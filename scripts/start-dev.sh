#!/bin/bash
# ===========================================
# OUTFLO - Start Development Server
# ===========================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "==========================================="
echo "   Starting Outflo Development Server"
echo "==========================================="
echo -e "${NC}"

# Function to start a service
start_service() {
    local name=$1
    local command=$2
    local dir=$3

    echo -e "${YELLOW}Starting $name...${NC}"
    cd "$dir"
    x-terminal-emulator -e "$command" 2>/dev/null || \
    gnome-terminal -- "$command" 2>/dev/null || \
    osascript -e "tell app \"Terminal\" to do script \"cd $dir && $command\"" 2>/dev/null || \
    echo "Please manually run: cd $dir && $command"
}

# Start Backend
if [ -d "apps/backend" ]; then
    echo -e "${GREEN}Starting Backend Server (Port 8000)...${NC}"
    cd apps/backend
    if [ -d "venv" ]; then
        source venv/bin/activate
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    else
        uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
    fi
fi

# Wait a moment
sleep 2

# Start Frontend
if [ -d "apps/frontend" ]; then
    echo -e "${GREEN}Starting Frontend Server (Port 3000)...${NC}"
    cd apps/frontend
    npm run dev &
fi

echo ""
echo -e "${GREEN}==========================================="
echo "   Servers Starting!"
echo "==========================================="
echo ""
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"
echo "==========================================="${NC}

wait