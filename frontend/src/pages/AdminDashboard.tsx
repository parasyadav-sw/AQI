import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Settings, RefreshCw, Terminal, BarChart3, Trash2, 
  PlusCircle, AlertTriangle, ShieldCheck, Database, ServerCrash
} from 'lucide-react';

interface UserProfile {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: 'citizen' | 'government' | 'admin';
  is_verified: boolean;
  created_at: string;
}

interface SensorItem {
  id: number;
  name: string;
  city_id: number;
  latitude: number;
  longitude: number;
  status: 'active' | 'inactive' | 'maintenance';
  last_reading_time: string | null;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  details: string | null;
  timestamp: string;
}

interface AnalyticsData {
  users: {
    total: number;
    citizens: number;
    officers: number;
    admins: number;
  };
  database: {
    aqi_readings: number;
    sensors: number;
    cities: number;
  };
}

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const activeTab = queryParams.get('tab') || 'dashboard';

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [sensorsList, setSensorsList] = useState<SensorItem[]>([]);
  const [logsList, setLogsList] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New Sensor form state
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorCityId, setNewSensorCityId] = useState('1');
  const [newSensorLat, setNewSensorLat] = useState('');
  const [newSensorLng, setNewSensorLng] = useState('');
  const [sensorSuccess, setSensorSuccess] = useState(false);

  // Retrain state
  const [retrainStatus, setRetrainStatus] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/analytics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSensors = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/citizen/sensors');
      if (res.ok) {
        const data = await res.json();
        setSensorsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchAnalytics(), fetchUsers(), fetchSensors(), fetchLogs()]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      loadAll();
    }
  }, [token]);

  // Update user role
  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/role?role=${newRole}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number) => {
    if (!token || !window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchAnalytics();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Sensor
  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSensorName || !newSensorLat || !newSensorLng || !token) return;

    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/sensors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSensorName,
          city_id: parseInt(newSensorCityId),
          latitude: parseFloat(newSensorLat),
          longitude: parseFloat(newSensorLng)
        })
      });
      if (res.ok) {
        setSensorSuccess(true);
        setNewSensorName('');
        setNewSensorLat('');
        setNewSensorLng('');
        fetchSensors();
        fetchAnalytics();
        fetchLogs();
        setTimeout(() => setSensorSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle sensor state (for predictive maintenance)
  const toggleSensorStatus = async (sensorId: number, currentStatus: string) => {
    if (!token) return;
    const nextStatus = currentStatus === 'active' ? 'maintenance' : (currentStatus === 'maintenance' ? 'inactive' : 'active');
    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/sensors/${sensorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus
        })
      });
      if (res.ok) {
        fetchSensors();
        fetchLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger Retraining
  const triggerRetraining = async () => {
    if (!token) return;
    setRetrainStatus('retraining');
    try {
      const res = await fetch('http://localhost:8000/api/v1/ml/retrain', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setRetrainStatus('success');
        fetchLogs();
      } else {
        setRetrainStatus('failed');
      }
    } catch (err) {
      console.error(err);
      setRetrainStatus('failed');
    }
  };

  // Trigger Backup
  const triggerBackup = async () => {
    if (!token) return;
    setBackupStatus('backing_up');
    try {
      const res = await fetch('http://localhost:8000/api/v1/admin/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBackupStatus(`success: ${data.file_name}`);
        fetchLogs();
      } else {
        setBackupStatus('failed');
      }
    } catch (err) {
      console.error(err);
      setBackupStatus('failed');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* Admin stats dashboard tab */}
      {activeTab === 'dashboard' && (
        <>
          {loading || !analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800"></div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              
              {/* Analytics counter deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex items-center gap-4">
                  <div className="p-3.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Users</span>
                    <span className="text-2xl font-extrabold text-white mt-0.5 font-display">{analytics.users.total}</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex items-center gap-4">
                  <div className="p-3.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">AQI Data Logs</span>
                    <span className="text-2xl font-extrabold text-white mt-0.5 font-display">{analytics.database.aqi_readings}</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Sensors</span>
                    <span className="text-2xl font-extrabold text-white mt-0.5 font-display">{analytics.database.sensors}</span>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border border-slate-850 flex items-center gap-4">
                  <div className="p-3.5 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Monitored Cities</span>
                    <span className="text-2xl font-extrabold text-white mt-0.5 font-display">{analytics.database.cities}</span>
                  </div>
                </div>
              </div>

              {/* Maintenance shortcuts cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Database backup trigger card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-sm text-slate-200">Database Administration</h3>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm">Trigger hot-backups of SQLAlchemy records to a backup file.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full mt-4">
                    <button
                      onClick={triggerBackup}
                      disabled={backupStatus === 'backing_up'}
                      className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${backupStatus === 'backing_up' ? 'animate-spin' : ''}`} /> Run Backup
                    </button>
                    {backupStatus && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {backupStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Model Training console card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-bold text-sm text-slate-200">ML Model Retraining Pipeline</h3>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm">Triggers background calculations for Linear Regression, Random Forest, and XGBoost.</p>
                  </div>
                  <div className="flex items-center gap-3 w-full mt-4">
                    <button
                      onClick={triggerRetraining}
                      disabled={retrainStatus === 'retraining'}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${retrainStatus === 'retraining' ? 'animate-spin' : ''}`} /> Retrain Models
                    </button>
                    {retrainStatus && (
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                        {retrainStatus === 'retraining' ? 'Retraining active...' : (retrainStatus === 'success' ? 'Pipeline complete' : 'Pipeline failed')}
                      </span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 overflow-x-auto w-full">
          <h3 className="font-bold text-base text-slate-200 mb-6">User Database Console</h3>
          <table className="w-full text-left text-xs font-medium text-slate-400 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4 text-center">De-register</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((userItem) => (
                <tr key={userItem.id} className="border-b border-slate-850 hover:bg-slate-900/20">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{userItem.name}</td>
                  <td className="py-3.5 px-4">{userItem.email}</td>
                  <td className="py-3.5 px-4">{new Date(userItem.created_at).toLocaleDateString()}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={userItem.role}
                      onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                      className="px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                    >
                      <option value="citizen">Citizen</option>
                      <option value="government">Government</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button 
                      onClick={() => handleDeleteUser(userItem.id)}
                      className="p-2 hover:bg-red-950/20 text-slate-500 hover:text-red-400 rounded-lg border border-transparent hover:border-red-900/40"
                      title="De-register user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sensors Grid / Maintenance Tab */}
      {activeTab === 'sensors' && (
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
          
          {/* Add Sensor Node Form */}
          <div className="w-full lg:w-4/12 glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-200 mb-6 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-500" /> Deploy IOT Sensor Node
            </h3>
            {sensorSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl mb-4 text-center text-xs font-semibold">
                🎉 Node deployed successfully!
              </div>
            )}
            <form onSubmit={handleAddSensor} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Sensor Identifier Name</label>
                <input
                  type="text"
                  value={newSensorName}
                  onChange={(e) => setNewSensorName(e.target.value)}
                  placeholder="e.g. Delhi North-West (Rohini)"
                  required
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Link City/District</label>
                <select
                  value={newSensorCityId}
                  onChange={(e) => setNewSensorCityId(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="1">Delhi</option>
                  <option value="2">Mumbai</option>
                  <option value="3">Pune</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Latitude</label>
                  <input
                    type="text"
                    value={newSensorLat}
                    onChange={(e) => setNewSensorLat(e.target.value)}
                    placeholder="e.g. 28.7"
                    required
                    className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-slate-400">Longitude</label>
                  <input
                    type="text"
                    value={newSensorLng}
                    onChange={(e) => setNewSensorLng(e.target.value)}
                    placeholder="e.g. 77.1"
                    required
                    className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg active:scale-98 transition-all"
              >
                Deploy Sensor Node
              </button>
            </form>
          </div>

          {/* Sensors grid list */}
          <div className="flex-1 w-full glass-panel p-6 rounded-2xl border border-slate-800 overflow-x-auto">
            <h3 className="font-bold text-base text-slate-200 mb-6">Physical IOT Node Grid</h3>
            <table className="w-full text-left text-xs font-medium text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="py-3 px-4">Node Name</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Operations State</th>
                  <th className="py-3 px-4 text-center">Toggle State</th>
                </tr>
              </thead>
              <tbody>
                {sensorsList.map((s) => (
                  <tr key={s.id} className="border-b border-slate-850 hover:bg-slate-900/20">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{s.name}</td>
                    <td className="py-3.5 px-4 text-[11px] font-mono">{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                        s.status === 'active' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : (s.status === 'maintenance' 
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' 
                              : 'bg-red-500/10 border-red-500/20 text-red-400')
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleSensorStatus(s.id, s.status)}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-300 rounded-lg"
                        title="Simulate predictive maintenance toggling"
                      >
                        ⚙️ Toggle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Retrain ML Tab */}
      {activeTab === 'retrain' && (
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start w-full">
          
          <div className="w-full md:w-5/12 glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-200 mb-4">Trigger Pipeline Retraining</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Triggers the background python subprocess to parse CSV historical readings, perform MinMaxScaler transformations, execute Random Forests and XGBoost comparisons, and export joblib model binaries.
            </p>
            <button
              onClick={triggerRetraining}
              disabled={retrainStatus === 'retraining'}
              className="w-full py-3 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrainStatus === 'retraining' ? 'animate-spin' : ''}`} /> Retrain ML Predictors
            </button>
          </div>

          <div className="flex-1 w-full glass-panel p-6 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-base text-slate-100 font-display mb-4">ML Processing Logs</h3>
            
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-400 h-64 overflow-y-auto flex flex-col gap-1 leading-normal">
              <div>[INFO] {new Date().toLocaleDateString()} startup - Model engine initialized.</div>
              <div>[INFO] Predictor assets loaded successfully.</div>
              {retrainStatus === 'retraining' && (
                <>
                  <div className="text-blue-400">[PROCESS] Retraining pipeline active...</div>
                  <div className="text-slate-500">[SUBPROCESS] Reading backend/ml_pipeline/data/historical_aqi.csv</div>
                  <div className="text-slate-500">[SUBPROCESS] Fit transformation: scaling features</div>
                  <div className="text-slate-500">[SUBPROCESS] Training estimators for targets [AQI_24h, AQI_48h, AQI_72h]</div>
                </>
              )}
              {retrainStatus === 'success' && (
                <>
                  <div className="text-emerald-400">[SUCCESS] Retraining completed. Saved best_model.joblib</div>
                  <div className="text-slate-300">[METRICS] Random Forest Avg R2: 0.94, Avg RMSE: 12.5</div>
                  <div className="text-slate-300">[METRICS] XGBoost Avg R2: 0.96, Avg RMSE: 9.8</div>
                  <div className="text-emerald-400">[INFO] Saved model training metadata. Reloaded predictor.</div>
                </>
              )}
              {retrainStatus === 'failed' && (
                <div className="text-red-400 flex items-center gap-1.5"><ServerCrash className="w-3.5 h-3.5" /> [ERROR] Pipeline failed. Check historical_aqi.csv.</div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'logs' && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800">
          <h3 className="font-bold text-base text-slate-200 mb-6 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" /> Security Audit Log Console
          </h3>
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 font-mono text-[11px] leading-relaxed max-h-[480px] overflow-y-auto pr-2 flex flex-col gap-2">
            {logsList.map((log) => (
              <div key={log.id} className="text-slate-400 hover:text-white transition-colors py-1 border-b border-slate-900/60 flex gap-2">
                <span className="text-indigo-500 font-bold shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-slate-500 font-semibold shrink-0">[{log.action.toUpperCase()}]</span>
                <span className="text-slate-300">{log.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
