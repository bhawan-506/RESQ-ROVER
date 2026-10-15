import { Siren, Home, CheckCircle } from 'lucide-react';
import { useRover } from '../../context/RoverContext';

export function SosBanner() {
  const { telemetry, resolveSOS, returnToBase } = useRover();
  const sos = telemetry.mode === 'SOS';
  const lowEsp = telemetry.espBatteryPct < 15;
  const lowStm = telemetry.stmBatteryPct < 15;
  const lowBatt = (lowEsp || lowStm) && !sos;
  if (!sos && !lowBatt) return null;
  const lowLabel = lowEsp && lowStm
    ? 'Both packs under 15%'
    : lowEsp ? `ESP32 pack ${Math.round(telemetry.espBatteryPct)}%` : `STM32 pack ${Math.round(telemetry.stmBatteryPct)}%`;

  return (
    <div className={`relative overflow-hidden rounded-[18px] border px-5 py-4 sm:px-6 sm:py-5 shadow-xl ${sos ? 'bg-gradient-to-r from-orange-700 via-orange-600 to-orange-700 border-orange-500' : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 border-amber-400'}`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.25) 0 12px, transparent 12px 24px)' }} />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <span className="relative flex w-3 h-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
          </span>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <Siren className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] sm:text-[17px] font-extrabold text-white tracking-tight leading-snug">
              {sos ? 'SOS BEACON ACTIVE: EMERGENCY BROADCAST' : `Low battery (${lowLabel}): return advised`}
            </p>
            <p className="text-[12px] sm:text-[13px] text-white/80 mt-0.5">
              {sos ? 'All operators alerted: rover holding position' : 'Finish the drop, then return to base'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
          <button onClick={returnToBase} className="h-11 px-5 rounded-xl bg-white text-orange-700 text-[14px] font-bold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
            <Home className="w-4 h-4" /> Return to base
          </button>
          {sos && (
            <button onClick={resolveSOS} className="h-11 px-5 rounded-xl border-2 border-white/60 text-white text-[14px] font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
              <CheckCircle className="w-4 h-4" /> Stand down
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
