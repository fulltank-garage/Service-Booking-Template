# Service Booking Template

Customer booking app สำหรับระบบจองคิวเข้าใช้บริการ ใช้ Vite + React + TypeScript + MUI + Axios และเตรียม integration สำหรับ LINE LIFF/Rich Menu

## Stack

- React `19.2.7`
- Vite `8.0.16`
- TypeScript `6.0.3`
- MUI `9.0.1`
- Axios `1.17.0`
- Vitest + Testing Library
- Playwright e2e

## Run

```bash
npm install
npm run dev
```

Default URL: `http://127.0.0.1:5173`

## Environment

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080/api/v1
VITE_LIFF_ID=
VITE_ENABLE_MOCK_FALLBACK=true
```

ถ้า API ยังไม่รัน ระบบจะใช้ mock fallback เพื่อให้ template เปิดใช้งานและทดสอบ flow หลักได้ทันที

## Tests

```bash
npm test
npm run test:e2e
npm run build
```
