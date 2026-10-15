# RESQ Rover

Emergency supply delivery robot dashboard. GPS tracking, rover status, and ESP32 WiFi telemetry in one place.

Live demo: https://resq-rover.vercel.app

> Built for **BuildFest 2026** (hackathon), **Hardware** category. Team NODE-X, PS-26: Emergency Supply Rover for Obstacle-Filled Environments, Guru Nanak Dev University.
>
> This dashboard is **vibecoded**: designed and built with AI assistance, then tested against the real ESP32 + STM32 hardware. Solution deck lives in [`/Docs`](../Docs/) at the repo root.

## What it does

- **Overview**: connection status, dual battery (ESP32 + STM32), speed, tilt, live yard map, 180-degree obstacle radar, rover status, delivery checklist, WiFi logs
- **Tracking**: GPS trail map, location finder, chassis tilt readout
- **WiFi Logs**: raw ESP32 log stream with search, level filters, and export
- **SOS banner**: emergency broadcast + return-to-base, plus low-battery warning per pack

## ESP32 wiring

The dashboard polls the ESP32 over WiFi (default `http://192.168.4.2`):

- `GET /status` -> `{ espBatteryPct, stmBatteryPct, rssiDbm, uptimeS, tempC, tiltXDeg, tiltYDeg, mode, payload, missionPct }`
- `GET /gps` -> `{ lat, lng, speedMps, headingDeg, sats, hdop }`
- `GET /radar` -> `[{ angle, dist }]` (or `[[angle, dist]]`, or `{ points: [...] }`; metres, cm auto-detected)
- `GET /logs` -> plain text lines, or a JSON array

Field names are tolerant (`battery`, `espBattery`, `stmBattery`, `lng`/`lon`, `sats`/`satellites`, `pitch`/`tiltX` all parse). Speed and heading are optional: derived from GPS deltas. Enable CORS on the ESP32 or the browser blocks polling.

Note: a hosted build (Vercel) cannot reach local `192.168.x.x` addresses. For live hardware data, run locally on the ESP32 WiFi network.

## Run it

```bash
npm install
npm run dev      # local dev, http://localhost:5173
npm run selftest # backend checks (URL, geo math, validation, radar parsing)
npm run build    # production build to dist/
```

## Stack

React 18 + TypeScript + Vite 6 + Tailwind CSS 3 + React Router 6. No map-tile dependency; the yard map and radar are custom canvas so the prototype works offline.
