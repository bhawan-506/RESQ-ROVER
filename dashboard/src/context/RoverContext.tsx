import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import type { RoverTelemetry, TrailPoint, WifiLogLine, LogEntry, ConnectionState, RoverMode, RadarPoint } from '../types';
import { RADAR_MAX_M } from '../types';
import { normalizeBaseUrl, fetchEsp32Status, fetchEsp32Gps, fetchEsp32Logs, fetchEsp32Radar, parseLogLevel, haversineM, bearingDeg, fixQuality, isValidMode, clampNum, isValidIpInput, type FixQuality } from '../lib/esp32';

// Prototype yard 24m x 16m anchored at BASE. Live GPS deltas map onto yard.
const BASE_LAT = 28.6139;
const BASE_LNG = 77.209;
const YARD_W = 24;
const YARD_H = 16;
const METERS_PER_DEG_LAT = 111320;
const BASE_COS = Math.cos((BASE_LAT * Math.PI) / 180);

function metersToGps(x: number, y: number) {
  return {
    lat: BASE_LAT + (y - YARD_H / 2) / METERS_PER_DEG_LAT,
    lng: BASE_LNG + (x - YARD_W / 2) / (METERS_PER_DEG_LAT * BASE_COS),
  };
}

function gpsToYard(lat: number, lng: number) {
  const x = YARD_W / 2 + (lng - BASE_LNG) * METERS_PER_DEG_LAT * BASE_COS;
  const y = YARD_H / 2 + (lat - BASE_LAT) * METERS_PER_DEG_LAT;
  return { x, y, outOfYard: x < -30 || x > YARD_W + 30 || y < -30 || y > YARD_H + 30 };
}

function clampYard(x: number, y: number) {
  return { x: Math.max(0.5, Math.min(YARD_W - 0.5, x)), y: Math.max(0.5, Math.min(YARD_H - 0.5, y)) };
}

// Simulated 180-degree servo scan: fixed obstacles + one drifting object
function makeSimScan(tick: number): RadarPoint[] {
  const mover = 30 + ((tick * 7) % 120); // slow drift 30..150 deg
  const pts: RadarPoint[] = [];
  for (let a = 0; a <= 180; a += 5) {
    let d = RADAR_MAX_M;
    if (a >= 55 && a <= 80) d = 2.3; // wall
    if (a >= 115 && a <= 125) d = 1.1; // pole, close
    if (a >= 140 && a <= 152) d = 3.1; // crate
    if (Math.abs(a - mover) <= 4) d = Math.min(d, 1.7); // moving object
    d += (Math.random() - 0.5) * 0.12;
    pts.push({ angleDeg: a, distM: Number(Math.max(0.1, Math.min(RADAR_MAX_M, d)).toFixed(2)) });
  }
  return pts;
}

function safeStoreGet(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeStoreSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch { /* private mode */ }
}

function initialTelemetry(): RoverTelemetry {
  const { lat, lng } = metersToGps(6, 5);
  return {
    espBatteryPct: 87, stmBatteryPct: 82, rssiDbm: -58, uptimeS: 1240, tempC: 36.4,
    tiltXDeg: 2.1, tiltYDeg: -1.4,
    mode: 'EN_ROUTE', payload: 'MEDKIT-A', missionPct: 34,
    gps: { lat, lng, speedMps: 0.9, headingDeg: 48, sats: 9, hdop: 0.8, timestamp: Date.now() },
  };
}

// Waypoint mission: pickup B -> drop A loop, so trail tells a story
const WAYPOINTS = [
  { x: 19.5, y: 3.5, name: 'PICKUP B' },
  { x: 14, y: 8, name: 'TRANSIT' },
  { x: 4.5, y: 12.2, name: 'DROP A' },
  { x: 10, y: 8, name: 'TRANSIT' },
];

const VALID_SOURCES: LogEntry['source'][] = ['esp32', 'gps', 'rover', 'system'];

export type MissionStage = {
  id: 'pickup' | 'enroute' | 'drop' | 'return';
  label: string;
  detail: string;
  state: 'done' | 'active' | 'todo';
  at: number | null;
};

