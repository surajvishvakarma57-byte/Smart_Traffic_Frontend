<<<<<<< HEAD
# Smart Traffic Backend

Real-time traffic monitoring system with WebSocket support for live updates, geocoding, and analytics.

## Features

- 🔴 **Real-time Traffic Updates**: WebSocket-based live traffic condition updates
- 📍 **Geocoding Service**: Search and locate places on the map
- 📊 **Analytics Dashboard**: Real-time traffic analytics and insights
- 🗺️ **Interactive Map**: Google Maps integration with traffic layer
- 📡 **WebSocket Server**: Broadcasts traffic updates every 5 seconds
- 🎯 **REST API**: Full-featured API for traffic data management

## Tech Stack

- **Node.js** with Express.js
- **WebSocket** (ws library) for real-time communication
- **Google Maps APIs** (Geocoding & Maps JavaScript API)
- **CORS** enabled for frontend integration

## Installation

### Prerequisites

- Node.js 18+ installed
- Google Maps API key (optional for testing with mock data)

### Setup Steps

1. **Navigate to backend directory**:
   ```bash
   cd smart-traffic-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   WS_PORT=8080
   TRAFFIC_UPDATE_INTERVAL=5000
   GRAPH_UPDATE_INTERVAL=10000
   ```

5. **Start the server**:
   ```bash
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:5000`

## API Endpoints

### Traffic Endpoints

#### GET /api/traffic/locations
Get all traffic locations with current conditions.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "MG Road",
      "status": "moderate",
      "speed": 25,
      "incidents": 0,
      "lat": 12.9716,
      "lng": 77.5946,
      "area": "Central Business District",
      "lastUpdated": "2024-02-11T10:30:00.000Z"
    }
  ],
  "count": 8,
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

#### GET /api/traffic/locations/:id
Get specific location by ID.

#### GET /api/traffic/search?q=query
Search locations by name or area.

**Example**: `GET /api/traffic/search?q=koramangala`

#### POST /api/traffic/locations
Add a new traffic monitoring location.

**Request Body**:
```json
{
  "name": "New Location",
  "lat": 12.9716,
  "lng": 77.5946,
  "area": "Area Name",
  "status": "moderate",
  "speed": 30,
  "incidents": 0
}
```

#### POST /api/traffic/update
Manually trigger traffic conditions update.

### Geocoding Endpoints

#### GET /api/geocode/forward?address=location
Geocode an address to coordinates.

**Example**: `GET /api/geocode/forward?address=MG Road, Bengaluru`

**Response**:
```json
{
  "success": true,
  "data": {
    "formattedAddress": "MG Road, Bengaluru, Karnataka, India",
    "location": {
      "lat": 12.9716,
      "lng": 77.5946
    },
    "placeId": "ChIJ...",
    "types": ["route"]
  }
}
```

#### GET /api/geocode/reverse?lat=12.9716&lng=77.5946
Reverse geocode coordinates to address.

#### GET /api/geocode/search?q=query
Search for places.

### Analytics Endpoints

#### GET /api/analytics/overview
Get complete analytics overview.

**Response**:
```json
{
  "success": true,
  "data": {
    "hourly": [...],
    "weekly": [...],
    "summary": {
      "totalVolume": 317000,
      "avgSpeed": 32,
      "totalIncidents": 4,
      "peakDay": { ... }
    }
  }
}
```

#### GET /api/analytics/hourly
Get hourly traffic pattern data (24-hour rolling).

#### GET /api/analytics/weekly
Get weekly traffic volume data.

#### GET /api/analytics/summary
Get summary statistics only.

### Health Check

#### GET /api/health
Server health check.

## WebSocket Connection

### Connection URL
```
ws://localhost:5000/ws
```

### Message Types

#### From Server to Client

**Connection Acknowledgment**:
```json
{
  "type": "connection",
  "message": "Connected to Smart Traffic real-time updates",
  "clientId": "uuid",
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

**Initial Data**:
```json
{
  "type": "initial_data",
  "data": [...traffic locations...],
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

**Traffic Updates** (every 5 seconds):
```json
{
  "type": "traffic_update",
  "data": [...updated locations...],
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

**Analytics Updates** (every 10 seconds):
```json
{
  "type": "analytics_update",
  "data": {
    "hourly": [...],
    "weekly": [...],
    "summary": {...}
  },
  "timestamp": "2024-02-11T10:30:00.000Z"
}
```

#### From Client to Server

**Request Data**:
```json
{
  "type": "request_data"
}
```

**Subscribe to Location**:
```json
{
  "type": "subscribe_location",
  "locationId": "uuid"
}
```

**Ping** (keep-alive):
```json
{
  "type": "ping"
}
```

## Data Simulation

The backend includes a sophisticated traffic simulation system:

- **Traffic Status**: Randomly updates between 'light', 'moderate', and 'heavy'
- **Speed Variations**: Realistic speed changes based on traffic status
- **Incidents**: Random incident generation
- **Hourly Patterns**: Simulates realistic traffic patterns throughout the day
- **Peak Hours**: Higher traffic during morning (6-9 AM) and evening (5-8 PM)

## Project Structure

```
smart-traffic-backend/
├── src/
│   ├── routes/
│   │   ├── traffic.routes.js      # Traffic API endpoints
│   │   ├── geocode.routes.js      # Geocoding endpoints
│   │   └── analytics.routes.js    # Analytics endpoints
│   ├── services/
│   │   ├── traffic.service.js     # Traffic data management
│   │   └── geocoding.service.js   # Geocoding service
│   ├── websocket/
│   │   └── websocket.server.js    # WebSocket server & broadcasting
│   └── server.js                   # Main application entry
├── package.json
├── .env.example
└── README.md
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment mode | development |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 |
| GOOGLE_MAPS_API_KEY | Google Maps API key | YOUR_GOOGLE_MAPS_API_KEY |
| TRAFFIC_UPDATE_INTERVAL | Traffic update interval (ms) | 5000 |
| GRAPH_UPDATE_INTERVAL | Analytics update interval (ms) | 10000 |

## Google Maps API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable these APIs:
   - Maps JavaScript API
   - Geocoding API
4. Create credentials (API Key)
5. Add the API key to `.env` file

**Note**: The system works with mock data if no API key is provided.

## CORS Configuration

The backend is configured to accept requests from:
- Frontend URL specified in `.env` (default: `http://localhost:5173`)

To allow multiple origins, modify `src/server.js`:
```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-production-domain.com'
  ],
  credentials: true
}));
```

## Monitoring & Logging

The server provides console logging for:
- WebSocket connections/disconnections
- Traffic update broadcasts
- Analytics update broadcasts
- API requests
- Errors and warnings

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name smart-traffic-backend
   ```

3. Configure reverse proxy (nginx):
   ```nginx
   location /api {
     proxy_pass http://localhost:5000;
   }
   
   location /ws {
     proxy_pass http://localhost:5000;
     proxy_http_version 1.1;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "upgrade";
   }
   ```

## Troubleshooting

### WebSocket connection fails
- Check if port 5000 is accessible
- Verify CORS settings
- Ensure frontend URL is correct in `.env`

### No traffic updates
- Check WebSocket connection status
- Verify update intervals in `.env`
- Check browser console for errors

### Geocoding not working
- Verify Google Maps API key
- Ensure Geocoding API is enabled
- Check API key restrictions
- System falls back to mock data if API unavailable

## License

ISC

## Support

For issues and questions, please create an issue in the repository.
=======
# Smart_traffic_Backend
>>>>>>> 79fd2253feca7b41b37861047f0614b356939c64
