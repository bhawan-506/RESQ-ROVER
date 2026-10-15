import { useState, useMemo } from 'react';
import { Terminal, Pause, Play, Trash2 } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { parseLogTag } from '../../lib/esp32';
import { cn } from '../../lib/utils';

const tagColor: Record<string, string> = {
  GPS: 'text-sky-300 bg-sky-500/10 border-sky-500/25',
  WIFI: 'text-violet-300 bg-violet-500/10 border-violet-500/25',
  NAV: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  PWR: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  CMD: 'text-blue-300 bg-blue-500/10 border-blue-500/25',
  SYS: 'text-slate-300 bg-white/5 border-white/10',
  BOOT: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  SOS: 'text-orange-300 bg-orange-500/15 border-orange-500/30',
};

export function WifiLogsPanel({ limit = 16 }: { limit?: number }) {
  const { wifiLogs, connection, clearLogs } = useRover();
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const counts = useMemo(() => ({
    info: wifiLogs.filter((l) => l.level === 'info').length,
    warn: wifiLogs.filter((l) => l.level === 'warn').length,
    error: wifiLogs.filter((l) => l.level === 'error').length,
  }), [wifiLogs]);

  const rows = wifiLogs.filter((l) => filter === 'all' || l.level === filter).slice(0, paused ? limit : limit);

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-800 bg-slate-950 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">ESP32 link log</p>
            <p className="text-[12px] text-slate-400">{connection === 'live' ? 'Streaming from hardware' : 'Simulated telemetry stream'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPaused(!paused)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title={paused ? 'Resume' : 'Pause'}>
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={clearLogs} className="p-2 rounded-lg text-slate-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors" title="Clear">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5">
        {(['all', 'info', 'warn', 'error'] as const).map((l) => (
          <button key={l} onClick={() => setFilter(l)}
            className={cn("text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors capitalize",
              filter === l ? 'bg-white text-slate-900 border-white' : 'text-slate-400 border-white/10 hover:text-white hover:border-white/25')}>
            {l}{l !== 'all' && <span className="ml-1 opacity-60">{counts[l]}</span>}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500 mono">{paused ? 'PAUSED' : '�-� TAILING'}</span>
      </div>

      <div className="p-4 flex-1 min-h-[280px] max-h-[380px] overflow-y-auto mono text-[12.5px] leading-[1.75]">
        {rows.map((l) => {
          const tag = parseLogTag(l.raw);
          const msg = l.raw.replace(/^\[[^\]]+\]\s*/, '');
          return (
            <div key={l.id} className="flex gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/[0.04]">
              <span className="text-slate-600 shrink-0">{new Date(l.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</span>
              <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border h-fit", tagColor[tag] || tagColor.SYS)}>{tag}</span>
              <span className={cn("break-all", l.level === 'error' ? 'text-orange-300' : l.level === 'warn' ? 'text-amber-200' : 'text-slate-300')}>{msg}</span>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-slate-600 text-center py-10">No logs for this filter.</p>}
      </div>
    </div>
  );
}



