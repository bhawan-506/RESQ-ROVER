import { Check, Package, Truck, MapPin, Home, RotateCcw } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

const icons = { pickup: Package, enroute: Truck, drop: MapPin, return: Home } as const;

export function MissionChecklist() {
  const { mission, missionDone, confirmPickup, confirmDrop, completeReturn, resetMission } = useRover();
  const activeIdx = mission.findIndex((s) => s.state === 'active');

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="section-title !text-[16px]">Delivery run</p>
          <p className="text-[13px] text-slate-400 mt-0.5">MEDKIT-A • PICKUP B → DROP A</p>
        </div>
        <button onClick={resetMission} className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="space-y-1">
        {mission.map((s, i) => {
          const Icon = icons[s.id];
          const done = s.state === 'done';
          const active = s.state === 'active';
          return (
            <div key={s.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-colors",
                  done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-300'
                )}>
                  {done ? <Check className="w-5 h-5" /> : <Icon className="w-4.5 h-4.5" />}
                </div>
                {i < mission.length - 1 && (
                  <div className={cn("w-0.5 flex-1 min-h-[22px] my-1 rounded-full", done ? 'bg-emerald-400' : 'bg-slate-200')} />
                )}
              </div>
              <div className="flex-1 pb-5">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-[14px] font-bold", done ? 'text-slate-400 line-through' : active ? 'text-slate-900' : 'text-slate-400')}>
                    {i + 1}. {s.label}
                  </p>
                  {s.at && <span className="text-[11px] text-slate-400 mono">{new Date(s.at).toLocaleTimeString('en-GB', { hour12: false })}</span>}
                </div>
                <p className="text-[12px] text-slate-400 mt-0.5">{s.detail}</p>
                {active && s.id === 'pickup' && (
                  <button onClick={confirmPickup} className="btn btn-primary !h-9 !text-[12px] mt-2.5">Confirm pickup</button>
                )}
                {active && s.id === 'drop' && (
                  <button onClick={confirmDrop} className="btn btn-primary !h-9 !text-[12px] mt-2.5">Confirm drop delivered</button>
                )}
                {active && s.id === 'return' && (
                  <button onClick={completeReturn} className="btn btn-secondary !h-9 !text-[12px] mt-2.5">Mark back at base</button>
                )}
                {active && s.id === 'enroute' && (
                  <p className="text-[12px] text-blue-600 font-semibold mt-2">GPS is tracking the trail. Confirm the drop when it arrives.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {missionDone && (
        <div className="mt-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-[13px] font-bold text-emerald-800">Run complete - payload delivered and rover home.</p>
        </div>
      )}
      {activeIdx >= 0 && (
        <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 transition-all duration-500" style={{ width: `${(mission.filter((s) => s.state === 'done').length / mission.length) * 100}%` }} />
        </div>
      )}
    </div>
  );
}



