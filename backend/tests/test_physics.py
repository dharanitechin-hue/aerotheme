import pytest
from app.simulator.physics_engine import PhysicsEngine
from app.simulator.engine_state import OperatingState


def test_isa_atmosphere():
    physics = PhysicsEngine()
    
    # Sea level
    temp_sl, delta_sl, sigma_sl = physics.compute_isa_atmosphere(0.0, sea_level_temp_c=15.0)
    assert round(temp_sl, 1) == 15.0
    assert round(delta_sl, 2) == 1.0
    assert round(sigma_sl, 2) == 1.0

    # 15,000 ft
    temp_15k, delta_15k, sigma_15k = physics.compute_isa_atmosphere(15000.0, sea_level_temp_c=15.0)
    assert temp_15k < 0.0  # Lapse rate makes it negative
    assert delta_15k < 1.0
    assert sigma_15k < delta_sl


def test_operating_states_baselines():
    physics = PhysicsEngine()
    
    # OFF state expected values
    off_exp = physics.calculate_expected_healthy_values(0, 0, 0, 25.0, OperatingState.OFF)
    assert off_exp.rpm == 0.0
    assert off_exp.oil_pressure == 0.0

    # CRUISE expected values
    cruise_exp = physics.calculate_expected_healthy_values(0.72, 0.65, 10000.0, 20.0, OperatingState.CRUISE)
    assert 4000.0 <= cruise_exp.rpm <= 5000.0
    assert 150.0 <= cruise_exp.cht <= 200.0
    assert 550.0 <= cruise_exp.egt <= 700.0
    assert 3.5 <= cruise_exp.oil_pressure <= 5.0
    assert 14.0 <= cruise_exp.fuel_flow <= 24.0


def test_rpm_throttle_dynamics():
    physics = PhysicsEngine()
    state = {"rpm": 1400.0, "egt": 450.0, "cht": 120.0, "oil_pressure": 3.0, "oil_temperature": 70.0, "fuel_flow": 5.0}
    
    # Apply 100% throttle
    next_state = physics.step(
        dt=0.5,
        current_state=state,
        throttle=1.0,
        load=0.5,
        altitude_ft=5000.0,
        ambient_temp_c=20.0,
        engine_state=OperatingState.TAKEOFF
    )
    
    # RPM must increase dynamically
    assert next_state["rpm"] > state["rpm"]
    assert next_state["fuel_flow"] > state["fuel_flow"]
