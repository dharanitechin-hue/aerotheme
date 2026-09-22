import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function EngineVisualization({ state, isRunning, isPaused }) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(performance.now());

  const rpm = state?.rpm || 0;
  const compStatus = state?.component_status || {
    engine_block: 'NORMAL',
    cylinder: 'NORMAL',
    injector: 'NORMAL',
    oil_system: 'NORMAL',
    exhaust: 'NORMAL',
    crankshaft: 'NORMAL',
    sensors: 'NORMAL'
  };

  // Smooth continuous animation linked to simulated RPM
  useEffect(() => {
    const updateAngle = (now) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (isRunning && !isPaused && rpm > 20) {
        const degPerSec = (rpm / 60) * 360 * 0.15;
        setRotationAngle((prev) => (prev + degPerSec * dt) % 360);
      }

      animFrameRef.current = requestAnimationFrame(updateAngle);
    };

    animFrameRef.current = requestAnimationFrame(updateAngle);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isRunning, isPaused, rpm]);

  // Light-theme status colors helper
  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL':
        return { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.25)', glow: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.4))' };
      case 'WARNING':
        return { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.25)', glow: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' };
      case 'NORMAL':
      default:
        return { stroke: '#0891b2', fill: 'rgba(8, 145, 178, 0.08)', glow: 'drop-shadow(0 0 5px rgba(8, 145, 178, 0.2))' };
    }
  };

  // Piston kinematics based on crankshaft rotation
  const rad = (rotationAngle * Math.PI) / 180;
  const crankRadius = 32;
  const rodLength = 95;
  const crankPinX = 350 + crankRadius * Math.sin(rad);
  const crankPinY = 320 - crankRadius * Math.cos(rad);
  const pistonPinY = crankPinY - Math.sqrt(Math.max(0, rodLength * rodLength - Math.pow(crankPinX - 350, 2)));

  const cycleDeg = (rotationAngle * 2) % 720;
  const isCombustionFlash = cycleDeg > 350 && cycleDeg < 410 && rpm > 400;
  const flowOffset = (rotationAngle * 1.5) % 100;

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col items-center justify-between h-full bg-white border border-slate-200 shadow-sm relative overflow-hidden">
      {/* Header with quick stats */}
      <div className="w-full flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-600 animate-pulse" />
          <h3 className="text-base font-bold tracking-wider uppercase text-cyan-600">
            Aero Piston Engine Architecture Schematic
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-500">STATE:</span>
          <span className="px-2.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-bold border border-cyan-200">
            {state?.engine_state || 'OFF'}
          </span>
          <span className="text-slate-500 ml-2">RPM:</span>
          <span className="text-cyan-700 font-bold text-sm">{Math.round(rpm)}</span>
        </div>
      </div>

      {/* SVG Engine Schematic */}
      <div className="w-full flex justify-center py-2 relative flex-1 items-center">
        <svg
          viewBox="100 20 540 380"
          className="w-full max-w-[620px] h-auto select-none"
        >
          <defs>
            <linearGradient id="combustionGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff3b00" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ff9900" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="exhaustGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* 1. EXHAUST SYSTEM */}
          <g style={{ filter: getStatusColor(compStatus.exhaust).glow }}>
            <path
              d="M 400 110 C 440 110, 470 120, 520 120"
              fill="none"
              stroke={getStatusColor(compStatus.exhaust).stroke}
              strokeWidth="16"
              strokeLinecap="round"
            />
            {rpm > 100 && (
              <path
                d="M 400 110 C 440 110, 470 120, 540 120"
                fill="none"
                stroke="url(#exhaustGradient)"
                strokeWidth="10"
                strokeDasharray="18 12"
                strokeDashoffset={-flowOffset * 2}
              />
            )}
            <text x="490" y="105" fill="#ef4444" fontSize="10" fontFamily="monospace" fontWeight="bold">
              EXHAUST ({Math.round(state?.egt || 25)}°C)
            </text>
          </g>

          {/* 2. FUEL INJECTOR & FUEL RAIL */}
          <g style={{ filter: getStatusColor(compStatus.injector).glow }}>
            <line x1="240" y1="50" x2="350" y2="50" stroke="#0284c7" strokeWidth="6" />
            <rect
              x="343"
              y="45"
              width="14"
              height="35"
              rx="3"
              fill={getStatusColor(compStatus.injector).fill}
              stroke={getStatusColor(compStatus.injector).stroke}
              strokeWidth="2.5"
            />
            {rpm > 200 && (
              <polygon
                points="350,80 338,105 362,105"
                fill="rgba(2, 132, 199, 0.4)"
                className={isCombustionFlash ? "animate-pulse opacity-90" : "opacity-40"}
              />
            )}
            <text x="240" y="42" fill="#0284c7" fontSize="10" fontFamily="monospace" fontWeight="bold">
              INJECTOR ({state?.fuel_flow?.toFixed(1) || 0} L/h)
            </text>
          </g>

          {/* 3. ENGINE BLOCK & CYLINDER HEAD (Light Theme Fix) */}
          <g style={{ filter: getStatusColor(compStatus.engine_block).glow }}>
            <path
              d="M 285 85 L 415 85 L 415 220 L 440 240 L 440 370 L 260 370 L 260 240 L 285 220 Z"
              fill="#f8fafc"
              stroke={getStatusColor(compStatus.engine_block).stroke}
              strokeWidth="3.5"
            />
            {[105, 125, 145, 165, 185, 205].map((finY) => (
              <g key={finY}>
                <line x1="270" y1={finY} x2="285" y2={finY} stroke="#cbd5e1" strokeWidth="3" />
                <line x1="415" y1={finY} x2="430" y2={finY} stroke="#cbd5e1" strokeWidth="3" />
              </g>
            ))}
            <text x="235" y="160" fill="#64748b" fontSize="10" fontFamily="monospace" transform="rotate(-90 235 160)">
              CYLINDER ({Math.round(state?.cht || 25)}°C)
            </text>
          </g>

          {/* 4. CYLINDER BORE & COMBUSTION CHAMBER (Light Theme Fix) */}
          <g style={{ filter: getStatusColor(compStatus.cylinder).glow }}>
            <rect x="295" y="88" width="110" height="135" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="2" />
            {isCombustionFlash && (
              <rect
                x="296"
                y="90"
                width="108"
                height={Math.max(25, pistonPinY - 95)}
                fill="url(#combustionGlow)"
                className="animate-pulse"
              />
            )}
          </g>

          {/* 5. RECIPROCATING PISTON & CONNECTING ROD */}
          <g>
            <rect
              x="298"
              y={pistonPinY - 28}
              width="104"
              height="38"
              rx="4"
              fill="#cbd5e1"
              stroke="#0891b2"
              strokeWidth="2.5"
            />
            <line x1="300" y1={pistonPinY - 20} x2="400" y2={pistonPinY - 20} stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="300" y1={pistonPinY - 14} x2="400" y2={pistonPinY - 14} stroke="#94a3b8" strokeWidth="1.5" />
            <circle cx="350" cy={pistonPinY} r="7" fill="#0891b2" stroke="#ffffff" strokeWidth="2" />

            <line
              x1="350"
              y1={pistonPinY}
              x2={crankPinX}
              y2={crankPinY}
              stroke="#94a3b8"
              strokeWidth="11"
              strokeLinecap="round"
            />
            <line
              x1="350"
              y1={pistonPinY}
              x2={crankPinX}
              y2={crankPinY}
              stroke="#0284c7"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {/* 6. CRANKSHAFT & ROTATING CRANKWEB (Light Theme Fix) */}
          <g style={{ filter: getStatusColor(compStatus.crankshaft).glow }}>
            <circle cx="350" cy="320" r="54" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
            <g transform={`rotate(${rotationAngle}, 350, 320)`}>
              <path
                d="M 330 320 A 46 46 0 0 0 370 320 L 360 358 A 46 46 0 0 1 340 358 Z"
                fill="#cbd5e1"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              <circle cx="350" cy="288" r="9" fill="#0891b2" stroke="#ffffff" strokeWidth="2" />
              <circle cx="350" cy="320" r="14" fill="#e2e8f0" stroke="#0891b2" strokeWidth="3" />
            </g>
            <text x="350" y="390" fill="#0891b2" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
              CRANKSHAFT / PROPELLER SHAFT
            </text>
          </g>

          {/* 7. OIL LUBRICATION CIRCUIT */}
          <g style={{ filter: getStatusColor(compStatus.oil_system).glow }}>
            <rect
              x="275"
              y="355"
              width="150"
              height="20"
              rx="4"
              fill={getStatusColor(compStatus.oil_system).fill}
              stroke={getStatusColor(compStatus.oil_system).stroke}
              strokeWidth="2"
            />
            <path
              d="M 275 365 C 240 365, 240 200, 280 200"
              fill="none"
              stroke={getStatusColor(compStatus.oil_system).stroke}
              strokeWidth="4"
              strokeDasharray={rpm > 100 ? "8 6" : "none"}
              strokeDashoffset={flowOffset}
            />
            <text x="280" y="395" fill="#ca8a04" fontSize="9" fontFamily="monospace">
              OIL SYSTEM ({state?.oil_pressure?.toFixed(1) || 0} bar | {Math.round(state?.oil_temperature || 25)}°C)
            </text>
          </g>

          {/* 8. SENSOR CLUSTER PINS & PROBES */}
          <g style={{ filter: getStatusColor(compStatus.sensors).glow }}>
            <circle cx="415" cy="115" r="4" fill="#0284c7" />
            <circle cx="460" cy="120" r="4" fill="#ef4444" />
            <circle cx="250" cy="310" r="4" fill="#ca8a04" />
            <circle cx="350" cy="374" r="4" fill="#9333ea" />
          </g>

          {/* 9. PROPELLER BLADE HUB ROTATION INDICATOR */}
          <g transform="translate(145, 320)">
            <g transform={`rotate(${rotationAngle * 1.5}, 0, 0)`}>
              <ellipse cx="0" cy="-55" rx="7" ry="45" fill="rgba(2, 132, 199, 0.4)" stroke="#0284c7" strokeWidth="1.5" />
              <ellipse cx="0" cy="55" rx="7" ry="45" fill="rgba(2, 132, 199, 0.4)" stroke="#0284c7" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="14" fill="#e2e8f0" stroke="#0891b2" strokeWidth="3" />
            </g>
            <text x="0" y="75" fill="#0284c7" fontSize="9" fontFamily="monospace" textAnchor="middle">
              PROPELLER HUB
            </text>
          </g>
        </svg>
      </div>

      {/* Subsystems Health Badges Grid */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-3 border-t border-slate-200 text-xs">
        {Object.entries(compStatus).map(([key, status]) => {
          const isCrit = status === 'CRITICAL';
          const isWarn = status === 'WARNING';
          const formattedKey = key.replace('_', ' ').toUpperCase();

          return (
            <div
              key={key}
              className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all duration-300 ${
                isCrit
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : isWarn
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="font-mono text-[10px] text-slate-500">{formattedKey}</span>
              <span
                className={`font-bold text-[11px] mt-0.5 ${
                  isCrit ? 'text-rose-600' : isWarn ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {status}
              </span>
            </div>
          );A
        })}
      </div>
    </div>
  );
}