# AeroTwin-X: AI-Enabled Real-Time Digital Twin System for MALE UAV Aero Piston Engines

Developed as an independent engineering solution for real-time health monitoring, fault prediction, and mission reliability of MALE UAV aero piston engines.

AeroTwin-X is a full-stack, physics-informed, AI-enabled Digital Twin platform for aero piston engines (Rotax 914 / Lycoming IO-360 class) used in Medium Altitude Long Endurance (MALE) Unmanned Aerial Vehicles (UAVs).

---

## System Architecture

```text
User Controls / Scenarios
           ↓
Engine Physics Model (Thermodynamics, ISA Atmosphere, Constant-Speed Propeller)
           ↓
Engine State (21 parameters: RPM, CHT, EGT, Oil Press/Temp, Fuel Flow, Vibration, etc.)
           ↓
Sensor Simulation (Configurable Gaussian Noise: 0.02, Sensor Drift Bias, Sensor Failure)
           ↓
Telemetry Stream (WebSocket /ws/telemetry/{engine_id} @ 10 Hz)
           ↓
Digital Twin Nominal Physics (Expected RPM, EGT, CHT, Oil Press, Vibration)
           ↓
Residual Analysis (Δ = Actual - Expected)
           ↓
AI/ML Layer (Isolation Forest Anomaly Detection → Random Forest Fault Classification → RUL Regression)
           ↓
Mission Risk Engine (Profile Duration vs RUL Compatibility)
           ↓
Glass-Cockpit Dashboard (Animated Engine Cutaway, Circular Gauges, Residuals, Scenarios, Mission Demonstration)
```

---

## Key Features

1. **Continuous Simulation Loop**:
   - High-frequency simulation loop runs at **10 Hz** for smooth mechanical visual motion.
   - Low-frequency AI inference loop runs at **1–2 Hz** to prevent excessive inference overhead while delivering real-time health intelligence.
2. **21-Parameter Complete Engine State**:
   - Core: `rpm`, `throttle`, `load`, `cht`, `egt`, `oil_pressure`, `oil_temperature`, `fuel_flow`, `vibration`, `battery_voltage`, `alternator_voltage`, `injection_timing`, `altitude`, `ambient_temperature`, `engine_state`.
   - Intelligence: `health_score`, `degradation_level`, `anomaly_score`, `fault_type`, `rul_hours`, `failure_probability`, `mission_risk`, `maintenance_recommendation`.
3. **9 Operating States**:
   - `OFF`, `STARTING`, `IDLE`, `TAKEOFF`, `CLIMB`, `CRUISE`, `HIGH_LOAD`, `DESCENT`, `LANDING`.
4. **9 Supported Fault Modes with Gradual Severity Progression**:
   - `MISFIRE`
   - `INJECTOR_ABNORMALITY`
   - `LUBRICATION_DEGRADATION`
   - `SENSOR_DRIFT`
   - `SENSOR_FAILURE`
   - `COMBUSTION_INSTABILITY`
   - `OVERHEATING`
   - `ABNORMAL_VIBRATION`
   - `BATTERY_DEGRADATION`
5. **Sensor Drift Decoupling**:
   - In `SENSOR_DRIFT`, the underlying engine physics remains completely healthy while the designated sensor reading drifts, allowing the Digital Twin to flag sensor calibration anomalies.
6. **Simulation Speeds**:
   - `0.25x`, `0.5x`, `1.0x`, `2.0x`, `5.0x`, `10.0x`.
7. **Cockpit Visualization**:
   - Animated SVG cutaway with RPM-locked crankshaft and propeller rotation, reciprocating piston with 4-stroke combustion glow, pressurized oil circuit, and hot exhaust gas plume.
   - Live subsystem status highlighting (`NORMAL`, `WARNING`, `CRITICAL`).
   - 7 precision glass-cockpit dials (RPM, CHT, EGT, Oil Press, Oil Temp, Fuel Flow, Vibration).
   - Centered residual divergence bars (Actual vs Expected).
8. **One-Click 13-Stage Mission Demonstration Orchestrator**:
   - Automates the full operational validation narrative from cold start $\to$ healthy cruise $\to$ gradual lubrication degradation $\to$ residual divergence $\to$ AI anomaly detection $\to$ fault classification $\to$ RUL drop $\to$ mission risk escalation $\to$ maintenance recommendation $\to$ historical replay review.

---

## Directory Structure

```text
aerotwin-x/
├── backend/
│   ├── app/
│   │   ├── simulator/
│   │   │   ├── engine_state.py
│   │   │   ├── physics_engine.py
│   │   │   ├── sensor_model.py
│   │   │   ├── fault_injection.py
│   │   │   ├── scenario_manager.py
│   │   │   ├── simulation_controller.py
│   │   │   └── engine_simulator.py
│   │   ├── digital_twin/
│   │   │   └── digital_twin.py
│   │   ├── ai/
│   │   │   ├── anomaly_detector.py
│   │   │   ├── fault_classifier.py
│   │   │   └── rul_estimator.py
│   │   ├── mission/
│   │   │   ├── mission_risk_engine.py
│   │   │   └── mission_replay.py
│   │   ├── api/
│   │   │   ├── routes.py
│   │   │   └── websocket.py
│   │   └── main.py
│   └── tests/
│       ├── test_physics.py
│       ├── test_sensors.py
│       ├── test_faults_ai.py
│       └── test_api.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── simulation/
│   │   │       ├── EngineVisualization.jsx
│   │   │       ├── SimulationControls.jsx
│   │   │       ├── EngineGauge.jsx
│   │   │       ├── TelemetryPanel.jsx
│   │   │       ├── FaultControl.jsx
│   │   │       ├── EngineStatus.jsx
│   │   │       ├── ActualVsExpected.jsx
│   │   │       └── SimulationTimeline.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
└── run_aerotwin.ps1
```

---

## How to Run

### Quick Launch (PowerShell)
```powershell
cd C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x
.\run_aerotwin.ps1
```

### Manual Launch

**1. Backend:**
```powershell
cd C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x\backend
$env:PYTHONPATH = "C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation: `http://localhost:8000/docs`

**2. Frontend:**
```powershell
cd C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x\frontend
npm run dev
```
Dashboard URL: `http://localhost:5173`

**3. Run Test Suite:**
```powershell
cd C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x\backend
$env:PYTHONPATH = "C:\Users\dhara\.gemini\antigravity\scratch\aerotwin-x\backend"
python -m pytest tests
```

---

## AeroTwin-X AI Copilot (Gemini)

A new "AeroTwin-X AI Copilot" panel appears at the bottom of the Output Panel.
It sends the engineer's question, together with the current live engine
state from the existing simulation/digital-twin controller, to Google's
Gemini API through the FastAPI backend — the frontend never talks to
Gemini directly and never sees the API key.

**Setup:**
```powershell
cd backend
pip install httpx python-dotenv
copy .env.example .env
# then edit .env and set GEMINI_API_KEY=your_new_api_key_here
```

`.env` is already excluded via `.gitignore` — never commit it.

Endpoint added: `POST /api/ai/chat` with body `{"message": "..."}`.
