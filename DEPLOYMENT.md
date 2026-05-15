# OUTFLO - Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

## Quick Start (Docker)

```bash
# Clone the repository
git clone <your-repo>
cd outflo

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Environment Variables

### Backend (.env)
Create `apps/backend/.env`:
```env
SECRET_KEY=your-secure-secret-key
MONGO_URL=mongodb://localhost:27017
MONGO_DATABASE=outflo
DEBUG=false
CORS_ORIGINS=["http://localhost:3000"]
OLLAMA_BASE_URL=http://localhost:11434
```

### Frontend (.env.local)
Create `apps/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Manual Deployment

### Backend
```bash
cd apps/backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd apps/frontend
npm install
npm run build
npm start
```

## Production Checklist

- [ ] Set secure SECRET_KEY
- [ ] Configure MongoDB with authentication
- [ ] Set up SSL/HTTPS
- [ ] Configure environment variables
- [ ] Set up monitoring (Sentry recommended)
- [ ] Configure backup for MongoDB
- [ ] Set up log rotation
- [ ] Configure rate limiting

## Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Backend API | 8000 |
| MongoDB | 27017 |