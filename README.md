# Service Booking Template API

API สำหรับระบบจองคิวเข้าใช้บริการ ใช้ Go + Gin + PostgreSQL + Redis และรองรับ WebSocket สำหรับ realtime admin notification

## Run

```bash
docker compose up -d postgres redis
go run ./cmd/api
```

Default API: `http://127.0.0.1:8080/api/v1`

## Endpoints

- `GET /api/v1/health`
- `GET /api/v1/services`
- `GET /api/v1/availability?serviceId=...&date=YYYY-MM-DD`
- `POST /api/v1/bookings`
- `GET /api/v1/admin/bookings`
- `PUT /api/v1/admin/bookings/:id/status`
- `GET /api/v1/admin/notifications`
- `PUT /api/v1/admin/notifications/:id/read`
- `GET /api/v1/admin/push/public-key`
- `POST /api/v1/admin/push/subscribe`
- `GET /api/v1/ws/admin`

## Tests

```bash
go test ./...
```
