import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.simulator.simulation_controller import SimulationController
from app.simulator.engine_state import OperatingState, FaultType, TargetSensor

router = APIRouter()


@router.websocket("/ws/telemetry/{engine_id}")
async def websocket_telemetry_endpoint(websocket: WebSocket, engine_id: str):
    """
    WebSocket endpoint streaming live engine telemetry at 10-20 Hz
    and accepting real-time interactive control commands from the frontend.
    """
    await websocket.accept()
    from app.main import controller  # singleton simulation controller

    queue = controller.subscribe()

    async def sender():
        try:
            while True:
                telemetry = await queue.get()
                # Send latest state JSON
                await websocket.send_text(json.dumps(telemetry))
        except Exception:
            pass

    async def receiver():
        try:
            while True:
                msg_text = await websocket.receive_text()
                try:
                    data = json.loads(msg_text)
                    action = data.get("action")
                    val = data.get("value")

                    if action == "start":
                        controller.start()
                    elif action == "pause":
                        controller.pause()
                    elif action == "resume":
                        controller.resume()
                    elif action == "reset":
                        controller.reset()
                    elif action == "emergency_stop":
                        controller.emergency_stop()
                    elif action == "set_throttle":
                        controller.set_throttle(float(val))
                    elif action == "set_load":
                        controller.set_load(float(val))
                    elif action == "set_altitude":
                        controller.set_altitude(float(val))
                    elif action == "set_ambient_temp":
                        controller.set_ambient_temp(float(val))
                    elif action == "set_speed":
                        controller.set_speed(float(val))
                    elif action == "set_operating_state":
                        controller.set_operating_state(OperatingState(val))
                    elif action == "set_noise_level":
                        controller.set_noise_level(float(val))
                    elif action == "inject_fault":
                        f_type = FaultType(data.get("fault_type", "NONE"))
                        f_sev = float(data.get("severity", 1.0))
                        f_rate = float(data.get("rate", 0.05))
                        t_sens = TargetSensor(data.get("target_sensor", "egt"))
                        controller.inject_fault(f_type, f_sev, f_rate, t_sens)
                    elif action == "clear_faults":
                        controller.clear_faults()
                    elif action == "start_demo_sequence":
                        controller.scenario_manager.start_demo_sequence()
                    elif action == "load_scenario":
                        controller.scenario_manager.load_scenario(val)
                except Exception as e:
                    # Ignore ill-formed commands
                    pass
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    send_task = asyncio.create_task(sender())
    recv_task = asyncio.create_task(receiver())

    try:
        # Wait until either ends
        done, pending = await asyncio.wait(
            [send_task, recv_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
    finally:
        controller.unsubscribe(queue)
