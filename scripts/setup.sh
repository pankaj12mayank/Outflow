#!/bin/bash
set -e

echo "========================================"
echo "  OUTFLO - AI Outreach Automation"
echo "========================================"
echo ""

cd "$(dirname "$0")/.."

echo "[1/5] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 not found. Please install Python 3.10+"
    exit 1
fi
python3 --version

echo "[2/5] Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

echo "[3/5] Activating virtual environment..."
source venv/bin/activate

echo "[4/5] Installing backend dependencies..."
pip install -q -r apps/backend/requirements.txt

echo "[5/5] Installing Playwright browsers..."
playwright install chromium

echo ""
echo "========================================"
echo "  Environment setup complete!"
echo "========================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Install Ollama (https://ollama.ai)"
echo "   ollama pull llama3.2"
echo ""
echo "2. Create .env file:"
echo "   cp apps/backend/.env.example apps/backend/.env"
echo "   (edit with your database URL)"
echo ""
echo "3. Run database migrations:"
echo "   cd apps/backend"
echo "   alembic upgrade head"
echo ""
echo "4. Start the backend:"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "5. Start the frontend (new terminal):"
echo "   cd apps/frontend"
echo "   npm install --legacy-peer-deps"
echo "   npm run dev"
echo ""