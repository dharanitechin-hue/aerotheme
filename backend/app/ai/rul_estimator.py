import math
from typing import Tuple
from app.simulator.engine_state import FaultType


class RULEstimator:
    """
    Remaining Useful Life (RUL) regression estimator providing:
    - Estimated flight hours remaining
    - 90% confidence uncertainty interval [lower_bound, upper_bound]
    - Failure probability percentage (0 to 100%)
    """

    def __init__(self, nominal_life_hours: float = 50.0):
        self.nominal_life = nominal_life_hours

    def estimate(
        self,
        health_score: float,
        degradation_level: float,
        fault_type: str,
        fault_severity: float,
        anomaly_score: float
    ) -> Tuple[float, float, float, float, float]:
        """
        Returns:
            (rul_hours, confidence, lower_bound, upper_bound, failure_prob_pct)
        """
        # If fault is SENSOR_DRIFT or SENSOR_FAILURE, the engine itself is mechanically healthy!
        effective_health = health_score
        effective_sev = fault_severity
        if fault_type in [FaultType.SENSOR_DRIFT.value, FaultType.SENSOR_FAILURE.value]:
            effective_health = max(92.0, health_score)
            effective_sev = 0.05

        # Fault severity factor: critical faults like lubrication/overheating accelerate degradation
        fault_multipliers = {
            FaultType.LUBRICATION_DEGRADATION.value: 2.2,
            FaultType.OVERHEATING.value: 2.4,
            FaultType.MISFIRE.value: 1.6,
            FaultType.ABNORMAL_VIBRATION.value: 1.8,
            FaultType.INJECTOR_ABNORMALITY.value: 1.3,
            FaultType.COMBUSTION_INSTABILITY.value: 1.4,
            FaultType.BATTERY_DEGRADATION.value: 1.1,
            FaultType.NONE.value: 1.0
        }
        mult = fault_multipliers.get(fault_type, 1.0)

        # Baseline RUL scaling
        health_ratio = max(0.01, min(1.0, effective_health / 100.0))
        rul = self.nominal_life * (health_ratio ** 1.6)

        # Apply degradation & fault severity reduction
        degrade_penalty = (effective_sev * 0.70 + degradation_level * 0.30) * mult
        rul = rul * max(0.04, 1.0 - min(0.96, degrade_penalty))

        # Confidence: High when healthy or when fault signature is fully developed
        if fault_type != FaultType.NONE.value and fault_severity > 0.3:
            confidence = 0.92
            uncertainty_margin = max(1.2, rul * 0.15)
        elif health_score > 90.0:
            confidence = 0.95
            uncertainty_margin = max(2.5, rul * 0.10)
        else:
            confidence = 0.88
            uncertainty_margin = max(2.0, rul * 0.20)

        lower = max(0.5, rul - uncertainty_margin)
        upper = rul + uncertainty_margin

        # Failure Probability: logistic curve anchored at health = 45%
        # Healthy (95%) -> ~0.7%
        # Warning (70%) -> ~8%
        # Degraded (50%) -> ~38%
        # Critical (30%) -> ~82%
        k = 0.09
        midpoint = 48.0
        exponent = -k * (midpoint - effective_health)
        # Cap exponent to prevent overflow
        exponent = max(-15.0, min(15.0, exponent))
        raw_prob = 1.0 / (1.0 + math.exp(exponent))
        failure_prob_pct = round(raw_prob * 100.0, 1)

        return (
            round(rul, 1),
            confidence,
            round(lower, 1),
            round(upper, 1),
            failure_prob_pct
        )
