import React, { useState } from 'react';
import { ShieldCheck, PlayCircle, History } from 'lucide-react';

export default function SimulationTimeline({
  onLoadScenario,
  onStartDemoSequence,
  onStopDemoSequence,
  demoStage = 0,
  demoDescription = '',
  onReplaySelect,
}) {
  const [selectedScenario, setSelectedScenario] = useState('healthy_cruise');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayFrames, setReplayFrames] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);

  const scenarioOptions = [
    { key: 'healthy_cruise', name: '1. Healthy Cruise (15,000 ft, Nominal)' },
    { key: 'high_temp_mission', name: '2. High Temperature Mission (45°C OAT)' },
    { key: 'lubrication_degradation', name: '3. Lubrication Degradation' },
    { key: 'misfire', name: '4. Cylinder Misfire Roughness' },
    { key: 'injector_abnormality', name: '5. Injector Fuel Abnormality' },
    { key: 'overheating', name: '6. Overheating Climb' },
    { key: 'sensor_drift', name: '7. Sensor Drift (EGT isolated bias)' },
    { key: 'abnormal_vibration', name: '8. Abnormal Bearing / Propeller Vibration' },
  ];

  const demoStagesList = Array.from({ length: 13 }, (_, i) => i + 1);

  const fetchReplayData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/simulator/replay?limit=200');
      if (res.ok) {
        const data = await res.json();
        setReplayFrames(data.history || []);
        if (data.history && data.history.length > 0) {
          setReplayIndex(data.history.length - 1);
          setIsReplaying(true);
        }
      }
    } catch (e) {
      console.error('Failed to load replay history', e);
    }
  };

  const handleReplaySlider = (idx) => {
    setReplayIndex(idx);
    if (replayFrames[idx] && onReplaySelect) {
      onReplaySelect(replayFrames[idx]);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col justify-between gap-4 bg-white border border-slate-200 shadow-sm h-full w-full">
      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            DRDO-Oriented Demonstration Controller
          </h4>
        </div>
        <button
          onClick={onStartDemoSequence}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          <PlayCircle className="w-3.5 h-3.5 fill-current" />
          Start Mission Demo
        </button>
      </div>

      {/* Main Body Content - Stretches vertically to fill panel */}
      <div className="flex-1 flex flex-col justify-center gap-4">
        {/* 13-Stage Active Demo Tracker */}
        {demoStage > 0 && (
          <div className="bg-cyan-50/60 p-3 rounded-lg border border-cyan-200 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-cyan-800 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-ping" />
                DEMO STEP {demoStage} / 13
              </span>
              <button
                onClick={onStopDemoSequence}
                className="text-[11px] text-slate-500 hover:text-rose-600 font-mono underline"
              >
                Abort
              </button>
            </div>
            <p className="text-xs text-slate-700 font-mono bg-white p-2 rounded border border-cyan-200 truncate">
              {demoDescription}
            </p>
            <div className="grid grid-cols-13 gap-1 pt-1">
              {demoStagesList.map((st) => (
                <div
                  key={st}
                  className={`h-2 rounded-sm transition-all ${
                    demoStage === st
                      ? 'bg-cyan-600 ring-2 ring-cyan-300'
                      : demoStage > st
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Mission Scenario Selection Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Select Mission Scenario
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 truncate"
            >
              {scenarioOptions.map((sc) => (
                <option key={sc.key} value={sc.key}>
                  {sc.name}
                </option>
              ))}
            </select>
            <button
  onClick={() => onLoadScenario(selectedScenario)}
  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95 whitespace-nowrap"
>
  Start Scenario
</button>
          </div>
        </div>
      </div>

      {/* Bottom Mission Incident Replay Box - Pushed to exact bottom */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-600 font-semibold">
            <History className="w-4 h-4 text-cyan-600" />
            <span>MISSION INCIDENT REPLAY</span>
          </div>
          <button
            onClick={fetchReplayData}
            className="text-xs font-mono text-cyan-600 hover:text-cyan-700 font-bold underline"
          >
            {isReplaying ? 'Refresh' : 'Load Replay'}
          </button>
        </div>

        {isReplaying && replayFrames.length > 0 ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex justify-between text-xs font-mono text-slate-500">
              <span>Frame {replayIndex + 1}/{replayFrames.length}</span>
              <span className="text-cyan-700 font-bold">
                Fault: {replayFrames[replayIndex]?.fault_type || 'NONE'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={replayFrames.length - 1}
              value={replayIndex}
              onChange={(e) => handleReplaySlider(parseInt(e.target.value))}
              className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded cursor-pointer"
            />
          </div>
        ) : (
          <p className="text-[11px] font-mono text-slate-400 italic">
            Click 'Load Replay' to fetch historical flight incident logs.
          </p>
        )}
      </div>
    </div>
  );
}