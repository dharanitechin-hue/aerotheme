import pytest
from app.simulator.engine_simulator import EngineSimulator
from app.simulator.engine_state import OperatingState, FaultType


def test_lubrication_degradation_pipeline():
    simulator = EngineSimulator(engine_id="ENG-TEST")
    simulator.engine_state = OperatingState.CRUISE
    simulator.throttle = 0.72
    simulator.load = 0.65
    simulator.altitude = 12000.0
    simulator.warm_start()

    # Run 20 healthy steps
    for _ in range(20):
        simulator.step(dt=0.1, run_ai_inference=True)

    initial_health = simulator.health_score
    initial_oil_p = simulator.physical_state["oil_pressure"]
    assert initial_health >= 90.0
    assert initial_oil_p >= 3.5

    # Inject Lubrication Degradation fault
    simulator.fault_system.inject_fault(
        fault=FaultType.LUBRICATION_DEGRADATION,
        target_severity=0.85,
        rate=0.5
    )

    # Step through simulation
    for _ in range(30):
        simulator.step(dt=0.1, run_ai_inference=True)

    # Telemetry should reflect lubrication degradation
    assert simulator.physical_state["oil_pressure"] < initial_oil_p
    assert simulator.health_score < initial_health
    assert simulator.anomaly_score > 0.25
    assert simulator.predicted_fault == FaultType.LUBRICATION_DEGRADATION.value
    assert simulator.rul_hours < 40.0
