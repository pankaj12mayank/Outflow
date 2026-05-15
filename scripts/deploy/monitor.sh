#!/bin/bash

# Outflo Health & Monitoring Script

OUTFLO_DIR="/var/www/outflo"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
    local name=$1
    local port=$2
    local endpoint=$3

    if curl -sf "http://localhost:${port}${endpoint}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name is healthy"
        return 0
    else
        echo -e "${RED}✗${NC} $name is down"
        return 1
    fi
}

echo "🏥 Outflo Health Check"
echo "======================"

# Check PM2 services
echo -e "\n${YELLOW}PM2 Services:${NC}"
pm2 list

# Check services
echo -e "\n${YELLOW}Service Health:${NC}"
check_service "Frontend" 3000 "/"
check_service "Backend API" 8000 "/api/v1/health"
check_service "Backend Ready" 8000 "/api/v1/ready"

# Check Nginx
echo -e "\n${YELLOW}Nginx Status:${NC}"
systemctl status nginx --no-pager | head -5

# Check disk space
echo -e "\n${YELLOW}Disk Usage:${NC}"
df -h | grep -E '/$|/var'

# Check memory
echo -e "\n${YELLOW}Memory Usage:${NC}"
free -h

# Check CPU
echo -e "\n${YELLOW}CPU Load:${NC}"
uptime

# Check logs for errors
echo -e "\n${YELLOW}Recent Errors (Last 10):${NC}"
if [ -f "${OUTFLO_DIR}/backend/logs/error.log" ]; then
    tail -10 "${OUTFLO_DIR}/backend/logs/error.log" | grep -i error || echo "No recent errors"
fi

# Network connections
echo -e "\n${YELLOW}Active Connections:${NC}"
netstat -tn | grep -E ':(3000|8000)' | wc -l | xargs echo "Connections to app:"

echo -e "\n✅ Health check complete"