type RoverContextType = {
  telemetry: RoverTelemetry;
  trail: TrailPoint[];
  radar: RadarPoint[];
  wifiLogs: WifiLogLine[];
  logs: LogEntry[];
  mission: MissionStage[];
  missionDone: boolean;
  connection: ConnectionState;
  esp32Ip: string;
  esp32Base: string;
  ipValid: boolean;
  pollIntervalMs: number;
  lastFetchAt: number | null;
  fetchError: string | null;
  pollsOk: number;
  pollDrops: number;
  gpsAgeS: number;
  quality: FixQuality;
  distanceM: number;
  setEsp32Ip: (ip: string) => void;
  setPollIntervalMs: (ms: number) => void;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (cmd: string) => void;
  clearLogs: () => void;
  confirmPickup: () => void;
  confirmDrop: () => void;
  completeReturn: () => void;
  resetMission: () => void;
  triggerSOS: () => void;
  resolveSOS: () => void;
  returnToBase: () => void;
};

const RoverContext = createContext<RoverContextType | null>(null);

export function RoverProvider({ children }: { children: ReactNode }) {
  const [telemetry, setTelemetry] = useState<RoverTelemetry>(initialTelemetry);
  const [trail, setTrail] = useState<TrailPoint[]>(() => {
    const pts: TrailPoint[] = [];
    let x = 6, y = 5;
    for (let i = 0; i < 36; i++) {
      x += 0.32; y += 0.12 + Math.sin(i / 4) * 0.08;
      const { lat, lng } = metersToGps(x, y);
      pts.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), lat, lng, timestamp: Date.now() - (36 - i) * 2000 });
    }
    return pts;
  });
  const [wifiLogs, setWifiLogs] = useState<WifiLogLine[]>([
    { id: 'w0', raw: '[BOOT] RESQ Rover v0.4 init OK: ESP32 + GPS online', timestamp: Date.now() - 120000, level: 'info' },
    { id: 'w1', raw: '[WIFI] AP 192.168.4.1 linked RSSI -58 dBm', timestamp: Date.now() - 100000, level: 'info' },
    { id: 'w2', raw: '[GPS] 3D fix sats=9 hdop=0.8', timestamp: Date.now() - 90000, level: 'info' },
    { id: 'w3', raw: '[NAV] route PICKUP B to DROP A loaded (4 wps)', timestamp: Date.now() - 80000, level: 'info' },
    { id: 'w4', raw: '[PWR] esp 87% stm 82% draw 1.2A temp 36.4C', timestamp: Date.now() - 60000, level: 'info' },
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'l0', message: 'Simulator running - connect ESP32 IP for live hardware feed.', source: 'system', level: 'info', timestamp: Date.now() - 120000 },
    { id: 'l1', message: 'GPS 3D fix: 9 sats, HDOP 0.8 - quality EXCELLENT', source: 'gps', level: 'success', timestamp: Date.now() - 90000 },
    { id: 'l2', message: 'Mission MEDKIT-A: en route to PICKUP B', source: 'rover', level: 'info', timestamp: Date.now() - 80000 },
  ]);
  const [connection, setConnection] = useState<ConnectionState>('simulated');
  const [radar, setRadar] = useState<RadarPoint[]>(() => makeSimScan(0));
  const [mission, setMission] = useState<MissionStage[]>([
    { id: 'pickup', label: 'Pickup', detail: 'Collect MEDKIT-A at PICKUP B', state: 'active', at: null },
    { id: 'enroute', label: 'En route', detail: 'Navigate to DROP A', state: 'todo', at: null },
    { id: 'drop', label: 'Drop', detail: 'Deliver payload at DROP A', state: 'todo', at: null },
    { id: 'return', label: 'Return', detail: 'Back to base', state: 'todo', at: null },
  ]);
  const [esp32Ip, setEsp32Ip] = useState(() => safeStoreGet('resq-esp32-ip', '192.168.4.2'));
  const [pollIntervalMs, setPollIntervalMs] = useState(3000);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pollsOk, setPollsOk] = useState(0);
  const [pollDrops, setPollDrops] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const simRef = useRef({ x: 16, y: 7, wp: 0, speed: 0.9 });
  const lastGpsRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const baseRef = useRef<string>('');
  const intervalRef = useRef<number>(3000);
  const smoothSpeed = useRef(0.9);
  const outOfYardWarned = useRef(false);
  const failStreak = useRef(0);

  const esp32Base = normalizeBaseUrl(esp32Ip);
  const ipValid = isValidIpInput(esp32Ip);

  // ticking clock so gpsAgeS stays live between polls
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const addLog = useCallback((message: string, source: LogEntry['source'], level: LogEntry['level']) => {
    const src = (VALID_SOURCES as string[]).includes(source) ? source : 'system';
    setLogs((prev) => [{ id: `l-${Date.now()}-${Math.random().toString(36).slice(2)}`, message, source: src as LogEntry['source'], level, timestamp: Date.now() }, ...prev].slice(0, 150));
  }, []);

  const pushWifiLog = useCallback((raw: string) => {
    const line = String(raw).slice(0, 300);
    if (!line.trim()) return;
    setWifiLogs((prev) => {
      if (prev[0] && prev[0].raw === line && Date.now() - prev[0].timestamp < 1500) return prev; // dedupe bursts
      return [{ id: `w-${Date.now()}-${Math.random().toString(36).slice(2)}`, raw: line, timestamp: Date.now(), level: parseLogLevel(line) }, ...prev].slice(0, 200);
    });
  }, []);

  const sendCommand = useCallback((cmd: string) => {
    const clean = String(cmd).toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 32) || 'PING';
    addLog(`Command queued: ${clean}`, 'system', 'info');
    pushWifiLog(`[CMD] ${clean} → ack OK`);
  }, [addLog, pushWifiLog]);

  const clearLogs = useCallback(() => {
    setWifiLogs([]);
    addLog('WiFi log buffer cleared', 'system', 'warning');
  }, [addLog]);

  const setMode = useCallback((mode: RoverMode) => {
    setTelemetry((prev) => ({ ...prev, mode }));
  }, []);

  const markStage = useCallback((id: MissionStage['id'], state: MissionStage['state']) => {
    setMission((prev) => prev.map((s) => (s.id === id ? { ...s, state, at: state === 'todo' ? null : Date.now() } : s)));
  }, []);

  const confirmPickup = useCallback(() => {
    markStage('pickup', 'done');
    setMission((prev) => prev.map((s) => (s.id === 'enroute' ? { ...s, state: 'active', at: Date.now() } : s)));
    setMode('EN_ROUTE');
    pushWifiLog('[MISSION] pickup confirmed MEDKIT-A → en route DROP A');
    addLog('Pickup confirmed - rover en route to DROP A', 'rover', 'success');
  }, [markStage, setMode, pushWifiLog, addLog]);

  const confirmDrop = useCallback(() => {
    markStage('enroute', 'done');
    markStage('drop', 'done');
    setMission((prev) => prev.map((s) => (s.id === 'return' ? { ...s, state: 'active', at: Date.now() } : s)));
    setTelemetry((prev) => ({ ...prev, mode: 'RETURNING', missionPct: 100 }));
    pushWifiLog('[MISSION] drop confirmed at DROP A - payload delivered');
    addLog('Drop confirmed at DROP A - payload delivered, returning to base', 'rover', 'success');
  }, [markStage, pushWifiLog, addLog]);

  const completeReturn = useCallback(() => {
    setMission((prev) => prev.map((s) => ({ ...s, state: 'done' as const, at: s.at ?? Date.now() })));
    setMode('IDLE');
    pushWifiLog('[MISSION] rover back at base - mission complete');
    addLog('Mission complete - rover back at base', 'rover', 'success');
  }, [setMode, pushWifiLog, addLog]);

  const resetMission = useCallback(() => {
    setMission([
      { id: 'pickup', label: 'Pickup', detail: 'Collect MEDKIT-A at PICKUP B', state: 'active', at: null },
      { id: 'enroute', label: 'En route', detail: 'Navigate to DROP A', state: 'todo', at: null },
      { id: 'drop', label: 'Drop', detail: 'Deliver payload at DROP A', state: 'todo', at: null },
      { id: 'return', label: 'Return', detail: 'Back to base', state: 'todo', at: null },
    ]);
    setTelemetry((prev) => ({ ...prev, mode: 'EN_ROUTE', missionPct: 34 }));
    pushWifiLog('[MISSION] mission reset - new run started');
    addLog('Mission reset - new delivery run started', 'system', 'info');
  }, [pushWifiLog, addLog]);

  const triggerSOS = useCallback(() => {
    setMode('SOS');
    pushWifiLog('[SOS] BEACON ON - emergency broadcast');
    addLog('SOS beacon activated - emergency broadcast', 'rover', 'error');
  }, [setMode, pushWifiLog, addLog]);

  const resolveSOS = useCallback(() => {
    setMode('IDLE');
    pushWifiLog('[SOS] beacon cleared by operator');
    addLog('SOS cleared - rover holding in IDLE', 'system', 'success');
  }, [setMode, pushWifiLog, addLog]);

  const returnToBase = useCallback(() => {
    setMode('RETURNING');
    pushWifiLog('[CMD] RETURN_TO_BASE → ack OK');
    addLog('Return-to-base commanded', 'system', 'warning');
  }, [setMode, pushWifiLog, addLog]);

  // --- waypoint simulator ---
  useEffect(() => {
    if (connection === 'live') return;
    const t = setInterval(() => {
      const s = simRef.current;
      const target = WAYPOINTS[s.wp % WAYPOINTS.length];
      const dx = target.x - s.x;
      const dy = target.y - s.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.6) {
        s.wp += 1;
        const next = WAYPOINTS[s.wp % WAYPOINTS.length];
        pushWifiLog(`[NAV] waypoint ${target.name} reached → heading ${next.name}`);
        if (target.name === 'DROP A') addLog('Payload delivered at DROP A - returning to PICKUP B', 'rover', 'success');
      }
      s.speed = Math.max(0.5, Math.min(1.5, s.speed + (Math.random() - 0.5) * 0.12));
      const heading = (Math.atan2(dy, dx) * 180) / Math.PI;
      const rad = (heading * Math.PI) / 180;
      s.x = Math.max(0.8, Math.min(YARD_W - 0.8, s.x + Math.cos(rad) * s.speed));
      s.y = Math.max(0.8, Math.min(YARD_H - 0.8, s.y + Math.sin(rad) * s.speed));
      const { lat, lng } = metersToGps(s.x, s.y);
      smoothSpeed.current = smoothSpeed.current * 0.8 + s.speed * 0.2;

      setTelemetry((prev) => ({
        ...prev,
        espBatteryPct: Math.max(5, prev.espBatteryPct - 0.002),
        stmBatteryPct: Math.max(5, prev.stmBatteryPct - 0.003),
        rssiDbm: -55 - Math.floor(Math.random() * 10),
        uptimeS: prev.uptimeS + 1,
        tempC: 36 + Math.random() * 1.4,
        tiltXDeg: Number((Math.sin(Date.now() / 9000) * 6 + (Math.random() - 0.5) * 1.2).toFixed(1)),
        tiltYDeg: Number((Math.cos(Date.now() / 11000) * 5 + (Math.random() - 0.5) * 1.2).toFixed(1)),
        missionPct: Math.min(99, prev.missionPct + 0.04),
        gps: {
          lat, lng,
          speedMps: Number(smoothSpeed.current.toFixed(2)),
          headingDeg: Math.round(((heading % 360) + 360) % 360),
          sats: 8 + Math.floor(Math.random() * 3),
          hdop: Number((0.7 + Math.random() * 0.4).toFixed(1)),
          timestamp: Date.now(),
        },
      }));
      setTrail((prev) => [...prev.slice(-239), { x: Number(s.x.toFixed(2)), y: Number(s.y.toFixed(2)), lat, lng, timestamp: Date.now() }]);
    }, 1000);
    return () => clearInterval(t);
  }, [connection, pushWifiLog, addLog]);

  useEffect(() => {
    if (connection === 'live') return;
    let tick = 0;
    const t = setInterval(() => {
      tick += 1;
      setRadar(makeSimScan(tick));
    }, 2500);
    return () => clearInterval(t);
  }, [connection]);

  useEffect(() => {
    if (connection === 'live') return;
    const msgs = [
      '[GPS] 3D fix sats=9 hdop=0.8 dist 42.6m',
      '[NAV] x=16.2 y=7.1 hdg 048° wp PICKUP B 3.1m',
      '[PWR] esp 86% stm 81% draw 1.18A temp 36.6C',
      '[WIFI] RSSI -57 dBm rtt 12ms loss 0%',
      '[SYS] loop 1.00Hz heap 184KB ok',
    ];
    const t = setInterval(() => pushWifiLog(msgs[Math.floor(Math.random() * msgs.length)]), 6000);
    return () => clearInterval(t);
  }, [connection, pushWifiLog]);

  // --- live poll ---
  const doPoll = useCallback(async (base: string) => {
    try {
      const [st, gps, rawLogs, liveRadar] = await Promise.all([fetchEsp32Status(base), fetchEsp32Gps(base), fetchEsp32Logs(base), fetchEsp32Radar(base)]);
      if (!st && !gps && !rawLogs && !liveRadar) {
        failStreak.current += 1;
        setPollDrops((n) => n + 1);
        if (failStreak.current >= 3) {
          setFetchError('No response from ESP32 after 3 tries. Same WiFi? CORS enabled? Staying simulated.');
          setConnection('simulated');
          addLog(`ESP32 poll failed at ${base}`, 'system', 'warning');
        } else {
          setConnection('connecting');
          setFetchError(`No reply from ESP32, retrying (${failStreak.current}/3)...`);
        }
        return;
      }
      failStreak.current = 0;
      setFetchError(null);
      setLastFetchAt(Date.now());
      setPollsOk((n) => n + 1);
      setConnection('live');

      let derivedSpeed: number | undefined;
      let derivedHeading: number | undefined;
      let yard: { x: number; y: number } | null = null;
      let validGps: { lat: number; lng: number } | null = null;

      if (gps && gps.lat !== undefined && gps.lng !== undefined) {
        const glat = gps.lat;
        const glng = gps.lng;
        validGps = { lat: glat, lng: glng };
        const prev = lastGpsRef.current;
        const nowT = Date.now();
        if (prev) {
          const dtS = Math.max(0.5, (nowT - prev.t) / 1000);
          const dM = haversineM(prev.lat, prev.lng, glat, glng);
          if (dM < 200) {
            const inst = dM / dtS;
            smoothSpeed.current = smoothSpeed.current * 0.6 + Math.min(inst, 8) * 0.4;
            derivedSpeed = Number(smoothSpeed.current.toFixed(2));
            if (dM > 0.5) derivedHeading = Math.round(bearingDeg(prev.lat, prev.lng, glat, glng));
          }
        }
        lastGpsRef.current = { lat: glat, lng: glng, t: nowT };
        const conv = gpsToYard(glat, glng);
        if (conv.outOfYard && !outOfYardWarned.current) {
          outOfYardWarned.current = true;
          addLog('Live GPS is outside the 24�-16m prototype yard - showing clamped position. Field map recommended.', 'gps', 'warning');
        }
        yard = clampYard(conv.x, conv.y);
      }

      setTelemetry((prev) => {
        const rawMode = st?.mode ? String(st.mode).toUpperCase() : prev.mode;
        const mode: RoverMode = isValidMode(rawMode) ? rawMode : prev.mode;
        const nextGps = validGps ? {
          lat: validGps.lat, lng: validGps.lng,
          speedMps: clampNum(gps!.speedMps ?? derivedSpeed ?? prev.gps.speedMps, 0, 15, prev.gps.speedMps),
          headingDeg: clampNum(gps!.headingDeg ?? derivedHeading ?? prev.gps.headingDeg, 0, 360, prev.gps.headingDeg),
          sats: Math.round(clampNum(gps!.sats ?? prev.gps.sats, 0, 24, prev.gps.sats)),
          hdop: clampNum(gps!.hdop ?? prev.gps.hdop, 0.3, 20, prev.gps.hdop),
          timestamp: Date.now(),
        } : prev.gps;
        return {
          espBatteryPct: clampNum(st?.espBatteryPct ?? st?.batteryPct ?? prev.espBatteryPct, 0, 100, prev.espBatteryPct),
          stmBatteryPct: clampNum(st?.stmBatteryPct ?? st?.batteryPct ?? prev.stmBatteryPct, 0, 100, prev.stmBatteryPct),
          rssiDbm: clampNum(st?.rssiDbm ?? prev.rssiDbm, -100, 0, prev.rssiDbm),
          uptimeS: Math.max(0, st?.uptimeS ?? prev.uptimeS + intervalRef.current / 1000),
          tempC: clampNum(st?.tempC ?? prev.tempC, -20, 90, prev.tempC),
          tiltXDeg: clampNum(st?.tiltXDeg ?? prev.tiltXDeg, -90, 90, prev.tiltXDeg),
          tiltYDeg: clampNum(st?.tiltYDeg ?? prev.tiltYDeg, -90, 90, prev.tiltYDeg),
          mode,
          payload: String(st?.payload ?? prev.payload).slice(0, 24),
          missionPct: clampNum(st?.missionPct ?? prev.missionPct, 0, 100, prev.missionPct),
          gps: nextGps,
        };
      });

      if (yard && validGps) {
        const fx = validGps.lat;
        const flng = validGps.lng;
        setTrail((prev) => {
          const last = prev[prev.length - 1];
          if (last) {
            const jump = Math.hypot(yard!.x - last.x, yard!.y - last.y);
            if (jump < 0.05) return prev;
            if (jump > 12) return [{ x: yard!.x, y: yard!.y, lat: fx, lng: flng, timestamp: Date.now() }];
          }
          return [...prev.slice(-239), { x: Number(yard!.x.toFixed(2)), y: Number(yard!.y.toFixed(2)), lat: fx, lng: flng, timestamp: Date.now() }];
        });
      }

      if (rawLogs) {
        const lines = rawLogs.slice(-24);
        setWifiLogs((prev) => {
          const existing = new Set(prev.map((p) => p.raw));
          const fresh = lines.filter((l) => !existing.has(l)).map((raw) => ({ id: `w-${Date.now()}-${Math.random().toString(36).slice(2)}`, raw: String(raw).slice(0, 300), timestamp: Date.now(), level: parseLogLevel(raw) as WifiLogLine['level'] }));
          return [...fresh.reverse(), ...prev].slice(0, 200);
        });
      }

      if (liveRadar) {
        setRadar(liveRadar.map((p) => ({ angleDeg: p.angleDeg, distM: p.distM })));
      }
    } catch (e) {
      failStreak.current += 1;
      setPollDrops((n) => n + 1);
      if (failStreak.current >= 3) {
        setFetchError(e instanceof Error ? e.message : 'Poll failed');
        setConnection('error');
      } else {
        setFetchError(`Link hiccup, retrying (${failStreak.current}/3)...`);
      }
    }
  }, [addLog]);

  const startLoop = useCallback((base: string, intervalMs: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    baseRef.current = base;
    intervalRef.current = intervalMs;
    pollRef.current = setInterval(() => void doPoll(baseRef.current), intervalRef.current);
  }, [doPoll]);

  // if user changes refresh while live, restart loop with new cadence
  useEffect(() => {
    intervalRef.current = pollIntervalMs;
    if (connection === 'live' && baseRef.current) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => void doPoll(baseRef.current), pollIntervalMs);
    }
  }, [pollIntervalMs, connection, doPoll]);

  const connect = useCallback(() => {
    if (!isValidIpInput(esp32Ip)) {
      setFetchError('That IP/hostname looks invalid. Try 192.168.4.2 or esp32.local.');
      return;
    }
    const base = normalizeBaseUrl(esp32Ip);
    if (!base) { setFetchError('Enter ESP32 IP first (e.g. 192.168.4.2)'); return; }
    // support ?ip= override: user pastes link with IP and it just works
    safeStoreSet('resq-esp32-ip', esp32Ip.trim());
    outOfYardWarned.current = false;
    failStreak.current = 0;
    setConnection('connecting');
    addLog(`Probing ESP32 at ${base} (/status /gps /logs)...`, 'system', 'info');
    void doPoll(base);
    startLoop(base, intervalRef.current);
  }, [esp32Ip, doPoll, startLoop, addLog]);

  const disconnect = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    baseRef.current = '';
    lastGpsRef.current = null;
    setConnection('simulated');
    addLog('ESP32 link closed - simulator resumed', 'system', 'warning');
  }, [addLog]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);
  useEffect(() => { safeStoreSet('resq-esp32-ip', esp32Ip); }, [esp32Ip]);

  // auto-connect when URL has ?ip= (user just shares link with IP)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('ip');
      if (q && isValidIpInput(q)) {
        setEsp32Ip(q.trim());
        safeStoreSet('resq-esp32-ip', q.trim());
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gpsAgeS = Math.max(0, Math.floor((now - telemetry.gps.timestamp) / 1000));
  const quality = fixQuality(telemetry.gps.sats, telemetry.gps.hdop);
  const distanceM = useMemo(() => {
    let d = 0;
    for (let i = 1; i < trail.length; i++) {
      d += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
    }
    return d;
  }, [trail]);

  const missionDone = mission.every((s) => s.state === 'done');

  return (
    <RoverContext.Provider value={{ telemetry, trail, radar, wifiLogs, logs, mission, missionDone, connection, esp32Ip, esp32Base, ipValid, pollIntervalMs, lastFetchAt, fetchError, pollsOk, pollDrops, gpsAgeS, quality, distanceM, setEsp32Ip, setPollIntervalMs, connect, disconnect, sendCommand, clearLogs, confirmPickup, confirmDrop, completeReturn, resetMission, triggerSOS, resolveSOS, returnToBase }}>
      {children}
    </RoverContext.Provider>
  );
}

export function useRover() {
  const ctx = useContext(RoverContext);
  if (!ctx) throw new Error('useRover must be used within RoverProvider');
  return ctx;
}

export { YARD_W, YARD_H, BASE_LAT, BASE_LNG };



