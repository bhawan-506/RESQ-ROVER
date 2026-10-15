import { Battery, Gauge, Radio, Move3d } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

function battColor(pct: number) {
  return pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-orange-500';
}

export function StatsBar() {
  const { telemetry } = useRover();
  const esp = Math.round(telemetry.espBatteryPct);
  const stm = Math.round(telemetry.stmBatteryPct);
  const lowPack = esp <= 25 || stm <= 25;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      <div className="panel panel-hover p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={cn("min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-2xl flex items-center justify-center", lowPack ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
            <Battery className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[20px] sm:text-[26px] font-extrabold text-slate-900 leading-none tracking-tight truncate">
              {esp}<span className="text-[13px] sm:text-[15px] font-bold text-slate-400">% / {stm}%</span>
            </p>
            <p className="text-[12px] sm:text-[13px] font-bold text-slate-600 mt-1">Power: ESP32 / STM32</p>
          </div>
        </div>
        <div className="space-y-1.5 mt-3 sm:mt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-7">ESP</span>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex-1">
              <div className={cn("h-full rounded-full transition-all duration-500", battColor(esp))} style={{ width: `${esp}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-7">STM</span>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden flex-1">
              <div className={cn("h-full rounded-full transition-all duration-500", battColor(stm))} style={{ width: `${stm}%` }} />
            </div>
          </div>
        </div>
      </div>

      {[
        { icon: Gauge, label: 'Speed', value: `${telemetry.gps.speedMps.toFixed(1)} m/s`, sub: `Heading ${Math.round(telemetry.gps.headingDeg)}°`,
          ring: 'bg-blue-50 text-blue-600', bar: 'bg-blue-500', pct: Math.min(100, (telemetry.gps.speedMps / 2) * 100) },
        { icon: Move3d, label: 'Chassis tilt', value: `X ${telemetry.tiltXDeg >= 0 ? '+' : ''}${telemetry.tiltXDeg.toFixed(1)}°`, sub: `Y ${telemetry.tiltYDeg >= 0 ? '+' : ''}${telemetry.tiltYDeg.toFixed(1)}°`,
          ring: 'bg-violet-50 text-violet-600', bar: 'bg-violet-500', pct: Math.min(100, (Math.max(Math.abs(telemetry.tiltXDeg), Math.abs(telemetry.tiltYDeg)) / 30) * 100) },
        { icon: Radio, label: 'WiFi signal', value: `${telemetry.rssiDbm} dBm`, sub: telemetry.rssiDbm > -65 ? 'Strong link' : telemetry.rssiDbm > -75 ? 'Fair link' : 'Weak link',
          ring: telemetry.rssiDbm > -65 ? 'bg-emerald-50 text-emerald-600' : telemetry.rssiDbm > -75 ? 'bg-amber-50 text-amber-600' : 'bg-orange-50 text-orange-600',
          bar: telemetry.rssiDbm > -65 ? 'bg-emerald-500' : telemetry.rssiDbm > -75 ? 'bg-amber-500' : 'bg-orange-500', pct: Math.max(8, Math.min(100, (100 + telemetry.rssiDbm) * 2)) },
      ].map((s) => (
        <div key={s.label} className="panel panel-hover p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className={cn("min-w-[44px] min-h-[44px] sm:min-w-[48px] sm:min-h-[48px] rounded-2xl flex items-center justify-center", s.ring)}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] sm:text-[26px] font-extrabold text-slate-900 leading-none tracking-tight truncate">{s.value}</p>
              <p className="text-[12px] sm:text-[13px] font-bold text-slate-600 mt-1">{s.label}</p>
              <p className="text-[11px] sm:text-[12px] text-slate-500 truncate">{s.sub}</p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3 sm:mt-4">
            <div className={cn("h-full rounded-full transition-all duration-500", s.bar)} style={{ width: `${s.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
