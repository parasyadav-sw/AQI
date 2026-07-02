import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapView } from '../components/MapView';
import { GreenRoute } from '../components/GreenRoute';
import { CarbonCalculator } from '../components/CarbonCalculator';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { 
  Search, Star, AlertTriangle, Thermometer, Wind, Droplets, Compass, CloudRain,
  Activity, Calendar, Heart, Shield, Info, ArrowUpRight
} from 'lucide-react';

interface DashboardData {
  city_id: number;
  city_name: string;
  state: string;
  latitude: number;
  longitude: number;
  is_favorite: boolean;
  current_aqi: number;
  category: string;
  weather: {
    temperature: number;
    humidity: number;
    wind_speed: number;
    pressure: number;
    rainfall: number;
  };
  pollutants: {
    PM25: number;
    PM10: number;
    NO2: number;
    SO2: number;
    CO: number;
    O3: number;
  };
  predictions: {
    '24h': number;
    '48h': number;
    '72h': number;
  };
  explainability: Array<{
    feature: string;
    contribution: number;
    impact: string;
  }>;
  advisories: {
    General: string;
    Children: string;
    Elderly: string;
    Pregnant_Women?: string;
    'Pregnant Women'?: string;
    Asthma_Patients?: string;
    'Asthma Patients'?: string;
    Heart_Patients?: string;
    'Heart Patients'?: string;
    Athletes: string;
  };
  trends: Array<{
    day: string;
    aqi: number;
    pm25: number;
    pm10: number;
  }>;
  hotspots: Array<{
    sensor_name: string;
    latitude: number;
    longitude: number;
    aqi: number;
    category: string;
  }>;
  alerts: Array<{
    id: number;
    sensor: string;
    alert_type: string;
    message: string;
    severity: string;
    timestamp: string;
  }>;
}

