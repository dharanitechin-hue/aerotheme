import React from 'react';
import { X, Cpu, Activity, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function ComponentInspector({ component, state, onClose }) {
  if (!component) return null;

  const compId = component.system || component.id || 'engine_block';
  const compName = component.name || 'Component';
  const compStatus = state?.component_status?.[compId] || 'NORMAL';
  const isWarn = compStatus === 'WARNING';
  const isCrit = compStatus === 'CRITICAL';

  // Subsystem telemetry data mapping
  const getSubsystemDetails = () => {
    switch (compId) {
      case 'oil_system':
        return {
          title: 'Lubrication & Oil Subsystem',
          params: [
            { label: 'Oil Pressure', value: `${(state?.oil_pressure || 0).toFixed(2)} bar`, trend: 'down', normal: '3.5 - 5.0 bar' },
            { label: 'Oil Temperature', value: `${Math.round(state?.oil_temperature || 25)} °C`, trend: 'up', normal: '80 - 105 °C' },
            { label: 'Vibration Induction', value: `${(state?.vibration || 0).toFixed(2)} mm/s`, trend: 'up', normal: '< 1.8 mm/s' },
          ],
          aiDiagnosis: isCrit || isWarn
            ? 'Severe hydrodynamic lubrication breakdown detected. Bearing friction surge.'
            : 'Normal hydrodynamic wedge film thickness. Pump delivery nominal.',
        };
      case 'cylinder':
        return {
          title: 'Combustion Chamber & Cylinder Bore',
          params: [
            { label: 'Cylinder Head Temp (CHT)', value: `${Math.round(state?.cht || 25)} °C`, trend: 'stable', normal: '140 - 190 °C' },
            { label: 'Exhaust Gas Temp (EGT)', value: `${Math.round(state?.egt || 25)} °C`, trend: 'stable', normal: '580 - 720 °C' },
            { label: 'Combustion Vibration', value: `${(state?.vibration || 0).toFixed(2)} mm/s`, trend: 'up', normal: '< 2.0 mm/s' },
          ],
          aiDiagnosis: isCrit || isWarn
            ? 'Cycle-to-cycle pressure variation observed. Potential misfire or thermal stress.'
            : 'Stoichiometric combustion efficiency. Thermal equilibrium stable.',
        };
      case 'injector':
        return {
          title: 'Electronic Fuel Injection (EFI)',
          params: [
            { label: 'Fuel Flow Rate', value: `${(state?.fuel_flow || 0).toFixed(1)} L/h`, trend: 'stable', normal: '12 - 26 L/h' },
            { label: 'Injection Timing Advance', value: `${(state?.injection_timing || 20).toFixed(1)}° BTDC`, trend: 'stable', normal: '18 - 24°' },
            { label: 'Exhaust Reaction (EGT)', value: `${Math.round(state?.egt || 25)} °C`, trend: 'up', normal: '600 - 680 °C' },
          ],
          aiDiagnosis: isCrit || isWarn
            ? 'Injector nozzle restriction causing asymmetric fuel-air distribution.'
            : 'Electronic pulse width modulation operating within ±1.5% calibration.',
        };
      case 'crankshaft':
        return {
          title: 'Crankshaft & Propeller Drive Train',
          params: [
            { label: 'Engine Speed (RPM)', value: `${Math.round(state?.rpm || 0)} RPM`, trend: 'stable', normal: '1400 - 5500 RPM' },
            { label: 'Main Bearing Vibration', value: `${(state?.vibration || 0).toFixed(2)} mm/s`, trend: 'up', normal: '< 1.5 mm/s' },
            { label: 'Drive Load', value: `${Math.round((state?.load || 0) * 100)}%`, trend: 'stable', normal: '0 - 95%' },
          ],
          aiDiagnosis: isCrit || isWarn
            ? 'Harmonic vibration anomaly detected on main journals or propeller balance.'
            : 'Torsional damping and journal clearances within aerospace tolerances.',
        };
      case 'exhaust':
        return {
          title: 'Exhaust Gas Manifold & Turbo-Duct',
          params: [
            { label: 'EGT Thermal Level', value: `${Math.round(state?.egt || 25)} °C`, trend: 'stable', normal: '580 - 720 °C' },
            { label: 'Backpressure Estimate', value: '1.14 bar', trend: 'stable', normal: '1.05 - 1.25 bar' },
            { label: 'Residual Divergence', value: `${(state?.residuals?.egt || 0).toFixed(1)} °C`, trend: 'up', normal: '± 20 °C' },
          ],
          aiDiagnosis: isCrit || isWarn
            ? 'Exhaust gas temperature divergence exceeds nominal thermal envelope.'
            : 'Collector flow velocity and thermal dissipation nominal.',
        };
      default:
        return {
          title: 'Engine Structural Block & Mounts',
          params: [
            { label: 'Engine Health Score', value: `${Math.round(state?.health_score || 100)}%`, trend: 'stable', normal: '90 - 100%' },
            { label: 'Overall Anomaly Score', value: (state?.anomaly_score || 0).toFixed(2), trend: 'up', normal: '< 0.25' },
            { label: 'Estimated RUL', value: `${(state?.rul_hours || 50).toFixed(1)} hrs`, trend: 'down', normal: '> 25 hrs' },
          ],
          aiDiagnosis: 'Structural integrity nominal. Monitoring acoustic and thermal residuals.',
        };
    }
  };

  const details = getSubsystemDetails();

  return (
    <div className="absolute top-4 right-4 z-20 w-80 glass-panel-glow p-4 rounded-xl shadow-2xl border border-cyan-500/40 text-slate-100 flex flex-col gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-cyan-300">
            Component Inspection
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Component Title & Status */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-100">{compName}</h4>
          <span className="text-[10px] font-mono text-slate-400">{details.title}</span>
        </div>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            isCrit
              ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
              : isWarn
              ? 'bg-amber-950 text-amber-300 border-amber-600'
              : 'bg-emerald-950 text-emerald-300 border-emerald-600'
          }`}
        >
          {compStatus}
        </span>
      </div>

      {/* Parameters Matrix */}
      <div className="flex flex-col gap-2 pt-1">
        {details.params.map((p, i) => (
          <div key={i} className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400 font-mono text-[11px] block">{p.label}</span>
              <span className="text-[9px] text-slate-500 font-mono">Norm: {p.normal}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold">
              {p.trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-amber-400" />
              ) : p.trend === 'down' ? (
                <TrendingDown className="w-3 h-3 text-rose-400" />
              ) : null}
              <span className="text-slate-100">{p.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Diagnostic Assessment */}
      <div className="bg-slate-900/90 p-2.5 rounded-lg border border-cyan-900/60 flex flex-col gap-1 text-xs">
        <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold flex items-center gap-1">
          <Activity className="w-3 h-3" /> AI Health Assessment
        </span>
        <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
          {details.aiDiagnosis}
        </p>
      </div>
    </div>
  );
}
