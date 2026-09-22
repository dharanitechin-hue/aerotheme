import React from 'react';
import { Radio, Battery, Zap, Clock, Fuel, Navigation, Thermometer } from 'lucide-react';

export default function TelemetryPanel({ state }) {
  const telemetryItems = [
    { label: 'BATTERY', value: state?.battery_voltage ? `${state.battery_voltage.toFixed(1)} V` : '12.6 V', sub: '12V Bus', icon: Battery },
    { label: 'ALTERNATOR', value: state?.alternator_current ? `${state.alternator_current.toFixed(1)} A` : '0.0 V', sub: 'Standby', icon: Zap },
    { label: 'INJ. TIMING', value: state?.ignition_timing ? `${state.ignition_timing.toFixed(1)}°` : '20.0°', sub: 'BTDC ECU', icon: Clock },
    { label: 'FUEL FLOW', value: state?.fuel_flow ? `${state.fuel_flow.toFixed(2)}` : '0.00', sub: 'L / hour', icon: Fuel },
    { label: 'ALTITUDE', value: state?.altitude ? `${Math.round(state.altitude)}` : '0', sub: 'feet MSL', icon: Navigation },
    { label: 'AMB. AIR', value: state?.ambient_temp ? `${Math.round(state.ambient_temp)}°C` : '25°C', sub: 'OAT Sensor', icon: Thermometer },
  ];

  return (
    <div className="glass-panel p-4 rounded-xl flex flex-col justify-between h-full bg-white border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-600" />
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Avionics & Environmental Telemetry
          </h4>
        </div>
        <span className="text-xs font-mono text-slate-400">
          UTC: --:--:--
        </span>
      </div>

      {/* 3 Columns x 2 Rows Grid to eliminate bottom-left empty space */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
        {telemetryItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between hover:border-cyan-400 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-slate-500">
                <Icon size={14} className="text-cyan-600" />
                <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  {item.label}
                </span>
              </div>
              <div className="my-1">
                <span className="text-xl font-black font-mono text-slate-800 block">
                  {item.value}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {item.sub}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}