import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';

import EngineCanvas from './components/three/EngineCanvas';
import EngineGauge from './components/simulation/EngineGauge';
import SimulationControls from './components/simulation/SimulationControls';
import FaultControl from './components/simulation/FaultControl';
import EngineStatus from './components/simulation/EngineStatus';
import ActualVsExpected from './components/simulation/ActualVsExpected';
import TelemetryPanel from './components/simulation/TelemetryPanel';
import SimulationTimeline from './components/simulation/SimulationTimeline';
import AeroTwinAICopilot from './components/simulation/AeroTwinAICopilot';

export default function App() {
  const [engineState, setEngineState] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [demoStage, setDemoStage] = useState(0);
  const [demoDescription, setDemoDescription] = useState('Ready');
  const [isPaused, setIsPaused] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Establish live high-frequency WebSocket connection (10-20 Hz)
  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/ws/telemetry/ENG-001`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!isReplaying) {
            setEngineState(data);
          }
        } catch (e) {
          console.error('Error parsing telemetry payload', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setWsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
    }
  };

  useEffect(() => {
    connectWebSocket();

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/simulator/scenarios');
        if (res.ok) {
          const data = await res.json();
          setDemoStage(data.demo_stage || 0);
          setDemoDescription(data.demo_description || 'Ready');
        }
      } catch (e) {
        // Backend not ready yet
      }
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isReplaying]);

  const sendWsAction = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleControl = async (action) => {
    setIsReplaying(false);
    if (action === 'pause') setIsPaused(true);
    if (action === 'resume' || action === 'start') setIsPaused(false);

    sendWsAction({ action });
    try {
      await fetch('http://localhost:8000/api/simulator/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleParamChange = async (key, val) => {
    setIsReplaying(false);
    if (key === 'speed_multiplier') {
      setSpeedMultiplier(val);
    }

    sendWsAction({ action: `set_${key}`, value: val });
    try {
      await fetch('http://localhost:8000/api/simulator/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: val }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleInjectFault = async (faultData) => {
    setIsReplaying(false);
    sendWsAction({
      action: 'inject_fault',
      ...faultData,
    });
    try {
      await fetch('http://localhost:8000/api/simulator/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faultData),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearFaults = async () => {
    sendWsAction({ action: 'clear_faults' });
    try {
      await fetch('http://localhost:8000/api/simulator/fault/clear', {
        method: 'POST',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNoiseChange = (noise) => {
    sendWsAction({ action: 'set_noise_level', value: noise });
  };

  const handleLoadScenario = async (key) => {
    setIsReplaying(false);
    sendWsAction({ action: 'load_scenario', value: key });
    try {
      await fetch('http://localhost:8000/api/simulator/scenario/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_key: key }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartDemoSequence = async () => {
    setIsReplaying(false);
    sendWsAction({ action: 'start_demo_sequence' });
    try {
      await fetch('http://localhost:8000/api/simulator/scenario/demo-sequence/start', {
        method: 'POST',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopDemoSequence = async () => {
    try {
      await fetch('http://localhost:8000/api/simulator/scenario/demo-sequence/stop', {
        method: 'POST',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReplaySelect = (frame) => {
    setIsReplaying(true);
    setEngineState(frame);
  };

  const isRunning = engineState?.engine_state && engineState.engine_state !== 'OFF';

  return (
    <div className="aero-app min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <main className="aero-main flex-1">
        {/* Top Navigation Header */}
        <header className="aero-topbar bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm sticky top-0 z-50">
          <div className="aero-brand flex items-center space-x-3">
            <div className="aero-brand-mark p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Activity size={18} />
            </div>
            <div>
              <div className="aero-brand-name font-bold text-slate-900 tracking-wide">AEROTWIN-X</div>
              <div className="aero-brand-sub text-xs text-slate-500 font-medium">ENGINE DIGITAL TWIN</div>
            </div>
          </div>

          <div className="aero-page-title hidden md:flex flex-col text-center">
            <span className="text-xs font-semibold text-slate-400 tracking-wider">ENGINE MONITOR</span>
            <strong className="text-sm font-semibold text-slate-700">Real-time Digital Twin Workspace</strong>
          </div>

          <div className="aero-top-status flex items-center space-x-4">
            {isReplaying && (
              <button
                onClick={() => setIsReplaying(false)}
                className="replay-exit text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded hover:bg-amber-100 font-semibold transition-colors"
              >
                EXIT REPLAY
              </button>
            )}
            <div
              className={`connection-status flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                wsConnected
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`connection-dot w-2 h-2 rounded-full mr-2 ${
                  wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              {wsConnected ? 'CONNECTED · 10 HZ' : 'OFFLINE'}
            </div>
            <div className="engine-id-status text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-md font-mono">
              ENGINE <b>{engineState?.engine_id || 'ENG-001'}</b>
            </div>
          </div>
        </header>

        {/* Outer Workspace Content */}
        <div className="aero-content p-4 max-w-[1920px] w-full mx-auto space-y-4">
          
          {/* Top Engine Banner */}
          <section className="aero-commandbar bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="commandbar-title">
              <span className="section-kicker text-xs font-bold text-sky-600 tracking-wider block uppercase">
                ENGINE PROFILE
              </span>
              <strong className="text-slate-900 font-semibold">
                {engineState?.engine_id || 'ENG-001'} · Representative Aero Piston Engine
              </strong>
            </div>
            <div className="commandbar-facts flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">SIMULATION</span>
                <b className="text-slate-800 font-bold">{engineState?.engine_state || 'OFF'}</b>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">AI INFERENCE</span>
                <b className="ok text-emerald-600 font-bold">ACTIVE</b>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">DIGITAL TWIN</span>
                <b className="ok text-emerald-600 font-bold">SYNCED</b>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">MISSION RISK</span>
                <b className="text-slate-800 font-bold">{engineState?.mission_risk ?? '—'}</b>
              </div>
            </div>
          </section>

          {/* Grid Layout System */}
          <section className="aero-workspace space-y-4">
            
            {/* ROW 1: 3D Engine Viewport + Gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[420px] flex flex-col">
                <EngineCanvas state={engineState} isRunning={isRunning} />
              </div>
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between">
                <div className="gauge-grid grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <EngineGauge label="RPM" value={engineState?.rpm} unit="RPM" min={0} max={6000} warnHigh={5400} critHigh={5800} precision={0} />
                  <EngineGauge label="EGT" value={engineState?.egt} unit="°C" min={0} max={850} warnHigh={720} critHigh={790} precision={0} />
                  <EngineGauge label="CHT" value={engineState?.cht} unit="°C" min={0} max={250} warnHigh={195} critHigh={225} precision={0} />
                  <EngineGauge label="Oil Press" value={engineState?.oil_pressure} unit="bar" min={0} max={8.0} warnLow={2.8} critLow={1.8} warnHigh={6.0} critHigh={6.8} precision={2} />
                  <EngineGauge label="Oil Temp" value={engineState?.oil_temperature} unit="°C" min={0} max={150} warnHigh={110} critHigh={125} precision={0} />
                  <EngineGauge label="Fuel Flow" value={engineState?.fuel_flow} unit="L/h" min={0} max={35} warnHigh={28} critHigh={32} precision={1} />
                  <EngineGauge label="Vibration" value={engineState?.vibration} unit="mm/s" min={0} max={5.0} warnHigh={2.2} critHigh={3.5} precision={2} />
                </div>
              </div>
            </div>

            {/* ROW 2: Actual Vs Expected (Left 7) + AI Health Panel (Right 5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 flex flex-col h-full">
                <ActualVsExpected state={engineState} />
              </div>
              <div className="lg:col-span-5 flex flex-col h-full">
                <EngineStatus state={engineState} />
              </div>
            </div>

            {/* ROW 3: Telemetry Panel (Left 7) + Controls (Right 5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 flex flex-col h-full">
                <TelemetryPanel state={engineState} />
              </div>
              <div className="lg:col-span-5 flex flex-col h-full">
                <SimulationControls
                  state={engineState}
                  isRunning={isRunning}
                  isPaused={isPaused}
                  speedMultiplier={speedMultiplier}
                  onControl={handleControl}
                  onParamChange={handleParamChange}
                />
              </div>
            </div>

            {/* ROW 4: Fault Testing (Left 7) + Scenario Controller (Right 5) - Vertically Aligned */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              <div className="lg:col-span-7 flex flex-col h-full">
                <FaultControl
                  state={engineState}
                  onInjectFault={handleInjectFault}
                  onClearFaults={handleClearFaults}
                  onNoiseChange={handleNoiseChange}
                />
              </div>
              <div className="lg:col-span-5 flex flex-col h-full">
                <SimulationTimeline
                  onLoadScenario={handleLoadScenario}
                  onStartDemoSequence={handleStartDemoSequence}
                  onStopDemoSequence={handleStopDemoSequence}
                  demoStage={demoStage}
                  demoDescription={demoDescription}
                  onReplaySelect={handleReplaySelect}
                />
              </div>
            </div>

            {/* ROW 5: AeroTwin-X AI Copilot (bottom of Output Panel) */}
            <div className="grid grid-cols-1 gap-4">
              <AeroTwinAICopilot />
            </div>

          </section>
        </div>
      </main>
    </div>
  );
}