from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from app.simulator.engine_state import OperatingState, FaultType, TargetSensor

router = APIRouter(prefix="/api/simulator", tags=["simulator"])


class ControlCommand(BaseModel):
    action: str  # start, pause, resume, reset, emergency_stop


class ParameterUpdate(BaseModel):
    throttle: Optional[float] = None
    load: Optional[float] = None
    altitude: Optional[float] = None
    ambient_temperature: Optional[float] = None
    speed_multiplier: Optional[float] = None
    engine_state: Optional[OperatingState] = None
    noise_level: Optional[float] = None


class FaultInjectionRequest(BaseModel):
    fault_type: FaultType
    severity: float = 1.0
    rate: float = 0.05
    target_sensor: TargetSensor = TargetSensor.EGT


class ScenarioRequest(BaseModel):
    scenario_key: str


@router.get("/state")
async def get_engine_state():
    from app.main import controller
    return controller.latest_state.model_dump()


@router.post("/control")
async def execute_control(cmd: ControlCommand):
    from app.main import controller
    act = cmd.action.lower()
    if act == "start":
        controller.start()
    elif act == "pause":
        controller.pause()
    elif act == "resume":
        controller.resume()
    elif act == "reset":
        controller.reset()
    elif act == "emergency_stop":
        controller.emergency_stop()
    else:
        raise HTTPException(status_code=400, detail=f"Unknown control action: {cmd.action}")
    return {"status": "ok", "action": act, "is_running": controller.is_running, "is_paused": controller.is_paused}


@router.post("/parameters")
async def update_parameters(params: ParameterUpdate):
    from app.main import controller
    if params.throttle is not None:
        controller.set_throttle(params.throttle)
    if params.load is not None:
        controller.set_load(params.load)
    if params.altitude is not None:
        controller.set_altitude(params.altitude)
    if params.ambient_temperature is not None:
        controller.set_ambient_temp(params.ambient_temperature)
    if params.speed_multiplier is not None:
        controller.set_speed(params.speed_multiplier)
    if params.engine_state is not None:
        controller.set_operating_state(params.engine_state)
    if params.noise_level is not None:
        controller.set_noise_level(params.noise_level)
    return {"status": "parameters_updated"}


@router.post("/fault")
async def inject_fault(req: FaultInjectionRequest):
    from app.main import controller
    if req.fault_type == FaultType.NONE:
        controller.clear_faults()
    else:
        controller.inject_fault(
            fault=req.fault_type,
            severity=req.severity,
            rate=req.rate,
            target_sensor=req.target_sensor
        )
    return {"status": "fault_applied", "active_fault": req.fault_type.value, "severity": req.severity}


@router.post("/fault/clear")
async def clear_faults():
    from app.main import controller
    controller.clear_faults()
    return {"status": "faults_cleared"}


@router.get("/scenarios")
async def list_scenarios():
    from app.main import controller
    return {
        "scenarios": controller.scenario_manager.scenarios,
        "active_scenario": controller.scenario_manager.active_scenario_name,
        "demo_stage": controller.scenario_manager.demo_current_stage,
        "demo_description": controller.scenario_manager.demo_stage_description
    }


@router.post("/scenario/load")
async def load_scenario(req: ScenarioRequest):
    from app.main import controller
    success = controller.scenario_manager.load_scenario(req.scenario_key)
    if not success:
        raise HTTPException(status_code=404, detail="Scenario key not found")
    return {"status": "scenario_loaded", "scenario": req.scenario_key}


@router.post("/scenario/demo-sequence/start")
async def start_demo_sequence():
    from app.main import controller
    controller.scenario_manager.start_demo_sequence()
    return {"status": "demo_sequence_started"}


@router.post("/scenario/demo-sequence/stop")
async def stop_demo_sequence():
    from app.main import controller
    controller.scenario_manager.stop_demo_sequence()
    return {"status": "demo_sequence_stopped"}


@router.get("/replay")
async def get_replay_history(limit: int = 150):
    from app.main import controller
    history = controller.simulator.replay_buffer.get_history(limit=limit)
    return {
        "count": len(history),
        "history": history,
        "events": controller.simulator.replay_buffer.events
    }
