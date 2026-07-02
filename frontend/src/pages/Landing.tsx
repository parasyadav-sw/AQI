import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Activity, Map, Trees, Heart, UserCheck } from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-mesh text-slate-800 dark:text-slate-100 flex flex-col justify-between overflow-x-hidden">
      
      {/* Navbar Header */}
      <header className="px-8 py-6 max-w-7xl mx-auto w-full flex justify-between items-center z-10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/10">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white font-display">AirGuard AI</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold px-4 py-2"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-blue-500/10"
          >
            Register Now
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto w-full px-8 py-16 flex flex-col lg:flex-row items-center gap-12 z-10 flex-1">
        <div className="flex-1 flex flex-col gap-6 items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-450 text-[10px] font-semibold uppercase tracking-wider">
            🛡️ SIH 2026 Winner Prototype
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white font-display leading-[1.1]">
            Next-Gen Air Quality <br />
            <span className="text-gradient-primary">Prediction & Health Advisory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            Protect your health with our machine learning models. AirGuard AI analyzes multi-sensor spatial nodes to forecast AQI up to 72 hours, suggests eco-friendly commute routes, and pushes localized alerts for government bodies and citizens.
          </p>
          <div className="flex flex-wrap gap-4 mt-4 w-full sm:w-auto">
            <button
              onClick={() => navigate('/register')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-4 bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold rounded-2xl text-xs shadow-xl shadow-blue-500/15 transition-all hover:scale-102"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex-1 sm:flex-initial px-7 py-4 border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 bg-white/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition-all hover:bg-slate-100/50"
            >
              Demo Dashboard
            </button>
          </div>
        </div>

        {/* Floating Landing Cards */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full relative">
          <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-[120px] -z-10"></div>
          
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-display">72-Hour Predictions</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              We compare Linear Regression, Random Forests, and XGBoost models to automatically deploy the best predictor.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-800/80 mt-0 sm:mt-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-650 dark:text-emerald-400">
              <Map className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-display">Clean Route Navigation</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Find alternative walking or cycling directions designed to minimize exposure to heavy pollutants and PM2.5.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-display">Smart Cohort Advisories</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Tailored medical and activity instructions for children, pregnant women, asthmatics, and heart patients.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-slate-200 dark:border-slate-800/80 mt-0 sm:mt-6">
            <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 font-display">GRAP Enforcement</h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Government control deck to dispatch alerts, examine historical logs, and request compliance report generation.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 py-8 px-8 z-10 bg-white/40 dark:bg-slate-950/40">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <span>&copy; 2026 AirGuard AI – Built for Smart India Hackathon. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-400">Terms of Service</a>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-blue-650 dark:text-blue-500 hover:underline">API Docs</a>
          </div>
        </div>
      </footer>

    </div>
  );
};
