import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

export function ConnectionBar() {
  const { connection, pollIntervalMs, lastFetchAt, fetchError, pollsOk, pollDrops, setPollIntervalMs, connect, disconnect } = useRover();
  const live = connection === 'live';
  const busy = connection === 'connecting';

  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-center gap-4 sm:gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn("min-w-[48px] min-h-[48px] rounded-2xl flex items-center justify-center shrink-0", live ? "bg-emerald-50" : "bg-slate-100")}>
            {live ? <Wifi className="w-5 h-5 text-emerald-600" /> : <WifiOff className="w-5 h-5 text-slate-400" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-[15px] sm:text-[16px] font-bold text-slate-900">
                {live ? 'ESP32 live via WiFi' : busy ? 'Connecting...' : 'Simulation mode'}
              </p>
              <span className={cn("mqtt-pill", live ? "connected" : busy ? "connecting" : "disconnected")}>
                {live ? `Synced ${lastFetchAt ? Math.max(0, Math.floor((Date.now() - lastFetchAt) / 1000)) : 0}s ago` : 'No ESP32 linked'}
              </span>
            </div>
            <p className="text-[12px] sm:text-[13px] text-slate-500 mt-1">
              {live
                ? `Streaming status, GPS, radar and logs · ${pollsOk} polls ok · ${pollDrops} drops`
                : 'Join the rover WiFi and hit connect to go live'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full xl:w-auto">
          <select value={pollIntervalMs} onChange={(e) => setPollIntervalMs(Number(e.target.value))} className="select !w-auto shrink-0" aria-label="Refresh rate">
            <option value={2000}>2s refresh</option>
            <option value={3000}>3s refresh</option>
            <option value={5000}>5s refresh</option>
          </select>
          {live ? (
            <button onClick={disconnect} className="btn btn-secondary w-full sm:w-auto">Disconnect</button>
          ) : (
            <button onClick={connect} disabled={busy} className="btn btn-primary w-full sm:w-auto">
              <RefreshCw className={busy ? "w-4 h-4 animate-spin" : "w-4 h-4"} /> {busy ? 'Probing...' : 'Connect ESP32'}
            </button>
          )}
        </div>
      </div>
      {fetchError && !live && (
        <div className="mt-4 flex items-start gap-2.5 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{fetchError}</span>
        </div>
      )}
    </div>
  );
}
