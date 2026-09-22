from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timezone


class OperatingState(str, Enum):
    OFF = "OFF"
    STARTING = "STARTING"
    IDLE = "IDLE"
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE = "CRUISE"
    HIGH_LOAD = "HIGH_LOAD"
    DESCENT = "DESCENT"
    LANDING = "LANDING"


class FaultType(str, Enum):
    NONE = "NONE"
    MISFIRE = "MISFIRE"
    INJECTOR_ABNORMALITY = "INJECTOR_ABNORMALITY"
    LUBRICATION_DEGRADATION = "LUBRICATION_DEGRADATION"
    SENSOR_DRIFT = "SENSOR_DRIFT"
    SENSOR_FAILURE = "SENSOR_FAILURE"
    COMBUSTION_INSTABILITY = "COMBUSTION_INSTABILITY"
    OVERHEATING = "OVERHEATING"
    ABNORMAL_VIBRATION = "ABNORMAL_VIBRATION"
    BATTERY_DEGRADATION = "BATTERY_DEGRADATION"


class TargetSensor(str, Enum):
    EGT = "egt"
    CHT = "cht"
    OIL_PRESSURE = "oil_pressure"
    OIL_TEMPERATURE = "oil_temperature"
    RPM = "rpm"
    VIBRATION = "vibration"


class ExpectedEngineValues(BaseModel):
    rpm: float = 0.0
    cht: float = 25.0
    egt: float = 25.0
    oil_pressure: float = 0.0
    oil_temperature: float = 25.0
    fuel_flow: float = 0.0
    vibration: float = 0.0


class EngineResiduals(BaseModel):
    rpm: float = 0.0
    cht: float = 0.0
    egt: float = 0.0
    oil_pressure: float = 0.0
    oil_temperature: float = 0.0
    fuel_flow: float = 0.0
    vibration: float = 0.0


class EngineState(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    engine_id: str = "ENG-001"
    
    # Core operating parameters
    rpm: float = 0.0
    throttle: float = 0.0  # 0.0 to 1.0
    load: float = 0.0      # 0.0 to 1.0
    cht: float = 25.0      # Cylinder Head Temp in °C
    egt: float = 25.0      # Exhaust Gas Temp in °C
    oil_pressure: float = 0.0  # bar
    oil_temperature: float = 25.0  # °C
    fuel_flow: float = 0.0  # L/h
    vibration: float = 0.0  # mm/s RMS
    battery_voltage: float = 12.6  # V
    alternator_voltage: float = 0.0  # V
    injection_timing: float = 20.0  # °BTDC
    altitude: float = 0.0  # ft
    ambient_temperature: float = 25.0  # °C
    
    # Engine Operating State
    engine_state: OperatingState = OperatingState.OFF
    
    # Health, degradation & AI parameters
    health_score: float = 100.0  # 0 to 100%
    degradation_level: float = 0.0  # 0.0 to 1.0
    anomaly_score: float = 0.0  # 0.0 to 1.0
    fault_type: FaultType = FaultType.NONE
    fault_severity: float = 0.0  # 0.0 to 1.0
    rul_hours: float = 50.0  # Estimated flight hours remaining
    rul_confidence: float = 0.95
    rul_lower_bound: float = 45.0
    rul_upper_bound: float = 55.0
    failure_probability: float = 0.0  # 0 to 100%
    mission_risk: str = "LOW"  # LOW, MEDIUM, HIGH, CRITICAL
    maintenance_recommendation: str = "Engine operational. Normal monitoring."
    
    # Digital Twin Expected & Residual values
    expected: ExpectedEngineValues = Field(default_factory=ExpectedEngineValues)
    residuals: EngineResiduals = Field(default_factory=EngineResiduals)
    
    # Component status indicators (NORMAL, WARNING, CRITICAL)
    component_status: Dict[str, str] = Field(default_factory=lambda: {
        "engine_block": "NORMAL",
        "cylinder": "NORMAL",
        "injector": "NORMAL",
        "oil_system": "NORMAL",
        "exhaust": "NORMAL",
        "crankshaft": "NORMAL",
        "sensors": "NORMAL"
    })

    model_config = ConfigDict(use_enum_values=True)
