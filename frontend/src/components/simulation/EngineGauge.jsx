import React from 'react';

export default function EngineGauge({
  label,
  value,
  unit,
  min = 0,
  max = 100,
  warnLow,
  warnHigh,
  critLow,
  critHigh,
  precision = 0,
  accentColor = '#00f0ff'
}) {
  const safeVal = typeof value === 'number' ? value : 0;
  const clampedVal = Math.max(min, Math.min(max, safeVal));
  
  // Angle range: -135 deg to +135 deg (270 degree sweep)
  const angleStart = -135;
  const angleEnd = 135;
  const totalSweep = angleEnd - angleStart;
  const fraction = (clampedVal - min) / (max - min);
  const currentAngle = angleStart + fraction * totalSweep;

  // Determine status color
  let statusColor = '#10b981'; // safe
  let isWarning = false;
  let isCritical = false;

  if (critHigh !== undefined && safeVal >= critHigh) {
    statusColor = '#ef4444';
    isCritical = true;
  } else if (critLow !== undefined && safeVal <= critLow) {
    statusColor = '#ef4444';
    isCritical = true;
  } else if (warnHigh !== undefined && safeVal >= warnHigh) {
    statusColor = '#f59e0b';
    isWarning = true;
  } else if (warnLow !== undefined && safeVal <= warnLow) {
    statusColor = '#f59e0b';
    isWarning = true;
  }

  // Radius for SVG gauge arc
  const radius = 55;
  const center = 75;

  // Helper for arc path calculation
  const polarToCartesian = (cx, cy, r, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x, y, r, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const bgArc = describeArc(center, center, radius, angleStart, angleEnd);
  const activeArc = describeArc(center, center, radius, angleStart, Math.min(angleEnd, currentAngle));

  return (
    <div
      className={`glass-panel p-2.5 rounded-xl flex flex-col items-center relative transition-all duration-300 ${
        isCritical ? 'border-rose-300 shadow-[0_0_15px_rgba(239,68,68,0.12)]' : ''
      }`}
    >
      <div className="w-full flex justify-between items-center text-[11px] font-mono text-slate-500 mb-1">
        <span className="font-bold uppercase tracking-wider">{label}</span>
        <span className="text-slate-400">{unit}</span>
      </div>

      <div className="relative w-[130px] h-[105px] flex items-center justify-center">
        <svg viewBox="0 0 150 130" className="w-full h-full">
          {/* Background Track */}
          <path d={bgArc} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />

          {/* Active Value Arc */}
          {fraction > 0.01 && (
            <path
              d={activeArc}
              fill="none"
              stroke={statusColor}
              strokeWidth="8"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${statusColor})` }}
            />
          )}

          {/* Pivot Center */}
          <circle cx={center} cy={center} r="6" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />

          {/* Needle Pointer */}
          <g transform={`rotate(${currentAngle}, ${center}, ${center})`}>
            <line
              x1={center}
              y1={center}
              x2={center}
              y2={center - radius + 8}
              stroke={statusColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Digital Numeric Display In Center */}
        <div className="absolute bottom-1 flex flex-col items-center pointer-events-none">
          <span className="font-mono text-lg font-black tracking-tight" style={{ color: statusColor }}>
            {safeVal.toFixed(precision)}
          </span>
        </div>
      </div>

      {/* Min / Max bounds */}
      <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 px-1 mt-0.5">
        <span>{min}</span>
        <span className={isCritical ? 'text-rose-600 font-bold' : isWarning ? 'text-amber-600' : 'text-slate-400'}>
          {isCritical ? 'ALERT' : isWarning ? 'CAUTION' : 'NOMINAL'}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}
