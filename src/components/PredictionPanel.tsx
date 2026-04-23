import { useState, useEffect, useRef } from 'react';
import { Clock, Calendar, TrendingUp, TrendingDown, MapPin, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const timeSlots = ['6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WS_URL = 'ws://localhost:5000/ws';
const API_URL = 'http://localhost:5000/api';

// const WS_URL = 'wss://smart-traffic-backend-xyz.onrender.com/ws';
// const API_URL = 'https://smart-traffic-backend-xyz.onrender.com/api';

interface TrafficLocation {
  id: string;
  name: string;
  status: 'heavy' | 'moderate' | 'light';
  speed: number;
  incidents: number;
  lat: number;
  lng: number;
  area?: string;
  lastUpdated?: string;
}

interface ChartDataPoint {
  time: string;
  current: number;
  predicted: number;
  historical: number;
}

const generateDynamicPredictionData = (
  route: string,
  day: string,
  selectedTime: string,
  currentTrafficData?: TrafficLocation
): ChartDataPoint[] => {
  // Use real traffic data if available
  const baseValue = currentTrafficData ?
    (currentTrafficData.status === 'heavy' ? 80 :
      currentTrafficData.status === 'moderate' ? 50 : 30) : 50;

  const isWeekend = day === 'Saturday' || day === 'Sunday';
  const currentDayIndex = daysOfWeek.indexOf(day);

  // Adjust base value based on day of week
  const dayMultiplier = isWeekend ? 0.7 :
    (currentDayIndex === 0 || currentDayIndex === 4) ? 1.2 : 1.0; // Mon & Fri busier

  const adjustedBase = baseValue * dayMultiplier;

  // Time-of-day patterns
  const timePatterns: Record<string, number> = {
    '6 AM': -30,
    '9 AM': isWeekend ? -10 : 20,
    '12 PM': 10,
    '3 PM': 15,
    '6 PM': isWeekend ? 5 : 25,
    '9 PM': -10,
  };

  return timeSlots.map(time => {
    const timeAdjustment = timePatterns[time] || 0;
    const isSelectedTime = time === selectedTime;

    // Add more variation for selected time
    const selectedBoost = isSelectedTime ? 3 : 0;

    return {
      time,
      current: Math.max(10, Math.min(100, adjustedBase + timeAdjustment + selectedBoost)),
      predicted: Math.max(12, Math.min(100, adjustedBase + timeAdjustment + 2 + selectedBoost)),
      historical: Math.max(8, Math.min(100, adjustedBase + timeAdjustment - 2)),
    };
  });
};

export function PredictionPanel() {
  const [monitoredLocations, setMonitoredLocations] = useState<TrafficLocation[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });
  const [selectedTime, setSelectedTime] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return '6 AM';
    if (hour >= 9 && hour < 12) return '9 AM';
    if (hour >= 12 && hour < 15) return '12 PM';
    if (hour >= 15 && hour < 18) return '3 PM';
    if (hour >= 18 && hour < 21) return '6 PM';
    return '9 PM';
  });
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket for real-time data
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('✅ Prediction Panel: Connected to traffic updates');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'initial_data' || message.type === 'traffic_update') {
          setMonitoredLocations(message.data);
          console.log('📊 Prediction Panel: Received', message.data.length, 'locations');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('❌ Prediction Panel: Disconnected');
        setIsConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  };

  // Get current traffic data for selected route
  const currentLocationData = monitoredLocations.find(
    loc => loc.name.toLowerCase() === selectedRoute.toLowerCase()
  );

  // Generate chart data dynamically based on day and time
  const chartData = generateDynamicPredictionData(
    selectedRoute,
    selectedDay,
    selectedTime,
    currentLocationData
  );

  const currentData = chartData.find(d => d.time === selectedTime);
  const trend = currentData ? currentData.predicted - currentData.historical : 0;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Not connected to live traffic data. Predictions may not be accurate.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Traffic Prediction Settings</h2>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* Route Selection - Matches Day/Time style */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              Route / Location
              {currentLocationData && (
                <span className="ml-2 text-xs text-green-600">
                  ✓ Live Data
                </span>
              )}
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a route...</option>
              {monitoredLocations.map((location) => (
                <option key={location.id} value={location.name}>
                  {location.name} - {location.area}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {daysOfWeek.map((day) => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Time</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeSlots.map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Current Traffic Status (if real data available) */}
      {currentLocationData && selectedRoute && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-blue-600" />
                <p className="text-sm text-gray-700 font-medium">Current Live Status - {selectedRoute}</p>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Last updated: {currentLocationData.lastUpdated
                  ? new Date(currentLocationData.lastUpdated).toLocaleTimeString()
                  : 'Just now'}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-600">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`size-2 rounded-full ${currentLocationData.status === 'heavy' ? 'bg-red-500' :
                    currentLocationData.status === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                  <p className={`text-sm font-semibold ${currentLocationData.status === 'heavy' ? 'text-red-600' :
                    currentLocationData.status === 'moderate' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {currentLocationData.status === 'heavy' ? 'Heavy' :
                      currentLocationData.status === 'moderate' ? 'Moderate' : 'Light'}
                  </p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Avg Speed</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {currentLocationData.speed} km/h
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">Incidents</p>
                <p className={`text-sm font-semibold mt-1 ${currentLocationData.incidents > 0 ? 'text-orange-600' : 'text-gray-900'
                  }`}>
                  {currentLocationData.incidents}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Route Selected Message */}
      {!selectedRoute && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <MapPin className="size-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Select a route to view predictions</p>
          <p className="text-sm text-gray-500 mt-1">Choose from {monitoredLocations.length} monitored locations above</p>
        </div>
      )}

      {/* Prediction Stats */}
      {selectedRoute && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Clock className="size-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-600">Current Level</span>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{currentData?.current || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">Traffic congestion at {selectedTime}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <TrendingUp className="size-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-600">Predicted Level</span>
              </div>
              <p className="text-3xl font-semibold text-gray-900">{currentData?.predicted || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">Expected on {selectedDay}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`${trend >= 0 ? 'bg-orange-100' : 'bg-green-100'} p-2 rounded-lg`}>
                  {trend >= 0 ? (
                    <TrendingUp className="size-5 text-orange-600" />
                  ) : (
                    <TrendingDown className="size-5 text-green-600" />
                  )}
                </div>
                <span className="text-sm text-gray-600">Trend</span>
              </div>
              <p className={`text-3xl font-semibold ${trend >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {trend >= 0 ? '+' : ''}{Math.round(trend)}%
              </p>
              <p className="text-sm text-gray-500 mt-1">vs. historical avg</p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="size-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  Traffic Pattern - {selectedRoute}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">{selectedDay}</span>
                {currentLocationData && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    Live Data
                  </span>
                )}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#6b7280"
                  label={{
                    value: 'Congestion %',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: 12 }
                  }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `${Math.round(value)}%`}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  name="Historical Avg"
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Current"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  name="Predicted"
                  dot={{ fill: '#8b5cf6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="size-3 bg-gray-400 rounded-full opacity-50"></div>
                <span>Historical Average</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 bg-blue-500 rounded-full"></div>
                <span>Current Traffic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 bg-purple-500 rounded-full"></div>
                <span>AI Prediction</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              AI Recommendations for {selectedRoute} on {selectedDay} at {selectedTime}
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  {trend > 10
                    ? `Traffic is predicted to be ${Math.abs(Math.round(trend))}% heavier than usual. Consider departing earlier or using alternate routes.`
                    : trend < -10
                      ? `Traffic is predicted to be ${Math.abs(Math.round(trend))}% lighter than usual. Good time to travel!`
                      : 'Traffic is predicted to be near historical averages for this time.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>
                  {selectedDay === 'Saturday' || selectedDay === 'Sunday'
                    ? 'Weekend traffic patterns show lighter congestion compared to weekdays.'
                    : selectedDay === 'Monday' || selectedDay === 'Friday'
                      ? 'Traffic tends to be heavier on Mondays and Fridays. Extra travel time recommended.'
                      : 'Mid-week traffic patterns are generally more predictable.'}
                </span>
              </li>
              {currentLocationData && currentLocationData.incidents > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">⚠️</span>
                  <span className="text-red-700 font-medium">
                    {currentLocationData.incidents} active incident(s) currently reported in this area. Expect delays.
                  </span>
                </li>
              )}
              {currentLocationData && currentLocationData.status === 'heavy' && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>
                    Current traffic is heavy with average speed of {currentLocationData.speed} km/h.
                    Consider alternative routes or wait for conditions to improve.
                  </span>
                </li>
              )}
              {!currentLocationData && (
                <li className="flex items-start gap-2">
                  <span className="text-gray-600 mt-0.5">ℹ️</span>
                  <span className="text-gray-600">
                    Live traffic data not available for this location. Predictions based on historical patterns.
                  </span>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}