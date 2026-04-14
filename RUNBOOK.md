# HarvestGrow ERP — Runbook

Operational cheatsheet for local dev and VPS deploy.

## Port assignments (local dev)

| Service           | Port | Notes                                      |
|-------------------|------|--------------------------------------------|
| Backend API       | 3001 | Fastify + Prisma                            |
| Frontend (Vite)   | 5174 | Proxies `/api` to backend                   |
| Postgres (Docker) | 5433 | Container `harvestgrow-db` (postgres:16)    |
| Redis (Docker)    | 6380 | Container `harvestgrow-redis` (redis:7)     |

Chosen to avoid clashing with DreamGarage (3000 / 5173 / 5432 / 6379).

## Test credentials

Admin (ERP):
- `admin@harvestgrow-veg.com` / `admin123`

Driver (delivery app):
- `driver@harvestgrow-veg.com` / `driver123`

Shop customers (seeded):
- Lim Ah Seng
- Siti Aminah

## Start the dev environment from scratch

```bash
# 1. Start Postgres + Redis (first time or after `docker rm`)
docker run -d --name harvestgrow-db \
  -e POSTGRES_USER=harvestgrow \
  -e POSTGRES_PASSWORD=harvestgrow_dev \
  -e POSTGRES_DB=harvestgrow \
  -p 5433:5432 postgres:16

docker run -d --name harvestgrow-redis \
  -p 6380:6379 redis:7

# 2. Install deps
cd backend && npm install --no-audit --no-fund
cd ../frontend && npm install --no-audit --no-fund

# 3. Apply migrations + seed
cd ../backend
npx prisma migrate dev
npm run db:seed

# 4. Run dev servers (two terminals)
npm run dev            # backend on :3001
cd ../frontend && npm run dev   # frontend on :5174
```

If containers already exist but are stopped: `docker start harvestgrow-db harvestgrow-redis`.

## Reset the database

```bash
# Nuke and recreate the DB (keeps the container)
docker exec -i harvestgrow-db psql -U harvestgrow -d postgres \
  -c "DROP DATABASE harvestgrow; CREATE DATABASE harvestgrow OWNER harvestgrow;"

cd backend
npx prisma migrate deploy   # or: npx prisma migrate dev
npm run db:seed
```

Or full-reset (migrations + data):
```bash
cd backend
npx prisma migrate reset --force
```

## Smoke-test endpoints

```bash
# Health
curl http://localhost:3001/api/health

# Admin login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@harvestgrow-veg.com","password":"admin123"}'

# Public shop
curl http://localhost:3001/api/v1/shop/categories
curl http://localhost:3001/api/v1/shop/products
curl http://localhost:3001/api/v1/shop/cutoff

# Dashboard (needs Bearer token from login)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3001/api/v1/dashboard/stats
```

## Deploy to Azure VPS (steps only — do NOT execute from here)

1. **DNS**: point `api.harvestgrow-veg.com` (and the shop domain) at the VPS IP.
2. **First-time server bootstrap** — on the VPS:
   ```bash
   # Edit DB_PASS in setup-vps.sh first!
   bash /home/digitalscape/HarvestGrow/deploy/setup-vps.sh
   ```
   This installs Postgres, Redis, Node 20, PM2, and clones the repo.
3. **Configure `.env`** at `backend/.env` with real DB creds, Redis URL, a strong `JWT_SECRET` (`openssl rand -base64 32`), and `CORS_ORIGIN` set to the production shop domain.
4. **Build & launch** backend:
   ```bash
   cd ~/HarvestGrow/backend
   npm ci
   npx prisma migrate deploy
   npm run db:seed            # only first time
   npm run build
   pm2 start ecosystem.config.cjs
   pm2 save && pm2 startup
   ```
5. **Nginx reverse proxy**:
   ```bash
   sudo cp ~/HarvestGrow/deploy/nginx-api.conf /etc/nginx/sites-available/harvestgrow-api
   sudo ln -s /etc/nginx/sites-available/harvestgrow-api /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```
6. **SSL** via Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d api.harvestgrow-veg.com
   ```
7. **Frontend** — deploy via Cloudflare Pages:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Env var: `VITE_API_URL=https://api.harvestgrow-veg.com/api/v1`
8. **Daily DB backup** (cron):
   ```
   0 2 * * * /home/digitalscape/HarvestGrow/deploy/backup-db.sh
   ```

## Common gotchas

- **Port collisions with DreamGarage**: DG runs on 3000/5173/5432/6379; HG uses 3001/5174/5433/6380. Don't swap.
- **Prisma migrations copied from DG**: the initial-migration folder was deleted and regenerated as `initial_harvestgrow` for HG. If you ever copy another Prisma project's `prisma/migrations/` in, delete it first before running `prisma migrate dev`.
- **Tailwind v4 `@apply` in scoped styles**: Vue SFC `<style scoped>` blocks using `@apply` must start with `@reference "../../assets/css/main.css";` (or the correct relative path) — otherwise the build fails with "Cannot apply unknown utility class".
- **Custom theme colors**: if you use `ring-olive/30`, `bg-olive` etc. inside `@apply`, they must be declared under `@theme { --color-olive: ...; }` in `main.css`.
- **vue-tsc build mode** (`vue-tsc -b`) is stricter than `vue-tsc --noEmit`. Always run `npm run build` before declaring victory.
- **JWT in login response** lives at `data.data.token` (not `data.token`) — the API envelope wraps everything in `{ success, data }`.
- **Shop categories count** — `/api/v1/shop/categories` only returns categories that contain at least one product (7 of the 8 seeded today). This is intentional.
- **Admin token localStorage key** is `dg_token` (kept from DG origin) and shop token key is `hg_shop_token`. Don't rename without updating both `api.ts` and `shop-api.ts`.

## Files to know

- `backend/.env` — local dev config (Docker ports, dev JWT secret)
- `backend/.env.example` — production template
- `backend/ecosystem.config.cjs` — PM2 (app name: `harvestgrow-backend`)
- `backend/prisma/schema.prisma` — source of truth for DB
- `backend/prisma/seed.ts` — admin/driver/customers/sample orders
- `deploy/setup-vps.sh` — bootstrap a fresh Ubuntu VPS
- `deploy/nginx-api.conf` — reverse proxy config (TODO: set real `server_name`)
- `deploy/backup-db.sh` — nightly pg_dump → gzip, keeps 30 days
- `frontend/vite.config.ts` — dev server on 5174, proxy → 3001
- `frontend/src/lib/api.ts`, `shop-api.ts` — axios bases (use `VITE_API_URL` in prod)

## Manual steps Fakhrul must do before VPS deploy

1. Create the production Git repo (`Aphrosidiac/harvestgrow` or similar) and push.
2. Update the `git clone` URL inside `deploy/setup-vps.sh`.
3. Pick the real production domain(s) (e.g. `api.harvestgrow-veg.com`, `harvestgrow-veg.com`) and update:
   - `deploy/nginx-api.conf` → `server_name`
   - `backend/.env` on VPS → `CORS_ORIGIN`
   - Cloudflare Pages env var → `VITE_API_URL`
4. Pick a strong `DB_PASS` in `setup-vps.sh` before running it.
5. Decide whether `seed.ts` (with sample orders) should run in production, or if only the admin user should be created. Currently it seeds demo data too.
