# HarvestGrow ERP

B2B vegetable/produce supplier management system for **Harvest Grow Veg Sdn Bhd**
(Reg 201901034939), based in Johor Bahru, Malaysia.

Scope:

- Customer-facing storefront for daily produce orders
- Production/packing board for the warehouse floor
- Same-day delivery routing with driver mobile app
- Purchase invoicing (from upstream farms/suppliers) and sales invoicing
- Daily price updates, low-stock alerts, perishable shelf-life tracking
- Operational dashboard + reports + Claude-powered assistant

## Stack

- **Backend:** Fastify + Prisma + PostgreSQL + Redis
- **Frontend:** Vue 3 + Vite + Tailwind v4 (inline `@theme`) + Pinia + Chart.js
- **AI Assistant:** Anthropic Claude Opus with tool use (read-only queries)

## Quick Start

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend
cd backend
npm install
npx prisma db push
npx prisma db seed
npm run dev   # http://localhost:3000

# 3. Frontend
cd ../frontend
npm install
npm run dev   # http://localhost:5173
```

## Test Logins

| Role   | Email                          | Password  |
| ------ | ------------------------------ | --------- |
| ADMIN  | admin@harvestgrow-veg.com      | admin123  |
| DRIVER | driver@harvestgrow-veg.com     | driver123 |

Storefront (public): http://localhost:5173/
Admin app: http://localhost:5173/admin/login
Driver app: http://localhost:5173/driver

## Modules

- **dashboard** — operational overview (today's orders, deliveries, stock turnover, daily sales, top-sellers, price changes, bottlenecks, low-stock)
- **orders** — order lifecycle: PENDING → CONFIRMED → PICKING → CUTTING → PACKING → READY → OUT_FOR_DELIVERY → DELIVERED
- **production** — pack-board kanban, packaging page, pack-sheet printing, stuck-order alerts
- **delivery** — trips, stops, dispatch board, driver mobile run flow with signature/photo proof
- **stock** — items, categories, history, daily-pricing, bulk price update, low-stock, price-history
- **documents** — quotations, invoices, receipts, delivery orders; settings per type; bank / automation / storefront key-values
- **customers / shop-customers / debtors** — customer directory, storefront accounts, AR aging
- **suppliers / purchase-invoices / supplier-payments** — upstream supply chain
- **reports** — payment log, sales, orders, stock movement, price history, driver performance (CSV export)
- **assistant** — Claude Opus chat with 17 read-only tools for live data questions
- **audit** — full audit trail with action / entity / date filters
- **shop** — public storefront API (catalog, cart, checkout, order tracking)

## Architecture

```
┌─────────────────┐    ┌────────────────┐    ┌──────────┐
│ Vue 3 SPA       │◄──►│ Fastify API    │◄──►│ Postgres │
│ (Admin + Shop   │    │ (Prisma ORM)   │    └──────────┘
│  + Driver)      │    └───┬────────────┘
└─────────────────┘        │         ┌──────────┐
                           ├────────►│ Redis    │ cache
                           │         └──────────┘
                           │         ┌──────────────────┐
                           └────────►│ Claude Opus API  │ assistant
                                     └──────────────────┘
```

## Phases Completed

- **Phase 0** — scaffold, branding, schema
- **Phase 1** — stock, daily pricing, low-stock alerts
- **Phase 2** — storefront, cart, checkout, order lifecycle
- **Phase 3** — production board / packaging
- **Phase 4** — delivery trips, driver app, signature proof
- **Phase 5** — documents (quotation / invoice / receipt / DO), document-settings, reports scaffold, assistant
- **Phase 6** — dashboard widgets, reports (5 new), assistant tools (8 new), document-settings UI completion, storefront polish

## Default Color Palette

Olive: `#869940` · Dark olive: `#495c14` · Light olive: `#a3b568` · Cream: `#f5ebe2`
