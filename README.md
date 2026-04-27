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
- WhatsApp AI agents for staff and customers (ordering, stock, voice, image)
- AI quotation comparison with history and Excel export

## Live

| URL | Purpose |
|---|---|
| https://harvestgrowapp.apdevotion.my | Admin app |
| https://harvestgrowweb.apdevotion.my | Customer storefront |

## Stack

- **Backend:** Fastify 5 + Prisma 6 + PostgreSQL 16 + Redis + Zod validation
- **Frontend:** Vue 3 + Vite 8 + Tailwind v4 + Pinia + Chart.js
- **AI:** Claude Opus 4.6 (assistant), Claude Haiku 4.5 (WhatsApp agents + quotation extraction)
- **WhatsApp:** Baileys (multi-device, voice/image support)
- **Security:** Helmet CSP, per-user rate limiting, JWT auth, Prisma error mapping
- **Deploy:** PM2 (fork mode) + Nginx on Ubuntu 24.04

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

## Deploy

```bash
ssh ubuntu@43.134.29.203 "cd ~/harvestgrow && git pull && cd frontend && npm run build && cd ../backend && npm install && npm run build && npx prisma db push --skip-generate && pm2 restart harvestgrow-api"
```

## Modules

### Core ERP
- **Dashboard** — revenue, orders, deliveries, stock turnover, daily sales, top-sellers, price changes, production bottlenecks, low-stock alerts
- **Sales Orders** — full order management matching production workflow:
  - Create/edit with customer search, credit term/limit snapshot, country (MY/SG), branch, truck dropdown, basket/box counts, deliver remark
  - Product table with image, product code, 2nd description, remark, UOM, unit price, FOC
  - Edit Item Modal: product search with image preview, EST. BALANCE, UOM variant radio buttons with pricing, processing checkboxes (Cut/Peel/Sliced/Cube/Shredded/Rolling Cut/Stick), last ordered history, FOC
  - Completed order read-only view page
  - Picking List PDF and Delivery Order PDF generation (jsPDF + autoTable)
  - Recalculate Prices from UOM variant pricing
  - Status flow: Pending → Awaiting Shipment → Completed (Sync to SQL Accounting) / Cancelled
  - Copy order, combine order (placeholder)
- **Documents** — quotations, invoices, receipts, delivery orders; status workflow, payment tracking, document conversion
- **Orders** — order lifecycle: PENDING → CONFIRMED → PICKING → CUTTING → PACKING → READY → OUT_FOR_DELIVERY → DELIVERED
- **Production** — kanban board, packaging page, pack-sheet printing, stuck-order alerts, shop-display TV mode
- **Delivery** — trips, stops, dispatch board, driver mobile app with signature/photo proof

### Inventory & Pricing
- **Stock** — items, categories, history, daily-pricing bulk update, low-stock alerts, price history, UOM variant pricing (per-product UOM codes with individual prices and KG weight)
- **Product Clearance** — daily clearance lists for perishables
- **Pricing Boards** — customer group pricing, pricing edit board

### Customers & Suppliers
- **Master Data** — customers, customer groups, products, quotations, packing lists, supplier list
- **Debtors** — outstanding invoice tracking, AR aging
- **Purchase Invoices** — supplier invoice tracking, stock verification
- **Supplier Payments** — A/P payment recording

### AI Features
- **Assistant** — Claude Opus chat with 18 read-only tools for live data questions
- **WhatsApp AI Agents** — auto-responding agents for staff (9 tools) and customers (6 tools)
  - Place orders, repeat last order, check stock, create quotations, adjust stock, check balances
  - Voice message transcription, image-based ordering (handwritten order photos)
  - Multi-language: English, Malay, Chinese (auto-detects)
- **Quotation Compare** — upload supplier PDFs/images, Claude extracts prices, side-by-side comparison table with AI recommendation, history, Excel export
- **Quotation Broadcast** — send quotation requests to supplier categories via WhatsApp (staggered delivery)

### Reports
- Truck, export/import, packing list summary, wastage, supply return, supplier summary, low margin, truck map, truck road
- Payment log, sales report, orders report, stock movement, price history, driver performance

### Other
- **User Office** — user management with roles and groups
- **Audit Log** — full activity trail with entity/action/date filters
- **Shop** — public storefront (catalog, cart, checkout, quick order, order tracking)
- **Profile** — password change
- **API Docs** — Swagger UI at /docs

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
                           ├────────►│ Claude API       │ assistant + agents
                           │         └──────────────────┘
                           │         ┌──────────────────┐
                           └────────►│ Baileys          │ WhatsApp
                                     └──────────────────┘
```

## Security

- JWT auth (24h expiry) with role-based access control (ADMIN, MANAGER, PRODUCTION, PACKER, DRIVER)
- Helmet with Content Security Policy (production)
- Global rate limiting (100 req/min) + per-user AI rate limits
- Zod validation on all major controllers (9 controllers, shared validate helper)
- Prisma error mapping (P2002/P2025/P2003 → user-friendly messages with requestId)
- Environment validation — hard failures in production for missing DATABASE_URL, ANTHROPIC_API_KEY, CORS_ORIGIN
- WhatsApp: exponential backoff reconnection, staggered broadcast, per-phone rate limiting

## UX

- Confirmation dialogs (ConfirmDialog component) on all destructive actions
- Unsaved changes warning on form pages (beforeunload + route guard)
- Loading skeleton rows in tables, skeleton cards on dashboard
- Mobile card view for tables (opt-in, responsive below md breakpoint)
- Olive/cream theme with stone grays, Inter font

## Company Branding

- **Palette:** olive `#869940` · dark olive `#495c14` · light olive `#a3b568` · cream `#f5ebe2`
- **Address:** 5 Jalan Kempas Lama, 2/4 Kempas Lama, 81200 Johor Bahru, Johor
- **Phone:** +607-511 2696 · +6013-777 9069
- **Email:** sales@harvestgrow-veg.com
