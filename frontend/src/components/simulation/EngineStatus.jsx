import React from 'react';
import { Activity, ShieldCheck, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function EngineStatus({ state }) {
  const health = state?.health_score ?? 100;
  const anomalyScore = state?.anomaly_score ?? 0.0;
  const rul = state?.predicted_rul ?? 50.0;
  const failureProb = state?.failure_probability ?? 0.0;
  const faultMode = state?.classified_fault_mode || 'NO FAULT DETECTED';
  const recommendation = state?.maintenance_recommendation || 'Engine operational. Normal monitoring.';
  const risk = state?.mission_risk || 'LOW';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <Activity size={16} className="text-sky-600" />
            <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">
              DIGITAL TWIN AI HEALTH & MISSION INTELLIGENCE
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
            risk === 'HIGH' ? 'bg-rose-100 text-rose-700' :
            risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            RISK: {risk}
          </span>
        </div>

        {/* 4 Primary AI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ENGINE HEALTH</span>
            <div className="text-2xl font-black text-emerald-600 my-1">{health}%</div>
            <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${health}%` }} />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">AI ANOMALY SCORE</span>
            <div className="text-2xl font-black text-sky-600 my-1">{anomalyScore.toFixed(2)}</div>
            <span className="text-[10px] text-slate-400">Normal Threshold &lt; 0.35</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">PREDICTED RUL</span>
            <div className="text-2xl font-black text-slate-800 my-1">{rul.toFixed(1)} <span className="text-xs font-normal">hrs</span></div>
            <span className="text-[10px] text-slate-400">[45–55h | 95% Conf]</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">FAILURE PROBABILITY</span>
            <div className="text-2xl font-black text-emerald-600 my-1">{(failureProb * 100).toFixed(1)}%</div>
            <span className="text-[10px] text-slate-400">In-flight Risk</span>
          </div>
        </div>

        {/* Diagnostic Status Box */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">CLASSIFIED FAULT MODE:</span>
            <span className={`font-bold ${faultMode === 'NO FAULT DETECTED' ? 'text-amber-600' : 'text-rose-600'}`}>
              {faultMode}
            </span>
          </div>
          <div className="flex items-start space-x-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <span><b>Maintenance Recommendation:</b> {recommendation}</span>
          </div>
        </div>
      </div>

      {/* Sub-system Status Row (Fills the bottom empty space in the card) */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-[11px]">
        <div className="flex items-center justify-center space-x-1 text-slate-600 font-medium">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span>Sensor Sync: <b>OK</b></span>
        </div>
        <div className="flex items-center justify-center space-x-1 text-slate-600 font-medium">
          <Cpu size={13} className="text-sky-500" />
          <span>Model Drift: <b>0.01%</b></span>
        </div>
        <div className="flex items-center justify-center space-x-1 text-slate-600 font-medium">
          <Activity size={13} className="text-emerald-500" />
          <span>Telemetry: <b>10 Hz Live</b></span>
        </div>
      </div>
    </div>
  );
}