export const CitizenDashboard: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Tab states: dashboard, map, routes, carbon
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'dashboard';

  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Array<{ id: number; name: string }>>([]);

  const getAQIColorClass = (category: string) => {
    switch (category) {
      case 'Good': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'Satisfactory': return 'text-lime-400 bg-lime-500/10 border-lime-500/25';
      case 'Moderate': return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'Poor': return 'text-orange-400 bg-orange-500/10 border-orange-500/25';
      case 'Very Poor': return 'text-purple-400 bg-purple-500/10 border-purple-500/25';
      case 'Severe': return 'text-red-400 bg-red-500/10 border-red-500/25';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/25';
    }
  };

  const getAQIGradient = (category: string) => {
    switch (category) {
      case 'Good': return 'from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/10 border-emerald-400';
      case 'Satisfactory': return 'from-emerald-400 to-lime-500 text-white shadow-lg shadow-lime-500/10 border-lime-400';
      case 'Moderate': return 'from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/10 border-amber-400';
      case 'Poor': return 'from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/10 border-orange-400';
      case 'Very Poor': return 'from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/10 border-purple-400';
      case 'Severe': return 'from-red-600 to-red-900 text-white shadow-lg shadow-red-600/10 border-red-500';
      default: return 'from-slate-100 to-slate-200 text-slate-800 dark:from-slate-800/30 dark:to-slate-950/10 border-slate-300 dark:border-slate-800/40';
    }
  };

  // Fetch cities list
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/citizen/cities');
        if (res.ok) {
          const data = await res.json();
          setCities(data);
          if (data.length > 0) {
            setSelectedCityId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch cities list:", err);
      }
    };
    fetchCities();
  }, []);

  // Fetch favorites list
  const fetchFavorites = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/citizen/favorites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [token]);

  // Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    if (!selectedCityId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/citizen/dashboard?city_id=${selectedCityId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Error loading citizen dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [selectedCityId, token]);

  const toggleFavorite = async () => {
    if (!dashboardData || !token) return;
    const isFav = dashboardData.is_favorite;
    const url = `http://localhost:8000/api/v1/citizen/favorites/${selectedCityId}`;
    try {
      const res = await fetch(url, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDashboardData(prev => prev ? { ...prev, is_favorite: !isFav } : null);
        fetchFavorites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPollutantsChartData = () => {
    if (!dashboardData || !dashboardData.pollutants) return [];
    const p = dashboardData.pollutants;
    return [
      { name: 'PM2.5', value: p.PM25 || 0, limit: 60 }, // Indian 24h standard limits
      { name: 'PM10', value: p.PM10 || 0, limit: 100 },
      { name: 'NO2', value: p.NO2 || 0, limit: 80 },
      { name: 'SO2', value: p.SO2 || 0, limit: 80 },
      { name: 'O3', value: p.O3 || 0, limit: 100 }
    ];
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Search & Favorites Controls Header */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.id}>📍 {city.name} City</option>
              ))}
            </select>
            <button
              onClick={toggleFavorite}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                dashboardData?.is_favorite 
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={dashboardData?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Quick Favorites Links */}
          {favorites.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Favorites:</span>
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  onClick={() => setSelectedCityId(fav.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedCityId === fav.id 
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fav.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dynamic Tab Switching */}
      {activeTab === 'map' && dashboardData && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-white">Live Pollution Heatmap</h2>
            <p className="text-xs text-slate-400 mt-1">Examine physical air quality monitoring stations in {dashboardData.city_name}</p>
          </div>
          <div className="h-[500px]">
            <MapView 
              latitude={dashboardData.latitude} 
              longitude={dashboardData.longitude} 
              sensors={dashboardData.hotspots.length > 0 ? dashboardData.hotspots.map(h => ({
                name: h.sensor_name || 'Monitoring Station',
                latitude: h.latitude,
                longitude: h.longitude,
                aqi: h.aqi,
                category: h.category
              })) : [
                { name: `${dashboardData.city_name || 'City'} Station`, latitude: dashboardData.latitude, longitude: dashboardData.longitude, aqi: dashboardData.current_aqi, category: dashboardData.category }
              ]} 
            />
          </div>
        </div>
      )}

      {activeTab === 'routes' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-white font-display">Clean Commute Routing</h2>
            <p className="text-xs text-slate-400 mt-1">Select alternative paths with lower particulate concentrations</p>
          </div>
          <GreenRoute />
        </div>
      )}

      {activeTab === 'carbon' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-white font-display">Personal Carbon footprint</h2>
            <p className="text-xs text-slate-400 mt-1">Audit and mitigate greenhouse gas emissions caused by your commutes</p>
          </div>
          <CarbonCalculator />
        </div>
      )}

      {/* Main Core Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <>
          {loading || !dashboardData ? (
            // Loading Skeletons
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
              <div className="lg:col-span-2 h-[350px] bg-slate-900/60 rounded-2xl border border-slate-800"></div>
              <div className="h-[350px] bg-slate-900/60 rounded-2xl border border-slate-800"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Left Column: AQI Indicator and Forecast */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Visual AQI Gauge Card */}
                <div className={`p-8 rounded-3xl border bg-gradient-to-br ${getAQIGradient(dashboardData?.category || '')} flex flex-col justify-between gap-6 shadow-xl relative overflow-hidden group`}>
                  {/* Background visual gloss bloom */}
                  <div className="absolute -right-24 -top-24 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/15 transition-all duration-500"></div>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 z-10">
                    <div className="flex flex-col gap-2.5">
                      <span className="text-xs font-bold opacity-85 uppercase tracking-wider">Air Quality Index</span>
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-6xl sm:text-7xl font-extrabold tracking-tight font-display leading-none text-white">{dashboardData?.current_aqi}</h2>
                        <span className="text-xs font-bold opacity-75">AQI</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider bg-white/20 border-white/30 text-white animate-pulse">
                          {dashboardData?.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 max-w-sm sm:text-right sm:items-end">
                      <span className="text-xs font-semibold opacity-85 uppercase tracking-wide">General Health Advice</span>
                      <p className="text-xs leading-relaxed opacity-90 mt-1">{dashboardData.advisories?.General}</p>
                    </div>
                  </div>

                  {/* Interactive Scale Bar */}
                  <div className="w-full flex flex-col gap-2 mt-2 z-10">
                    <div className="flex justify-between text-[9px] font-bold opacity-80 uppercase tracking-wider">
                      <span>Good (0)</span>
                      <span>Moderate (100)</span>
                      <span>Severe (500)</span>
                    </div>
                    <div className="w-full h-2 bg-white/25 rounded-full relative overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-1000 shadow-md shadow-white/30"
                        style={{ width: `${Math.min(100, (dashboardData?.current_aqi || 0) / 5)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Weather & Pollutant Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Weather Parameters */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                      <Thermometer className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" /> Weather Conditions
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      
                      <div className="glass-card bg-white/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/20 hover:shadow-lg hover:shadow-orange-500/5 group">
                        <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-450 rounded-2xl border border-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                          <Thermometer className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Temperature</span>
                          <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 font-display">{dashboardData.weather?.temperature || 0}°C</span>
                        </div>
                      </div>

                      <div className="glass-card bg-white/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5 group">
                        <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-455 rounded-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                          <Droplets className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Humidity</span>
                          <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 font-display">{dashboardData.weather?.humidity || 0}%</span>
                        </div>
                      </div>

                      <div className="glass-card bg-white/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] hover:border-teal-500/20 hover:shadow-lg hover:shadow-teal-500/5 group">
                        <div className="p-3 bg-teal-500/10 dark:bg-teal-500/20 text-teal-650 dark:text-teal-400 rounded-2xl border border-teal-500/20 group-hover:scale-110 transition-transform duration-300">
                          <Wind className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Wind Speed</span>
                          <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 font-display">{dashboardData.weather?.wind_speed || 0} km/h</span>
                        </div>
                      </div>

                      <div className="glass-card bg-white/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-150 dark:border-slate-850 flex items-center gap-3.5 transition-all duration-300 hover:scale-[1.02] hover:border-sky-500/20 hover:shadow-lg hover:shadow-sky-500/5 group">
                        <div className="p-3 bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-2xl border border-sky-500/20 group-hover:scale-110 transition-transform duration-300">
                          <CloudRain className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Rainfall</span>
                          <span className="text-base font-extrabold text-slate-800 dark:text-white mt-0.5 font-display">{dashboardData.weather?.rainfall || 0} mm</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Pollutant charts summary */}
                  <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-md shadow-slate-100/50 dark:shadow-none">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <Activity className="w-4.5 h-4.5 text-emerald-500 dark:text-emerald-400" /> Pollutant Concentrations
                    </h4>
                    <div className="h-40 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getPollutantsChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '10px', color: '#0f172a' }}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* 72-Hour Predictions Card */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-100/50 dark:shadow-none">
                  <div className="flex justify-between items-center mb-5">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Calendar className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" /> Predictor AI: 72-Hour Forecast
                    </h4>
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500">Multivariate ML output</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="glass-card bg-white/50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 group">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">In 24 Hours</span>
                      <span className="text-3xl font-extrabold text-slate-850 dark:text-white mt-2 font-display group-hover:scale-105 transition-transform duration-300">{dashboardData.predictions?.['24h'] || 0}</span>
                      <span className="text-[9px] text-slate-450 dark:text-slate-550 mt-1 uppercase font-bold tracking-wide">Predicted AQI</span>
                      <div className="w-8 h-1 rounded-full bg-blue-500/20 mt-3 group-hover:w-16 transition-all duration-300"></div>
                    </div>
                    <div className="glass-card bg-white/50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 group">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">In 48 Hours</span>
                      <span className="text-3xl font-extrabold text-slate-850 dark:text-white mt-2 font-display group-hover:scale-105 transition-transform duration-300">{dashboardData.predictions?.['48h'] || 0}</span>
                      <span className="text-[9px] text-slate-450 dark:text-slate-550 mt-1 uppercase font-bold tracking-wide">Predicted AQI</span>
                      <div className="w-8 h-1 rounded-full bg-blue-500/20 mt-3 group-hover:w-16 transition-all duration-300"></div>
                    </div>
                    <div className="glass-card bg-white/50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 group">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">In 72 Hours</span>
                      <span className="text-3xl font-extrabold text-slate-850 dark:text-white mt-2 font-display group-hover:scale-105 transition-transform duration-300">{dashboardData.predictions?.['72h'] || 0}</span>
                      <span className="text-[9px] text-slate-450 dark:text-slate-550 mt-1 uppercase font-bold tracking-wide">Predicted AQI</span>
                      <div className="w-8 h-1 rounded-full bg-blue-500/20 mt-3 group-hover:w-16 transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* Weekly Trend Chart */}
                {dashboardData?.trends?.length > 0 && (
                  <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-100/50 dark:shadow-none">
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                      <Activity className="w-4.5 h-4.5 text-blue-500 dark:text-blue-400" /> Weekly Pollution Trends
                    </h4>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.trends}>
                          <defs>
                            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '10px' }}
                            labelStyle={{ fontWeight: 'bold' }}
                          />
                          <Area type="monotone" dataKey="aqi" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAqi)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Personalized Health Advisory & Alerts */}
              <div className="flex flex-col gap-6">
                
                {/* Personalized Advisories */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 shadow-md shadow-slate-100/50 dark:shadow-none">
                  <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 flex items-center gap-2">
                    <Heart className="w-4.5 h-4.5 text-red-500" /> Smart Cohort Advisory
                  </h4>
                  <div className="flex flex-col gap-3.5 max-h-[390px] overflow-y-auto pr-1">
                    
                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-blue-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-wider">Children & Infants</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">{dashboardData.advisories?.Children}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-purple-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider">Elderly Citizens</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">{dashboardData.advisories?.Elderly}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-pink-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-pink-650 dark:text-pink-400 font-extrabold uppercase tracking-wider">Pregnant Cohorts</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                          {dashboardData.advisories?.Pregnant_Women || dashboardData.advisories?.['Pregnant Women'] || "Stay in clean environment, filter room air."}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-amber-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-amber-600 dark:text-amber-550 font-extrabold uppercase tracking-wider">Asthma Patients</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                          {dashboardData.advisories?.Asthma_Patients || dashboardData.advisories?.['Asthma Patients'] || "Keep inhaler ready, avoid travel."}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-rose-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-rose-600 dark:text-rose-500 font-extrabold uppercase tracking-wider">Heart Patients</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                          {dashboardData.advisories?.Heart_Patients || dashboardData.advisories?.['Heart Patients'] || "Avoid heavy cardio exercises outdoors."}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl flex gap-3.5 transition-all duration-200 hover:bg-white/70 dark:hover:bg-slate-900/60 group">
                      <div className="w-1.5 rounded-full bg-teal-500 shrink-0 self-stretch group-hover:scale-y-110 transition-transform duration-200"></div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-extrabold uppercase tracking-wider">Athletes & Runners</span>
                        <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">{dashboardData.advisories?.Athletes}</p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Emergency Alerts Panel */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 flex flex-col gap-4 shadow-md shadow-slate-100/50 dark:shadow-none">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> Active Emergency Warnings
                  </h4>
                  {dashboardData?.alerts?.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {dashboardData.alerts.map((alert) => (
                        <div 
                          key={alert.id} 
                          className={`p-3.5 border rounded-xl flex gap-3 text-xs leading-relaxed ${
                            alert.severity === 'critical' 
                              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300' 
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span className="font-bold capitalize">{alert.alert_type.replace('_', ' ')}</span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{alert.message}</span>
                            <span className="text-[8px] text-slate-500 uppercase mt-1 font-semibold">{alert.sensor} • {new Date(alert.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/40 border border-slate-200/65 dark:border-slate-850 rounded-2xl">
                      <Shield className="w-8 h-8 text-emerald-500/30 mb-2" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">No active warnings</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-550 mt-0.5">Air parameters are normal.</span>
                    </div>
                  )}
                </div>

                {/* AI generated Daily air summary */}
                <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 bg-gradient-to-br from-blue-50/30 to-slate-50/30 dark:from-indigo-950/20 dark:to-slate-950/20 shadow-md shadow-slate-100/50 dark:shadow-none">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 animate-pulse" /> AI Daily Environmental summary
                  </span>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 mt-1">
                    AirGuard AI forecasts a {dashboardData.predictions?.['24h'] > dashboardData?.current_aqi ? 'slight degradation' : 'stable condition'} in the next 24 hours. Primary particulate driver is PM2.5 (contributing {dashboardData.explainability?.[0]?.contribution * 100 || 50}% of local AQI). Vulnerable citizens should regulate high-intensity training schedules.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};
