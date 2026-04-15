#!/usr/bin/env bash
# HarvestGrow VPS deploy script — idempotent, won't break DG
# Run as: bash deploy-vps.sh
# Assumes: Ubuntu, postgres + redis already installed (from DG deploy), nginx running, pm2 installed globally
# Domain not configured yet — exposes via IP + port. Frontend on :8081, backend on :3101.

set -euo pipefail

# ─── Config ─────────────────────────────────────────
APP_DIR="/home/ubuntu/harvestgrow"
REPO="https://github.com/Aphrosidiac/harvestgrow.git"
DB_NAME="harvestgrow"
DB_USER="harvestgrow"
DB_PASS="hg_$(openssl rand -hex 8)"
JWT_SECRET="$(openssl rand -base64 32)"
BACKEND_PORT=3101
FRONTEND_PORT=8081
PUBLIC_IP="$(curl -s ifconfig.me || echo 'YOUR_VPS_IP')"

echo "════════════════════════════════════════════"
echo "  HarvestGrow Deploy"
echo "  Public IP:   $PUBLIC_IP"
echo "  Backend:     :$BACKEND_PORT"
echo "  Frontend:    :$FRONTEND_PORT"
echo "  DB:          $DB_NAME"
echo "════════════════════════════════════════════"

# ─── 1. Clone or pull ───────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  echo "[1/8] Repo exists — pulling latest..."
  cd "$APP_DIR" && git pull
else
  echo "[1/8] Cloning repo..."
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ─── 2. Postgres database ───────────────────────────
echo "[2/8] Creating Postgres DB + user..."
sudo -u postgres psql <<EOF || true
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
EOF
# If user already exists, force-set the password to the new random one
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"

# ─── 3. Backend env ─────────────────────────────────
echo "[3/8] Writing backend .env..."
cat > "$APP_DIR/backend/.env" <<EOF
NODE_ENV=production
PORT=$BACKEND_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public
REDIS_URL=redis://localhost:6379/3
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=http://$PUBLIC_IP:$FRONTEND_PORT
ANTHROPIC_API_KEY=
EOF

# ─── 4. Backend install + migrate + seed ────────────
echo "[4/8] Installing backend deps..."
cd "$APP_DIR/backend"
npm install --no-audit --no-fund
echo "  → migrate..."
npx prisma migrate deploy
echo "  → generate..."
npx prisma generate
echo "  → seed (skip on re-run by setting SKIP_SEED=1)..."
if [ "${SKIP_SEED:-0}" != "1" ]; then
  npm run db:seed || echo "  (seed failed or already done — continuing)"
fi

# ─── 5. Frontend build ──────────────────────────────
echo "[5/8] Building frontend..."
cd "$APP_DIR/frontend"
# Point API at the public backend port
echo "VITE_API_BASE=http://$PUBLIC_IP:$BACKEND_PORT/api/v1" > .env.production
npm install --no-audit --no-fund
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# ─── 6. PM2 backend ─────────────────────────────────
echo "[6/8] Starting backend with PM2..."
cd "$APP_DIR/backend"
pm2 delete harvestgrow-backend 2>/dev/null || true
pm2 start npm --name harvestgrow-backend -- run start
pm2 save

# ─── 7. Nginx for frontend ──────────────────────────
echo "[7/8] Configuring nginx for frontend..."
sudo tee /etc/nginx/sites-available/harvestgrow >/dev/null <<NGINX
server {
    listen $FRONTEND_PORT;
    server_name _;
    root $APP_DIR/frontend/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}

# Backend reverse proxy with CORS for the assistant streaming etc
server {
    listen $BACKEND_PORT;
    server_name _;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:$((BACKEND_PORT + 1000));
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

# Actually we want nginx to just serve the frontend, backend listens directly on $BACKEND_PORT via PM2.
# Rewrite the config more cleanly:
sudo tee /etc/nginx/sites-available/harvestgrow >/dev/null <<NGINX
server {
    listen $FRONTEND_PORT default_server;
    server_name _;
    root $APP_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)\$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/harvestgrow /etc/nginx/sites-enabled/harvestgrow
sudo nginx -t
sudo systemctl reload nginx

# ─── 8. Firewall ────────────────────────────────────
echo "[8/8] Opening firewall ports..."
sudo ufw allow $BACKEND_PORT/tcp || true
sudo ufw allow $FRONTEND_PORT/tcp || true

echo ""
echo "════════════════════════════════════════════"
echo "  ✅ HarvestGrow deployed!"
echo "════════════════════════════════════════════"
echo "  Storefront:  http://$PUBLIC_IP:$FRONTEND_PORT/"
echo "  Admin:       http://$PUBLIC_IP:$FRONTEND_PORT/admin/login"
echo "  Driver:      http://$PUBLIC_IP:$FRONTEND_PORT/driver"
echo "  Backend API: http://$PUBLIC_IP:$BACKEND_PORT/api/v1"
echo ""
echo "  Login:"
echo "    admin@harvestgrow-veg.com / admin123"
echo "    driver@harvestgrow-veg.com / driver123"
echo ""
echo "  DB password (saved in backend/.env): $DB_PASS"
echo "  JWT secret saved in backend/.env"
echo ""
echo "  pm2 logs harvestgrow-backend   # to tail logs"
echo "  pm2 restart harvestgrow-backend"
echo "════════════════════════════════════════════"
