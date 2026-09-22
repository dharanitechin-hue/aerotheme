import numpy as np
from typing import Dict, Tuple, List, Optional
from sklearn.ensemble import RandomForestClassifier
from app.simulator.engine_state import FaultType


class FaultClassifier:
    """
    Random Forest multi-class fault classifier trained offline on
    characteristic aero-engine degradation signatures.
    Performs real-time low-latency inference on engineered residual vectors.
    """

    def __init__(self):
        self.fault_classes = [
            FaultType.NONE.value,
            FaultType.MISFIRE.value,
            FaultType.INJECTOR_ABNORMALITY.value,
            FaultType.LUBRICATION_DEGRADATION.value,
            FaultType.SENSOR_DRIFT.value,
            FaultType.SENSOR_FAILURE.value,
            FaultType.COMBUSTION_INSTABILITY.value,
            FaultType.OVERHEATING.value,
            FaultType.ABNORMAL_VIBRATION.value,
            FaultType.BATTERY_DEGRADATION.value
        ]
        
        # Features: [res_rpm, res_cht, res_egt, res_oil_p, res_oil_t, res_ff, res_vib, res_batt, res_alt, is_isolated_sensor]
        self._train_offline_model()

    def _train_offline_model(self):
        np.random.seed(101)
        X_train = []
        y_train = []

        samples_per_class = 150

        # Feature order:
        # 0: rpm, 1: cht, 2: egt, 3: oil_p, 4: oil_t, 5: fuel_flow, 6: vib, 7: batt, 8: alt, 9: single_sensor_isolated

        for cls in self.fault_classes:
            for _ in range(samples_per_class):
                # Baseline nominal residuals
                r_rpm = np.random.normal(0, 15)
                r_cht = np.random.normal(0, 2)
                r_egt = np.random.normal(0, 6)
                r_oil_p = np.random.normal(0, 0.08)
                r_oil_t = np.random.normal(0, 1.5)
                r_ff = np.random.normal(0, 0.4)
                r_vib = np.random.normal(0, 0.06)
                r_batt = np.random.normal(0, 0.1)
                r_alt = np.random.normal(0, 0.1)
                isolated = 0.0

                sev = np.random.uniform(0.2, 1.0)

                if cls == FaultType.NONE.value:
                    pass
                elif cls == FaultType.LUBRICATION_DEGRADATION.value:
                    r_oil_p -= (1.8 + np.random.uniform(0, 1.0)) * sev
                    r_oil_t += (20.0 + np.random.uniform(0, 20.0)) * sev
                    r_vib += (1.2 + np.random.uniform(0, 1.0)) * sev
                    r_cht += (12.0 + np.random.uniform(0, 10.0)) * sev
                elif cls == FaultType.MISFIRE.value:
                    r_rpm -= (150.0 + np.random.uniform(0, 200.0)) * sev
                    r_egt += np.random.choice([-1, 1]) * (30.0 + np.random.uniform(0, 25.0)) * sev
                    r_vib += (1.8 + np.random.uniform(0, 1.2)) * sev
                    r_ff += (1.5 + np.random.uniform(0, 1.0)) * sev
                elif cls == FaultType.INJECTOR_ABNORMALITY.value:
                    r_egt += (45.0 + np.random.uniform(0, 25.0)) * sev
                    r_ff -= (2.0 + np.random.uniform(0, 2.5)) * sev
                    r_vib += (0.8 + np.random.uniform(0, 0.6)) * sev
                elif cls == FaultType.COMBUSTION_INSTABILITY.value:
                    r_rpm += np.random.normal(0, 80) * sev
                    r_egt += np.random.normal(0, 35) * sev
                    r_vib += (1.2 + np.random.uniform(0, 0.7)) * sev
                elif cls == FaultType.OVERHEATING.value:
                    r_cht += (45.0 + np.random.uniform(0, 30.0)) * sev
                    r_egt += (30.0 + np.random.uniform(0, 25.0)) * sev
                    r_oil_t += (22.0 + np.random.uniform(0, 15.0)) * sev
                elif cls == FaultType.ABNORMAL_VIBRATION.value:
                    r_vib += (2.2 + np.random.uniform(0, 1.8)) * sev
                elif cls == FaultType.BATTERY_DEGRADATION.value:
                    r_batt -= (2.0 + np.random.uniform(0, 1.5)) * sev
                    r_alt -= (3.0 + np.random.uniform(0, 3.0)) * sev
                elif cls == FaultType.SENSOR_DRIFT.value:
                    # Isolated drift on one sensor while other signals are flat
                    r_egt += (40.0 + np.random.uniform(0, 40.0)) * sev
                    isolated = 1.0
                elif cls == FaultType.SENSOR_FAILURE.value:
                    r_egt += 300.0 * sev
                    isolated = 1.0

                X_train.append([r_rpm, r_cht, r_egt, r_oil_p, r_oil_t, r_ff, r_vib, r_batt, r_alt, isolated])
                y_train.append(cls)

        self.model = RandomForestClassifier(n_estimators=60, max_depth=10, random_state=42, n_jobs=1)
        self.model.fit(np.array(X_train), np.array(y_train))

    def predict(
        self,
        residuals: Dict[str, float],
        z_scores: Dict[str, float],
        anomaly_score: float,
        drift_suspect: Optional[str]
    ) -> Tuple[str, float, List[Dict[str, Any]]]:
        """
        Predicts the fault class and confidence probability.
        Returns:
            - predicted_fault: str
            - confidence: float (0.0 to 1.0)
            - top_features: List of contributing residual metrics for explainability
        """
        if anomaly_score < 0.20 and not drift_suspect:
            return FaultType.NONE.value, 0.98, []

        isolated_flag = 1.0 if drift_suspect is not None else 0.0

        r_batt = residuals.get("battery_voltage", 0.0)
        r_alt = residuals.get("alternator_voltage", 0.0)

        feat_vector = np.array([[
            residuals.get("rpm", 0.0),
            residuals.get("cht", 0.0),
            residuals.get("egt", 0.0),
            residuals.get("oil_pressure", 0.0),
            residuals.get("oil_temperature", 0.0),
            residuals.get("fuel_flow", 0.0),
            residuals.get("vibration", 0.0),
            r_batt,
            r_alt,
            isolated_flag
        ]])

        probs = self.model.predict_proba(feat_vector)[0]
        max_idx = int(np.argmax(probs))
        predicted = self.model.classes_[max_idx]
        confidence = float(probs[max_idx])

        # If sensor drift is isolated, override with high confidence SENSOR_DRIFT
        if drift_suspect and anomaly_score < 0.7:
            predicted = FaultType.SENSOR_DRIFT.value
            confidence = max(0.92, confidence)

        # Build explainability ranking
        ranking = [
            {"param": "Oil Pressure", "deviation": f"{residuals.get('oil_pressure', 0.0):+.2f} bar", "z": z_scores.get("oil_pressure", 0.0)},
            {"param": "Oil Temp", "deviation": f"{residuals.get('oil_temperature', 0.0):+.1f} °C", "z": z_scores.get("oil_temperature", 0.0)},
            {"param": "Vibration", "deviation": f"{residuals.get('vibration', 0.0):+.2f} mm/s", "z": z_scores.get("vibration", 0.0)},
            {"param": "CHT", "deviation": f"{residuals.get('cht', 0.0):+.1f} °C", "z": z_scores.get("cht", 0.0)},
            {"param": "EGT", "deviation": f"{residuals.get('egt', 0.0):+.1f} °C", "z": z_scores.get("egt", 0.0)},
            {"param": "RPM", "deviation": f"{residuals.get('rpm', 0.0):+.0f} RPM", "z": z_scores.get("rpm", 0.0)},
        ]
        # Sort by z-score descending
        ranking.sort(key=lambda x: x["z"], reverse=True)
        top_features = ranking[:3]

        return predicted, round(confidence, 3), top_features
