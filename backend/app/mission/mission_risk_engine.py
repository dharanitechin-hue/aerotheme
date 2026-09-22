from typing import Tuple
from app.simulator.engine_state import FaultType


class MissionRiskEngine:
    """
    Evaluates mission safety and reliability compatibility for MALE UAVs.
    Compares real-time engine health, predicted RUL, and operational stress
    against planned mission profile.
    """

    def __init__(self, default_mission_duration_hours: float = 10.0):
        self.planned_mission_duration = default_mission_duration_hours

    def evaluate_risk(
        self,
        rul_hours: float,
        health_score: float,
        failure_prob_pct: float,
        altitude_ft: float,
        ambient_temp_c: float,
        fault_type: str,
        fault_severity: float
    ) -> Tuple[str, str]:
        """
        Returns:
            (mission_risk_level, maintenance_recommendation)
            risk_level in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        """
        # Sensor drift / failure does not imply immediate mechanical failure
        if fault_type in [FaultType.SENSOR_DRIFT.value, FaultType.SENSOR_FAILURE.value]:
            return (
                "MEDIUM",
                f"Avionics Advisory: {fault_type.replace('_', ' ')} detected. Calibrate/replace sensor at next turn-around. Mechanical systems nominal."
            )

        # Environmental stress multipliers
        altitude_stress = 1.0 + max(0.0, (altitude_ft - 12000.0) / 25000.0)
        thermal_stress = 1.0 + max(0.0, (ambient_temp_c - 35.0) / 25.0)
        required_margin = self.planned_mission_duration * 1.5 * altitude_stress * thermal_stress

        # Critical threshold checks
        if health_score < 40.0 or failure_prob_pct > 65.0 or rul_hours < (self.planned_mission_duration * 0.6):
            risk = "CRITICAL"
            recommendation = (
                f"MISSION ABORT: Severe {fault_type.replace('_', ' ')} detected! "
                f"RUL ({rul_hours:.1f}h) critically below mission duration ({self.planned_mission_duration:.1f}h). "
                f"Initiate emergency Return to Base (RTB) immediately."
            )
        elif health_score < 65.0 or failure_prob_pct > 25.0 or rul_hours < required_margin:
            risk = "HIGH"
            recommendation = (
                f"HIGH RISK: Degradation detected in {fault_type.replace('_', ' ')}. "
                f"Throttle derating to 65% recommended. Restrict flight corridor and schedule depot maintenance."
            )
        elif health_score < 85.0 or failure_prob_pct > 8.0:
            risk = "MEDIUM"
            recommendation = (
                f"CAUTION: Early anomaly signature identified ({fault_type.replace('_', ' ')}). "
                f"Monitor thermal & lubrication residuals. Safe for localized surveillance."
            )
        else:
            risk = "LOW"
            recommendation = (
                f"GO FOR MISSION: Engine health optimal ({health_score:.0f}%). "
                f"RUL ({rul_hours:.1f}h) exceeds planned mission duration ({self.planned_mission_duration:.1f}h) with 95% confidence."
            )

        return risk, recommendation
