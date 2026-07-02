import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Compass, ShieldAlert, CheckCircle, RefreshCw, Navigation } from 'lucide-react';

// Custom Marker Icons to bypass leaflet asset issues in build pipelines
const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface RoutePoint {
  lat: number;
  lng: number;
  aqi: number;
  category: string;
}

interface RouteResponse {
  route_name: string;
  clean_route_points: RoutePoint[];
  average_aqi: number;
  health_safety_index: number;
  alternative_points: RoutePoint[];
  alternative_average_aqi: number;
}

const PRESET_ROUTES = [
  {
    name: "Delhi: IGI Airport to Connaught Place",
    start_lat: 28.5562, start_lng: 77.1000,
    end_lat: 28.6304, end_lng: 77.2177
  },
  {
    name: "Mumbai: Bandra West to Colaba",
    start_lat: 19.0596, start_lng: 72.8295,
    end_lat: 18.9067, end_lng: 72.8147
  },
  {
    name: "Pune: Kothrud to Shivajinagar",
    start_lat: 18.5074, start_lng: 73.8077,
    end_lat: 18.5312, end_lng: 73.8445
  }
];

export const GreenRoute: React.FC = () => {
  const [startLat, setStartLat] = useState('28.5562');
  const [startLng, setStartLng] = useState('77.1000');
  const [endLat, setEndLat] = useState('28.6304');
  const [endLng, setEndLng] = useState('77.2177');
  const [mode, setMode] = useState('walking');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);

  const calculateRoute = async (slat: string, slng: string, elat: string, elng: string) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/green-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_lat: parseFloat(slat),
          start_lng: parseFloat(slng),
          end_lat: parseFloat(elat),
          end_lng: parseFloat(elng),
          mode
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Failed to compute green route:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    calculateRoute(startLat, startLng, endLat, endLng);
  };

  const selectPreset = (preset: typeof PRESET_ROUTES[0]) => {
    setStartLat(preset.start_lat.toString());
    setStartLng(preset.start_lng.toString());
    setEndLat(preset.end_lat.toString());
    setEndLng(preset.end_lng.toString());
    calculateRoute(preset.start_lat.toString(), preset.start_lng.toString(), preset.end_lat.toString(), preset.end_lng.toString());
  };

  // Convert Route Points to Leaflet Polyline format: [lat, lng][]
  const cleanPathCoords = result?.clean_route_points.map(p => [p.lat, p.lng] as [number, number]) || [];
  const altPathCoords = result?.alternative_points.map(p => [p.lat, p.lng] as [number, number]) || [];

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 items-stretch">
      
      {/* Route Parameters Box */}
      <div className="w-full lg:w-4/12 flex flex-col gap-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-600/20 border border-blue-500 rounded-lg text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 font-display">Green Routes Planner</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Bypass heavily polluted zones</p>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-col gap-2 mb-6">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets</span>
            {PRESET_ROUTES.map((p, idx) => (
              <button
                key={idx}
                onClick={() => selectPreset(p)}
                className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 transition-all truncate"
              >
                📍 {p.name}
              </button>
            ))}
          </div>

          <hr className="border-slate-800/80 mb-5" />

          {/* Coordinates Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custom Waypoints</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">Start Lat</label>
                <input
                  type="text"
                  value={startLat}
                  onChange={(e) => setStartLat(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">Start Lng</label>
                <input
                  type="text"
                  value={startLng}
                  onChange={(e) => setStartLng(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">End Lat</label>
                <input
                  type="text"
                  value={endLat}
                  onChange={(e) => setEndLat(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500">End Lng</label>
                <input
                  type="text"
                  value={endLng}
                  onChange={(e) => setEndLng(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-500">Commute Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
              >
                <option value="walking">🚶 Walking</option>
                <option value="cycling">🚲 Cycling</option>
                <option value="driving">🚗 Driving</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? 'Finding routes...' : 'Calculate Routes'}
            </button>
          </form>
        </div>

        {/* Route Stats */}
        {result && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col gap-4 animate-fade-in">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route Comparison</span>
            
            {/* Safety index score */}
            <div className="p-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold">Health Safety Index</span>
                <span className="text-sm font-bold mt-0.5">{result.health_safety_index} / 100</span>
              </div>
            </div>

            {/* Clean Route Stats */}
            <div className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-xl border border-emerald-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-xs font-semibold text-slate-200">Green Route</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 font-display">{result.average_aqi} AQI</span>
            </div>

            {/* Traffic Route Stats */}
            <div className="flex justify-between items-center bg-slate-900/60 p-3.5 rounded-xl border border-red-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-xs font-semibold text-slate-200">Traffic Route</span>
              </div>
              <span className="text-sm font-bold text-red-400 font-display">{result.alternative_average_aqi} AQI</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Display Panel */}
      <div className="flex-1 min-h-[450px] lg:h-auto rounded-2xl overflow-hidden glass-panel border border-slate-800 p-1 flex flex-col">
        {result ? (
          <div className="w-full h-full flex flex-col relative min-h-[400px]">
            <MapContainer
              center={[result.clean_route_points[0].lat, result.clean_route_points[0].lng]}
              zoom={13}
              style={{ width: '100%', height: '100%', flex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              {/* Start & End Markers */}
              <Marker position={cleanPathCoords[0]} icon={greenIcon}>
                <Popup><b>Start Point</b></Popup>
              </Marker>
              <Marker position={cleanPathCoords[cleanPathCoords.length - 1]} icon={redIcon}>
                <Popup><b>Destination</b></Popup>
              </Marker>

              {/* Waypoints of Green Route */}
              {result.clean_route_points.slice(1, -1).map((p, idx) => (
                <Marker key={`clean-${idx}`} position={[p.lat, p.lng]} icon={blueIcon}>
                  <Popup>
                    <div className="text-xs">
                      <b>Green Waypoint {idx + 1}</b>
                      <div className="mt-1">AQI: <span className="font-bold text-emerald-400">{p.aqi} ({p.category})</span></div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Polylines */}
              <Polyline positions={cleanPathCoords} color="#10b981" weight={6} opacity={0.8} />
              <Polyline positions={altPathCoords} color="#ef4444" weight={4} opacity={0.6} dashArray="5, 10" />
            </MapContainer>
            
            {/* Visual Legend overlays */}
            <div className="absolute top-4 right-4 bg-slate-950/80 border border-slate-850 p-3.5 rounded-xl backdrop-blur-md flex flex-col gap-2 z-[1000] text-xs">
              <span className="font-bold text-[10px] uppercase text-slate-400">Map Legend</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-1 bg-emerald-500 rounded"></span>
                <span>Green Route (Clean)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-1 border-t border-dashed border-red-500"></span>
                <span>Traffic Route (Polluted)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 my-auto">
            <div className="w-16 h-16 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 animate-pulse-slow">
              <Navigation className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-slate-200">Interactive Clean Air Routing</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              AirGuard AI evaluates real-time pollutant levels across spatial nodes to calculate alternative paths that avoid pollution hotspots. Click one of our quick presets or submit coordinates to generate the route.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
