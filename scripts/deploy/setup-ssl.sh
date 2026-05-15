#!/bin/bash
set -e

# Outflo SSL Setup Script
# Usage: ./setup-ssl.sh

echo "🔐 Setting up SSL certificates..."

DOMAINS=("outflo.io" "app.outflo.io" "api.outflo.io")
EMAIL="admin@outflo.io"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1; }

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Please run as root"
    exit 1
fi

# Install certbot
log_info "Installing certbot..."
apt update && apt install -y certbot python3-certbot-nginx

# Stop nginx for standalone mode
systemctl stop nginx

# Generate certificates
for DOMAIN in "${DOMAINS[@]}"; do
    log_info "Getting certificate for $DOMAIN..."
    certbot certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "$EMAIL" \
        -d "$DOMAIN"
done

# Start nginx
systemctl start nginx

# Update Nginx configs for SSL
log_info "Updating Nginx configurations..."

# Frontend SSL
cat > /etc/nginx/sites-available/outflo-frontend-ssl << 'EOF'
upstream outflo_frontend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
}

server {
    listen 80;
    listen [::]:80;
    server_name app.outflo.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.outflo.io;

    ssl_certificate /etc/letsencrypt/live/outflo.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/outflo.io/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_trusted_certificate /etc/letsencrypt/live/outflo.io/chain.pem;

    root /var/www/outflo/frontend/.next;
    index index.html;

    location /_next/static {
        proxy_pass http://outflo_frontend;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://outflo_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Backend SSL
cat > /etc/nginx/sites-available/outflo-backend-ssl << 'EOF'
upstream outflo_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name api.outflo.io;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.outflo.io;

    ssl_certificate /etc/letsencrypt/live/outflo.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/outflo.io/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

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
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
    }

    location /health {
        proxy_pass http://outflo_backend/api/v1/health;
        proxy_set_header Host $host;
    }
}
EOF

# Enable configs
ln -sf /etc/nginx/sites-available/outflo-frontend-ssl /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/outflo-backend-ssl /etc/nginx/sites-enabled/

# Remove old configs
rm -f /etc/nginx/sites-available/outflo-frontend
rm -f /etc/nginx/sites-available/outflo-backend

nginx -t
systemctl reload nginx

# Setup auto-renewal
log_info "Setting up auto-renewal..."
(crontab -l 2>/dev/null; echo "0 0 * * * certbot renew --quiet --deploy-hook 'pm2 reload all'") | crontab -

log_info "✅ SSL setup complete!"
echo ""
echo "Certificate locations:"
ls -la /etc/letsencrypt/live/outflo.io/