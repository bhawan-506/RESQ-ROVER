import { useEffect, useRef } from 'react';
import { Navigation } from 'lucide-react';
import { useRover, YARD_W, YARD_H } from '../../context/RoverContext';
import { cn } from '../../lib/utils';

export function GpsTrailMap({ height }: { height?: number }) {
  const { trail, telemetry, gpsAgeS, distanceM, connection } = useRover();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // deep mission bg with vignette
    const bg = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, Math.max(w, h) * 0.75);
    bg.addColorStop(0, '#16213a');
    bg.addColorStop(1, '#0b1220');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pad = 30;
    const s = Math.min((w - pad * 2) / YARD_W, (h - pad * 2) / YARD_H);
    const ox = (w - YARD_W * s) / 2;
    const oy = (h - YARD_H * s) / 2;
    const toPx = (x: number, y: number): [number, number] => [ox + x * s, oy + (YARD_H - y) * s];

    // grid
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= YARD_W; gx += 2) {
      const [x1, y1] = toPx(gx, 0);
      const [x2, y2] = toPx(gx, YARD_H);
      ctx.strokeStyle = gx % 6 === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.1)';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (gx % 6 === 0) {
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '600 9px Inter, sans-serif';
        const [lx] = toPx(gx, 0);
        ctx.fillText(`${gx}m`, lx - 8, h - 8);
      }
    }
    for (let gy = 0; gy <= YARD_H; gy += 2) {
      const [x1, y1] = toPx(0, gy);
      const [x2, y2] = toPx(YARD_W, gy);
      ctx.strokeStyle = gy % 4 === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.1)';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // yard fence
    const [bx, by] = toPx(0, YARD_H);
    ctx.strokeStyle = 'rgba(148,163,184,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(bx, by, YARD_W * s, YARD_H * s);
    ctx.setLineDash([]);

    // zones
    const zones = [
      { x: 2, y: 10.3, w: 5.2, h: 3.7, label: 'DROP A', sub: 'MEDKIT', color: 'rgba(249,115,22,0.13)', border: 'rgba(249,115,22,0.55)', text: '#fdba74' },
      { x: 16.8, y: 1.8, w: 5.2, h: 3.7, label: 'PICKUP B', sub: 'STAGING', color: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.55)', text: '#6ee7b7' },
    ];
    zones.forEach((z) => {
      const [zx, zy] = toPx(z.x, z.y + z.h);
      ctx.fillStyle = z.color;
      ctx.strokeStyle = z.border;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(zx, zy, z.w * s, z.h * s, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = z.text;
      ctx.font = '800 10px Inter, sans-serif';
      ctx.fillText(z.label, zx + 10, zy + 18);
      ctx.font = '600 8px Inter, sans-serif';
      ctx.globalAlpha = 0.7;
      ctx.fillText(z.sub, zx + 10, zy + 30);
      ctx.globalAlpha = 1;
    });

    // trail with glow
    if (trail.length >= 2) {
      ctx.save();
      ctx.shadowColor = 'rgba(59,130,246,0.55)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.length; i++) {
        const a = 0.1 + (0.9 * i) / trail.length;
        ctx.strokeStyle = i > trail.length - 30 ? `rgba(251,191,36,${a.toFixed(2)})` : `rgba(96,165,250,${a.toFixed(2)})`;
        const [x1, y1] = toPx(trail[i - 1].x, trail[i - 1].y);
        const [x2, y2] = toPx(trail[i].x, trail[i].y);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      }
      ctx.restore();

      const [sxPx, syPx] = toPx(trail[0].x, trail[0].y);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#0b1220';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sxPx, syPx, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0b1220';
      ctx.font = '800 7px Inter, sans-serif';
      ctx.fillText('S', sxPx - 3, syPx + 2.5);

      // accuracy circle from hdop
      const cur = trail[trail.length - 1];
      const [cx, cy] = toPx(cur.x, cur.y);
      const accR = Math.max(8, Math.min(30, telemetry.gps.hdop * 12));
      ctx.fillStyle = 'rgba(56,189,248,0.1)';
      ctx.strokeStyle = 'rgba(56,189,248,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.arc(cx, cy, accR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);

      // heading wedge
      const hdg = (telemetry.gps.headingDeg * Math.PI) / 180;
      const hx = Math.cos(hdg) * 22;
      const hy = -Math.sin(hdg) * 22;
      ctx.fillStyle = 'rgba(251,191,36,0.9)';
      ctx.beginPath();
      ctx.moveTo(cx + hx, cy + hy);
      ctx.lineTo(cx + Math.cos(hdg + 2.5) * 10, cy - Math.sin(hdg + 2.5) * 10);
      ctx.lineTo(cx + Math.cos(hdg - 2.5) * 10, cy - Math.sin(hdg - 2.5) * 10);
      ctx.closePath(); ctx.fill();

      // rover body
      ctx.save();
      ctx.shadowColor = 'rgba(59,130,246,0.8)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#2563eb';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = '800 8px Inter, sans-serif';
      ctx.fillText('R1', cx - 6, cy + 3);
    }

    // compass
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.beginPath(); ctx.arc(w - 34, 34, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#93c5fd';
    ctx.font = '800 11px Inter, sans-serif';
    ctx.fillText('N', w - 38.5, 30);
    ctx.fillStyle = 'rgba(148,163,184,0.8)';
    ctx.beginPath();
    ctx.moveTo(w - 34, 34 + 8);
    ctx.lineTo(w - 37, 34 - 4);
    ctx.lineTo(w - 34, 34 - 7);
    ctx.lineTo(w - 31, 34 - 4);
    ctx.closePath(); ctx.fill();
  }, [trail, telemetry]);

  const stale = gpsAgeS > 10;

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-800 bg-slate-950 shadow-xl">
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="relative flex w-2.5 h-2.5">
            <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", connection === 'live' ? 'bg-emerald-400' : 'bg-amber-400')} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", connection === 'live' ? 'bg-emerald-400' : 'bg-amber-400')} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-white tracking-tight">Live position</p>
            <p className="text-[12px] text-slate-400">
              {connection === 'live' ? 'ESP32 GPS feed' : 'Simulated yard run'} • {distanceM.toFixed(1)} m travelled • {trail.length} pts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-lg border", stale ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'bg-white/5 text-slate-300 border-white/10')}>
            {gpsAgeS <= 1 ? 'LIVE' : `${gpsAgeS}s ago`}
          </span>
        </div>
      </div>

      <div className="relative">
        <canvas ref={canvasRef} className="w-full block" style={{ height: height ?? 'clamp(300px, 44vw, 540px)' }} />
        <div className="absolute left-4 bottom-4 flex items-center gap-2 rounded-xl bg-black/55 backdrop-blur px-3.5 py-2.5 border border-white/10">
          <Navigation className="w-4 h-4 text-amber-300" />
          <span className="mono text-[12px] font-semibold text-white">
            {telemetry.gps.lat.toFixed(6)}, {telemetry.gps.lng.toFixed(6)}
          </span>
        </div>
        <div className="absolute right-4 bottom-4 flex items-center gap-2 rounded-xl bg-black/55 backdrop-blur px-3.5 py-2.5 border border-white/10">
          <Navigation className="w-4 h-4 text-amber-300" />
          <span className="mono text-[12px] font-semibold text-white">
            {telemetry.gps.speedMps.toFixed(1)} m/s • {Math.round(telemetry.gps.headingDeg)}°
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.02]">
        {[
          { k: 'DISTANCE', v: `${distanceM.toFixed(1)} m` },
          { k: 'HEADING', v: `${Math.round(telemetry.gps.headingDeg)}°` },
          { k: 'YARD', v: trail.length ? `x ${trail[trail.length - 1].x.toFixed(1)} · y ${trail[trail.length - 1].y.toFixed(1)}` : '-' },
        ].map((s) => (
          <div key={s.k} className="px-6 py-3.5">
            <p className="text-[10px] font-bold tracking-[0.14em] text-slate-500">{s.k}</p>
            <p className="mono text-[14px] font-bold text-white mt-1">{s.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}



