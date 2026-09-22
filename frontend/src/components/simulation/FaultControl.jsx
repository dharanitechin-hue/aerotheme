import React, { useState } from 'react';
import { AlertTriangle, Flame, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function FaultControl({ state, onInjectFault, onClearFaults, onNoiseChange }) {
  const [selectedFault, setSelectedFault] = useState('LUBRICATION_DEGRADATION');
  const [severity, setSeverity] = useState(0.85);
  const [rate, setRate] = useState(0.05);
  const [targetSensor, setTargetSensor] = useState('egt');
  const [noiseLevel, setNoiseLevel] = useState(0.02);

  const faults = [
    { key: 'LUBRICATION_DEGRADATION', name: 'Lubrication Degradation', desc: 'Oil pressure drops, temp & friction surge' },
    { key: 'MISFIRE', name: 'Cylinder Misfire', desc: 'Combustion dropouts, erratic RPM, high vibration' },
    { key: 'INJECTOR_ABNORMALITY', name: 'Injector Abnormality', desc: 'Lean fuel imbalance, timing advance, EGT rise' },
    { key: 'SENSOR_DRIFT', name: 'Sensor Drift', desc: 'Selected sensor drifts while engine physics stays healthy' },
    { key: 'SENSOR_FAILURE', name: 'Sensor Failure', desc: 'Selected sensor freezes / flatlines' },
    { key: 'COMBUSTION_INSTABILITY', name: 'Combustion Instability', desc: 'Cycle flame oscillations, roughness' },
    { key: 'OVERHEATING', name: 'Overheating', desc: 'Cooling radiator loss, rapid CHT & EGT climb' },
    { key: 'ABNORMAL_VIBRATION', name: 'Abnormal Vibration', desc: 'Bearing wear / propeller mechanical unbalance' },
    { key: 'BATTERY_DEGRADATION', name: 'Battery Degradation', desc: 'Alternator diode failure / cell voltage drop' },
  ];

  const sensors = [
    { key: 'egt', label: 'EGT (Exhaust)' },
    { key: 'cht', label: 'CHT (Cylinder Head)' },
    { key: 'oil_pressure', label: 'Oil Pressure' },
    { key: 'oil_temperature', label: 'Oil Temp' },
    { key: 'rpm', label: 'Engine RPM' },
    { key: 'vibration', label: 'Vibration' },
  ];

  const activeFault = state?.fault_type || 'NONE';
  const currentSeverity = state?.fault_severity || 0.0;
  const isFaultActive = activeFault !== 'NONE' && currentSeverity > 0.01;

  const handleInject = () => {
    onInjectFault({
      fault_type: selectedFault,
      severity: severity,
      rate: rate,
      target_sensor: targetSensor,
    });
  };

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col gap-3 bg-white border border-slate-200 shadow-sm">
      {/* Title & Active Fault Banner */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Fault Injection & Sensor Stress Testing
          </h4>
        </div>
        {isFaultActive ? (
          <span className="text-[11px] font-mono text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200 animate-pulse font-bold">
            ACTIVE: {activeFault.replace('_', ' ')} ({(currentSeverity * 100).toFixed(0)}%)
          </span>
        ) : (
          <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            SYSTEM HEALTHY
          </span>
        )}
      </div>

      {/* Fault Selection Dropdown */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-mono text-slate-500">SELECT FAULT MODE</label>
        <select
          value={selectedFault}
          onChange={(e) => setSelectedFault(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {faults.map((f) => (
            <option key={f.key} value={f.key}>
              {f.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 italic">
          {faults.find((f) => f.key === selectedFault)?.desc}
        </p>
      </div>

      {/* Target Sensor for Drift/Failure */}
      {(selectedFault === 'SENSOR_DRIFT' || selectedFault === 'SENSOR_FAILURE') && (
        <div className="flex flex-col gap-1 bg-cyan-50/60 p-2.5 rounded-lg border border-cyan-200">
          <label className="text-xs font-mono text-cyan-800">TARGET SENSOR FOR DRIFT / FAILURE</label>
          <select
            value={targetSensor}
            onChange={(e) => setTargetSensor(e.target.value)}
            className="bg-white border border-slate-300 text-cyan-800 rounded p-1.5 text-xs font-mono"
          >
            {sensors.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Severity & Progression Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Target Severity</span>
            <span className="text-cyan-700 font-bold">{(severity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
            className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
          {/* Quick presets */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            {[0.1, 0.3, 0.5, 0.8, 1.0].map((val) => (
              <button
                key={val}
                onClick={() => setSeverity(val)}
                className={`hover:text-cyan-600 ${severity === val ? 'text-cyan-600 font-bold' : ''}`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Progression Rate</span>
            <span className="text-cyan-600 font-bold">{rate.toFixed(2)} /s</span>
          </div>
          <input
            type="range"
            min="0.01"
            max="0.20"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            <span>Slow (0.01)</span>
            <span>Fast (0.20)</span>
          </div>
        </div>
      </div>

      {/* Sensor Noise Slider */}
      <div className="flex flex-col gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-500">Configurable Sensor Noise (noise_level)</span>
          <span className="text-cyan-600 font-bold">{(noiseLevel * 100).toFixed(1)}%</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="0.10"
          step="0.005"
          value={noiseLevel}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setNoiseLevel(val);
            if (onNoiseChange) onNoiseChange(val);
          }}
          className="w-full accent-cyan-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
        />
      </div>

      {/* Action Buttons (Light Blue Action Button) */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleInject}
          className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95"
        >
          Inject Fault Mode
        </button>
        <button
          onClick={onClearFaults}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs uppercase rounded-lg border border-slate-300 transition-all active:scale-95"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}