import math
import random
from typing import Dict, Any, Tuple
from .engine_state import FaultType, TargetSensor


class FaultInjectionSystem:
    """
    Manages controlled gradual fault injection across 9 supported fault modes:
    - MISFIRE
    - INJECTOR_ABNORMALITY
    - LUBRICATION_DEGRADATION
    - SENSOR_DRIFT
    - SENSOR_FAILURE
    - COMBUSTION_INSTABILITY
    - OVERHEATING
    - ABNORMAL_VIBRATION
    - BATTERY_DEGRADATION
    """

    def __init__(self):
        self.active_fault: FaultType = FaultType.NONE
        self.current_severity: float = 0.0  # 0.0 to 1.0
        self.target_severity: float = 0.0   # 0.0 to 1.0
        self.progression_rate: float = 0.05  # severity increase per second (0.05 = ~20s to full fault)
        self.time_in_fault: float = 0.0
        self.target_sensor: TargetSensor = TargetSensor.EGT

    def inject_fault(self, fault: FaultType, target_severity: float = 1.0, rate: float = 0.05, target_sensor: TargetSensor = TargetSensor.EGT):
        """Activates a fault with gradual progression."""
        self.active_fault = fault
        self.target_severity = max(0.0, min(1.0, target_severity))
        self.progression_rate = max(0.005, min(1.0, rate))
        self.target_sensor = target_sensor
        self.time_in_fault = 0.0

    def set_severity(self, severity: float):
        """Instantly set severity to a specific value."""
        self.current_severity = max(0.0, min(1.0, severity))
        self.target_severity = self.current_severity

    def clear_faults(self):
        """Immediately reset all faults."""
        self.active_fault = FaultType.NONE
        self.current_severity = 0.0
        self.target_severity = 0.0
        self.time_in_fault = 0.0

    def update_progression(self, dt: float):
        """Gradually progresses fault severity toward target severity."""
        if self.active_fault == FaultType.NONE:
            # Gradually clear any lingering severity
            if self.current_severity > 0.0:
                self.current_severity = max(0.0, self.current_severity - self.progression_rate * dt * 2.0)
            return

        self.time_in_fault += dt
        if self.current_severity < self.target_severity:
            self.current_severity = min(
                self.target_severity,
                self.current_severity + self.progression_rate * dt
            )
        elif self.current_severity > self.target_severity:
            self.current_severity = max(
                self.target_severity,
                self.current_severity - self.progression_rate * dt
            )

    def apply_fault_physics(self, dt: float, physical_state: Dict[str, float]) -> Tuple[Dict[str, float], float, Dict[str, str]]:
        """
        Modifies true physical state according to active fault and current severity.
        Returns:
            (modified_physics_state, health_score_penalty, component_status_dict)
        """
        self.update_progression(dt)
        sev = self.current_severity
        
        modified = dict(physical_state)
        health_penalty = 0.0
        
        component_status = {
            "engine_block": "NORMAL",
            "cylinder": "NORMAL",
            "injector": "NORMAL",
            "oil_system": "NORMAL",
            "exhaust": "NORMAL",
            "crankshaft": "NORMAL",
            "sensors": "NORMAL"
        }

        # If engine is OFF or severity is zero, return as is
        if modified.get("rpm", 0.0) < 50.0 or sev <= 0.001 or self.active_fault == FaultType.NONE:
            return modified, 0.0, component_status

        t = self.time_in_fault

        if self.active_fault == FaultType.LUBRICATION_DEGRADATION:
            # Oil pressure drops significantly (loss of oil pressure / pump wear)
            modified["oil_pressure"] = max(0.4, modified["oil_pressure"] * (1.0 - 0.70 * sev))
            
            # Oil temperature increases due to unlubricated friction
            modified["oil_temperature"] += 45.0 * sev
            
            # Mechanical friction induces higher vibration
            modified["vibration"] += 2.2 * sev
            
            # Frictional heat transfers into cylinder block
            modified["cht"] += 28.0 * sev
            
            # Mechanical drag slightly reduces efficiency (higher fuel flow for same power)
            modified["fuel_flow"] *= (1.0 + 0.14 * sev)
            
            # Health score reduction
            health_penalty = 60.0 * sev

            # Component status
            if sev > 0.6:
                component_status["oil_system"] = "CRITICAL"
                component_status["crankshaft"] = "WARNING"
                component_status["engine_block"] = "WARNING"
            elif sev > 0.2:
                component_status["oil_system"] = "WARNING"

        elif self.active_fault == FaultType.MISFIRE:
            # Combustion misfire creates sharp intermittent torque drops
            # High frequency oscillation simulating missing power strokes
            osc = math.sin(t * 18.0) + 0.5 * math.sin(t * 42.0)
            rpm_loss = (180.0 + 380.0 * sev) * abs(osc)
            modified["rpm"] = max(800.0, modified["rpm"] - rpm_loss)
            
            # Unburnt fuel / cold cycle causes irregular EGT
            egt_jitter = math.sin(t * 14.0) * (45.0 * sev)
            modified["egt"] = max(200.0, modified["egt"] - (40.0 * sev) + egt_jitter)
            
            # Massive vibration from unbalanced cylinders
            modified["vibration"] += (2.8 * sev) * (0.8 + 0.4 * abs(osc))
            
            # Unburnt fuel increases fuel consumption per effective output
            modified["fuel_flow"] *= (1.0 + 0.18 * sev)
            
            health_penalty = 45.0 * sev

            if sev > 0.5:
                component_status["cylinder"] = "CRITICAL"
                component_status["crankshaft"] = "WARNING"
            elif sev > 0.2:
                component_status["cylinder"] = "WARNING"

        elif self.active_fault == FaultType.INJECTOR_ABNORMALITY:
            # Clogged or leaky injector nozzle
            # Causes lean mixture in affected cylinder, raising local combustion temp
            modified["egt"] += 68.0 * sev
            modified["fuel_flow"] = max(2.0, modified["fuel_flow"] * (1.0 - 0.22 * sev))
            modified["injection_timing"] += 3.8 * sev
            modified["vibration"] += 1.4 * sev
            modified["rpm"] = max(800.0, modified["rpm"] * (1.0 - 0.07 * sev))
            
            health_penalty = 38.0 * sev

            if sev > 0.5:
                component_status["injector"] = "CRITICAL"
                component_status["cylinder"] = "WARNING"
            elif sev > 0.2:
                component_status["injector"] = "WARNING"

        elif self.active_fault == FaultType.COMBUSTION_INSTABILITY:
            # Dynamic cycle-to-cycle turbulence and flame front instability
            omega = 12.0
            fluc = math.sin(omega * t) * (150.0 * sev)
            modified["rpm"] = max(800.0, modified["rpm"] + fluc)
            modified["egt"] += math.cos(omega * t) * (50.0 * sev)
            modified["vibration"] += 1.9 * sev
            modified["fuel_flow"] *= (1.0 + 0.08 * math.sin(t * 8.0) * sev)
            
            health_penalty = 40.0 * sev

            if sev > 0.5:
                component_status["cylinder"] = "CRITICAL"
                component_status["exhaust"] = "WARNING"
            elif sev > 0.2:
                component_status["cylinder"] = "WARNING"

        elif self.active_fault == FaultType.OVERHEATING:
            # Blocked oil cooler or lost airflow
            modified["cht"] += 75.0 * sev
            modified["egt"] += 55.0 * sev
            modified["oil_temperature"] += 40.0 * sev
            # High temp thins oil, causing lower oil pressure
            modified["oil_pressure"] = max(0.8, modified["oil_pressure"] * (1.0 - 0.35 * sev))
            
            health_penalty = 65.0 * sev

            if sev > 0.5:
                component_status["cylinder"] = "CRITICAL"
                component_status["engine_block"] = "CRITICAL"
                component_status["oil_system"] = "WARNING"
            elif sev > 0.2:
                component_status["cylinder"] = "WARNING"
                component_status["engine_block"] = "WARNING"

        elif self.active_fault == FaultType.ABNORMAL_VIBRATION:
            # Mechanical bearing wear / propeller unbalance
            # High vibration spikes with minimal initial combustion change
            modified["vibration"] += 3.6 * sev
            # Long-term bearing wear slightly drags RPM
            modified["rpm"] = max(800.0, modified["rpm"] - 75.0 * sev)
            
            health_penalty = 50.0 * sev

            if sev > 0.5:
                component_status["crankshaft"] = "CRITICAL"
                component_status["engine_block"] = "WARNING"
            elif sev > 0.2:
                component_status["crankshaft"] = "WARNING"

        elif self.active_fault == FaultType.BATTERY_DEGRADATION:
            # Alternator diode failure / cell collapse
            modified["alternator_voltage"] = max(0.0, modified["alternator_voltage"] * (1.0 - 0.45 * sev))
            modified["battery_voltage"] = max(9.8, modified["battery_voltage"] - (3.4 * sev))
            
            health_penalty = 30.0 * sev

            if sev > 0.5:
                component_status["sensors"] = "WARNING"
                component_status["engine_block"] = "WARNING"

        elif self.active_fault in [FaultType.SENSOR_DRIFT, FaultType.SENSOR_FAILURE]:
            # Critical note: As per user specification (Section 11):
            # "The underlying simulated engine should remain healthy.
            # The Digital Twin should compare: Physics Expected vs Sensor and identify possible sensor drift."
            # Therefore, the underlying physical state and engine health remain unaffected!
            health_penalty = 0.0
            
            if sev > 0.4:
                component_status["sensors"] = "CRITICAL" if self.active_fault == FaultType.SENSOR_FAILURE else "WARNING"

        return modified, health_penalty, component_status
