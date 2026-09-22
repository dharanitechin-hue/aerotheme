import random
import math
from typing import Dict, Any, Optional
from .engine_state import TargetSensor, FaultType


class SensorModel:
    """
    Sensor simulation layer that converts true physical parameters into
    realistic telemetry by introducing configurable Gaussian noise,
    sensor drift bias, and failure modes.
    """

    def __init__(self, noise_level: float = 0.02):
        self.noise_level = noise_level  # default 0.02 (2% relative noise)
        self.target_sensor: Optional[TargetSensor] = TargetSensor.EGT
        self.drift_accumulated: float = 0.0
        self.drift_rate: float = 0.75  # units/sec drift rate
        self.sensor_failed: bool = False
        self.failure_mode: str = "FREEZE"  # "FREEZE", "ZERO", "MAX"
        self.frozen_values: Dict[str, float] = {}

    def set_noise_level(self, level: float):
        """Allow the noise level to be changed for testing."""
        self.noise_level = max(0.0, min(0.20, level))

    def set_drift_target(self, sensor: TargetSensor):
        self.target_sensor = sensor
        self.drift_accumulated = 0.0

    def reset_sensor_faults(self):
        self.drift_accumulated = 0.0
        self.sensor_failed = False
        self.frozen_values.clear()

    def apply_sensor_dynamics(
        self,
        dt: float,
        true_values: Dict[str, float],
        active_fault: FaultType,
        fault_severity: float
    ) -> Dict[str, float]:
        """
        Applies noise, drift, and failures to physical values.
        """
        # If engine is completely off and cold, zero-out or ambient
        if true_values.get("rpm", 0.0) < 5.0:
            return {k: round(v, 2) for k, v in true_values.items()}

        sensed = {}

        # Handle Sensor Drift accumulation
        if active_fault == FaultType.SENSOR_DRIFT and fault_severity > 0:
            # Gradually accumulate bias on target sensor
            # E.g. at severity 1.0, drift accumulates up to +80°C or +1.5 bar
            rate_multiplier = fault_severity * 2.5
            self.drift_accumulated += self.drift_rate * rate_multiplier * dt
        elif active_fault != FaultType.SENSOR_DRIFT:
            # Decay drift if fault is cleared
            self.drift_accumulated = max(0.0, self.drift_accumulated - dt * 2.0)

        # Handle Sensor Failure freeze snapshot
        if active_fault == FaultType.SENSOR_FAILURE and not self.sensor_failed:
            self.sensor_failed = True
            self.frozen_values = {k: v for k, v in true_values.items()}
        elif active_fault != FaultType.SENSOR_FAILURE:
            self.sensor_failed = False
            self.frozen_values.clear()

        # Apply noise and modifications per parameter
        for param, true_val in true_values.items():
            if param in ["battery_voltage", "alternator_voltage", "injection_timing"]:
                # Electrical and timing have very low noise (0.2%)
                noise = random.gauss(0, true_val * (self.noise_level * 0.15))
                sensed[param] = round(true_val + noise, 2)
                continue

            # Check for catastrophic sensor failure on target sensor
            if (active_fault == FaultType.SENSOR_FAILURE and
                self.target_sensor and
                param == self.target_sensor.value and
                fault_severity > 0.3):
                if self.failure_mode == "FREEZE":
                    sensed[param] = round(self.frozen_values.get(param, true_val), 2)
                    continue
                elif self.failure_mode == "ZERO":
                    sensed[param] = 0.0
                    continue
                elif self.failure_mode == "MAX":
                    sensed[param] = 999.0
                    continue

            # Standard Gaussian noise: Normal(0, noise_level * baseline_scale)
            # Use appropriate scaling per metric so low readings don't get 0 noise
            param_scales = {
                "rpm": 5000.0,
                "egt": 650.0,
                "cht": 180.0,
                "oil_pressure": 4.5,
                "oil_temperature": 95.0,
                "fuel_flow": 20.0,
                "vibration": 1.2
            }
            scale = param_scales.get(param, abs(true_val) + 1.0)
            noise = random.gauss(0, scale * self.noise_level)

            sensed_val = true_val + noise

            # Add sensor drift if this is the target sensor
            if (active_fault == FaultType.SENSOR_DRIFT and
                self.target_sensor and
                param == self.target_sensor.value):
                sensed_val += self.drift_accumulated

            # Ensure physically non-negative values where appropriate
            if param in ["rpm", "cht", "egt", "oil_pressure", "oil_temperature", "fuel_flow", "vibration"]:
                sensed_val = max(0.0, sensed_val)

            # Format rounding
            if param in ["rpm", "egt", "cht", "oil_temperature"]:
                sensed[param] = round(sensed_val, 1)
            elif param in ["oil_pressure", "fuel_flow", "vibration"]:
                sensed[param] = round(sensed_val, 2)
            else:
                sensed[param] = round(sensed_val, 2)

        return sensed
