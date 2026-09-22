import pytest
from app.simulator.sensor_model import SensorModel
from app.simulator.engine_state import FaultType, TargetSensor


def test_sensor_noise_application():
    sensor = SensorModel(noise_level=0.02)
    true_values = {
        "rpm": 4500.0,
        "cht": 175.0,
        "egt": 625.0,
        "oil_pressure": 4.2,
        "oil_temperature": 92.0,
        "fuel_flow": 18.5,
        "vibration": 1.15
    }

    sensed = sensor.apply_sensor_dynamics(
        dt=0.1,
        true_values=true_values,
        active_fault=FaultType.NONE,
        fault_severity=0.0
    )

    # Values should be close to ground truth within noise bounds
    assert abs(sensed["rpm"] - true_values["rpm"]) < 300.0
    assert abs(sensed["egt"] - true_values["egt"]) < 50.0
    assert abs(sensed["oil_pressure"] - true_values["oil_pressure"]) < 0.5


def test_sensor_drift():
    sensor = SensorModel(noise_level=0.0)
    sensor.set_drift_target(TargetSensor.EGT)
    true_values = {"rpm": 4500.0, "egt": 625.0, "oil_pressure": 4.2}

    # Step over 5 seconds with active drift
    for _ in range(50):
        sensed = sensor.apply_sensor_dynamics(
            dt=0.1,
            true_values=true_values,
            active_fault=FaultType.SENSOR_DRIFT,
            fault_severity=1.0
        )

    # Sensor EGT should have drifted upwards significantly
    assert sensed["egt"] > 625.0 + 8.0
    # Other sensors should not have drifted
    assert sensed["rpm"] == 4500.0
