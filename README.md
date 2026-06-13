# Service Booking Template Monorepo

This monorepo combines the three existing Service Booking Template repositories without changing their application logic, UI, behavior, or deployment boundaries.

## Apps

| App | Source repository | Path | Local port |
| --- | --- | --- | --- |
| Customer web | `fulltank-garage/Service-Booking-Template` | `apps/customer` | `5173` |
| Admin web | `fulltank-garage/Service-Booking-Template-Admin` | `apps/admin` | `5174` |
| API | `fulltank-garage/Service-Booking-Template-Api` | `apps/api` | `8080` |

## Requirements

- Node.js `>=24.0.0`
- npm `>=11.0.0`
- Go `1.25`
- Docker and Docker Compose for Postgres and Redis

## Environment Files

Copy each example file before running locally:

```powershell
Copy-Item apps/customer/.env.example apps/customer/.env
Copy-Item apps/admin/.env.example apps/admin/.env
Copy-Item apps/api/.env.example apps/api/.env
```

Adjust values as needed for LIFF, push notifications, LINE rich menus, or production deployments.

## Run Locally

### Customer

```powershell
cd apps/customer
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

### Admin

```powershell
cd apps/admin
npm install
npm run dev
```

Open `http://127.0.0.1:5174`.

### API

Start local database dependencies:

```powershell
cd apps/api
docker compose up -d
go run ./cmd/api
```

The API runs on `http://127.0.0.1:8080`.

## Run Everything With Root Docker Compose

From the repository root:

```powershell
docker compose up --build
```

Services:

- Customer: `http://127.0.0.1:5173`
- Admin: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:8080`
- Postgres: `127.0.0.1:5432`
- Redis: `127.0.0.1:6379`

## Test And Build

Customer:

```powershell
cd apps/customer
npm ci
npm run lint
npm test
npm run build
```

Admin:

```powershell
cd apps/admin
npm ci
npm run lint
npm test
npm run build
```

API:

```powershell
cd apps/api
go test ./...
go build ./cmd/api
```

## Monorepo Notes

- Each app keeps its original `package.json`, lockfile, Go module, config files, and environment variable usage.
- `packages/shared-types` and `packages/shared-utils` are reserved for a future refactor. No shared application logic has been moved during this migration.
- GitHub Actions are split by app so customer, admin, and api remain independently verifiable and deployable.
