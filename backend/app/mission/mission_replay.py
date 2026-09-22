from collections import deque
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class MissionReplayBuffer:
    """
    Circular telemetry and inference recording buffer for post-incident review,
    trend analysis, and mission replay.
    """

    def __init__(self, max_capacity: int = 3000):
        self.max_capacity = max_capacity
        self.buffer = deque(maxlen=max_capacity)
        self.events: List[Dict[str, Any]] = []

    def record_frame(self, state_dict: Dict[str, Any]):
        """Append an engine state snapshot to the replay timeline."""
        snapshot = {
            "timestamp": state_dict.get("timestamp", datetime.now(timezone.utc).isoformat()),
            "rpm": state_dict.get("rpm", 0.0),
            "throttle": state_dict.get("throttle", 0.0),
            "load": state_dict.get("load", 0.0),
            "cht": state_dict.get("cht", 0.0),
            "egt": state_dict.get("egt", 0.0),
            "oil_pressure": state_dict.get("oil_pressure", 0.0),
            "oil_temperature": state_dict.get("oil_temperature", 0.0),
            "fuel_flow": state_dict.get("fuel_flow", 0.0),
            "vibration": state_dict.get("vibration", 0.0),
            "altitude": state_dict.get("altitude", 0.0),
            "health_score": state_dict.get("health_score", 100.0),
            "anomaly_score": state_dict.get("anomaly_score", 0.0),
            "fault_type": state_dict.get("fault_type", "NONE"),
            "fault_severity": state_dict.get("fault_severity", 0.0),
            "rul_hours": state_dict.get("rul_hours", 50.0),
            "failure_probability": state_dict.get("failure_probability", 0.0),
            "mission_risk": state_dict.get("mission_risk", "LOW"),
            "expected": state_dict.get("expected", {}),
            "residuals": state_dict.get("residuals", {})
        }
        self.buffer.append(snapshot)

    def log_event(self, description: str, fault_type: str, severity: float):
        """Record a notable milestone or incident tag."""
        self.events.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": description,
            "fault_type": fault_type,
            "severity": severity
        })

    def get_history(self, limit: int = 200) -> List[Dict[str, Any]]:
        """Retrieve recent frames for dashboard charting and replay."""
        history = list(self.buffer)
        if limit and len(history) > limit:
            return history[-limit:]
        return history

    def clear(self):
        """Reset replay history."""
        self.buffer.clear()
        self.events.clear()
