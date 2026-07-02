import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  RadialBarChart, RadialBar
} from 'recharts';
import { 
  ShieldAlert, Send, FileText, Download, CheckCircle2,
  AlertTriangle, Settings, HelpCircle, Activity, BarChart3
} from 'lucide-react';

interface GovDashboardData {
  stats: {
    average_national_aqi: number;
    total_cities: number;
    total_sensors: number;
    active_sensors: number;
    active_alerts: number;
    high_risk_cities_count: number;
  };
  cities: Array<{
    city_id: number;
    city_name: string;
    state: string;
    latitude: number;
    longitude: number;
    aqi: number;
    category: string;
    pm25: number;
    pm10: number;
    sensor_count: number;
  }>;
  high_risk_areas: Array<any>;
  model_comparison: {
    [modelName: string]: {
      rmse: number[];
      mae: number[];
      r2: number[];
      avg_rmse: number;
      avg_mae: number;
      avg_r2: number;
    }
  };
  feature_importance: {
    [featureName: string]: number;
  };
}

interface AlertItem {
  id: number;
  sensor_id: number;
  alert_type: string;
  message: string;
  severity: string;
  status: string;
  timestamp: string;
}

interface ReportItem {
  id: number;
  created_by: number | null;
  type: string;
  format: string;
  file_path: string;
  generated_at: string;
}

