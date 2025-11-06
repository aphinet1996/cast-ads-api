import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';

import { connectDatabase } from './config/db';
import { SocketManager } from './services/socket.service';
import deviceRoutes from './routes/devices';
import mediaRoutes from './routes/media';
import { castRoutes } from './routes/cast';
import { gridComposerRoutes } from './routes/grid-composer';
import { playlistRoutes } from './routes/playlists';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    // origin: process.env.FRONTEND_URL,
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files
app.use('/media', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/cast', castRoutes);
app.use('/api/grid-composer', gridComposerRoutes);
app.use('/api/playlists', playlistRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// // API Info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Cast ADS API',
    version: process.env.npm_package_version || '1.0.0',
    description: 'Digital signage casting and template management API',
    endpoints: {
      devices: '/api/devices',
      media: '/api/media',
      cast: '/api/cast',
      templates: '/api/templates'
    }
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('/{*any}', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Initialize services
const socketManager = SocketManager.getInstance();
socketManager.initialize(io);

// Start server
const PORT = process.env.PORT;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    
    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO server ready`);
      console.log(`Media files served from: ${uploadsDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export default app;