import asyncio
from typing import Dict, Any, Optional, Callable
from .engine_state import OperatingState, FaultType, TargetSensor


class ScenarioManager:
    """
    Manages predefined scenarios and orchestrates the automated 13-stage mission demonstration.
    """

    def __init__(self, simulator_controller):
        self.controller = simulator_controller
        self.active_scenario_name: Optional[str] = None
        self.demo_task: Optional[asyncio.Task] = None
        self.demo_current_stage: int = 0
        self.demo_stage_description: str = "Ready"

        # Predefined standard scenarios
        self.scenarios = {
            "healthy_cruise": {
                "name": "Healthy Cruise",
                "description": "Standard level patrol flight at 15,000 ft with healthy engine parameters.",
                "state": OperatingState.CRUISE,
                "throttle": 0.72,
                "load": 0.65,
                "altitude": 15000.0,
                "ambient_temp": 15.0,
                "fault": FaultType.NONE,
                "severity": 0.0,
                "rate": 0.05
            },
            "high_temp_mission": {
                "name": "High Temperature Mission",
                "description": "Desert environment operations (45°C ambient) with elevated thermal loading.",
                "state": OperatingState.CRUISE,
                "throttle": 0.80,
                "load": 0.75,
                "altitude": 5000.0,
                "ambient_temp": 45.0,
                "fault": FaultType.NONE,
                "severity": 0.0,
                "rate": 0.05
            },
            "lubrication_degradation": {
                "name": "Lubrication Degradation",
                "description": "Loss of oil pressure and elevated oil temperature leading to high bearing friction.",
                "state": OperatingState.CRUISE,
                "throttle": 0.72,
                "load": 0.65,
                "altitude": 12000.0,
                "ambient_temp": 20.0,
                "fault": FaultType.LUBRICATION_DEGRADATION,
                "severity": 0.85,
                "rate": 0.04
            },
            "misfire": {
                "name": "Cylinder Misfire",
                "description": "Intermittent ignition failure creating torque ripples, RPM fluctuation, and high vibration.",
                "state": OperatingState.CRUISE,
                "throttle": 0.75,
                "load": 0.70,
                "altitude": 10000.0,
                "ambient_temp": 20.0,
                "fault": FaultType.MISFIRE,
                "severity": 0.75,
                "rate": 0.08
            },
            "injector_abnormality": {
                "name": "Injector Abnormality",
                "description": "Fuel delivery imbalance resulting in lean combustion, EGT spike, and timing advance.",
                "state": OperatingState.CRUISE,
                "throttle": 0.70,
                "load": 0.65,
                "altitude": 14000.0,
                "ambient_temp": 18.0,
                "fault": FaultType.INJECTOR_ABNORMALITY,
                "severity": 0.70,
                "rate": 0.05
            },
            "overheating": {
                "name": "Overheating Scenario",
                "description": "Cooling duct failure or radiator blockage driving CHT and oil temp toward redline.",
                "state": OperatingState.HIGH_LOAD,
                "throttle": 0.88,
                "load": 0.85,
                "altitude": 8000.0,
                "ambient_temp": 38.0,
                "fault": FaultType.OVERHEATING,
                "severity": 0.80,
                "rate": 0.05
            },
            "sensor_drift": {
                "name": "Sensor Drift",
                "description": "EGT thermocouple drifts by +70°C while the underlying engine physics remains completely healthy.",
                "state": OperatingState.CRUISE,
                "throttle": 0.72,
                "load": 0.65,
                "altitude": 15000.0,
                "ambient_temp": 20.0,
                "fault": FaultType.SENSOR_DRIFT,
                "severity": 0.80,
                "rate": 0.04,
                "sensor": TargetSensor.EGT
            },
            "abnormal_vibration": {
                "name": "Abnormal Vibration",
                "description": "Propeller pitch imbalance or main bearing play generating excessive vibration harmonics.",
                "state": OperatingState.CRUISE,
                "throttle": 0.72,
                "load": 0.65,
                "altitude": 15000.0,
                "ambient_temp": 20.0,
                "fault": FaultType.ABNORMAL_VIBRATION,
                "severity": 0.80,
                "rate": 0.06
            }
        }

    def load_scenario(self, scenario_key: str):
        """Loads and applies a preset scenario."""
        if scenario_key not in self.scenarios:
            return False

        sc = self.scenarios[scenario_key]
        self.active_scenario_name = sc["name"]
        
        # Stop any active mission demonstration
        self.stop_demo_sequence()

        # Apply parameters
        self.controller.set_operating_state(sc["state"])
        self.controller.set_throttle(sc["throttle"])
        self.controller.set_load(sc["load"])
        self.controller.set_altitude(sc["altitude"])
        self.controller.set_ambient_temp(sc["ambient_temp"])
        
        # Inject fault if specified
        if sc["fault"] != FaultType.NONE:
            sensor = sc.get("sensor", TargetSensor.EGT)
            self.controller.inject_fault(sc["fault"], sc["severity"], sc["rate"], sensor)
        else:
            self.controller.clear_faults()

        return True

    def start_demo_sequence(self):
        """Launches the 13-stage automated mission demonstration sequence."""
        self.stop_demo_sequence()
        self.active_scenario_name = "Mission Demonstration Sequence"
        self.demo_task = asyncio.create_task(self._run_demo_sequence())

    def stop_demo_sequence(self):
        if self.demo_task and not self.demo_task.done():
            self.demo_task.cancel()
        self.demo_task = None
        self.demo_current_stage = 0
        self.demo_stage_description = "Ready"

    async def _run_demo_sequence(self):
        """
        Executes the exact 13-stage mission sequence:
        1. Start healthy engine
        2. Begin cruise mission
        3. Show stable telemetry
        4. Gradually introduce lubrication degradation
        5. Show actual vs expected divergence
        6. Detect anomaly
        7. Predict lubrication fault
        8. Reduce health score
        9. Reduce RUL
        10. Increase failure probability
        11. Increase mission risk
        12. Display maintenance recommendation
        13. Allow the user to replay the event
        """
        try:
            # Stage 1: Healthy Engine Start
            self.demo_current_stage = 1
            self.demo_stage_description = "1/13: Starting healthy UAV engine (Ignition & warmup)..."
            self.controller.reset()
            self.controller.start()
            self.controller.set_operating_state(OperatingState.STARTING)
            await asyncio.sleep(2.0)

            # Stage 2: Begin Cruise Mission
            self.demo_current_stage = 2
            self.demo_stage_description = "2/13: Transitioning to Cruise at 15,000 ft altitude..."
            self.controller.set_operating_state(OperatingState.CRUISE)
            self.controller.set_throttle(0.72)
            self.controller.set_load(0.65)
            self.controller.set_altitude(15000.0)
            self.controller.set_ambient_temp(22.0)
            await asyncio.sleep(3.0)

            # Stage 3: Show Stable Telemetry
            self.demo_current_stage = 3
            self.demo_stage_description = "3/13: Telemetry nominal. Digital Twin expected values in full alignment."
            await asyncio.sleep(3.5)

            # Stage 4: Gradually Introduce Lubrication Degradation
            self.demo_current_stage = 4
            self.demo_stage_description = "4/13: Injecting gradual lubrication degradation (severity: 0.0 -> 0.90)..."
            self.controller.inject_fault(
                fault=FaultType.LUBRICATION_DEGRADATION,
                target_severity=0.88,
                rate=0.06
            )
            await asyncio.sleep(4.0)

            # Stage 5: Actual vs Expected Divergence
            self.demo_current_stage = 5
            self.demo_stage_description = "5/13: Digital Twin calculates residuals: Oil pressure dropping, oil temp rising."
            await asyncio.sleep(3.0)

            # Stage 6: Anomaly Detection
            self.demo_current_stage = 6
            self.demo_stage_description = "6/13: AI Isolation Forest flags abnormal multivariate residual trend!"
            await asyncio.sleep(3.0)

            # Stage 7: Fault Prediction
            self.demo_current_stage = 7
            self.demo_stage_description = "7/13: Random Forest AI classifies fault: LUBRICATION DEGRADATION (Confidence > 92%)."
            await asyncio.sleep(3.0)

            # Stage 8: Health Score Reduction
            self.demo_current_stage = 8
            self.demo_stage_description = "8/13: Engine Health Index degrades from 100% down to critical zone."
            await asyncio.sleep(3.0)

            # Stage 9: RUL Reduction
            self.demo_current_stage = 9
            self.demo_stage_description = "9/13: Estimated Remaining Useful Life (RUL) drops below mission threshold."
            await asyncio.sleep(3.0)

            # Stage 10: Failure Probability Escalation
            self.demo_current_stage = 10
            self.demo_stage_description = "10/13: In-flight catastrophic seizure probability surges."
            await asyncio.sleep(2.5)

            # Stage 11: Mission Risk Escalation
            self.demo_current_stage = 11
            self.demo_stage_description = "11/13: Mission Risk Engine triggers HIGH / CRITICAL UAV safety alarm!"
            await asyncio.sleep(2.5)

            # Stage 12: Maintenance Recommendation
            self.demo_current_stage = 12
            self.demo_stage_description = "12/13: Advisory generated: Immediate RTB & depot oil subsystem teardown."
            await asyncio.sleep(3.0)

            # Stage 13: Replay Ready
            self.demo_current_stage = 13
            self.demo_stage_description = "13/13: Incident logged to replay buffer. Ready for post-flight timeline analysis."

        except asyncio.CancelledError:
            self.demo_stage_description = "Mission Demonstration aborted."
