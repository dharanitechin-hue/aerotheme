import datetime
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .engine_state import (
    EngineState, OperatingState, FaultType, TargetSensor,
    ExpectedEngineValues, EngineResiduals
)
from .physics_engine import PhysicsEngine
from .sensor_model import SensorModel
from .fault_injection import FaultInjectionSystem
from app.digital_twin.digital_twin import DigitalTwin
from app.ai.anomaly_detector import AnomalyDetector
from app.ai.fault_classifier import FaultClassifier
from app.ai.rul_estimator import RULEstimator
from app.mission.mission_risk_engine import MissionRiskEngine
from app.mission.mission_replay import MissionReplayBuffer


class EngineSimulator:
    """
    Unified Engine Simulator binding the physical dynamics, fault injection,
    sensor noise layer, Digital Twin expected values, AI inference pipeline,
    and mission risk assessment.
    """

    def __init__(self, engine_id: str = "ENG-001"):
        self.engine_id = engine_id
        
        # Subsystems
        self.physics = PhysicsEngine()
        self.sensor_model = SensorModel(noise_level=0.02)
        self.fault_system = FaultInjectionSystem()
        self.digital_twin = DigitalTwin(self.physics)
        self.anomaly_detector = AnomalyDetector()
        self.fault_classifier = FaultClassifier()
        self.rul_estimator = RULEstimator(nominal_life_hours=50.0)
        self.mission_risk_engine = MissionRiskEngine(default_mission_duration_hours=10.0)
        self.replay_buffer = MissionReplayBuffer(max_capacity=3000)

        # Operating controls
        self.throttle: float = 0.0
        self.load: float = 0.0
        self.altitude: float = 0.0
        self.ambient_temperature: float = 25.0
        self.engine_state: OperatingState = OperatingState.OFF

        # Internal true physical state
        self.physical_state: Dict[str, float] = {
            "rpm": 0.0,
            "cht": 25.0,
            "egt": 25.0,
            "oil_pressure": 0.0,
            "oil_temperature": 25.0,
            "fuel_flow": 0.0,
            "vibration": 0.0,
            "battery_voltage": 12.6,
            "alternator_voltage": 0.0,
            "injection_timing": 18.0
        }

        # Cached AI predictions (updated at low frequency 1-2 Hz)
        self.health_score: float = 100.0
        self.degradation_level: float = 0.0
        self.anomaly_score: float = 0.0
        self.predicted_fault: str = "NONE"
        self.fault_confidence: float = 0.98
        self.rul_hours: float = 50.0
        self.rul_confidence: float = 0.95
        self.rul_lower: float = 45.0
        self.rul_upper: float = 55.0
        self.failure_probability: float = 0.5
        self.mission_risk: str = "LOW"
        self.maintenance_advisory: str = "Engine operational. Normal monitoring."
        self.component_status: Dict[str, str] = {
            "engine_block": "NORMAL",
            "cylinder": "NORMAL",
            "injector": "NORMAL",
            "oil_system": "NORMAL",
            "exhaust": "NORMAL",
            "crankshaft": "NORMAL",
            "sensors": "NORMAL"
        }

        # Expected and residual caches
        self.expected = ExpectedEngineValues()
        self.residuals = EngineResiduals()
        self.z_scores: Dict[str, float] = {}

    def reset(self):
        """Full reset to cold and dark engine state."""
        self.throttle = 0.0
        self.load = 0.0
        self.altitude = 0.0
        self.ambient_temperature = 25.0
        self.engine_state = OperatingState.OFF
        self.fault_system.clear_faults()
        self.sensor_model.reset_sensor_faults()
        
        self.physical_state = {
            "rpm": 0.0,
            "cht": 25.0,
            "egt": 25.0,
            "oil_pressure": 0.0,
            "oil_temperature": 25.0,
            "fuel_flow": 0.0,
            "vibration": 0.0,
            "battery_voltage": 12.6,
            "alternator_voltage": 0.0,
            "injection_timing": 18.0
        }
        self.health_score = 100.0
        self.degradation_level = 0.0
        self.anomaly_score = 0.0
        self.predicted_fault = "NONE"
        self.rul_hours = 50.0
        self.failure_probability = 0.2
        self.mission_risk = "LOW"
        self.maintenance_advisory = "Engine operational. Normal monitoring."
        self.expected = self.physics.calculate_expected_healthy_values(0, 0, 0, 25, OperatingState.OFF)
        self.residuals = EngineResiduals()

    def warm_start(self):
        """Immediately converges physical state to steady-state expected values to avoid warmup lag."""
        exp = self.physics.calculate_expected_healthy_values(
            self.throttle, self.load, self.altitude, self.ambient_temperature, self.engine_state
        )
        self.physical_state["rpm"] = exp.rpm
        self.physical_state["cht"] = exp.cht
        self.physical_state["egt"] = exp.egt
        self.physical_state["oil_pressure"] = exp.oil_pressure
        self.physical_state["oil_temperature"] = exp.oil_temperature
        self.physical_state["fuel_flow"] = exp.fuel_flow
        self.physical_state["vibration"] = exp.vibration
        if exp.rpm > 1200:
            self.physical_state["battery_voltage"] = 14.1
            self.physical_state["alternator_voltage"] = 14.2

    def step(self, dt: float, run_ai_inference: bool = False) -> EngineState:
        """
        Executes one simulation step.
        - dt: time elapsed in seconds (scaled by simulation speed)
        - run_ai_inference: whether to evaluate the lower-frequency ML pipeline
        """
        # 1. Physics Engine integration
        raw_physics = self.physics.step(
            dt=dt,
            current_state=self.physical_state,
            throttle=self.throttle,
            load=self.load,
            altitude_ft=self.altitude,
            ambient_temp_c=self.ambient_temperature,
            engine_state=self.engine_state
        )

        # 2. Fault Injection layer
        fault_modified_physics, health_penalty, comp_status = self.fault_system.apply_fault_physics(
            dt=dt,
            physical_state=raw_physics
        )
        self.physical_state = fault_modified_physics
        self.component_status = comp_status

        # 3. Sensor Model (applies Gaussian noise, sensor drift & sensor failure)
        sensed = self.sensor_model.apply_sensor_dynamics(
            dt=dt,
            true_values=self.physical_state,
            active_fault=self.fault_system.active_fault,
            fault_severity=self.fault_system.current_severity
        )

        # 4. Digital Twin Expected Values & Residuals
        self.expected = self.digital_twin.compute_expected(
            throttle=self.throttle,
            load=self.load,
            altitude=self.altitude,
            ambient_temp=self.ambient_temperature,
            engine_state=self.engine_state
        )
        
        self.residuals, self.z_scores, drift_suspect = self.digital_twin.analyze_residuals(
            actual=sensed,
            expected=self.expected
        )

        # 5. Low-Frequency AI / ML Pipeline
        if run_ai_inference and self.engine_state != OperatingState.OFF:
            # Anomaly Detection
            self.anomaly_score = self.anomaly_detector.detect(self.z_scores)

            # Fault Classification
            self.predicted_fault, self.fault_confidence, _ = self.fault_classifier.predict(
                residuals=self.residuals.model_dump(),
                z_scores=self.z_scores,
                anomaly_score=self.anomaly_score,
                drift_suspect=drift_suspect
            )

            # Compute Health Score (100% - penalty - degradation)
            base_health = 100.0 - health_penalty
            if self.anomaly_score > 0.3:
                base_health -= (self.anomaly_score - 0.3) * 35.0
            self.health_score = round(max(5.0, min(100.0, base_health)), 1)
            self.degradation_level = round(1.0 - (self.health_score / 100.0), 3)

            # RUL Estimation
            (
                self.rul_hours,
                self.rul_confidence,
                self.rul_lower,
                self.rul_upper,
                self.failure_probability
            ) = self.rul_estimator.estimate(
                health_score=self.health_score,
                degradation_level=self.degradation_level,
                fault_type=self.predicted_fault,
                fault_severity=self.fault_system.current_severity,
                anomaly_score=self.anomaly_score
            )

            # Mission Risk & Advisory
            self.mission_risk, self.maintenance_advisory = self.mission_risk_engine.evaluate_risk(
                rul_hours=self.rul_hours,
                health_score=self.health_score,
                failure_prob_pct=self.failure_probability,
                altitude_ft=self.altitude,
                ambient_temp_c=self.ambient_temperature,
                fault_type=self.predicted_fault,
                fault_severity=self.fault_system.current_severity
            )

        # 6. Build EngineState object
        state = EngineState(
            timestamp=datetime.now(timezone.utc).isoformat(),
            engine_id=self.engine_id,
            rpm=sensed.get("rpm", 0.0),
            throttle=round(self.throttle, 2),
            load=round(self.load, 2),
            cht=sensed.get("cht", 25.0),
            egt=sensed.get("egt", 25.0),
            oil_pressure=sensed.get("oil_pressure", 0.0),
            oil_temperature=sensed.get("oil_temperature", 25.0),
            fuel_flow=sensed.get("fuel_flow", 0.0),
            vibration=sensed.get("vibration", 0.0),
            battery_voltage=sensed.get("battery_voltage", 12.6),
            alternator_voltage=sensed.get("alternator_voltage", 0.0),
            injection_timing=sensed.get("injection_timing", 18.0),
            altitude=round(self.altitude, 0),
            ambient_temperature=round(self.ambient_temperature, 1),
            engine_state=self.engine_state,
            health_score=self.health_score,
            degradation_level=self.degradation_level,
            anomaly_score=self.anomaly_score,
            fault_type=self.fault_system.active_fault,
            fault_severity=round(self.fault_system.current_severity, 2),
            rul_hours=self.rul_hours,
            rul_confidence=self.rul_confidence,
            rul_lower_bound=self.rul_lower,
            rul_upper_bound=self.rul_upper,
            failure_probability=self.failure_probability,
            mission_risk=self.mission_risk,
            maintenance_recommendation=self.maintenance_advisory,
            expected=self.expected,
            residuals=self.residuals,
            component_status=self.component_status
        )

        # 7. Record frame to replay buffer periodically
        if run_ai_inference:
            self.replay_buffer.record_frame(state.model_dump())

        return state