export const GovDashboard: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'dashboard';

  const [dashboardData, setDashboardData] = useState<GovDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Alert form state
  const [sensors, setSensors] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [alertType, setAlertType] = useState('poor_aqi');
  const [severity, setSeverity] = useState('warning');
  const [alertMsg, setAlertMsg] = useState('');
  const [alertList, setAlertList] = useState<AlertItem[]>([]);
  const [alertSent, setAlertSent] = useState(false);

  // Reports state
  const [reportType, setReportType] = useState('weekly');
  const [reportFormat, setReportFormat] = useState('csv');
  const [reportsList, setReportsList] = useState<ReportItem[]>([]);
  const [generatingReport, setGeneratingReport] = useState(false);

  // AI Policy Insights
  const [selectedInsightCityId, setSelectedInsightCityId] = useState<number>(1);
  const [aiInsight, setAiInsight] = useState<{ summary: string; stage: string; grap_actions: string[] } | null>(null);

  // Fetch Dashboard Stats
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/government/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sensors list
  const fetchSensors = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/v1/citizen/sensors');
      if (res.ok) {
        const data = await res.json();
        setSensors(data);
        if (data.length > 0) {
          setSelectedSensorId(data[0].id.toString());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch generated reports list
  const fetchReports = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/government/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch AI Insights
  const fetchAIInsights = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/government/insights?city_id=${selectedInsightCityId}`);
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboardData();
      fetchSensors();
      fetchReports();
    }
  }, [token]);

  useEffect(() => {
    fetchAIInsights();
  }, [selectedInsightCityId]);

  // Dispatch emergency warning
  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSensorId || !alertMsg || !token) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/government/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sensor_id: parseInt(selectedSensorId),
          alert_type: alertType,
          severity,
          message: alertMsg
        })
      });
      if (res.ok) {
        setAlertSent(true);
        setAlertMsg('');
        fetchDashboardData(); // update stats
        setTimeout(() => setAlertSent(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generate compliance reports
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setGeneratingReport(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/government/reports?report_type=${reportType}&format_type=${reportFormat}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Format model evaluation graph data
  const getModelComparisonData = () => {
    if (!dashboardData || !dashboardData.model_comparison) return [];
    return Object.entries(dashboardData.model_comparison).map(([name, metrics]) => ({
      name,
      RMSE: parseFloat(metrics.avg_rmse.toFixed(2)),
      R2: parseFloat(metrics.avg_r2.toFixed(2))
    }));
  };

  // Format feature importance data
  const getFeatureImportanceData = () => {
    if (!dashboardData || !dashboardData.feature_importance) return [];
    return Object.entries(dashboardData.feature_importance)
      .slice(0, 7) // Take top 7 features
      .map(([name, value]) => ({
        name,
        importance: parseFloat((value * 100).toFixed(1))
      }));
  };

  // CPCB category circles for heatmap
  const getAqiColor = (aqi: number) => {
    if (aqi > 300) return '#a855f7'; // purple
    if (aqi > 200) return '#ef4444'; // red
    if (aqi > 100) return '#f59e0b'; // orange/yellow
    return '#10b981'; // green
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Dashboard Analytics Deck */}
      {activeTab === 'dashboard' && (
        <>
          {loading || !dashboardData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Average Regional AQI</span>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-3xl font-extrabold text-white font-display">{dashboardData.stats.average_national_aqi}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      dashboardData.stats.average_national_aqi > 150 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>Active Monitoring</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">High Risk Districts</span>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-3xl font-extrabold text-red-400 font-display">{dashboardData.stats.high_risk_cities_count}</span>
                    <span className="text-[10px] font-bold text-slate-500">AQI &gt; 150</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sensor Operations</span>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-3xl font-extrabold text-white font-display">{dashboardData.stats.active_sensors} / {dashboardData.stats.total_sensors}</span>
                    <span className="text-[10px] font-bold text-emerald-400">98.5% Uptime</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Emergency Dispatches</span>
                  <div className="flex justify-between items-baseline mt-4">
                    <span className="text-3xl font-extrabold text-white font-display">{dashboardData.stats.active_alerts}</span>
                    <span className="text-[10px] font-bold text-red-400 animate-pulse">Critical Alerts</span>
                  </div>
                </div>
              </div>

              {/* Core Gov Dashboard Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left: Model comparison & AI policy guidelines */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* AI Policy recommendations */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-indigo-950/10 to-slate-950/10">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        🤖 AI Policy Engine Insights
                      </span>
                      <select
                        value={selectedInsightCityId}
                        onChange={(e) => setSelectedInsightCityId(parseInt(e.target.value))}
                        className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-white focus:outline-none"
                      >
                        {dashboardData.cities.map(c => (
                          <option key={c.city_id} value={c.city_id}>{c.city_name}</option>
                        ))}
                      </select>
                    </div>
                    {aiInsight && (
                      <div className="flex flex-col gap-4 text-xs">
                        <p className="leading-relaxed text-slate-300 font-medium">{aiInsight.summary}</p>
                        <div className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl">
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-2">Graded Response Action Plan (GRAP) Directives</span>
                          <ul className="flex flex-col gap-2">
                            {aiInsight.grap_actions.map((act, idx) => (
                              <li key={idx} className="flex gap-2 text-slate-400 leading-relaxed">
                                <span className="text-indigo-400 font-extrabold shrink-0">{idx + 1}.</span> {act}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ML Model Comparisons */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-sm text-slate-200 mb-5 flex items-center gap-2">
                      <BarChart3 className="w-4.5 h-4.5 text-blue-400" /> AI Retraining Benchmarks
                    </h4>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getModelComparisonData()}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px' }} />
                          <Bar dataKey="RMSE" fill="#ef4444" radius={[4, 4, 0, 0]} name="RMSE (lower is better)" />
                          <Bar dataKey="R2" fill="#3b82f6" radius={[4, 4, 0, 0]} name="R² Score (higher is better)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Right: Feature Importance & City Lists */}
                <div className="flex flex-col gap-6">
                  
                  {/* Feature Importance weights */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-sm text-slate-200 mb-5 flex items-center gap-2">
                      <Activity className="w-4.5 h-4.5 text-emerald-400" /> Prediction Feature Importance
                    </h4>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getFeatureImportanceData()} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                          <XAxis type="number" stroke="#94a3b8" fontSize={8} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
                          />
                          <Bar dataKey="importance" fill="#10b981" radius={[0, 4, 4, 0]} name="Weight %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* List of districts / cities */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-800">
                    <h4 className="font-bold text-sm text-slate-200 mb-4">District AQI List</h4>
                    <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {dashboardData.cities.map((c) => (
                        <div key={c.city_id} className="flex justify-between items-center p-3 bg-slate-900/40 border border-slate-850 rounded-xl text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200">{c.city_name}</span>
                            <span className="text-[10px] text-slate-500 uppercase mt-0.5">{c.sensor_count} Sensors</span>
                          </div>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                            c.aqi > 150 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>{c.aqi} AQI</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}
        </>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && dashboardData && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-white">District-wise Heatmap Overview</h2>
            <p className="text-xs text-slate-400 mt-1">Geographic overview of particulate distributions and regional limits</p>
          </div>
          <div className="h-[500px]">
            <MapContainer
              center={[20.5937, 78.9629]} // India center
              zoom={5}
              style={{ width: '100%', height: '100%', minHeight: '480px' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {dashboardData.cities.map((city, idx) => (
                <CircleMarker
                  key={idx}
                  center={[city.latitude, city.longitude]}
                  radius={12 + city.aqi / 25} // radius expands based on AQI
                  fillColor={getAqiColor(city.aqi)}
                  color="#1e293b"
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.4}
                >
                  <Popup>
                    <div className="text-xs p-1">
                      <b className="border-b border-slate-800 pb-1 block mb-1.5">{city.city_name} City</b>
                      <div>AQI: <span className="font-bold text-white">{city.aqi} ({city.category})</span></div>
                      <div className="mt-0.5">PM2.5: <span className="font-bold text-white">{city.pm25} µg/m³</span></div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Alerts Dispatcher Tab */}
      {activeTab === 'alerts' && (
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start w-full">
          
          <div className="w-full md:w-5/12 glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-100 font-display mb-6">Dispatch Emergency Warning</h3>
            {alertSent && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl mb-4 text-center text-xs font-semibold">
                🚨 Alert broadcasted successfully!
              </div>
            )}
            <form onSubmit={handleAlertSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Target Sensor Node</label>
                <select
                  value={selectedSensorId}
                  onChange={(e) => setSelectedSensorId(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {sensors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Alert Indicator</label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="poor_aqi">⚠️ AQI Poor warning</option>
                  <option value="severe_aqi">🚨 Severe AQI Emergency</option>
                  <option value="sudden_spike">⚡ Sudden PM2.5 Spike detected</option>
                  <option value="rain_improvement">🌧️ Washout Improvement update</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Warning Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="info">ℹ️ Information</option>
                  <option value="warning">⚠️ Warning</option>
                  <option value="critical">🚨 Critical Emergency</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Emergency Directive Message</label>
                <textarea
                  value={alertMsg}
                  onChange={(e) => setAlertMsg(e.target.value)}
                  placeholder="Enter alert directive details..."
                  rows={4}
                  required
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-tr from-red-600 to-rose-500 text-white font-bold rounded-xl text-xs shadow-lg active:scale-98 transition-all"
              >
                <Send className="w-4 h-4" /> Broadcast Warning
              </button>
            </form>
          </div>

          <div className="flex-1 w-full glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-100 font-display mb-4">Emergency Broadcast Center</h3>
            <p className="text-xs text-slate-400 mb-6">
              Warnings triggered here will instantly create alert items in the database and mock SMS/email/push dispatches to citizens favoriting the city of the sensor node.
            </p>
            <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-900/30 border border-slate-850 rounded-2xl">
              <ShieldAlert className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
              <span className="text-xs font-semibold text-slate-400">Broadcast Monitoring Active</span>
              <span className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                Choose a sensor, customize warning instructions, and click broadcast to push the alert to subscribers.
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Report Generator Tab */}
      {activeTab === 'reports' && (
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start w-full">
          
          <div className="w-full md:w-5/12 glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-100 font-display mb-6">Request Compliance Report</h3>
            <form onSubmit={handleGenerateReport} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Reporting Window</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="weekly">📅 Weekly compliance summary</option>
                  <option value="monthly">📅 Monthly historical audits</option>
                  <option value="seasonal">📅 Seasonal inversion trends</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">File Export Format</label>
                <select
                  value={reportFormat}
                  onChange={(e) => setReportFormat(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="csv">📊 Spreadsheet (CSV format)</option>
                  <option value="pdf">📄 Print Document (PDF format)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={generatingReport}
                className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg active:scale-98 transition-all disabled:opacity-50"
              >
                {generatingReport ? 'Generating files...' : 'Generate Document'}
              </button>
            </form>
          </div>

          <div className="flex-1 w-full glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-100 font-display mb-4">Export Archive Logs</h3>
            
            {reportsList.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1">
                {reportsList.map((rep) => (
                  <div key={rep.id} className="flex justify-between items-center p-3.5 bg-slate-900/40 border border-slate-850 rounded-xl text-xs font-medium text-slate-300">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200 capitalize">{rep.type} summary ({rep.format.toUpperCase()})</span>
                        <span className="text-[9px] text-slate-500 mt-0.5">{new Date(rep.generated_at).toLocaleDateString()} at {new Date(rep.generated_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    {rep.file_path === 'generating' ? (
                      <span className="text-[10px] text-indigo-400 font-bold animate-pulse">Compiling...</span>
                    ) : (
                      <a
                        href={`http://localhost:8000${rep.file_path}`}
                        download
                        className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:text-white rounded-xl flex items-center justify-center text-slate-300"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center bg-slate-900/30 border border-slate-850 rounded-2xl">
                <FileText className="w-12 h-12 text-slate-700 mb-3" />
                <span className="text-xs font-semibold text-slate-400">No generated reports</span>
                <span className="text-[10px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Request a new compliance export on the left panel to populate download logs.
                </span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
