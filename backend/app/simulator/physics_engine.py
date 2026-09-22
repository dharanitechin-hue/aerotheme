import math
from typing import Dict, Tuple
from .engine_state import OperatingState, ExpectedEngineValues


class PhysicsEngine:
    """
    High-fidelity aero piston engine physics model representing a four-stroke,
    four-cylinder reciprocating aero engine with constant-speed propeller dynamics
    for MALE (Medium Altitude Long Endurance) UAV applications.
    """

    def __init__(self):
        # Time constants for first-order lag approximations (seconds)
        self.tau_rpm = 0.55
        self.tau_egt = 0.80
        self.tau_cht = 5.50
        self.tau_oil_temp = 9.00
        self.tau_oil_press = 0.35
        self.tau_fuel_flow = 0.40

    def compute_isa_atmosphere(self, altitude_ft: float, sea_level_temp_c: float = 25.0) -> Tuple[float, float, float]:
        """
        International Standard Atmosphere (ISA) calculation.
        Returns: (ambient_temp_c, pressure_ratio_delta, density_ratio_sigma)
        """
        # Altitude capped between 0 and 30,000 ft
        h = max(0.0, min(30000.0, altitude_ft))
        
        # Temperature lapse: -1.9812 °C per 1,000 ft up to tropopause (36,089 ft)
        temp_c = sea_level_temp_c - (0.0019812 * h)
        temp_k = temp_c + 273.15
        t0_k = sea_level_temp_c + 273.15
        
        # Altitude in feet: ISA troposphere pressure lapse rate
        delta = math.pow(max(0.01, 1.0 - 6.87559e-6 * h), 5.25588)
        
        # Density ratio sigma = delta * (T0 / T)
        sigma = delta * (t0_k / max(180.0, temp_k))
        
        return temp_c, delta, sigma

    def get_state_target_parameters(self, state: OperatingState) -> Tuple[float, float]:
        """
        Returns baseline (throttle, load) for designated operating states.
        """
        baselines = {
            OperatingState.OFF: (0.0, 0.0),
            OperatingState.STARTING: (0.05, 0.10),
            OperatingState.IDLE: (0.12, 0.15),
            OperatingState.TAKEOFF: (1.00, 0.95),
            OperatingState.CLIMB: (0.85, 0.80),
            OperatingState.CRUISE: (0.72, 0.65),
            OperatingState.HIGH_LOAD: (0.95, 0.92),
            OperatingState.DESCENT: (0.28, 0.30),
            OperatingState.LANDING: (0.20, 0.25)
        }
        return baselines.get(state, (0.70, 0.65))

    def calculate_expected_healthy_values(
        self,
        throttle: float,
        load: float,
        altitude_ft: float,
        ambient_temp_c: float,
        engine_state: OperatingState
    ) -> ExpectedEngineValues:
        """
        Calculates the nominal Digital Twin expected physics values under
        healthy conditions without noise or faults.
        """
        if engine_state == OperatingState.OFF:
            return ExpectedEngineValues(
                rpm=0.0,
                cht=ambient_temp_c,
                egt=ambient_temp_c,
                oil_pressure=0.0,
                oil_temperature=ambient_temp_c,
                fuel_flow=0.0,
                vibration=0.0
            )

        if engine_state == OperatingState.STARTING:
            return ExpectedEngineValues(
                rpm=850.0,
                cht=ambient_temp_c + 15.0,
                egt=ambient_temp_c + 120.0,
                oil_pressure=2.2,
                oil_temperature=ambient_temp_c + 10.0,
                fuel_flow=4.2,
                vibration=1.4
            )

        _, _, sigma = self.compute_isa_atmosphere(altitude_ft, ambient_temp_c)
        density_effect = math.pow(max(0.3, sigma), 0.15)

        # Expected steady-state RPM governed by throttle and constant-speed prop governor
        rpm_idle = 1400.0
        rpm_max = 5500.0
        # Turbo-normalized engine maintains MAP, propeller governor maintains constant RPM
        expected_rpm = rpm_idle + throttle * (rpm_max - rpm_idle) * (1.0 - 0.04 * load)
        expected_rpm = max(0.0, min(5800.0, expected_rpm))

        rpm_norm = expected_rpm / rpm_max

        # Expected Fuel Flow (L/h)
        expected_ff = (3.2 + (rpm_norm ** 1.3) * (0.25 + 0.75 * throttle) * 23.5) * density_effect

        # Expected EGT (°C): Combustion temperature around 600 - 680 °C at cruise/power
        egt_base = 380.0 + (ambient_temp_c * 0.5)
        egt_power = (rpm_norm ** 0.95) * 310.0 * (0.35 + 0.65 * throttle)
        expected_egt = egt_base + egt_power

        # Expected CHT (°C): Thermal equilibrium around 165 - 185 °C at cruise
        cht_base = 75.0 + (ambient_temp_c * 0.4)
        heat_factor = (expected_egt / 600.0) * (0.35 + 0.65 * rpm_norm)
        expected_cht = cht_base + (88.0 * heat_factor)

        # Expected Oil Temp (°C)
        expected_oil_temp = ambient_temp_c + 30.0 + (rpm_norm * 45.0) * (0.6 + 0.4 * load)

        # Expected Oil Pressure (bar): Increases with RPM, slightly drops with high oil temp
        viscosity_factor = 92.0 / max(50.0, expected_oil_temp)
        expected_oil_press = (1.6 + 3.0 * rpm_norm) * (0.85 + 0.15 * viscosity_factor) * (1.0 - 0.05 * load)

        # Expected Vibration (mm/s RMS): structural vibration scales quadratically with RPM
        expected_vib = 0.55 + 0.85 * (rpm_norm ** 2) + 0.12 * load

        return ExpectedEngineValues(
            rpm=round(expected_rpm, 1),
            cht=round(expected_cht, 1),
            egt=round(expected_egt, 1),
            oil_pressure=round(expected_oil_press, 2),
            oil_temperature=round(expected_oil_temp, 1),
            fuel_flow=round(expected_ff, 2),
            vibration=round(expected_vib, 2)
        )

    def step(
        self,
        dt: float,
        current_state: Dict[str, float],
        throttle: float,
        load: float,
        altitude_ft: float,
        ambient_temp_c: float,
        engine_state: OperatingState
    ) -> Dict[str, float]:
        """
        Integrates physics state over time step dt with realistic lags and aerodynamic relationships.
        """
        # In OFF state, shut down engine dynamics smoothly
        if engine_state == OperatingState.OFF:
            decay_rate = math.exp(-dt / 2.0)
            thermal_decay = math.exp(-dt / 45.0)
            
            new_rpm = current_state.get("rpm", 0.0) * decay_rate
            if new_rpm < 15.0:
                new_rpm = 0.0
                
            new_ff = 0.0
            new_oil_press = current_state.get("oil_pressure", 0.0) * decay_rate
            if new_oil_press < 0.05:
                new_oil_press = 0.0
                
            new_cht = ambient_temp_c + (current_state.get("cht", ambient_temp_c) - ambient_temp_c) * thermal_decay
            new_egt = ambient_temp_c + (current_state.get("egt", ambient_temp_c) - ambient_temp_c) * math.exp(-dt / 8.0)
            new_oil_temp = ambient_temp_c + (current_state.get("oil_temperature", ambient_temp_c) - ambient_temp_c) * thermal_decay
            new_vib = 0.0
            new_batt = 12.6
            new_alt_volt = 0.0
            new_timing = 15.0

            return {
                "rpm": new_rpm,
                "cht": new_cht,
                "egt": new_egt,
                "oil_pressure": new_oil_press,
                "oil_temperature": new_oil_temp,
                "fuel_flow": new_ff,
                "vibration": new_vib,
                "battery_voltage": new_batt,
                "alternator_voltage": new_alt_volt,
                "injection_timing": new_timing
            }

        # Calculate steady-state physics targets
        expected = self.calculate_expected_healthy_values(
            throttle=throttle,
            load=load,
            altitude_ft=altitude_ft,
            ambient_temp_c=ambient_temp_c,
            engine_state=engine_state
        )

        # First-order filter integration: y(t+dt) = y(t) + (target - y(t)) * (1 - exp(-dt / tau))
        alpha_rpm = 1.0 - math.exp(-dt / self.tau_rpm)
        alpha_egt = 1.0 - math.exp(-dt / self.tau_egt)
        alpha_cht = 1.0 - math.exp(-dt / self.tau_cht)
        alpha_oil_p = 1.0 - math.exp(-dt / self.tau_oil_press)
        alpha_oil_t = 1.0 - math.exp(-dt / self.tau_oil_temp)
        alpha_ff = 1.0 - math.exp(-dt / self.tau_fuel_flow)

        rpm_cur = current_state.get("rpm", 0.0)
        egt_cur = current_state.get("egt", ambient_temp_c)
        cht_cur = current_state.get("cht", ambient_temp_c)
        oil_p_cur = current_state.get("oil_pressure", 0.0)
        oil_t_cur = current_state.get("oil_temperature", ambient_temp_c)
        ff_cur = current_state.get("fuel_flow", 0.0)

        next_rpm = rpm_cur + (expected.rpm - rpm_cur) * alpha_rpm
        next_egt = egt_cur + (expected.egt - egt_cur) * alpha_egt
        next_cht = cht_cur + (expected.cht - cht_cur) * alpha_cht
        next_oil_p = oil_p_cur + (expected.oil_pressure - oil_p_cur) * alpha_oil_p
        next_oil_t = oil_t_cur + (expected.oil_temperature - oil_t_cur) * alpha_oil_t
        next_ff = ff_cur + (expected.fuel_flow - ff_cur) * alpha_ff

        # Vibration directly tracks instantaneous RPM & load
        rpm_ratio = max(0.0, next_rpm / 5500.0)
        next_vib = 0.55 + 0.85 * (rpm_ratio ** 2) + 0.12 * load

        # Electrical subsystem
        if next_rpm > 1200:
            next_alt_volt = 14.2
            next_batt = 13.9 + 0.2 * (next_rpm / 5500.0)
        elif engine_state == OperatingState.STARTING:
            next_alt_volt = 0.0
            next_batt = 11.4  # Starter dip
        else:
            next_alt_volt = 0.0
            next_batt = 12.6

        # Dynamic injection timing advance: 18° at idle, up to 24° at high RPM
        next_timing = 18.0 + 6.0 * (next_rpm / 5500.0)

        return {
            "rpm": next_rpm,
            "cht": next_cht,
            "egt": next_egt,
            "oil_pressure": next_oil_p,
            "oil_temperature": next_oil_t,
            "fuel_flow": next_ff,
            "vibration": next_vib,
            "battery_voltage": next_batt,
            "alternator_voltage": next_alt_volt,
            "injection_timing": next_timing
        }
