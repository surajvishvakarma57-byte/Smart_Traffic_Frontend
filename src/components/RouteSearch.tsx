import { useState, useRef } from 'react';
import { MapPin, Navigation, Clock, AlertCircle, CheckCircle, Loader2, TrendingUp, X } from 'lucide-react';
import { Autocomplete, useLoadScript, GoogleMap, DirectionsRenderer } from '@react-google-maps/api';

const libraries: ("places" | "geometry" | "drawing")[] = ["places"];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface Location {
  name: string;
  lat: number;
  lng: number;
}

interface RouteOption {
  id: string;
  summary: string;
  distance: string;
  duration: string;
  durationInTraffic: string;
  traffic: 'light' | 'moderate' | 'heavy';
  savings?: string;
  recommended?: boolean;
  steps: google.maps.DirectionsStep[];
  warnings: string[];
  directionsResult: google.maps.DirectionsResult;
  routeIndex: number;
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
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
};

export function RouteSearch() {
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoutes, setShowRoutes] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const originAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocomplete = useRef<google.maps.places.Autocomplete | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: libraries,
  });

  const onOriginLoad = (autocomplete: google.maps.places.Autocomplete) => {
    originAutocomplete.current = autocomplete;
  };

  const onDestLoad = (autocomplete: google.maps.places.Autocomplete) => {
    destAutocomplete.current = autocomplete;
  };

  const onOriginChanged = () => {
    if (originAutocomplete.current) {
      const place = originAutocomplete.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setOrigin({
          name: place.formatted_address || place.name || 'Origin',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    }
  };

  const onDestChanged = () => {
    if (destAutocomplete.current) {
      const place = destAutocomplete.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setDestination({
          name: place.formatted_address || place.name || 'Destination',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    }
  };

  const analyzeTraffic = (durationInSeconds: number, durationInTrafficSeconds: number) => {
    const difference = durationInTrafficSeconds - durationInSeconds;
    const percentageIncrease = (difference / durationInSeconds) * 100;

    if (percentageIncrease > 30) return 'heavy';
    if (percentageIncrease > 10) return 'moderate';
    return 'light';
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  const formatDistance = (meters: number): string => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  };

  const onMapLoad = (mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  };

  const handleSearch = async () => {
    if (!origin || !destination || !isLoaded) {
      alert('Please select both origin and destination');
      return;
    }

    setIsSearching(true);
    setShowRoutes(false);
    setDirectionsResponse(null);
    console.log('🔍 Searching routes from', origin.name, 'to', destination.name);

    try {
      const directionsService = new google.maps.DirectionsService();

      const request: google.maps.DirectionsRequest = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
        unitSystem: google.maps.UnitSystem.METRIC,
      };

      directionsService.route(request, (result, status) => {
        console.log('Directions status:', status);

        if (status === 'OK' && result) {
          console.log('✅ Routes found:', result.routes.length);

          // Store the full directions result for map display
          setDirectionsResponse(result);

          const routeOptions: RouteOption[] = result.routes.map((route, index) => {
            const leg = route.legs[0];
            const duration = leg.duration?.value || 0;
            const durationInTraffic = leg.duration_in_traffic?.value || duration;
            const traffic = analyzeTraffic(duration, durationInTraffic);

            const slowestDuration = Math.max(
              ...result.routes.map(r => r.legs[0].duration_in_traffic?.value || r.legs[0].duration?.value || 0)
            );
            const timeSaved = slowestDuration - durationInTraffic;
            const savings = timeSaved > 60 ? `Save ${Math.round(timeSaved / 60)} min` : undefined;

            return {
              id: `route-${index}`,
              summary: route.summary || `Route ${index + 1}`,
              distance: formatDistance(leg.distance?.value || 0),
              duration: formatDuration(duration),
              durationInTraffic: formatDuration(durationInTraffic),
              traffic,
              savings,
              recommended: index === 0,
              steps: leg.steps,
              warnings: route.warnings || [],
              directionsResult: result,
              routeIndex: index,
            };
          });

          setRoutes(routeOptions);
          setShowRoutes(true);
          setSelectedRouteIndex(0); // Select first route by default
          setIsSearching(false);
        } else {
          console.error('❌ Directions request failed:', status);
          setIsSearching(false);

          // Provide more helpful error messages
          let errorMessage = 'Could not find routes. ';

          switch (status) {
            case 'NOT_FOUND':
              errorMessage += 'One or both locations could not be found. Please check the addresses.';
              break;
            case 'ZERO_RESULTS':
              errorMessage += 'No route could be found between these locations.';
              break;
            case 'REQUEST_DENIED':
              errorMessage += 'API request was denied. Please check if:\n' +
                '1. Directions API is enabled in Google Cloud Console\n' +
                '2. API key has proper permissions\n' +
                '3. Billing is enabled (required by Google)';
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage += 'API quota exceeded. Please try again later.';
              break;
            case 'INVALID_REQUEST':
              errorMessage += 'Invalid request parameters. Please try different locations.';
              break;
            default:
              errorMessage += `Error: ${status}. Please try again.`;
          }

          alert(errorMessage);
        }
      });
    } catch (error) {
      console.error('Error searching routes:', error);
      setIsSearching(false);
      alert('Failed to search routes. Please check your internet connection and try again.');
    }
  };

  const clearSearch = () => {
    setOrigin(null);
    setDestination(null);
    setRoutes([]);
    setShowRoutes(false);
    setSelectedRoute(null);
    setShowDirections(false);
    setDirectionsResponse(null);
    setSelectedRouteIndex(0);
    if (originInputRef.current) originInputRef.current.value = '';
    if (destInputRef.current) destInputRef.current.value = '';
  };

  const getTrafficColor = (traffic: RouteOption['traffic']) => {
    switch (traffic) {
      case 'light':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'heavy':
        return 'text-red-600 bg-red-100';
    }
  };

  const getTrafficIcon = (traffic: RouteOption['traffic']) => {
    return traffic === 'light' ? (
      <CheckCircle className="size-4" />
    ) : (
      <AlertCircle className="size-4" />
    );
  };

  const handleRouteSelect = (routeId: string, routeIndex: number) => {
    setSelectedRoute(routeId);
    setSelectedRouteIndex(routeIndex);
    setShowDirections(true);
  };

  const selectedRouteData = routes.find(r => r.id === selectedRoute);

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-semibold mb-2">Error loading Google Maps</h3>
          <p className="text-red-700 text-sm">Please check:</p>
          <ul className="text-red-600 text-sm mt-2 ml-4 list-disc">
            <li>API key is correct</li>
            <li>Maps JavaScript API is enabled</li>
            <li>Places API is enabled</li>
            <li>Directions API is enabled</li>
            <li>Billing is set up in Google Cloud Console</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Loader2 className="size-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-blue-700">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Search Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Find Your Best Route</h2>
          {(origin || destination) && (
            <button
              onClick={clearSearch}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="size-4" />
              Clear
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">
              <MapPin className="size-4 inline mr-1" />
              Starting Point
            </label>
            <Autocomplete onLoad={onOriginLoad} onPlaceChanged={onOriginChanged}>
              <input
                ref={originInputRef}
                type="text"
                placeholder="Enter origin (e.g., MG Road, Bangalore)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Autocomplete>
            {origin && (
              <p className="text-xs text-green-600 mt-1">✓ {origin.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">
              <Navigation className="size-4 inline mr-1" />
              Destination
            </label>
            <Autocomplete onLoad={onDestLoad} onPlaceChanged={onDestChanged}>
              <input
                ref={destInputRef}
                type="text"
                placeholder="Enter destination (e.g., Airport, Bangalore)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </Autocomplete>
            {destination && (
              <p className="text-xs text-green-600 mt-1">✓ {destination.name}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!origin || !destination || isSearching}
          className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSearching ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Searching Routes...
            </>
          ) : (
            <>
              <Navigation className="size-5" />
              Search Routes
            </>
          )}
        </button>
      </div>

      {/* Map Display */}
      {showRoutes && directionsResponse && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Route Map</h3>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={12}
            onLoad={onMapLoad}
            options={mapOptions}
          >
            <DirectionsRenderer
              directions={directionsResponse}
              routeIndex={selectedRouteIndex}
              options={{
                polylineOptions: {
                  strokeColor: selectedRouteIndex === 0 ? '#2563EB' : '#6B7280',
                  strokeWeight: 6,
                  strokeOpacity: 0.8,
                },
                suppressMarkers: false,
              }}
            />
          </GoogleMap>
          <p className="text-xs text-gray-500 mt-2">
            💡 Route shown on map • Click different routes below to see alternative paths
          </p>
        </div>
      )}

      {/* Route Results */}
      {showRoutes && routes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Available Routes</h3>
            <span className="text-sm text-gray-500">
              {routes.length} route{routes.length > 1 ? 's' : ''} found
            </span>
          </div>

          {routes.map((route) => (
            <div
              key={route.id}
              onClick={() => handleRouteSelect(route.id, route.routeIndex)}
              className={`bg-white rounded-lg shadow-sm border-2 p-5 transition-all cursor-pointer ${route.recommended
                ? 'border-blue-600'
                : 'border-gray-200 hover:border-gray-300'
                } ${selectedRoute === route.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{route.summary}</h4>
                    {route.recommended && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                        <CheckCircle className="size-3" />
                        Recommended
                      </span>
                    )}
                  </div>
                  {route.savings && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      {route.savings}
                    </p>
                  )}
                  {route.warnings.length > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ {route.warnings[0]}
                    </p>
                  )}
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${getTrafficColor(
                    route.traffic
                  )}`}
                >
                  {getTrafficIcon(route.traffic)}
                  {route.traffic.charAt(0).toUpperCase() + route.traffic.slice(1)}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Navigation className="size-4" />
                  <span>{route.distance}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="size-4" />
                  <span>{route.duration}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="size-4 text-orange-500" />
                  <span className="text-orange-600 font-medium">{route.durationInTraffic}</span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                {route.steps.length} steps • {route.traffic === 'heavy' ? 'Heavy traffic expected' : route.traffic === 'moderate' ? 'Moderate traffic' : 'Clear roads ahead'}
              </div>

              {/* Detailed Directions */}
              {selectedRoute === route.id && showDirections && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Navigation className="size-4 text-blue-600" />
                    Turn-by-Turn Directions
                  </h5>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {route.steps.map((step, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div
                            className="text-sm text-gray-700 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                          />
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Navigation className="size-3" />
                              {formatDistance(step.distance?.value || 0)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDuration(step.duration?.value || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="size-6 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-800 font-semibold">
                          You'll arrive at {destination?.name || 'your destination'}
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Total distance: {route.distance} • Estimated time: {route.durationInTraffic} with current traffic
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {showRoutes && routes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="size-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">No routes found</p>
          <p className="text-sm text-gray-600 mt-1">Try different locations or check your addresses</p>
        </div>
      )}

      {/* Tips */}
      {!showRoutes && !isSearching && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CheckCircle className="size-5 text-blue-600" />
            How Route Search Works
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Uses <strong>real-time traffic data</strong> from Google Maps for accurate time estimates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Shows <strong>visual route on map</strong> with color-coded paths</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Provides <strong>multiple alternatives</strong> with traffic comparison</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>Includes <strong>turn-by-turn directions</strong> for easy navigation</span>
            </li>
          </ul>
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> Start typing an address and select from dropdown suggestions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
