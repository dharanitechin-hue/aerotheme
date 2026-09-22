import React from 'react';
import { Play, Pause, RotateCcw, Octagon, FastForward } from 'lucide-react';

export default function SimulationControls({
  state,
  isRunning,
  isPaused,
  speedMultiplier,
  onControl,
  onParamChange,
}) {
  const throttle = state?.throttle !== undefined ? state.throttle : 0.0;
  const load = state?.load !== undefined ? state.load : 0.0;
  const altitude = state?.altitude !== undefined ? state.altitude : 0;
  const ambientTemp = state?.ambient_temperature !== undefined ? state.ambient_temperature : 25;
  const operatingState = state?.engine_state || 'OFF';

  const operatingStates = [
    'OFF',
    'STARTING',
    'IDLE',
    'TAKEOFF',
    'CLIMB',
    'CRUISE',
    'HIGH_LOAD',
    'DESCENT',
    'LANDING'
  ];

  const speeds = [0.25, 0.5, 1.0, 2.0, 5.0, 10.0];

  // Calculate percentage fill for custom track styling
  const throttlePercent = Math.min(Math.max((throttle / 1) * 100, 0), 100);
  const loadPercent = Math.min(Math.max((load / 1) * 100, 0), 100);
  const altitudePercent = Math.min(Math.max((altitude / 25000) * 100, 0), 100);
  const tempPercent = Math.min(Math.max(((ambientTemp - (-20)) / (50 - (-20))) * 100, 0), 100);

  const getSliderStyle = (percent) => ({
    background: `linear-gradient(to right, #06b6d4 ${percent}%, #e2e8f0 ${percent}%)`,
  });

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col gap-4 bg-white border border-slate-200 shadow-sm">
      {/* Primary Execution Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          {!isRunning || isPaused ? (
            <button
              onClick={() => onControl(isRunning ? 'resume' : 'start')}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunning ? 'Resume' : 'Start'}
            </button>
          ) : (
            <button
              onClick={() => onControl('pause')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          <button
            onClick={() => onControl('reset')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs uppercase rounded-lg border border-slate-300 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={() => onControl('emergency_stop')}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs uppercase rounded-lg shadow-sm transition-all active:scale-95 animate-pulse"
        >
          <Octagon className="w-3.5 h-3.5 fill-current" />
          Emergency Stop
        </button>
      </div>

      {/* Simulation Speed Multipliers */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <FastForward className="w-3.5 h-3.5 text-cyan-600" />
          <span>SPEED:</span>
        </div>
        <div className="flex items-center gap-1">
          {speeds.map((spd) => (
            <button
              key={spd}
              onClick={() => onParamChange('speed_multiplier', spd)}
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-all ${
                speedMultiplier === spd
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Operating Flight State Selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Engine Operating State
        </span>
        <div className="grid grid-cols-3 gap-1.5">
          {operatingStates.map((st) => (
            <button
              key={st}
              onClick={() => onParamChange('engine_state', st)}
              className={`py-1.5 px-2 text-[11px] font-mono font-bold rounded border transition-all ${
                operatingState === st
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Sliders Grid with Light Blue Filled Tracks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
        {/* Throttle Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Throttle</span>
            <span className="text-cyan-600 font-bold">{Math.round(throttle * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={throttle}
            onChange={(e) => onParamChange('throttle', parseFloat(e.target.value))}
            style={getSliderStyle(throttlePercent)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-600"
          />
        </div>

        {/* Load Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Engine Load</span>
            <span className="text-cyan-600 font-bold">{Math.round(load * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={load}
            onChange={(e) => onParamChange('load', parseFloat(e.target.value))}
            style={getSliderStyle(loadPercent)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-600"
          />
        </div>

        {/* Altitude Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Altitude</span>
            <span className="text-cyan-600 font-bold">{Math.round(altitude).toLocaleString()} ft</span>
          </div>
          <input
            type="range"
            min="0"
            max="25000"
            step="500"
            value={altitude}
            onChange={(e) => onParamChange('altitude', parseFloat(e.target.value))}
            style={getSliderStyle(altitudePercent)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-600"
          />
        </div>

        {/* Ambient Temperature Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-500">Ambient Temp</span>
            <span className="text-cyan-600 font-bold">{Math.round(ambientTemp)} °C</span>
          </div>
          <input
            type="range"
            min="-20"
            max="50"
            step="1"
            value={ambientTemp}
            onChange={(e) => onParamChange('ambient_temperature', parseFloat(e.target.value))}
            style={getSliderStyle(tempPercent)}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-600"
          />
        </div>
      </div>
    </div>
  );
}