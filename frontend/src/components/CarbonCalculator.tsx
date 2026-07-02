import React, { useState } from 'react';
import { Trees, Info, Send, Leaf, RefreshCw } from 'lucide-react';

interface CarbonResult {
  co2_emitted_kg: number;
  comparison_trees_absorbed_daily: number;
  carbon_rating: string;
  green_tips: string[];
}

export const CarbonCalculator: React.FC = () => {
  const [vehicle, setVehicle] = useState('petrol_car');
  const [distance, setDistance] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [result, setResult] = useState<CarbonResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distance || loading) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/carbon-calculator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          vehicle_type: vehicle,
          distance_km: parseFloat(distance),
          passengers: parseInt(passengers)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch (err) {
      console.error("Carbon calculation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDistance('');
    setPassengers('1');
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
      
      {/* Input Panel */}
      <div className="w-full md:w-5/12 glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-600/20 border border-emerald-500 rounded-lg text-emerald-400">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 font-display">Carbon Calculator</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Calculate travel footprint & ecological impact</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Mode of Transport</label>
            <select
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="petrol_car">🚗 Petrol Sedan/SUV</option>
              <option value="diesel_car">🚙 Diesel SUV</option>
              <option value="electric_car">🔌 Electric Vehicle (EV)</option>
              <option value="motorbike">🏍️ Two-Wheeler / Motorbike</option>
              <option value="bus">🚌 Public Bus</option>
              <option value="train">🚇 Metro / Train</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Distance (in Kilometers)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 15"
              min="0.1"
              required
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400">Number of Passengers (Carpooling)</label>
            <input
              type="number"
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              min="1"
              max="50"
              required
              className="px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !distance}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/10 active:scale-98 transition-all disabled:opacity-50"
          >
            {loading ? 'Calculating...' : 'Compute Footprint'}
          </button>
        </form>
      </div>

      {/* Results Display */}
      <div className="flex-1 w-full">
        {result ? (
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Calculation Results</span>
              <button 
                onClick={handleReset} 
                className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-calculate
              </button>
            </div>

            {/* Circular Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col items-center text-center">
                <span className="text-xs text-slate-400 font-semibold">Total Carbon Emitted</span>
                <span className="text-3xl font-extrabold text-white mt-2 font-display">{result.co2_emitted_kg} kg</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">CO₂ Equivalent</span>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl flex flex-col items-center text-center">
                <span className="text-xs text-slate-400 font-semibold">Forest Absorption Required</span>
                <span className="text-3xl font-extrabold text-emerald-400 mt-2 font-display">{result.comparison_trees_absorbed_daily}</span>
                <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Daily Tree absorptions</span>
              </div>
            </div>

            {/* Rating Alert */}
            <div className={`p-4 rounded-xl border flex gap-3.5 items-start ${
              result.carbon_rating.includes('High') 
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : (result.carbon_rating.includes('Moderate') 
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300')
            }`}>
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase">Emission Grade</span>
                <span className="text-sm font-semibold mt-1">Rating: {result.carbon_rating}</span>
              </div>
            </div>

            {/* Tips */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-emerald-400" /> Actionable Mitigation Strategies
              </span>
              <ul className="flex flex-col gap-2">
                {result.green_tips.map((tip, idx) => (
                  <li key={idx} className="text-xs leading-relaxed text-slate-400 flex gap-2">
                    <span className="text-emerald-400 font-bold shrink-0">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        ) : (
          <div className="glass-panel p-12 rounded-2xl border border-slate-850 flex flex-col items-center justify-center text-center h-[350px]">
            <div className="w-16 h-16 rounded-full bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-pulse-slow">
              <Trees className="w-8 h-8" />
            </div>
            <h4 className="font-semibold text-slate-200">Environmental Impact Score</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
              Fill out your trip specifications in the calculator panel to analyze your greenhouse gas footprint and get personalized environmental improvement strategies.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
