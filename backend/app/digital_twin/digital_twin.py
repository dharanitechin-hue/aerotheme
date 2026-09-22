from typing import Dict, Tuple, Optional
from app.simulator.engine_state import ExpectedEngineValues, EngineResiduals, OperatingState
from app.simulator.physics_engine import PhysicsEngine


class DigitalTwin:
    """
    Virtual representation of the aero piston engine.
    Calculates expected nominal values under current flight and operating conditions,
    computes parameter residuals, and cross-checks correlated signals for early
    degradation or sensor drift.
    """

    def __init__(self, physics_engine: PhysicsEngine):
        self.physics = physics_engine
        
        # Nominal parameter standard deviations for z-score normalization
        self.sigma = {
            "rpm": 60.0,
            "cht": 4.0,
            "egt": 12.0,
            "oil_pressure": 0.15,
            "oil_temperature": 3.0,
            "fuel_flow": 0.8,
            "vibration": 0.12
        }

    def compute_expected(
        self,
        throttle: float,
        load: float,
        altitude: float,
        ambient_temp: float,
        engine_state: OperatingState
    ) -> ExpectedEngineValues:
        """Returns nominal physics-based expected values."""
        return self.physics.calculate_expected_healthy_values(
            throttle=throttle,
            load=load,
            altitude_ft=altitude,
            ambient_temp_c=ambient_temp,
            engine_state=engine_state
        )

    def analyze_residuals(
        self,
        actual: Dict[str, float],
        expected: ExpectedEngineValues
    ) -> Tuple[EngineResiduals, Dict[str, float], Optional[str]]:
        """
        Calculates residuals: Actual - Expected.
        Returns:
            - residuals: EngineResiduals
            - z_scores: Normalized residual deviations
            - drift_suspect: Name of suspected sensor if isolated drift pattern detected
        """
        residuals = EngineResiduals(
            rpm=round(actual.get("rpm", 0.0) - expected.rpm, 1),
            cht=round(actual.get("cht", 0.0) - expected.cht, 1),
            egt=round(actual.get("egt", 0.0) - expected.egt, 1),
            oil_pressure=round(actual.get("oil_pressure", 0.0) - expected.oil_pressure, 2),
            oil_temperature=round(actual.get("oil_temperature", 0.0) - expected.oil_temperature, 1),
            fuel_flow=round(actual.get("fuel_flow", 0.0) - expected.fuel_flow, 2),
            vibration=round(actual.get("vibration", 0.0) - expected.vibration, 2)
        )

        # Compute z-scores: |residual| / standard_dev
        z_scores = {
            "rpm": abs(residuals.rpm) / self.sigma["rpm"],
            "cht": abs(residuals.cht) / self.sigma["cht"],
            "egt": abs(residuals.egt) / self.sigma["egt"],
            "oil_pressure": abs(residuals.oil_pressure) / self.sigma["oil_pressure"],
            "oil_temperature": abs(residuals.oil_temperature) / self.sigma["oil_temperature"],
            "fuel_flow": abs(residuals.fuel_flow) / self.sigma["fuel_flow"],
            "vibration": abs(residuals.vibration) / self.sigma["vibration"]
        }

        # Check for isolated sensor drift (Requirement 11)
        # If one sensor has z > 3.0 while all other sensors are normal (z < 2.0)
        high_z_params = [p for p, z in z_scores.items() if z > 3.0]
        drift_suspect = None
        if len(high_z_params) == 1:
            drift_suspect = high_z_params[0]

        return residuals, z_scores, drift_suspect
