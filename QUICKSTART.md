# Quick Start Guide

## Option 1: Docker (Recommended)

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### Steps

1. **Clone and setup**
   ```bash
   git clone <repo-url>
   cd collab-editor
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Wait for services** (about 30 seconds)
   ```bash
   docker-compose ps
   ```
   All services should show "healthy"

3. **Setup frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open browser**
   - Navigate to http://localhost:3000
   - Click "Create New Document"
   - Share the URL with others to collaborate!

## Option 2: Manual Setup

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Redis 7+

### Backend

1. **Install and start MongoDB**
   ```bash
   # MacOS
   brew install mongodb-community@7.0
   brew services start mongodb-community@7.0

   # Ubuntu
   sudo apt install mongodb-org
   sudo systemctl start mongod
   ```

2. **Install and start Redis**
   ```bash
   # MacOS
   brew install redis
   brew services start redis

   # Ubuntu
   sudo apt install redis-server
   sudo systemctl start redis
   ```

3. **Setup backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env if needed
   npm run dev
   ```

### Frontend

1. **Setup frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Open browser**
   - Navigate to http://localhost:3000

## Testing Collaboration

1. Open http://localhost:3000 in **Browser A**
2. Click "Create New Document"
3. Copy the URL (e.g., http://localhost:3000/editor/abc123)
4. Open the same URL in **Browser B** (or incognito)
5. Type in either browser - see real-time updates!

## Troubleshooting

### "Cannot connect to backend"
- Check backend is running: `curl http://localhost:3001/health`
- Check logs: `docker-compose logs app` or check terminal

### "WebSocket connection failed"
- Ensure port 3001 is not blocked
- Check firewall settings
- Verify JWT_SECRET is set in backend/.env

### "Page not loading"
- Clear browser cache
- Check frontend is running on port 3000
- Check console for errors (F12)

### "Redis connection error"
- Check Redis is running: `redis-cli ping`
- Should return: `PONG`

### "MongoDB connection error"
- Check MongoDB is running: `mongosh --eval "db.version()"`
- Should return version number

## Architecture Overview

```
User Browser
     ↓
Next.js Frontend (port 3000)
     ↓
WebSocket Connection
     ↓
Node.js Backend (port 3001)
     ↓
  ┌──┴──┐
  ↓     ↓
Redis MongoDB
(6379) (27017)
```

## Key Features to Test

1. **Real-time typing** - Type in one browser, see in another
2. **Cursor tracking** - Move cursor and watch collaborators panel
3. **Reconnection** - Close/open browser tab, see automatic reconnect
4. **Conflict resolution** - Both users type at same position
5. **Presence** - See when users join/leave

## Next Steps

- Read the full [README.md](./README.md) for architecture details
- Explore the OT algorithm in `backend/src/ot/engine.ts`
- Check out the Zustand store in `frontend/src/store/editorStore.ts`
- Review the WebSocket protocol in `shared/ws.types.ts`

## Support

For issues or questions:
- Check existing issues in the repository
- Review logs: `docker-compose logs -f`
- Enable debug mode by setting `NODE_ENV=development`
