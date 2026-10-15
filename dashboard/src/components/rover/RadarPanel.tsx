import { useEffect, useMemo, useRef, useState } from 'react';
import { Radar } from 'lucide-react';
import { useRover } from '../../context/RoverContext';
import { RADAR_MAX_M } from '../../types';
import { cn } from '../../lib/utils';

export function RadarPanel() {
  const { radar, connection } = useRover();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sweepRef = useRef(0);
  const sweepDir = useRef(1);
  const frameRef = useRef(0);

  const closest = useMemo(() => {
    if (radar.length === 0) return null;
    return radar.reduce((a, b) => (b.distM < a.distM ? b : a));
  }, [radar]);

  const state = !closest || closest.distM >= 1.5
    ? { label: 'CLEAR', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
    : closest.distM >= 0.8
      ? { label: 'CAUTION', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
      : { label: 'STOP', cls: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };

  const scanAtRef = useRef(Date.now());
  const [, forceTick] = useState(0);
  const lastScanRef = useRef<string>('');

  const scanKey = radar.map((p) => `${p.angleDeg}:${p.distM}`).join(',');
  useEffect(() => {
    if (scanKey !== lastScanRef.current) {
      lastScanRef.current = scanKey;
      scanAtRef.current = Date.now();
    }
  }, [scanKey]);

  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      // ping-pong sweep like a real servo: 0 -> 180 -> 0
      sweepRef.current += sweepDir.current * 1.6;
      if (sweepRef.current >= 180) { sweepRef.current = 180; sweepDir.current = -1; }
      if (sweepRef.current <= 0) { sweepRef.current = 0; sweepDir.current = 1; }
      frameRef.current += 1;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h - 18;
      const R = Math.min(w / 2 - 46, h - 52);
      const toPx = (angleDeg: number, distM: number): [number, number] => {
        const t = (angleDeg * Math.PI) / 180;
        const r = (distM / RADAR_MAX_M) * R;
        return [cx + Math.cos(t) * r, cy - Math.sin(t) * r];
      };

      // range rings
      ctx.lineWidth = 1;
      for (let m = 1; m <= RADAR_MAX_M; m++) {
        ctx.strokeStyle = 'rgba(148,163,184,0.16)';
        ctx.beginPath();
        ctx.arc(cx, cy, (m / RADAR_MAX_M) * R, Math.PI, 0);
        ctx.stroke();
        ctx.fillStyle = 'rgba(148,163,184,0.45)';
        ctx.font = '600 9px Inter, sans-serif';
        ctx.fillText(`${m}m`, cx + 4, cy - (m / RADAR_MAX_M) * R - 3);
      }

      // spokes + degree labels
      for (let a = 0; a <= 180; a += 10) {
        const [x2, y2] = toPx(a, RADAR_MAX_M);
        ctx.strokeStyle = a % 30 === 0 ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.12)';
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2); ctx.stroke();
        const [lx, ly] = toPx(a, RADAR_MAX_M + 0.45);
        ctx.fillStyle = a === 90 ? '#93c5fd' : 'rgba(203,213,225,0.75)';
        ctx.font = `${a % 30 === 0 ? '700' : '500'} 10px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${a}`, lx, ly + 3);
        ctx.textAlign = 'left';
      }

      // scan envelope fill
      if (radar.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        radar.forEach((p) => {
          const [x, y] = toPx(p.angleDeg, p.distM);
          ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(59,130,246,0.22)';
        ctx.fill();
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // sweep wedge
      const sa = (sweepRef.current * Math.PI) / 180;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, -sa - 0.35, -sa);
      ctx.closePath();
      ctx.fillStyle = 'rgba(96,165,250,0.14)';
      ctx.fill();
      ctx.restore();
      const [sx, sy] = [cx + Math.cos(sa) * R, cy - Math.sin(sa) * R];
      ctx.strokeStyle = 'rgba(147,197,253,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();

      // blips
      radar.forEach((p) => {
        if (p.distM >= RADAR_MAX_M - 0.01) return;
        const [x, y] = toPx(p.angleDeg, p.distM);
        const hot = closest && p.angleDeg === closest.angleDeg && p.distM === closest.distM;
        const col = p.distM < 0.8 ? '#fb923c' : p.distM < 1.5 ? '#fbbf24' : '#7dd3fc';
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, p.distM < 0.8 ? 4.5 : 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (hot) {
          const ph = (frameRef.current % 40) / 40;
          ctx.strokeStyle = `rgba(251,146,60,${(1 - ph).toFixed(2)})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 7 + ph * 10, 0, Math.PI * 2); ctx.stroke();
        }
      });

      // rover base
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#0b1120';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0b1120';
      ctx.font = '800 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('R1', cx, cy + 2.5);
      ctx.textAlign = 'left';

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [radar]);

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-800 bg-slate-950 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
            <Radar className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">180° obstacle radar</p>
            <p className="text-[12px] text-slate-400">
              {connection === 'live' ? 'Servo scan from ESP32' : 'Simulated servo sweep'} · {RADAR_MAX_M}m range · {radar.length} pts · scan {Math.max(0, Math.floor((Date.now() - scanAtRef.current) / 1000))}s ago
            </p>
          </div>
        </div>
        <span className={cn("text-[11px] font-bold px-2.5 py-1.5 rounded-lg border", state.cls)}>{state.label}</span>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="w-full block" style={{ height: 'clamp(280px, 36vw, 420px)' }} />
        <div className="absolute left-4 bottom-3 rounded-xl bg-black/55 backdrop-blur px-3.5 py-2 border border-white/10">
          <p className="text-[10px] font-bold tracking-widest text-slate-400">CLOSEST</p>
          <p className="mono text-[15px] font-bold text-white">
            {closest ? `${closest.distM.toFixed(1)}m @ ${Math.round(closest.angleDeg)}°` : 'no return'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
        {[
          { k: 'LEFT 135-180', v: `${minIn(radar, 135, 180)}m` },
          { k: 'AHEAD 75-105', v: `${minIn(radar, 75, 105)}m` },
          { k: 'RIGHT 0-45', v: `${minIn(radar, 0, 45)}m` },
        ].map((s) => (
          <div key={s.k} className="px-5 py-3">
            <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500">{s.k}</p>
            <p className="mono text-[14px] font-bold text-white mt-0.5">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function minIn(radar: { angleDeg: number; distM: number }[], from: number, to: number): string {
  const vals = radar.filter((p) => p.angleDeg >= from && p.angleDeg <= to).map((p) => p.distM);
  if (vals.length === 0) return '--';
  return Math.min(...vals).toFixed(1);
}
