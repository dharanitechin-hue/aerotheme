import React from 'react';
import { GitCompare, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ActualVsExpected({ state }) {
  const actual = {
    rpm: state?.rpm || 0,
    egt: state?.egt || 0,
    cht: state?.cht || 0,
    oil_pressure: state?.oil_pressure || 0,
    vibration: state?.vibration || 0,
  };

  const expected = state?.expected || {
    rpm: 0,
    egt: 0,
    cht: 0,
    oil_pressure: 0,
    vibration: 0,
  };

  const residuals = state?.residuals || {
    rpm: actual.rpm - expected.rpm,
    egt: actual.egt - expected.egt,
    cht: actual.cht - expected.cht,
    oil_pressure: actual.oil_pressure - expected.oil_pressure,
    vibration: actual.vibration - expected.vibration,
  };

  const parameters = [
    {
      key: 'rpm',
      name: 'Engine Speed',
      unit: 'RPM',
      maxDev: 300,
      format: (v) => Math.round(v),
      formatRes: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)}`,
    },
    {
      key: 'egt',
      name: 'Exhaust Gas Temp',
      unit: '°C',
      maxDev: 80,
      format: (v) => Math.round(v),
      formatRes: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)} °C`,
    },
    {
      key: 'cht',
      name: 'Cylinder Head Temp',
      unit: '°C',
      maxDev: 30,
      format: (v) => Math.round(v),
      formatRes: (v) => `${v >= 0 ? '+' : ''}${Math.round(v)} °C`,
    },
    {
      key: 'oil_pressure',
      name: 'Oil Pressure',
      unit: 'bar',
      maxDev: 1.5,
      format: (v) => v.toFixed(2),
      formatRes: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} bar`,
    },
    {
      key: 'vibration',
      name: 'Vibration RMS',
      unit: 'mm/s',
      maxDev: 2.0,
      format: (v) => v.toFixed(2),
      formatRes: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
    },
  ];

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Actual vs Digital Twin Expected (Residuals)
          </h4>
        </div>
        <span className="text-[11px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
          Δ = Actual - Expected
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {parameters.map((p) => {
          const actVal = actual[p.key];
          const expVal = expected[p.key];
          const resVal = residuals[p.key];
          
          // Normalized residual bar calculation (-100% to +100%)
          const deviationPercent = Math.max(-100, Math.min(100, (resVal / p.maxDev) * 100));
          const isHighDeviation = Math.abs(deviationPercent) > 40;
          const isExtremeDeviation = Math.abs(deviationPercent) > 75;

          return (
            <div key={p.key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                <span className="font-semibold text-slate-700">{p.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    Act: <b className="text-slate-800">{p.format(actVal)}</b>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">
                    Exp: <b className="text-cyan-600">{p.format(expVal)}</b>
                  </span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                      isExtremeDeviation
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : isHighDeviation
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-emerald-600'
                    }`}
                  >
                    Δ {p.formatRes(resVal)}
                  </span>
                </div>
              </div>

              {/* Centered Bidirectional Residual Bar */}
              <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex items-center border border-slate-200">
                {/* Center baseline marker */}
                <div className="absolute left-1/2 w-0.5 h-full bg-slate-300 z-10" />

                {/* Left deviation (Negative residual) */}
                {deviationPercent < 0 && (
                  <div
                    className={`absolute right-1/2 h-full transition-all duration-300 rounded-l-full ${
                      isExtremeDeviation ? 'bg-rose-500' : isHighDeviation ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.abs(deviationPercent) / 2}%` }}
                  />
                )}

                {/* Right deviation (Positive residual) */}
                {deviationPercent > 0 && (
                  <div
                    className={`absolute left-1/2 h-full transition-all duration-300 rounded-r-full ${
                      isExtremeDeviation ? 'bg-rose-500' : isHighDeviation ? 'bg-amber-500' : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.abs(deviationPercent) / 2}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
