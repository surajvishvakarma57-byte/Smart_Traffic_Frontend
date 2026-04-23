import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer as WS } from 'ws';
import { initWebSocketServer, broadcast } from './websocket/websocket.server.js';
import { TrafficDataService } from './services/traffic.service.js';
import { GeocodingService } from './services/geocoding.service.js';

// Import routes
import trafficRoutes from './routes/traffic.routes.js';
import geocodeRoutes from './routes/geocode.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// 🔥 CRITICAL: Initialize services FIRST
const trafficService = new TrafficDataService();
const geocodingService = new GeocodingService();

// Create WebSocket server
const wss = new WS({ server, path: '/ws' });

// 🔥 CRITICAL: Pass trafficService to WebSocket so they share the same data
initWebSocketServer(wss, trafficService);

// 🔥 CRITICAL: Make services and broadcast function available to routes
app.set('trafficService', trafficService); // Same instance used by WebSocket
app.set('geocodingService', geocodingService);
app.set('broadcast', broadcast); // Broadcast function from WebSocket

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Smart Traffic Backend is running',
    timestamp: new Date().toISOString(),
    websocketConnections: wss.clients.size,
    locations: trafficService.getAllLocations().length
  });
});

// API Routes
app.use('/api/traffic', trafficRoutes);
app.use('/api/geocode', geocodeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚦 Smart Traffic Backend - Real-time Monitoring System');
  console.log('='.repeat(60));
  console.log(`📡 HTTP Server:    http://localhost:${PORT}`);
  console.log(`🔌 WebSocket:      ws://localhost:${PORT}/ws`);
  console.log(`🔧 Environment:    ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Locations:      ${trafficService.getAllLocations().length} locations`);
  console.log(`⏱️  Update Interval: ${process.env.TRAFFIC_UPDATE_INTERVAL || 5000}ms`);
  console.log('='.repeat(60));
  console.log('✅ Server is ready! Waiting for connections...\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

export default app;