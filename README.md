# Service Booking Template Admin

Admin PWA สำหรับจัดการคิวจองบริการ ใช้ Vite + React + TypeScript + MUI + Axios พร้อม WebSocket realtime และ Web Push notification prompt ที่เขียนใหม่จากแนวคิดของ repo อ้างอิง

## Stack

- React `19.2.7`
- Vite `8.0.16`
- TypeScript `6.0.3`
- MUI `9.0.1`
- Axios `1.17.0`
- PWA manifest + `admin-sw.js`
- Vitest + Testing Library
- Playwright e2e

## Run

```bash
npm install
npm run dev
```

Default URL: `http://127.0.0.1:5174`

## Environment

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
VITE_WS_BASE_URL=ws://127.0.0.1:8080/api/v1
VITE_ENABLE_MOCK_FALLBACK=true
```

## Tests

```bash
npm test
npm run test:e2e
npm run build
```
