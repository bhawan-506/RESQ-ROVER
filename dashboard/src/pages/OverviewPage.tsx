import { useState, useEffect } from 'react';
import { ConnectionBar } from '../components/rover/ConnectionBar';
import { StatsBar } from '../components/rover/StatsBar';
import { RoverStatusCard } from '../components/rover/RoverStatusCard';
import { GpsTrailMap } from '../components/rover/GpsTrailMap';
import { RadarPanel } from '../components/rover/RadarPanel';
import { WifiLogsPanel } from '../components/rover/WifiLogsPanel';
import { ActivityLog } from '../components/rover/ActivityLog';
import { SosBanner } from '../components/rover/SosBanner';
import { MissionChecklist } from '../components/rover/MissionChecklist';
import { useRover } from '../context/RoverContext';
import { cn } from '../lib/utils';

export function OverviewPage() {
  const { connection, missionDone } = useRover();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="page space-y-5 sm:space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title">Rover overview</h1>
            <span className={cn("mqtt-pill", connection === 'live' ? "connected" : "disconnected")}>
              <span className={cn("w-1.5 h-1.5 rounded-full", connection === 'live' ? 'bg-emerald-500' : 'bg-slate-400')} />
              {connection === 'live' ? 'LIVE' : 'SIMULATED'}
            </span>
            {missionDone && (
              <span className="mqtt-pill connected">MISSION COMPLETE</span>
            )}
          </div>
          <p className="page-sub">Yard prototype: GPS position, ESP32 link and delivery runs</p>
        </div>
        <p className="mono text-[12px] sm:text-[13px] text-slate-400 shrink-0">
          {clock.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {clock.toLocaleTimeString('en-GB', { hour12: false })}
        </p>
      </div>

      <SosBanner />
      <ConnectionBar />
      <StatsBar />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 min-w-0"><GpsTrailMap /></div>
        <div className="xl:col-span-5 min-w-0"><RoverStatusCard /></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 min-w-0"><RadarPanel /></div>
        <div className="xl:col-span-5 min-w-0"><MissionChecklist /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="min-w-0"><WifiLogsPanel /></div>
        <div className="min-w-0"><ActivityLog /></div>
      </div>

      <p className="text-center text-[12px] text-slate-400 pt-2">
        RESQ-R1 · yard prototype 24 x 16 m · showing simulated data until an ESP32 connects
      </p>
    </div>
  );
}



