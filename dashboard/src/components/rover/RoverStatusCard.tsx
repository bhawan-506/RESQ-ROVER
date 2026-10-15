import { Battery, Package, Navigation, Signal } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const modeStyles: Record<string, string> = {
  IDLE: 'bg-slate-100 text-slate-600 border border-slate-200',
  EN_ROUTE: 'bg-blue-50 text-blue-700 border border-blue-200',
  DELIVERING: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  RETURNING: 'bg-amber-50 text-amber-700 border border-amber-200',
  LOW_BATTERY: 'bg-orange-50 text-orange-700 border border-orange-200',
  SOS: 'bg-orange-600 text-white border border-orange-600 shadow-lg shadow-orange-500/30',
  OFFLINE: 'bg-slate-100 text-slate-400 border border-slate-200',
};

export function RoverStatusCard() {
  const { telemetry, sendCommand, gpsAgeS, triggerSOS } = useRover();
  const esp = Math.round(telemetry.espBatteryPct);
  const stm = Math.round(telemetry.stmBatteryPct);
  const battBar = (p: number) => p > 60
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : p > 25 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-orange-600 to-orange-400';
  const rssi = telemetry.rssiDbm;
  const sigBars = rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;

  return (
    <div className="panel p-5 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3.5">
          <div className="min-w-[52px] min-h-[52px] rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-[18px] shadow-lg shadow-blue-500/30">R1</div>
          <div>
            <p className="text-[16px] font-extrabold text-slate-900 leading-none">RESQ-R1</p>
            <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1.5">
              Supply rover • ESP32
              <span className={cn("inline-flex items-center gap-1 font-bold", gpsAgeS <= 3 ? 'text-emerald-600' : 'text-amber-600')}>
                <span className={cn("w-1.5 h-1.5 rounded-full", gpsAgeS <= 3 ? 'bg-emerald-500' : 'bg-amber-500')} />
                {gpsAgeS <= 1 ? 'LIVE' : `${gpsAgeS}s`}
              </span>
            </p>
          </div>
        </div>
        <span className={cn("badge !text-[12px] !px-3 !py-1.5", modeStyles[telemetry.mode])}>{telemetry.mode.replace('_', ' ')}</span>
      </div>

      <div className="space-y-5 flex-1">
        <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-500"><Battery className="w-4 h-4" /> ESP32 PACK</span>
            <span className={cn("text-[16px] font-extrabold", esp > 60 ? 'text-emerald-600' : esp > 25 ? 'text-amber-600' : 'text-orange-600')}>{esp}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", battBar(esp))} style={{ width: `${esp}%` }} />
          </div>
          <div className="flex items-center justify-between mt-3 mb-2">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-500"><Battery className="w-4 h-4" /> STM32 PACK</span>
            <span className={cn("text-[16px] font-extrabold", stm > 60 ? 'text-emerald-600' : stm > 25 ? 'text-amber-600' : 'text-orange-600')}>{stm}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", battBar(stm))} style={{ width: `${stm}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-400"><Signal className="w-3.5 h-3.5" /> {rssi} dBm</span>
            <span className="flex items-end gap-0.5">
              {[1, 2, 3, 4].map((b) => (
                <span key={b} className={cn("w-1 rounded-full", b <= sigBars ? 'bg-emerald-500' : 'bg-slate-200')} style={{ height: 5 + b * 3 }} />
              ))}
            </span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-[13px] font-bold text-slate-500"><Package className="w-4 h-4" /> {telemetry.payload} DELIVERY</span>
            <span className="text-[15px] font-extrabold text-slate-800">{Math.round(telemetry.missionPct)}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${telemetry.missionPct}%` }} />
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
          <p className="text-[11px] font-bold tracking-[0.12em] text-slate-400 mb-2 flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5 text-sky-300" /> CURRENT FIX</p>
          <p className="mono text-[14px] font-bold text-white">{telemetry.gps.lat.toFixed(6)}, {telemetry.gps.lng.toFixed(6)}</p>
          <p className="text-[13px] text-slate-400 mt-1.5">
            <span className="text-sky-300 font-semibold">{telemetry.gps.speedMps.toFixed(2)} m/s</span> • {Math.round(telemetry.gps.headingDeg)}° • tilt {telemetry.tiltXDeg.toFixed(1)}°/{telemetry.tiltYDeg.toFixed(1)}°
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-center">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-3.5"><p className="text-[18px] font-extrabold text-slate-800">{telemetry.tiltXDeg.toFixed(1)}°</p><p className="text-[11px] text-slate-400 font-bold">TILT X</p></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 py-3.5"><p className="text-[18px] font-extrabold text-slate-800">{telemetry.tiltYDeg.toFixed(1)}°</p><p className="text-[11px] text-slate-400 font-bold">TILT Y</p></div>
        </div>
      </div>

      <div className="flex gap-2.5 mt-5">
        <button onClick={() => sendCommand('RETURN_TO_BASE')} className="btn btn-secondary flex-1">Return to base</button>
        <button onClick={triggerSOS} className="btn btn-primary flex-1">SOS beacon</button>
      </div>
    </div>
  );
}



