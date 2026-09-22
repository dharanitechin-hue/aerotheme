import asyncio
import time
from typing import Set, Optional, Callable, Dict, Any

from .engine_state import EngineState, OperatingState, FaultType, TargetSensor
from .engine_simulator import EngineSimulator
from .scenario_manager import ScenarioManager


class SimulationController:
    """
    Central controller managing simulation execution state, high-frequency
    loop (10-20 Hz), speed multipliers (0.25x to 10x), user controls,
    and WebSocket subscriber broadcasting.
    """

    def __init__(self, engine_id: str = "ENG-001"):
        self.engine_id = engine_id
        self.simulator = EngineSimulator(engine_id)
        self.scenario_manager = ScenarioManager(self)
        
        self.is_running: bool = False
        self.is_paused: bool = False
        self.speed_multiplier: float = 1.0  # 0.25x, 0.5x, 1x, 2x, 5x, 10x
        self.tick_rate_hz: float = 10.0      # Visual rate (10 updates/sec)
        
        self._loop_task: Optional[asyncio.Task] = None
        self._subscribers: Set[asyncio.Queue] = set()
        self._ai_counter: int = 0
        self.latest_state: EngineState = self.simulator.step(dt=0.01, run_ai_inference=True)

    def subscribe(self) -> asyncio.Queue:
        """Register a new WebSocket queue for live telemetry broadcast."""
        queue: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue):
        """Remove a subscriber queue upon disconnect."""
        self._subscribers.discard(queue)

    def broadcast(self, state: EngineState):
        """Dispatches telemetry state to all connected WebSocket clients."""
        payload = state.model_dump()
        dead_queues = set()
        for q in self._subscribers:
            try:
                # If queue is full, pop oldest frame to maintain low latency
                if q.full():
                    try:
                        q.get_nowait()
                    except asyncio.QueueEmpty:
                        pass
                q.put_nowait(payload)
            except Exception:
                dead_queues.add(q)
        for dq in dead_queues:
            self._subscribers.discard(dq)

    def start(self):
        """Start or resume simulation loop."""
        if self._loop_task is None or self._loop_task.done():
            self.is_running = True
            self.is_paused = False
            self._loop_task = asyncio.create_task(self._simulation_loop())
        else:
            self.is_running = True
            self.is_paused = False

    def pause(self):
        """Pause engine simulation."""
        self.is_paused = True

    def resume(self):
        """Resume engine simulation."""
        self.is_paused = False
        if self._loop_task is None or self._loop_task.done():
            self.start()

    def reset(self):
        """Reset engine to initial OFF state."""
        self.scenario_manager.stop_demo_sequence()
        self.simulator.reset()
        self.is_paused = False
        self.latest_state = self.simulator.step(dt=0.01, run_ai_inference=True)
        self.broadcast(self.latest_state)

    def emergency_stop(self):
        """Immediately shuts off fuel and cuts ignition."""
        self.scenario_manager.stop_demo_sequence()
        self.simulator.engine_state = OperatingState.OFF
        self.simulator.throttle = 0.0
        self.simulator.fault_system.clear_faults()
        self.latest_state = self.simulator.step(dt=0.1, run_ai_inference=True)
        self.broadcast(self.latest_state)

    def set_speed(self, multiplier: float):
        """Set simulation speed: 0.25x, 0.5x, 1.0x, 2.0x, 5.0x, 10.0x."""
        valid_speeds = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0]
        if multiplier in valid_speeds or (0.1 <= multiplier <= 20.0):
            self.speed_multiplier = float(multiplier)

    def set_throttle(self, throttle: float):
        self.simulator.throttle = max(0.0, min(1.0, throttle))

    def set_load(self, load: float):
        self.simulator.load = max(0.0, min(1.0, load))

    def set_altitude(self, altitude_ft: float):
        self.simulator.altitude = max(0.0, min(30000.0, altitude_ft))

    def set_ambient_temp(self, temp_c: float):
        self.simulator.ambient_temperature = max(-40.0, min(60.0, temp_c))

    def set_operating_state(self, state: OperatingState):
        self.simulator.engine_state = state
        # Automatically align baseline throttle/load if transitioning to defined flight phase
        t, l = self.simulator.physics.get_state_target_parameters(state)
        self.simulator.throttle = t
        self.simulator.load = l

    def set_noise_level(self, noise: float):
        self.simulator.sensor_model.set_noise_level(noise)

    def inject_fault(self, fault: FaultType, severity: float = 1.0, rate: float = 0.05, target_sensor: TargetSensor = TargetSensor.EGT):
        self.simulator.sensor_model.set_drift_target(target_sensor)
        self.simulator.fault_system.inject_fault(
            fault=fault,
            target_severity=severity,
            rate=rate,
            target_sensor=target_sensor
        )

    def set_fault_severity(self, severity: float):
        self.simulator.fault_system.set_severity(severity)

    def clear_faults(self):
        self.simulator.fault_system.clear_faults()
        self.simulator.sensor_model.reset_sensor_faults()

    async def _simulation_loop(self):
        """Core high-frequency simulation loop."""
        base_interval = 1.0 / self.tick_rate_hz  # 0.100 s (100 ms)

        try:
            while self.is_running:
                loop_start = time.perf_counter()

                if not self.is_paused:
                    # Scaled physics dt
                    dt = base_interval * self.speed_multiplier
                    
                    # Decouple AI inference: run AI every ~10 ticks (~1s simulated time)
                    self._ai_counter += 1
                    run_ai = (self._ai_counter >= 10)
                    if run_ai:
                        self._ai_counter = 0

                    # Step simulator
                    self.latest_state = self.simulator.step(dt=dt, run_ai_inference=run_ai)
                    
                    # Broadcast telemetry
                    self.broadcast(self.latest_state)

                # Maintain steady tick rate
                elapsed = time.perf_counter() - loop_start
                sleep_time = max(0.005, base_interval - elapsed)
                await asyncio.sleep(sleep_time)

        except asyncio.CancelledError:
            pass
        finally:
            self.is_running = False
