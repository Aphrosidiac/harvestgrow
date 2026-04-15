# HarvestGrow ERP

B2B vegetable/produce supplier management system for **Harvest Grow Veg Sdn Bhd**
(Reg 201901034939), based in Johor Bahru, Malaysia.

Scope:

- Customer-facing storefront for daily produce orders (guest checkout, COD)
- Production/packing board for the warehouse floor
- Same-day delivery routing with driver mobile app
- Purchase invoicing (from upstream farms) and sales invoicing
- Daily price updates, low-stock alerts, perishable shelf-life tracking
- Operational dashboard + reports + Claude-powered assistant

## Live Demo

Deployed to a shared VPS (port-based, no domain yet):

| URL | Purpose |
|---|---|
| http://43.134.29.203:8081/ | Storefront |
| http://43.134.29.203:8081/admin/login | Admin app |
| http://43.134.29.203:8081/driver | Driver mobile |
| http://43.134.29.203:8081/api/v1 | Backend API (nginx-proxied to :3101 internally) |

## Test Logins

| Role   | Email                          | Password  |
| ------ | ------------------------------ | --------- |
| ADMIN  | admin@harvestgrow-veg.com      | admin123  |
| DRIVER | driver@harvestgrow-veg.com     | driver123 |

## Stack

- **Backend:** Fastify + Prisma + PostgreSQL 16 + Redis
- **Frontend:** Vue 3 + Vite + Tailwind v4 (inline `@theme`) + Pinia + Chart.js
- **AI Assistant:** Anthropic Claude Opus 4.6 with tool use (read-only queries)
- **Deploy:** PM2 + Nginx on Ubuntu 24.04

## Local Development

```bash
# 1. Docker infra (non-conflicting ports with DreamGarage)
docker run -d --name harvestgrow-db  -p 5433:5432 \
  -e POSTGRES_DB=harvestgrow -e POSTGRES_USER=harvestgrow \
  -e POSTGRES_PASSWORD=harvestgrow_dev postgres:16
docker run -d --name harvestgrow-redis -p 6380:6379 redis:7

# 2. Backend (port 3001)
cd backend
npm install
npx prisma migrate dev
npm run db:seed
npm run dev

# 3. Frontend (port 5174)
cd ../frontend
npm install
npm run dev
```

Local URLs: storefront http://localhost:5174 · admin http://localhost:5174/admin/login · API http://localhost:3001/api/v1

See `RUNBOOK.md` for reset/cleanup commands.

## Deploy to VPS

One-shot deploy script for a fresh Ubuntu box with Postgres + Redis + Nginx + PM2 already installed:

```bash
curl -fsSL https://raw.githubusercontent.com/Aphrosidiac/harvestgrow/main/deploy/deploy-vps.sh -o deploy.sh && bash deploy.sh
```

What it does:
1. Clones repo to `/home/ubuntu/harvestgrow`
2. Creates isolated Postgres DB + user (won't touch other apps)
3. Writes backend `.env` with random DB password + JWT secret
4. Installs deps, runs migrations, seeds demo data
5. Builds frontend with `VITE_API_BASE=/api/v1`
6. Starts backend on PM2 as `harvestgrow-backend` (port 3101, internal)
7. Configures Nginx on port 8081 to serve frontend + proxy `/api/` → 3101
8. Opens UFW firewall ports

Post-deploy updates:
```bash
ssh ubuntu@<vps-ip>
cd /home/ubuntu/harvestgrow && git pull
cd backend && npm install && npm run build && pm2 restart harvestgrow-backend
cd ../frontend && npm install && npm run build
```

## Modules

- **dashboard** — operational overview (today's orders, deliveries, stock turnover, daily sales, top-sellers, price changes, bottlenecks, low-stock)
- **orders** — order lifecycle: PENDING → CONFIRMED → PICKING → CUTTING → PACKING → READY → OUT_FOR_DELIVERY → DELIVERED
- **production** — pack-board kanban, packaging page, pack-sheet printing, stuck-order alerts, shop-display TV mode
- **delivery** — trips, stops, dispatch board, driver mobile run flow with signature/photo proof
- **stock** — items, categories, history, daily-pricing bulk update, low-stock, price-history
- **documents** — quotations, invoices, receipts, delivery orders; settings per type; bank / automation / storefront key-values
- **customers / shop-customers / debtors** — customer directory, storefront accounts, AR aging
- **suppliers / purchase-invoices / supplier-payments** — upstream supply chain
- **reports** — payment log, sales, orders, stock movement, price history, driver performance (CSV export)
- **assistant** — Claude Opus chat with 17 read-only tools for live data questions
- **audit** — full audit trail with action / entity / date filters
- **shop** — public storefront API (catalog, cart, checkout, price-check, minimum-order, postcode serviceability, order tracking, quick reorder)

## Architecture

```
┌─────────────────┐    ┌────────────────┐    ┌──────────┐
│ Vue 3 SPA       │◄──►│ Fastify API    │◄──►│ Postgres │
│ (Admin + Shop   │    │ (Prisma ORM)   │    └──────────┘
│  + Driver)      │    └───┬────────────┘
└─────────────────┘        │         ┌──────────┐
                           ├────────►│ Redis    │ cache + rate-limit
                           │         └──────────┘
                           │         ┌──────────────────┐
                           └────────►│ Claude Opus API  │ assistant
                                     └──────────────────┘
```

Production on VPS:

```
Internet :8081 ──► Nginx
                    ├── / → /home/ubuntu/harvestgrow/frontend/dist  (SPA)
                    └── /api/ → http://127.0.0.1:3101 (PM2 harvestgrow-backend)
                                                      │
                                    Postgres :5432 ◄──┤
                                    Redis :6379 (db=3)┘
```

## Phases Completed

- **Phase 0** — scaffold from DreamGarage, rebrand olive/cream, produce schema
- **Phase 1** — stock, daily pricing, low-stock alerts
- **Phase 2** — storefront, cart, checkout, order lifecycle
- **Phase 3** — production board, packaging tablet UI, pack-sheet print
- **Phase 4** — delivery trips, driver mobile app, signature/photo proof
- **Phase 5** — documents (quotation / invoice / DO / purchase), auto-invoice on delivered
- **Phase 6** — dashboard widgets (7 new), reports (5 new), assistant tools (8 new), storefront polish
- **Phase 7** — local verification, deploy scripts, RUNBOOK
- **Post-launch** — VPS deployment (port-based), storefront polish (real images, cutoff countdown, price-change modal, minimum order, postcode check, quick reorder, cart cut-style edit)

## Company Branding

- **Palette:** olive `#869940` · dark olive `#495c14` · light olive `#a3b568` · cream `#f5ebe2`
- **Logo:** cached in `_brand/logo.png`, replicated across `frontend/public/logo-*.png`
- **Address:** 5 Jalan Kempas Lama, 2/4 Kempas Lama, 81200 Johor Bahru, Johor
- **Phone:** +607-511 2696 · +6013-777 9069
- **Email:** sales@harvestgrow-veg.com
