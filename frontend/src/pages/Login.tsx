import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Mail, ShieldAlert, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || loading) return;

    setLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        await login(data.access_token, {
          name: data.name,
          email: data.email,
          role: data.role
        });

        // Route dynamically based on role
        if (data.role === 'admin') navigate('/admin');
        else if (data.role === 'government') navigate('/government');
        else navigate('/citizen');
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Incorrect email or password.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failed. Make sure the FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-mesh flex flex-col justify-center items-center px-6 py-12 relative">
      <div className="absolute inset-0 bg-blue-650/5 rounded-full blur-[160px] -z-10"></div>

      <div className="w-full max-w-md flex flex-col gap-6">
        
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl shadow-xl shadow-blue-500/10">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h2 className="font-extrabold text-2xl tracking-tight text-slate-800 dark:text-white font-display">AirGuard AI Portal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to access your customized air quality dashboard</p>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-6 shadow-2xl">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-650 dark:text-red-300 rounded-xl flex items-center gap-2.5 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-650 dark:text-slate-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-650 dark:text-slate-400">Password</label>
                <Link to="/forgot-password" style={{ color: '#2563eb', fontSize: '10px', fontWeight: 'bold' }}>
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-850 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/10 active:scale-98 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="flex flex-col gap-2.5 mt-2">
            <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold tracking-wider text-center">1-Click Demo Accounts</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDemoFill('citizen@gmail.com', 'Citizen@12345')}
                className="py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition-all truncate"
              >
                👤 Citizen
              </button>
              <button
                onClick={() => handleDemoFill('officer@airguard.gov.in', 'Officer@12345')}
                className="py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition-all truncate"
              >
                👮 Officer
              </button>
              <button
                onClick={() => handleDemoFill('admin@airguard.gov.in', 'Admin@12345')}
                className="py-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition-all truncate"
              >
                ⚙️ Admin
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-900 pt-4">
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563eb', fontWeight: 'bold' }}>
              Create Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
