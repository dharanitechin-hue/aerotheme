import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    """
    Real-time anomaly detector combining an offline-calibrated Isolation Forest
    with normalized multi-sensor residual tracking.
    Evaluates telemetry features without running heavy offline training.
    """

    def __init__(self):
        # Feature names expected
        self.feature_names = ["rpm_res", "cht_res", "egt_res", "oil_p_res", "oil_t_res", "ff_res", "vib_res"]
        
        # Calibrate baseline Isolation Forest on synthetic nominal healthy operating noise
        np.random.seed(42)
        n_samples = 800
        # Normal residuals have mean 0 with slight sensor noise
        nominal_residuals = np.random.normal(
            loc=0.0,
            scale=[1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
            size=(n_samples, 7)
        )
        self.model = IsolationForest(
            n_estimators=50,
            contamination=0.02,
            random_state=42,
            n_jobs=1
        )
        self.model.fit(nominal_residuals)
        
        # Calculate baseline score offset
        base_scores = self.model.score_samples(nominal_residuals)
        self.baseline_score_mean = float(np.mean(base_scores))
        self.baseline_score_std = float(np.std(base_scores))

    def detect(self, z_scores: Dict[str, float]) -> float:
        """
        Calculates a smooth anomaly score [0.0 to 1.0].
        0.0 = completely healthy nominal
        0.5 = abnormal trend
        1.0 = critical anomaly
        """
        # Vector of normalized residuals
        feat_vector = np.array([[
            z_scores.get("rpm", 0.0),
            z_scores.get("cht", 0.0),
            z_scores.get("egt", 0.0),
            z_scores.get("oil_pressure", 0.0),
            z_scores.get("oil_temperature", 0.0),
            z_scores.get("fuel_flow", 0.0),
            z_scores.get("vibration", 0.0)
        ]])

        # Fast inference with Isolation Forest
        raw_score = self.model.score_samples(feat_vector)[0]
        
        # Isolation Forest score is typically between -0.8 (extreme anomaly) and -0.4 (normal)
        # Transform into normalized [0, 1] anomaly score
        if raw_score >= -0.42:
            iso_anomaly = 0.05
        else:
            iso_anomaly = min(1.0, max(0.0, (-0.42 - raw_score) / 0.35))

        # Also calculate Euclidean norm of normalized residuals (Mahalanobis proxy)
        norm_mag = np.linalg.norm(feat_vector[0])
        # A norm_mag > 3.0 indicates significant deviation (3 sigma)
        dist_anomaly = min(1.0, max(0.0, norm_mag / 6.0))

        # Combined smooth anomaly score
        combined_score = 0.4 * iso_anomaly + 0.6 * dist_anomaly
        return round(float(min(1.0, max(0.0, combined_score))), 3)
