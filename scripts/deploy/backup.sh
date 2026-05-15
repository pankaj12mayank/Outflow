#!/bin/bash
set -e

# Outflo Backup Script
# Daily backups for database and application data

BACKUP_DIR="/var/backups/outflo"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/var/www/outflo"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

# Create backup directory
mkdir -p ${BACKUP_DIR}/daily
mkdir -p ${BACKUP_DIR}/weekly
mkdir -p ${BACKUP_DIR}/monthly

log_info "Starting backup..."

# Backup MongoDB
log_info "Backing up MongoDB..."
mongodump --archive=${BACKUP_DIR}/daily/mongodb_${DATE}.archive --gzip 2>/dev/null || \
log_info "MongoDB backup skipped (not configured or running)"

# Backup PostgreSQL (if using)
if command -v pg_dump &> /dev/null; then
    log_info "Backing up PostgreSQL..."
    pg_dump -U outlfo_user outlfo_db > ${BACKUP_DIR}/daily/postgres_${DATE}.sql 2>/dev/null || \
    log_info "PostgreSQL backup skipped"
fi

# Backup application files
log_info "Backing up application files..."
tar -czf ${BACKUP_DIR}/daily/app_${DATE}.tar.gz \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    ${APP_DIR}/backend 2>/dev/null || true

# Backup environment files
log_info "Backing up configuration..."
tar -czf ${BACKUP_DIR}/daily/config_${DATE}.tar.gz \
    ${APP_DIR}/backend/.env \
    ${APP_DIR}/frontend/.env.local 2>/dev/null || true

# Backup Nginx configs
tar -czf ${BACKUP_DIR}/daily/nginx_${DATE}.tar.gz /etc/nginx/sites-* 2>/dev/null || true

# Cleanup old backups
log_info "Cleaning up old backups..."
find ${BACKUP_DIR}/daily -name "*.gz" -mtime +7 -delete
find ${BACKUP_DIR}/weekly -name "*.gz" -mtime +30 -delete

# Weekly rotation
if [ "$(date +%u)" = "1" ]; then
    log_info "Creating weekly backup..."
    cp -r ${BACKUP_DIR}/daily/* ${BACKUP_DIR}/weekly/ 2>/dev/null || true
fi

# Monthly rotation
if [ "$(date +%d)" = "01" ]; then
    log_info "Creating monthly backup..."
    cp -r ${BACKUP_DIR}/daily/* ${BACKUP_DIR}/monthly/ 2>/dev/null || true
fi

# Show backup size
log_info "Backup sizes:"
du -sh ${BACKUP_DIR}/daily/*

log_info "✅ Backup complete!"
echo ""
echo "Backup location: ${BACKUP_DIR}/daily/"