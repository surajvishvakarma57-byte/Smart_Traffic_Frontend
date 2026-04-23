import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Car, Calendar, Activity } from 'lucide-react';

const WS_URL = 'ws://localhost:5000/ws';
// const WS_URL = 'wss://smart-traffic-backend-xyz.onrender.com/ws';
// const API_URL = 'https://smart-traffic-backend-xyz.onrender.com/api';

interface HourlyData {
  hour: string;
  vehicles: number;
  timestamp?: number;
}

interface WeeklyData {
  day: string;
  volume: number;
  predicted: number;
  capacity: number;
}

interface AnalyticsSummary {
  totalVolume: number;
  avgSpeed: number;
  totalIncidents: number;
  peakDay: WeeklyData;
}

export function DemandChart() {
  const [activeView, setActiveView] = useState<'weekly' | 'hourly' | 'growth'>('weekly');
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const wsRef = useRef<WebSocket | null>(null);

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
        console.log('✅ Connected to analytics updates');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('❌ Disconnected from analytics updates');
        setIsConnected(false);
        setTimeout(connectWebSocket, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'analytics_update':
        if (message.data) {
          setHourlyData(message.data.hourly || []);
          setWeeklyData(message.data.weekly || []);
          setSummary(message.data.summary || null);
          setLastUpdate(new Date());
        }
        break;
      case 'initial_data':
        // Request analytics data
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'request_data' }));
        }
        break;
    }
  };

  const monthlyGrowth = [
    { month: 'Jan', growth: 2.5 },
    { month: 'Feb', growth: 3.2 },
    { month: 'Mar', growth: 2.8 },
    { month: 'Apr', growth: 4.1 },
    { month: 'May', growth: 3.5 },
    { month: 'Jun', growth: 4.8 },
  ];

  const totalVolume = summary?.totalVolume || 0;
  const avgCapacity = weeklyData.length > 0
    ? (totalVolume / weeklyData.reduce((sum, day) => sum + day.capacity, 0)) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Traffic Analytics</h2>
        <div className="flex items-center gap-2">
          <span className={`size-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full ${isConnected ? 'animate-pulse' : ''}`}></span>
          <span className="text-sm text-gray-500">
            {isConnected ? 'Real-time' : 'Offline'}
          </span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm text-gray-500">
            Updated {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Car className="size-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Weekly Volume</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {(totalVolume / 1000).toFixed(0)}K
          </p>
          <p className="text-sm text-gray-500 mt-1">vehicles this week</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Users className="size-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Avg Capacity</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{avgCapacity.toFixed(0)}%</p>
          <p className="text-sm text-gray-500 mt-1">of road capacity used</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Activity className="size-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-600">Avg Speed</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900">{summary?.avgSpeed || 0}</p>
          <p className="text-sm text-gray-500 mt-1">km/h across city</p>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView('weekly')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeView === 'weekly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Calendar className="size-4 inline mr-2" />
            Weekly Demand
          </button>
          <button
            onClick={() => setActiveView('hourly')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeView === 'hourly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <Car className="size-4 inline mr-2" />
            Hourly Pattern
          </button>
          <button
            onClick={() => setActiveView('growth')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${activeView === 'growth'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            <TrendingUp className="size-4 inline mr-2" />
            Growth Trends
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeView === 'weekly' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Weekly Traffic Volume & Predictions</h3>
              <div className="flex items-center gap-2">
                <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Live Data</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Vehicles', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="volume" fill="#3b82f6" name="Actual Volume" radius={[8, 8, 0, 0]} />
                <Bar dataKey="predicted" fill="#8b5cf6" name="Predicted Volume" radius={[8, 8, 0, 0]} />
                <Bar dataKey="capacity" fill="#e5e7eb" name="Road Capacity" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {activeView === 'hourly' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Hourly Traffic Pattern (Real-time)</h3>
              <div className="flex items-center gap-2">
                <div className="size-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Updating Live</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Vehicles', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="vehicles"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Vehicle Count"
                  dot={{ r: 6 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}

        {activeView === 'growth' && (
          <>
            <h3 className="font-semibold text-gray-900 mb-6">Monthly Traffic Growth Rate</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Growth %', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="growth" fill="#10b981" name="Growth Rate (%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Real-time Insights</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-0.5">•</span>
            <span>
              {summary?.peakDay
                ? `Traffic peaks on ${summary.peakDay.day} with ${(summary.peakDay.volume / 1000).toFixed(1)}K vehicles`
                : 'Loading peak traffic data...'}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-0.5">•</span>
            <span>
              Current average speed across monitored locations: {summary?.avgSpeed || 0} km/h
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-0.5">•</span>
            <span>
              Active incidents being monitored: {summary?.totalIncidents || 0}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-600 mt-0.5">•</span>
            <span>
              Data updates every 10 seconds via WebSocket connection
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
