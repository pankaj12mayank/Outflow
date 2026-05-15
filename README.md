# Outflo - AI Outreach Automation Platform

## 🚀 One-Click Development System

Welcome to Outflo! This platform is designed for **zero-configuration** startup. Just double-click and the entire system starts automatically.

### Quick Start

1. **Clone/Download** the project
2. **Double-click** `run.bat`
3. **That's it!** - The entire system will:
   - Verify your environment
   - Install all dependencies
   - Start MongoDB (if not running)
   - Start the backend server
   - Start the frontend server
   - Open your browser automatically

---

## 📁 Project Structure

```
outflo/
├── run.bat                 # One-click start (DOUBLE-CLICK THIS)
├── stop.bat               # Stop all services
├── restart.bat            # Restart the entire system
├── verify_system.bat      # Verify all dependencies
├── install_requirements.bat # Install all dependencies manually
├── README.md              # This file
├── logs/                  # System logs
│   ├── backend.log        # Backend server logs
│   └── frontend.log       # Frontend server logs
├── apps/
│   ├── backend/           # FastAPI Backend
│   │   ├── app/           # Main application
│   │   ├── venv/          # Python virtual environment
│   │   ├── requirements.txt
│   │   └── .env           # Backend environment config
│   └── frontend/          # Next.js Frontend
│       ├── app/           # Next.js app router
│       ├── components/    # React components
│       ├── lib/           # Utilities
│       └── .env.local     # Frontend environment config
├── packages/              # Shared packages
│   ├── ai-providers/     # AI provider integrations
│   ├── email/            # Email service
│   ├── scraping/         # Web scraping utilities
│   └── shared/           # Shared TypeScript
├── scripts/               # Build & deploy scripts
└── docs/                 # Documentation
```

---

## 🎯 Quick Commands

| Action | Command |
|--------|---------|
| **Start System** | Double-click `run.bat` |
| **Stop System** | Double-click `stop.bat` |
| **Restart System** | Double-click `restart.bat` |
| **Verify System** | Double-click `verify_system.bat` |
| **Manual Install** | Double-click `install_requirements.bat` |

---

## 🔧 System Requirements

### Must Have
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community)

### Optional (AI Features)
- **Ollama** - [Download](https://ollama.ai/)

---

## 🌐 Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| Ollama | 11434 | http://localhost:11434 |

---

## ⚙️ Configuration

### Backend Environment (.env)

Located at: `apps/backend/.env`

```env
# Database (MongoDB)
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=outflo

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true

# Authentication
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Ollama AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# CORS
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend Environment (.env.local)

Located at: `apps/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🛠️ Manual Setup (If Needed)

### Backend Setup

```bash
cd apps/backend

# Create virtual environment
python -m venv venv

# Activate
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env

# Start server
python -m uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd apps/frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error:** `Connection refused` or `MongoDB not connecting`

**Solutions:**
1. Install MongoDB: https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   ```bash
   mongod
   ```
3. Default connection: `mongodb://localhost:27017`

---

### Port Already in Use

**Error:** `Port 3000 is already in use` or `Port 8000 is already in use`

**Solutions:**
1. Check what's using the port:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Kill the process:
   ```bash
   taskkill /F /PID <PROCESS_ID>
   ```
3. Or use a different port in `.env`

---

### Python Dependency Issues

**Error:** `Module not found` or `pip install failed`

**Solutions:**
1. Delete `venv` folder and recreate:
   ```bash
   rmdir /s /q venv
   python -m venv venv
   venv\Scripts\activate.bat
   pip install -r requirements.txt
   ```

---

### Node Modules Issues

**Error:** `Cannot find module` or `npm install failed`

**Solutions:**
1. Clear npm cache and reinstall:
   ```bash
   cd apps/frontend
   rmdir /s /q node_modules
   rmdir /s /q .next
   npm cache clean --force
   npm install
   ```

---

### Ollama Issues

**Error:** `Ollama not found` or `Model not available`

**Solutions:**
1. Install Ollama: https://ollama.ai/
2. Start Ollama:
   ```bash
   ollama serve
   ```
3. Pull required model:
   ```bash
   ollama pull llama3.2
   ```

---

### Frontend Build Issues

**Error:** `Build failed` or `Next.js error`

**Solutions:**
1. Clean build:
   ```bash
   cd apps/frontend
   rmdir /s /q .next
   npm run build
   ```

---

## 🔍 Health Checks

### Backend Health
```bash
curl http://localhost:8000/api/v1/health
```

### Readiness Check
```bash
curl http://localhost:8000/api/v1/ready
```

### Frontend Health
```bash
curl http://localhost:3000
```

---

## 🚀 Production Deployment

### Backend (Production)

```bash
cd apps/backend

# Use production requirements
pip install -r requirements-prod.txt

# Set environment
set APP_ENV=production

# Run with gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
```

### Frontend (Production)

```bash
cd apps/frontend

# Build for production
npm run build

# Start production server
npm run start
```

---

## 📝 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License

---

## 📞 Support

For issues and questions:
- Check the troubleshooting section above
- Review the logs in `logs/` directory
- Verify system with `verify_system.bat`

---

**Made with ❤️ for developers who want to ship fast!**