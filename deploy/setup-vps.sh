#!/bin/bash
# HarvestGrow VPS Setup Script
# Run on Azure VPS (Ubuntu)

set -e

APP_DIR="/home/digitalscape/HarvestGrow"
DB_NAME="harvestgrow"
DB_USER="harvestgrow"
DB_PASS="CHANGE_THIS_PASSWORD"

echo "=== 1. Install PostgreSQL ==="
sudo apt update
sudo apt install -y postgresql postgresql-contrib

echo "=== 2. Create Database ==="
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo "=== 3. Install Redis ==="
sudo apt install -y redis-server
# Enable Redis to start on boot and bind to localhost only
sudo sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory .*/maxmemory 128mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sudo systemctl enable redis-server
sudo systemctl restart redis-server

echo "=== 4. Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== 5. Install PM2 ==="
sudo npm install -g pm2

echo "=== 6. Clone & Setup ==="
cd /home/digitalscape
# TODO: replace with the real HarvestGrow repo URL
git clone https://github.com/Aphrosidiac/harvestgrow.git HarvestGrow
cd $APP_DIR/backend
cp .env.example .env

echo ""
echo "=== MANUAL STEPS ==="
echo "1. Edit $APP_DIR/backend/.env with real values:"
echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME\""
echo "   REDIS_URL=\"redis://127.0.0.1:6379\""
echo "   JWT_SECRET=\"$(openssl rand -base64 32)\""
echo "   CORS_ORIGIN=\"https://harvestgrow-veg.com\""
echo ""
echo "2. Then run:"
echo "   cd $APP_DIR/backend"
echo "   npm install"
echo "   npx prisma migrate deploy"
echo "   npm run db:seed"
echo "   npm run build"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "3. Setup Nginx:"
echo "   sudo cp $APP_DIR/deploy/nginx-api.conf /etc/nginx/sites-available/harvestgrow-api"
echo "   sudo ln -s /etc/nginx/sites-available/harvestgrow-api /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "4. SSL (after DNS is pointed):"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d api.harvestgrow-veg.com"
echo ""
echo "5. Cloudflare Pages (frontend):"
echo "   Connect repo: Aphrosidiac/harvestgrow"
echo "   Root directory: frontend"
echo "   Build command: npm run build"
echo "   Output: dist"
echo "   Env var: VITE_API_URL=https://api.harvestgrow-veg.com/api/v1"
