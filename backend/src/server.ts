import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { DocumentManager } from './services/documentManager';
import { PresenceManager } from './services/presenceManager';
import { ConnectionManager } from './services/connectionManager';
import { createRouter } from './routes/api';
import { WSMessage } from './shared/ws.types';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!process.env.REDIS_HOST) throw new Error('REDIS_HOST is required');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');

const MONGODB_URI = process.env.MONGODB_URI;
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;

async function startServer() {
  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  // Initialize services
  const documentManager = new DocumentManager();
  const presenceManager = new PresenceManager(REDIS_HOST, REDIS_PORT);
  const connectionManager = new ConnectionManager(
    documentManager,
    presenceManager,
    JWT_SECRET
  );

  // Create Express app
  const app = express();
  
  const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3000', // optional for local dev
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS blocked'));
  },
  credentials: true,
}));

  app.use(express.json());

  // API routes
  const apiRouter = createRouter(documentManager, JWT_SECRET);
  app.use('/api', apiRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    let userId: string;
    try {
      userId = connectionManager.authenticateConnection(token);
    } catch (error) {
      ws.close(1008, 'Invalid token');
      return;
    }

    const clientId = uuidv4();
    connectionManager.addClient(clientId, ws, userId);
    console.log(`Client connected: ${userId} (${clientId})`);

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        connectionManager.handleMessage(clientId, message);
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`Client disconnected: ${userId} (${clientId})`);
      connectionManager.removeClient(clientId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Periodic persistence for all active documents
  setInterval(async () => {
    // This would be enhanced to track active documents
    console.log('Periodic save check...');
  }, 10000);

  // Start server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
const host = FRONTEND_URL || `localhost:${PORT}`;
console.log(`WebSocket endpoint: ${protocol}://${host}/ws`);

  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server...');
    server.close();
    await mongoose.connection.close();
    await presenceManager.close();
    process.exit(0);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
