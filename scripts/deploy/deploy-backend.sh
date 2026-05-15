#!/bin/bash
set -e

# Outflo Backend Production Deployment Script
# Usage: ./deploy-backend.sh

echo "🚀 Starting Outflo Backend Deployment..."

# Configuration
APP_DIR="/var/www/outflo/backend"
SERVICE_NAME="outflo-backend"
PORT=8000
NODE_VERSION="20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
fi

# Update and install dependencies
log_info "Updating system packages..."
apt update && apt upgrade -y

log_info "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs nginx certbot python3-certbot-nginx build-essential

# Create application directory
log_info "Creating application directory..."
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs

# Copy application files
log_info "Copying application files..."
cd ${APP_DIR}
cp -r /root/outflo/apps/backend/* . || log_warn "Copy from source skipped"

# Install dependencies
log_info "Installing Python dependencies..."
pip3 install -r requirements.txt --break-system-packages

log_info "Installing Node dependencies..."
npm install --production

# Setup environment
log_info "Setting up environment variables..."
cp .env.example .env
chmod 600 .env

# Setup PM2
log_info "Setting up PM2 process manager..."
npm install -g pm2
pm2 delete ${SERVICE_NAME} 2>/dev/null || true

# Create PM2 ecosystem
cat > ${APP_DIR}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'outflo-backend',
    script: 'uvicorn app.main:app',
    interpreter: 'none',
    args: '--host 0.0.0.0 --port 8000 --workers 4',
    cwd: '/var/www/outflo/backend',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PYTHONUNBUFFERED: '1'
    },
    error_file: '/var/www/outflo/backend/logs/error.log',
    out_file: '/var/www/outflo/backend/logs/out.log',
    log_file: '/var/www/outflo/backend/logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Start application with PM2
log_info "Starting application with PM2..."
cd ${APP_DIR}
pm2 start ecosystem.config.js --env production
pm2 save

# Setup PM2 startup script
log_info "Setting up PM2 startup on boot..."
pm2 startup | tail -1 > /etc/systemd/system/pm2-outflo.service
systemctl daemon-reload
systemctl enable pm2-outflo

# Configure Nginx
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/outflo-backend << 'EOF'
upstream outflo_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    keepalive 32;
}

server {
    listen 80;
    server_name api.outflo.io;

    client_max_body_size 50M;
    client_body_timeout 300s;

    location / {
        proxy_pass http://outflo_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 75s;
    }

    location /ws {
        proxy_pass http://outflo_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /health {
        proxy_pass http://outflo_backend/api/v1/health;
        proxy_set_header Host $host;
    }

    access_log /var/log/nginx/outflo-backend-access.log;
    error_log /var/log/nginx/outflo-backend-error.log;
}
EOF

ln -sf /etc/nginx/sites-available/outflo-backend /etc/nginx/sites-enabled/
nginx -t

# Setup logrotate
log_info "Setting up logrotate..."
cat > /etc/logrotate.d/outflo-backend {
    /var/www/outflo/backend/logs/*.log {
        daily
        missingok
        rotate 30
        compress
        delaycompress
        notifempty
        create 0640 www-data www-data
        sharedscripts
        postrotate
            pm2 reload outflo-backend --update-env > /dev/null 2>&1 || true
        endscript
    }
}

log_info "✅ Backend deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure .env with production values"
echo "2. Run: certbot --nginx -d api.outflo.io"
echo "3. Restart: pm2 restart outflo-backend"