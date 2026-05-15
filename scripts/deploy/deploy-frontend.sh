#!/bin/bash
set -e

# Outflo Frontend Production Deployment Script

echo "🚀 Starting Outflo Frontend Deployment..."

APP_DIR="/var/www/outflo/frontend"
SERVICE_NAME="outflo-frontend"
PORT=3000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1; }
log_error() { echo -e "${RED}[ERROR]${NC} $1; }

if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
fi

# Install Node.js
log_info "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Create directory
log_info "Creating application directory..."
mkdir -p ${APP_DIR}
mkdir -p ${APP_DIR}/logs

# Copy files
log_info "Copying application files..."
cp -r /root/outflo/apps/frontend/* ${APP_DIR}/ || true

cd ${APP_DIR}

# Install dependencies
log_info "Installing dependencies..."
npm install

# Build
log_info "Building application..."
npm run build

# Setup PM2
log_info "Setting up PM2..."
pm2 delete ${SERVICE_NAME} 2>/dev/null || true

cat > ${APP_DIR}/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'outflo-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/outflo/frontend',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/outflo/frontend/logs/error.log',
    out_file: '/var/www/outflo/frontend/logs/out.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};
EOF

pm2 start ${APP_DIR}/ecosystem.config.js --env production
pm2 save

# Nginx configuration
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/outflo-frontend << 'EOF'
upstream outflo_frontend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name app.outflo.io;

    root /var/www/outflo/frontend/.next;
    index index.html;

    # Next.js static files
    location /_next/static {
        proxy_pass http://outflo_frontend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    # Static assets
    location /static {
        proxy_pass http://outflo_frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Dynamic requests
    location / {
        proxy_pass http://outflo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /_next/webpack-hmr {
        proxy_pass http://outflo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    access_log /var/log/nginx/outflo-frontend-access.log;
    error_log /var/log/nginx/outflo-frontend-error.log;
}
EOF

ln -sf /etc/nginx/sites-available/outflo-frontend /etc/nginx/sites-enabled/
nginx -t

log_info "✅ Frontend deployment complete!"