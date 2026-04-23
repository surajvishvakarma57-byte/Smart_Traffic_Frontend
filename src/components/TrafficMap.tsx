import { useState } from 'react';
import { MapPin, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, TrafficLayer } from '@react-google-maps/api';

interface TrafficLocation {
  id: string;
  name: string;
  status: 'heavy' | 'moderate' | 'light';
  speed: number;
  incidents: number;
  lat: number;
  lng: number;
}

const mockLocations: TrafficLocation[] = [
  { id: '1', name: 'Kengeri', status: 'heavy', speed: 15, incidents: 2, lat: 37.7749, lng: -122.4194 },
  { id: '2', name: 'Nagarbhavi', status: 'moderate', speed: 45, incidents: 0, lat: 37.8044, lng: -122.4180 },
  { id: '3', name: 'Vijaynagar', status: 'light', speed: 60, incidents: 0, lat: 37.7849, lng: -122.4094 },
  { id: '4', name: 'Rajarajeshwari Nagar', status: 'moderate', speed: 50, incidents: 1, lat: 37.7649, lng: -122.4294 },
  { id: '5', name: 'Rajaji Nagar', status: 'heavy', speed: 20, incidents: 1, lat: 37.7949, lng: -122.3994 },
  { id: '6', name: 'Bangalore university', status: 'light', speed: 55, incidents: 0, lat: 37.7549, lng: -122.4394 },
];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '8px',
};

const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
};

// Get API key from: https://console.cloud.google.com/google/maps-apis
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'https://smart-traffic-backend-production-fc3c.up.railway.app/api';

export function TrafficMap() {
  const [selectedLocation, setSelectedLocation] = useState<TrafficLocation | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const onLoad = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  const getMarkerIcon = (status: TrafficLocation['status']) => {
    const color = status === 'heavy' ? 'red' : status === 'moderate' ? 'yellow' : 'green';
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: 'white',
      strokeWeight: 2,
      scale: 10,
    };
  };

  const getStatusColor = (status: TrafficLocation['status']) => {
    switch (status) {
      case 'heavy':
        return 'bg-red-500';
      case 'moderate':
        return 'bg-yellow-500';
      case 'light':
        return 'bg-green-500';
    }
  };

  const getStatusText = (status: TrafficLocation['status']) => {
    switch (status) {
      case 'heavy':
        return 'Heavy Traffic';
      case 'moderate':
        return 'Moderate Traffic';
      case 'light':
        return 'Light Traffic';
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Map View */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Live Traffic Map</h2>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="size-4" />
              Updated 2 min ago
            </div>
          </div>

          {/* Google Map Container */}
          {GOOGLE_MAPS_API_KEY === 'AIzaSyDP7EBe3E7qhJfcQO0OyE8GVZUfklJYutc' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <AlertTriangle className="size-12 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Google Maps API Key Required</h3>
              <p className="text-sm text-gray-600 mb-4">
                To display the live traffic map, you need to add your Google Maps API key.
              </p>
              <ol className="text-left text-sm text-gray-600 space-y-2 max-w-md mx-auto">
                <li>1. Go to <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                <li>2. Create a project and enable the Maps JavaScript API</li>
                <li>3. Create an API key</li>
                <li>4. Replace 'YOUR_GOOGLE_MAPS_API_KEY' in /components/TrafficMap.tsx</li>
              </ol>
            </div>
          ) : loadError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center h-[500px] flex flex-col items-center justify-center">
              <AlertTriangle className="size-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Error Loading Map</h3>
              <p className="text-sm text-gray-600">{loadError.message}</p>
            </div>
          ) : !isLoaded ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center h-[500px] flex flex-col items-center justify-center">
              <Loader2 className="size-12 text-blue-600 mx-auto mb-3 animate-spin" />
              <h3 className="font-semibold text-gray-900">Loading Map...</h3>
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              onLoad={onLoad}
              options={mapOptions}
            >
              {/* Traffic Layer - shows real-time traffic conditions */}
              <TrafficLayer />

              {/* Traffic Location Markers */}
              {mockLocations.map((location) => (
                <Marker
                  key={location.id}
                  position={{ lat: location.lat, lng: location.lng }}
                  icon={getMarkerIcon(location.status)}
                  onClick={() => setSelectedLocation(location)}
                  title={location.name}
                />
              ))}
            </GoogleMap>
          )}
        </div>
      </div>

      {/* Location Details */}
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
                    <p className="text-sm text-gray-500">Selected Location</p>
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
                  <span className="font-medium text-gray-900">{selectedLocation.speed} mph</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Incidents</span>
                  <span className={`font-medium ${selectedLocation.incidents > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                    {selectedLocation.incidents}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="size-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Select a location on the map</p>
            </div>
          )}
        </div>

        {/* All Locations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">All Locations</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {mockLocations.map((location) => (
              <button
                key={location.id}
                onClick={() => setSelectedLocation(location)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedLocation?.id === location.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{location.name}</span>
                  <div className={`size-2 ${getStatusColor(location.status)} rounded-full`} />
                </div>
                <p className="text-xs text-gray-500">{location.speed} mph avg</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}