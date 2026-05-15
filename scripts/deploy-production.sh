# ===========================================
# OUTFLO - Backend Production Deployment
# ===========================================

# Server Requirements
- Ubuntu 20.04+ / Debian 11+
- 2GB RAM minimum
- PostgreSQL 15+

# ===========================================
# STEP 1: Install Dependencies
# ===========================================

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python, PostgreSQL, Nginx
sudo apt install -y python3.11 python3.11-venv python3-pip postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# ===========================================
# STEP 2: Database Setup
# ===========================================

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE outflo;
CREATE USER outflo_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE outflo TO outflo_user;
ALTER DATABASE outflo OWNER TO outflo_user;
\q
EOF

# ===========================================
# STEP 3: Application Setup
# ===========================================

# Create application user
sudo useradd -m -s /bin/bash outflo
sudo mkdir -p /opt/outflo
sudo chown outflo:outflo /opt/outflo

# Copy application
cd /opt/outflo
sudo -u outflo git clone <your-repo-url> .
cd apps/backend

# Create virtual environment
sudo -u outflo python3.11 -m venv venv
sudo -u outflo source venv/bin/activate
sudo -u outflo pip install -r requirements.txt

# Configure environment
sudo -u outflo cp ../../.env.example .env
sudo -u outflo nano .env  # Edit with production values

# Run migrations
sudo -u outflo alembic upgrade head

# ===========================================
# STEP 4: PM2 Process Manager
# ===========================================

# Install PM2
sudo npm install -g pm2

# Create ecosystem file
sudo -u outflo cat > /opt/outflo/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'outflo-backend',
    script: 'app/main.py',
    cwd: '/opt/outflo/apps/backend',
   interpreter: 'python3.11',
    interpreter_args: '-m uvicorn app.main:app --host 0.0.0.0 --port 8000',
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      APP_ENV: 'production'
    },
    error_file: '/var/log/outflo/error.log',
    out_file: '/var/log/outflo/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Create log directory
sudo mkdir -p /var/log/outflo
sudo chown outflo:outflo /var/log/outflo

# Start application
cd /opt/outflo
sudo -u outflo pm2 start ecosystem.config.js
sudo -u outflo pm2 save
sudo -u outflo pm2 startup

# ===========================================
# STEP 5: Nginx Reverse Proxy
# ===========================================

# Create Nginx config
sudo cat > /etc/nginx/sites-available/outflo << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/outflo /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# ===========================================
# STEP 6: SSL Certificate (Optional)
# ===========================================

sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# ===========================================
# DONE!
# ===========================================

echo "=========================================="
echo "   Outflo Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend: http://your-domain.com/api/"
echo "Frontend: http://your-domain.com/"
echo ""
echo "Logs: pm2 logs outflo-backend"
echo "Status: pm2 status"
echo "Restart: pm2 restart outflo-backend"
echo "=========================================="