import { Move3d } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

function tiltTone(deg: number) {
  const a = Math.abs(deg);
  if (a < 8) return 'text-emerald-600';
  if (a < 18) return 'text-amber-600';
  return 'text-orange-600';
}

export function TiltPanel() {
  const { telemetry } = useRover();
  const tx = telemetry.tiltXDeg;
  const ty = telemetry.tiltYDeg;
  const RANGE = 30;
  const cx = Math.max(-1, Math.min(1, tx / RANGE));
  const cy = Math.max(-1, Math.min(1, ty / RANGE));

  return (
    <div className="panel p-5 sm:p-6 h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
          <Move3d className="w-5 h-5" />
        </div>
        <div>
          <p className="section-title !text-[15px]">Chassis tilt</p>
          <p className="text-[12px] text-slate-500">2-axis IMU level</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-28 h-28 shrink-0 rounded-full bg-slate-900 border-4 border-slate-200 overflow-hidden">
          <div className="absolute left-1/2 top-2 bottom-2 w-px bg-white/15" />
          <div className="absolute top-1/2 left-2 right-2 h-px bg-white/15" />
          <div className="absolute left-1/2 top-1/2 w-8 h-8 -ml-4 -mt-4 rounded-full border border-dashed border-white/25" />
          <div
            className={cn(
              "absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white shadow-lg transition-all duration-300",
              Math.max(Math.abs(tx), Math.abs(ty)) < 8 ? 'bg-emerald-400' : Math.max(Math.abs(tx), Math.abs(ty)) < 18 ? 'bg-amber-400' : 'bg-orange-500'
            )}
            style={{ left: `${50 + cx * 38}%`, top: `${50 + cy * 38}%` }}
          />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          {[
            { k: 'X AXIS', v: tx },
            { k: 'Y AXIS', v: ty },
          ].map((r) => (
            <div key={r.k}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-500">{r.k}</span>
                <span className={cn("mono text-[14px] font-bold", tiltTone(r.v))}>
                  {r.v > 0 ? '+' : ''}{r.v.toFixed(1)}°
                </span>
              </div>
              <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300" />
                <div
                  className={cn("absolute top-0 bottom-0 rounded-full transition-all duration-300", tiltTone(r.v).replace('text-', 'bg-'))}
                  style={r.v >= 0
                    ? { left: '50%', width: `${Math.min(50, (r.v / RANGE) * 50)}%` }
                    : { right: '50%', width: `${Math.min(50, (-r.v / RANGE) * 50)}%` }}
                />
              </div>
            </div>
          ))}
          <p className="text-[11px] text-slate-500">
            {Math.max(Math.abs(tx), Math.abs(ty)) < 8 ? 'Level ground' : Math.max(Math.abs(tx), Math.abs(ty)) < 18 ? 'Sloped terrain, drive careful' : 'Steep tilt, slow down'}
          </p>
        </div>
      </div>
    </div>
  );
}
