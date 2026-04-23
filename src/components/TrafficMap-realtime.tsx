import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, AlertTriangle, CheckCircle, Clock, Search, Plus, X } from 'lucide-react';
import { GoogleMap, useLoadScript, Marker, TrafficLayer, InfoWindow, Autocomplete } from '@react-google-maps/api';
import { Button } from './ui/button';

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

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const WS_URL = import.meta.env.VITE_WS_URL;
const API_URL = import.meta.env.VITE_API_URL;

// const WS_URL = 'wss://smart-traffic-backend-xyz.onrender.com/ws';
// const API_URL = 'https://smart-traffic-backend-xyz.onrender.com/api';

export function TrafficMap() {
  const [locations, setLocations] = useState<TrafficLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<TrafficLocation | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchMarker, setSearchMarker] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

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
        console.log('✅ Connected to traffic updates');
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
        console.log('❌ Disconnected from traffic updates');
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
      case 'initial_data':
      case 'traffic_update':
        console.log('📊 Received locations update:', message.data.length, 'locations');
        setLocations(message.data);
        setLastUpdate(new Date());
        break;
      case 'connection':
        console.log('Connected:', message.message);
        break;
    }
  };

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onAutocompleteLoad = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
    console.log('✅ Autocomplete loaded successfully');
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();

      if (place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || place.formatted_address || 'Unknown Location',
        };

        setSearchMarker(location);

        if (map) {
          map.panTo({ lat: location.lat, lng: location.lng });
          map.setZoom(15);
        }

        console.log('✅ Place selected:', location.name);
      }
    }
  };

  const getMarkerIcon = (status: TrafficLocation['status']) => {
    const color = status === 'heavy' ? '#EF4444' : status === 'moderate' ? '#F59E0B' : '#10B981';
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: 'white',
      strokeWeight: 2,
      scale: 10,
    };
  };

  const getSearchMarkerIcon = () => {
    return {
      path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
      fillColor: '#3B82F6',
      fillOpacity: 1,
      strokeColor: 'white',
      strokeWeight: 2,
      scale: 6,
      rotation: 180,
    };
  };

  const getStatusColor = (status: TrafficLocation['status']) => {
    switch (status) {
      case 'heavy': return 'bg-red-500';
      case 'moderate': return 'bg-yellow-500';
      case 'light': return 'bg-green-500';
    }
  };

  const getStatusText = (status: TrafficLocation['status']) => {
    switch (status) {
      case 'heavy': return 'Heavy Traffic';
      case 'moderate': return 'Moderate Traffic';
      case 'light': return 'Light Traffic';
    }
  };

  const handleLocationClick = (location: TrafficLocation) => {
    setSelectedLocation(location);
    setSearchMarker(null);
    if (map) {
      map.panTo({ lat: location.lat, lng: location.lng });
      map.setZoom(15);
    }
  };

  const handleAddLocationToMonitoring = async () => {
    if (!searchMarker) return;

    try {
      console.log('📤 Sending location to backend:', searchMarker.name);

      const response = await fetch(`${API_URL}/traffic/locations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: searchMarker.name,
          lat: searchMarker.lat,
          lng: searchMarker.lng,
          area: 'User Added',
          status: 'moderate',
          speed: 30,
          incidents: 0,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Location added to backend:', data.data);

        // Clear search marker immediately
        clearSearch();

        // Show success message
        alert(`✅ ${searchMarker.name} added to traffic monitoring!\n\nIt will appear in "Monitored Locations" in a moment.`);

        // Request updated data from backend
        requestDataUpdate();
      } else {
        console.error('❌ Backend returned error:', data);
        alert('❌ Failed to add location: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error adding location:', error);
      alert('❌ Failed to add location. Make sure backend is running.');
    }
  };

  const requestDataUpdate = () => {
    // Request fresh data from backend
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'request_data' }));
      console.log('📡 Requested fresh data from backend');
    }
  };

  const clearSearch = () => {
    setSearchMarker(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  if (loadError) {
    return (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-8 text-red-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Map Error</h3>
                  <p className="text-sm text-red-700 mb-3">{loadError.message}</p>
                  <div className="text-sm text-red-600 space-y-1">
                    <p>Common fixes:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Enable "Maps JavaScript API" in Google Cloud Console</li>
                      <li>Enable "Places API" for search functionality</li>
                      <li>Enable billing (required by Google)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-blue-700 font-medium">Loading Google Maps...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Live Traffic Map</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`size-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full ${isConnected ? 'animate-pulse' : ''}`}></span>
                <span className="text-sm text-gray-500">{isConnected ? 'Live' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="size-4" />
                {Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 z-10 pointer-events-none" />
              <Autocomplete
                onLoad={onAutocompleteLoad}
                onPlaceChanged={onPlaceChanged}
              >
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search any place (e.g., MG Road, Bangalore Airport, Starbucks)..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </Autocomplete>
              {searchMarker && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              💡 Start typing to see suggestions - click to select and add to monitoring
            </div>

            {searchMarker && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    <MapPin className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{searchMarker.name}</p>
                      <p className="text-xs text-gray-600">
                        📍 {searchMarker.lat.toFixed(6)}, {searchMarker.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAddLocationToMonitoring}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                  >
                    <Plus className="size-4 mr-1" />
                    Add to Monitoring
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 Click "Add to Monitoring" to start tracking traffic here
                </p>
              </div>
            )}
          </div>

          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onLoad}
            options={mapOptions}
          >
            <TrafficLayer />

            {locations.map((location) => (
              <Marker
                key={location.id}
                position={{ lat: location.lat, lng: location.lng }}
                icon={getMarkerIcon(location.status)}
                onClick={() => handleLocationClick(location)}
                title={location.name}
              />
            ))}

            {searchMarker && (
              <Marker
                position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
                icon={getSearchMarkerIcon()}
                title={searchMarker.name}
                animation={google.maps.Animation.BOUNCE}
              />
            )}

            {selectedLocation && (
              <InfoWindow
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                onCloseClick={() => setSelectedLocation(null)}
              >
                <div className="p-2">
                  <h3 className="font-semibold text-gray-900 mb-1">{selectedLocation.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">{selectedLocation.area}</p>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Status:</span> {getStatusText(selectedLocation.status)}</p>
                    <p><span className="font-medium">Speed:</span> {selectedLocation.speed} km/h</p>
                    <p><span className="font-medium">Incidents:</span> {selectedLocation.incidents}</p>
                  </div>
                </div>
              </InfoWindow>
            )}

            {searchMarker && !selectedLocation && (
              <InfoWindow
                position={{ lat: searchMarker.lat, lng: searchMarker.lng }}
                onCloseClick={clearSearch}
              >
                <div className="p-2">
                  <h3 className="font-semibold text-blue-900 mb-1">📍 {searchMarker.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">Search Result</p>
                  <button
                    onClick={handleAddLocationToMonitoring}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    + Add to Traffic Monitoring
                  </button>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="size-3 bg-red-500 rounded-full"></div>
              <span>Heavy Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-yellow-500 rounded-full"></div>
              <span>Moderate Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-green-500 rounded-full"></div>
              <span>Light Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-3 bg-blue-600 rounded-full"></div>
              <span>Search Result</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Traffic Conditions</h3>

          {selectedLocation ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="size-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedLocation.name}</p>
                    <p className="text-sm text-gray-500">{selectedLocation.area || 'Selected Location'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${selectedLocation.status === 'heavy'
                    ? 'bg-red-100 text-red-700'
                    : selectedLocation.status === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                    }`}>
                    {selectedLocation.status === 'light' && <CheckCircle className="size-3" />}
                    {selectedLocation.status === 'heavy' && <AlertTriangle className="size-3" />}
                    {getStatusText(selectedLocation.status)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Speed</span>
                  <span className="font-medium text-gray-900">{selectedLocation.speed} km/h</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Incidents</span>
                  <span className={`font-medium ${selectedLocation.incidents > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {selectedLocation.incidents}
                  </span>
                </div>

                {selectedLocation.lastUpdated && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last Updated</span>
                    <span>{new Date(selectedLocation.lastUpdated).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          ) : searchMarker ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <Search className="size-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{searchMarker.name}</p>
                    <p className="text-sm text-gray-500">Search Result</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  This location is not currently being monitored for traffic.
                </p>
                <Button
                  onClick={handleAddLocationToMonitoring}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="size-4 mr-2" />
                  Add to Traffic Monitoring
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="size-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Search or select a location</p>
              <p className="text-xs text-gray-400 mt-2">Start typing to see suggestions</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Monitored Locations ({locations.length})</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {locations.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                <MapPin className="size-8 text-gray-300 mx-auto mb-2" />
                <p>No locations being monitored yet.</p>
                <p className="text-xs mt-1">Search and add locations to start tracking!</p>
              </div>
            ) : (
              locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => handleLocationClick(location)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedLocation?.id === location.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{location.name}</span>
                    <div className={`size-2 ${getStatusColor(location.status)} rounded-full`} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{location.area}</span>
                    <span>{location.speed} km/h</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}