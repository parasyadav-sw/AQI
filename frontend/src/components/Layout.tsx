import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  User as UserIcon, 
  LogOut, 
  Map, 
  Bell, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  Mic, 
  Languages,
  Activity,
  Trees,
  Compass,
  FileText,
  Terminal,
  Moon,
  Sun
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isCitizen, isGovernment, isAdmin, updateLanguage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  const navigationItems = [
    // Citizen Navigation
    { name: 'Dashboard', path: '/citizen', icon: Activity, show: isCitizen },
    { name: 'Pollution Map', path: '/citizen?tab=map', icon: Map, show: isCitizen },
    { name: 'Green Routes', path: '/citizen?tab=routes', icon: Compass, show: isCitizen },
    { name: 'Carbon Calculator', path: '/citizen?tab=carbon', icon: Trees, show: isCitizen },
    
    // Government Navigation
    { name: 'Command Center', path: '/government', icon: Shield, show: isGovernment },
    { name: 'Map Heatmap', path: '/government?tab=heatmap', icon: Map, show: isGovernment },
    { name: 'Emergency Alerts', path: '/government?tab=alerts', icon: Bell, show: isGovernment },
    { name: 'Report Generator', path: '/government?tab=reports', icon: FileText, show: isGovernment },

    // Admin Navigation
    { name: 'System Analytics', path: '/admin', icon: BarChart3, show: isAdmin },
    { name: 'User Management', path: '/admin?tab=users', icon: UserIcon, show: isAdmin },
    { name: 'Sensors Grid', path: '/admin?tab=sensors', icon: Settings, show: isAdmin },
    { name: 'Model Retraining', path: '/admin?tab=retrain', icon: Activity, show: isAdmin },
    { name: 'Audit Logs', path: '/admin?tab=logs', icon: Terminal, show: isAdmin }
  ];

  const toggleDarkMode = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser. Please try Chrome.");
      return;
    }
    
    setVoiceActive(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = user?.language === 'hi' ? 'hi-IN' : (user?.language === 'mr' ? 'mr-IN' : 'en-US');
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // TTS Greeting
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(
      user?.language === 'hi' ? 'मैं सुन रही हूँ, आप क्या जानना चाहते हैं?' : 
      (user?.language === 'mr' ? 'मी ऐकत आहे, विचारू शकता.' : 'Listening... How can I assist you?')
    );
    utter.lang = recognition.lang;
    synth.speak(utter);

    recognition.start();

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("Voice command received: ", command);
      
      let responseText = "Sorry, I didn't catch that command.";
      if (user?.language === 'hi') {
        responseText = "माफ़ कीजिये, मुझे समझ नहीं आया।";
      } else if (user?.language === 'mr') {
        responseText = "क्षमस्व, मला समजले नाही.";
      }

      // Voice routing / command handling
      if (command.includes('dashboard') || command.includes('डैशबोर्ड') || command.includes('गृह')) {
        navigate(isCitizen ? '/citizen' : (isGovernment ? '/government' : '/admin'));
        responseText = "Opening Dashboard";
        if (user?.language === 'hi') responseText = "डैशबोर्ड खोल रहा हूँ";
      } else if (command.includes('map') || command.includes('नक्शा') || command.includes('नकाशा')) {
        navigate(isCitizen ? '/citizen?tab=map' : '/government?tab=heatmap');
        responseText = "Opening Air Quality Map";
        if (user?.language === 'hi') responseText = "नक्शा खोल रहा हूँ";
      } else if (command.includes('carbon') || command.includes('कार्बन')) {
        if (isCitizen) {
          navigate('/citizen?tab=carbon');
          responseText = "Opening Carbon Footprint Calculator";
        }
      } else if (command.includes('route') || command.includes('मार्ग') || command.includes('रास्ता')) {
        if (isCitizen) {
          navigate('/citizen?tab=routes');
          responseText = "Opening Green Routes planner";
        }
      } else if (command.includes('logout') || command.includes('लॉगआउट')) {
        logout();
        responseText = "Logging you out. Goodbye!";
      }

      const responseUtter = new SpeechSynthesisUtterance(responseText);
      responseUtter.lang = recognition.lang;
      synth.speak(responseUtter);
      setVoiceActive(false);
    };

    recognition.onerror = () => {
      setVoiceActive(false);
    };

    recognition.onend = () => {
      setVoiceActive(false);
    };
  };

  const currentTab = location.search.replace('?tab=', '') || 'dashboard';

  return (
    <div className="min-h-screen bg-mesh text-slate-100 flex flex-col md:flex-row">
      
      {/* Mobile Top Navigation */}
      <header className="md:hidden flex justify-between items-center px-6 py-4 glass-panel border-b border-slate-800 z-50 sticky top-0">
        <div className="flex items-center gap-2" onClick={() => navigate('/')}>
          <div className="p-2 rounded-lg bg-blue-600 shadow-lg shadow-blue-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white font-display">AirGuard AI</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 glass-panel border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between z-40 p-6 pt-8 md:h-screen sticky top-0
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg leading-none tracking-tight text-slate-800 dark:text-white font-display">AirGuard AI</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase mt-0.5 tracking-wider">Health Shield</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-semibold tracking-wider px-3 mb-2">Navigation</span>
            {navigationItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const pathTab = item.path.includes('tab=') ? item.path.split('tab=')[1] : 'dashboard';
              const isActive = location.pathname === item.path.split('?')[0] && currentTab === pathTab;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`
                    flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 dark:bg-blue-600/25 text-blue-600 dark:text-blue-400 border-l-2 border-blue-500 font-semibold shadow-inner shadow-blue-500/5' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/35'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="flex flex-col gap-4 border-t border-slate-250 dark:border-slate-800/60 pt-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold uppercase">
              {user?.name ? user.name.slice(0, 2) : ''}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate text-slate-800 dark:text-slate-200">{user?.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user?.role}</span>
            </div>
          </div>

          <button 
            onClick={logout}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/50 hover:text-red-600 dark:hover:text-red-400 text-slate-600 dark:text-slate-350 text-sm font-medium transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 md:h-screen md:overflow-y-auto">
        {/* Top bar (for desktop header controls) */}
        <header className="hidden md:flex justify-between items-center px-8 py-5 border-b border-slate-200 dark:border-slate-800/40 sticky top-0 bg-white/70 dark:bg-slate-950/40 backdrop-blur-md z-30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow"></div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">AI Shield Active</span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-4">
            
            {/* Voice Assistant Button */}
            <button
              onClick={handleVoiceCommand}
              className={`p-2.5 rounded-xl border transition-all duration-200 ${
                voiceActive 
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                  : 'border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Voice Assistant"
            >
              <Mic className="w-4.5 h-4.5" />
            </button>

            {/* Light/Dark Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setLanguageMenuOpen(!languageMenuOpen)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all duration-200"
              >
                <Languages className="w-4 h-4" />
                <span className="uppercase">{user?.language || 'en'}</span>
              </button>
              {languageMenuOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1 z-50">
                  {['en', 'hi', 'mr'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        updateLanguage(lang);
                        setLanguageMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all uppercase"
                    >
                      {lang === 'en' ? 'English' : (lang === 'hi' ? 'हिंदी (Hindi)' : 'मराठी (Marathi)')}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 p-6 md:p-8">
          {children}
        </div>
      </main>

    </div>
  );
};
