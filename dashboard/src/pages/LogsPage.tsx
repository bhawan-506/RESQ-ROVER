import { useState, useMemo } from 'react';
import { Search, Download, Trash2 } from 'lucide-react';
import { useRover } from '../context/RoverContext';
import { parseLogTag } from '../lib/esp32';
import { cn } from '../lib/utils';

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

export function LogsPage() {
  const { wifiLogs, connection, clearLogs } = useRover();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');

  const counts = useMemo(() => ({
    total: wifiLogs.length,
    info: wifiLogs.filter((l) => l.level === 'info').length,
    warn: wifiLogs.filter((l) => l.level === 'warn').length,
    error: wifiLogs.filter((l) => l.level === 'error').length,
    debug: wifiLogs.filter((l) => l.level === 'debug').length,
  }), [wifiLogs]);

  const filtered = wifiLogs.filter((l) => {
    if (level !== 'all' && l.level !== level) return false;
    if (q && !l.raw.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const exportLogs = () => {
    const blob = new Blob([wifiLogs.map((l) => `${new Date(l.timestamp).toISOString()} [${l.level.toUpperCase()}] ${l.raw}`).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resq-rover-wifi-logs.txt';
    a.click();
  };

  const hi = (text: string) => {
    if (!q.trim()) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return text;
    return (<>{text.slice(0, i)}<mark className="bg-amber-300/90 text-slate-900 rounded px-0.5">{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>);
  };

  return (
    <div className="page space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">WiFi logs</h1>
          <p className="page-sub">
            Raw ESP32 feed over HTTP
            <span className={cn("ml-2 inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-1 rounded-lg", connection === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
              <span className={cn("w-1.5 h-1.5 rounded-full", connection === 'live' ? 'bg-emerald-500' : 'bg-amber-500')} />
              {connection === 'live' ? 'LIVE HARDWARE' : 'SIMULATED'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clearLogs} className="btn btn-secondary"><Trash2 className="w-4 h-4" /> Clear</button>
          <button onClick={exportLogs} className="btn btn-primary"><Download className="w-4 h-4" /> Export .txt</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {[
          { k: 'Total lines', v: counts.total, c: 'text-slate-900' },
          { k: 'Info', v: counts.info, c: 'text-sky-600' },
          { k: 'Warnings', v: counts.warn, c: 'text-amber-600' },
          { k: 'Errors', v: counts.error, c: 'text-orange-600' },
          { k: 'Debug', v: counts.debug, c: 'text-slate-400' },
        ].map((s) => (
          <div key={s.k} className="panel p-4 text-center">
            <p className={cn("text-[24px] font-extrabold leading-none", s.c)}>{s.v}</p>
            <p className="text-[12px] font-semibold text-slate-400 mt-1.5">{s.k}</p>
          </div>
        ))}
      </div>

      <div className="panel p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search logs, e.g. gps, wifi, nav" className="input !pl-11" />
        </div>
        <div className="filter-group shrink-0">
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={cn("filter-btn capitalize", level === l && "active")}>
              {l}{l !== 'all' && <span className="ml-1 opacity-60">{counts[l]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[18px] border border-slate-800 bg-slate-950 shadow-xl">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10">
          <p className="text-[12px] font-bold tracking-widest text-slate-400">TAIL: {filtered.length} / {wifiLogs.length} LINES</p>
          <p className="text-[12px] text-slate-500 mono">/logs endpoint • newest first</p>
        </div>
        <div className="p-4 min-h-[420px] max-h-[620px] overflow-y-auto mono text-[13px] leading-[1.8]">
          {filtered.map((l) => {
            const tag = parseLogTag(l.raw);
            const msg = l.raw.replace(/^\[[^\]]+\]\s*/, '');
            return (
              <div key={l.id} className="flex gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.04]">
                <span className="text-slate-600 shrink-0 w-20">{new Date(l.timestamp).toLocaleTimeString('en-GB', { hour12: false })}</span>
                <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border h-fit w-14 text-center",
                  l.level === 'error' ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : l.level === 'warn' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : l.level === 'debug' ? 'bg-white/5 text-slate-500 border-white/10' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25')}>
                  {l.level.toUpperCase()}
                </span>
                <span className={cn("shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md border h-fit", tagColor[tag] || tagColor.SYS)}>{tag}</span>
                <span className="text-slate-200 break-all">{hi(msg)}</span>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-slate-600 py-12 text-center">No logs match. Try clearing search or switching level.</p>}
        </div>
      </div>
    </div>
  );
}



