#!/bin/bash
set -e

APP_DIR="/home/ubuntu/harvestgrow"
WA_SESSION_DIR="/home/ubuntu/harvestgrow-wa-session"
REPO_URL="https://github.com/Aphrosidiac/harvestgrow.git"
DB_NAME="harvestgrow"
DB_USER="harvestgrow"
ANTHROPIC_KEY="${ANTHROPIC_API_KEY:-}"
if [ -z "$ANTHROPIC_KEY" ]; then
  # Read from existing .env if available
  ANTHROPIC_KEY=$(grep ANTHROPIC_API_KEY "$APP_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
fi

echo "=== HarvestGrow Production Deploy ==="
echo ""

# 1. Clone or pull
if [ -d "$APP_DIR" ]; then
  echo "→ Pulling latest code..."
  cd "$APP_DIR" && git pull
else
  echo "→ Cloning repository..."
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# 2. Database setup
echo "→ Setting up PostgreSQL..."
DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 20)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS'"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS'"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER" 2>/dev/null || true
echo "  DB password: $DB_PASS"

# 3. Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)

# 4. Backend .env
echo "→ Writing backend .env..."
cat > "$APP_DIR/backend/.env" <<ENVEOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://127.0.0.1:6379/2
JWT_SECRET=$JWT_SECRET
PORT=3101
NODE_ENV=production
CORS_ORIGIN=https://harvestgrowapp.apdevotion.my,https://harvestgrowweb.apdevotion.my,http://harvestgrowapp.apdevotion.my,http://harvestgrowweb.apdevotion.my
ADMIN_EMAIL=admin@harvestgrow-veg.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=HarvestGrow Admin
ANTHROPIC_API_KEY=$ANTHROPIC_KEY
ENVEOF

# 5. Backend build
echo "→ Building backend..."
cd "$APP_DIR/backend"
npm install --no-audit --no-fund
npx prisma generate
npx prisma db push --accept-data-loss
npm run build

# 6. Seed database
echo "→ Seeding database..."
npx tsx prisma/seed.ts 2>/dev/null || echo "  (main seed already done)"
npx tsx prisma/seed-all.ts 2>/dev/null || echo "  (extended seed already done)"

# 7. WhatsApp session directory (persists across deploys)
echo "→ Setting up WhatsApp session directory..."
mkdir -p "$WA_SESSION_DIR"
rm -rf "$APP_DIR/backend/whatsapp-session"
ln -sf "$WA_SESSION_DIR" "$APP_DIR/backend/whatsapp-session"

# 8. Frontend build
echo "→ Building frontend..."
cd "$APP_DIR/frontend"
npm install --no-audit --no-fund
VITE_API_URL=/api/v1 npm run build

# 9. PM2 setup
echo "→ Setting up PM2..."
cd "$APP_DIR"

# Stop old process if exists
pm2 delete harvestgrow-backend 2>/dev/null || true
pm2 delete harvestgrow-api 2>/dev/null || true

# Start with production ecosystem config
pm2 start deploy/ecosystem.production.config.cjs
pm2 save

# 10. Nginx setup
echo "→ Configuring nginx..."
sudo cp "$APP_DIR/deploy/nginx-harvestgrow.conf" /etc/nginx/sites-available/harvestgrow
sudo ln -sf /etc/nginx/sites-available/harvestgrow /etc/nginx/sites-enabled/harvestgrow
sudo nginx -t && sudo systemctl reload nginx

# 11. SSL (certbot)
echo "→ Setting up SSL..."
sudo certbot --nginx \
  -d harvestgrowapp.apdevotion.my \
  -d harvestgrowweb.apdevotion.my \
  --non-interactive --agree-tos \
  -m digitalscapeventure@gmail.com \
  2>/dev/null || echo "  (SSL setup failed or already exists — check DNS)"

# 12. Firewall
sudo ufw allow 80 2>/dev/null || true
sudo ufw allow 443 2>/dev/null || true

echo ""
echo "=== Deploy Complete ==="
echo ""
echo "Admin App:  https://harvestgrowapp.apdevotion.my/admin/login"
echo "Website:    https://harvestgrowweb.apdevotion.my"
echo "API Health: https://harvestgrowapp.apdevotion.my/api/health"
echo ""
echo "Login:  admin@harvestgrow-veg.com / admin123"
echo ""
echo "PM2:    pm2 logs harvestgrow-api"
echo "        pm2 restart harvestgrow-api"
echo ""
echo "DB Pass: $DB_PASS"
echo "JWT:     $JWT_SECRET"
