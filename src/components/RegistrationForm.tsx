import React, { useState } from 'react';
import { Users, Shield, Zap, Sparkles, MapPin, Calendar, Clock, Lock } from 'lucide-react';
import Logo from './Logo';
import { EventDetails } from '../types';

interface RegistrationFormProps {
  onRegister: (name: string) => void;
  slotsLeft: number;
  eventName: string;
  eventDetails?: EventDetails;
}

export default function RegistrationForm({ onRegister, slotsLeft, eventName, eventDetails }: RegistrationFormProps) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState(() => {
    try {
      return localStorage.getItem('sanati_brand_name') || 'Sanati Events';
    } catch {
      return 'Sanati Events';
    }
  });

  React.useEffect(() => {
    const handleBrandUpdate = () => {
      try {
        setBrandName(localStorage.getItem('sanati_brand_name') || 'Sanati Events');
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('sanati-brand-name-updated', handleBrandUpdate);
    return () => {
      window.removeEventListener('sanati-brand-name-updated', handleBrandUpdate);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onRegister(name);
    setName('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden" id="registration-form-wrapper">
      <div className="space-y-4">
        {/* Event Header Card */}
        <div className="border border-slate-800 bg-slate-950 p-5 rounded-2xl space-y-3 relative">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Logo size="sm" allowUpload={false} />
                <span className="text-[9px] font-mono tracking-widest text-slate-300 font-bold bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md uppercase">
                  {brandName}
                </span>
              </div>
              <h3 className="text-xl font-black font-mono text-white tracking-tight uppercase italic">{eventName}</h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">Official Access Registry • Live Sync</p>
            </div>
            
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-500 font-mono uppercase font-bold">LIMIT</p>
              <p className="text-sm font-black font-mono text-emerald-400">UNLIMITED</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{eventDetails ? eventDetails.date.toUpperCase() : 'OCT 24, 2026'}</span>
            </div>
            <div className="flex items-center gap-1 justify-center">
              <Clock size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{eventDetails ? eventDetails.time.toUpperCase() : '22:00 - LATE'}</span>
            </div>
            <div className="flex items-center gap-1 justify-end">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{eventDetails ? eventDetails.location.toUpperCase() : 'WAREHOUSE 07'}</span>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Welcome to the admissions registry. Enter your details below to generate your customized cryptographic access pass. Screenshot or print the generated QR code; it is required for scan-validation at the front gate.
        </p>

        {/* Input Fields Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1" id="buyer-register-form">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-mono block uppercase font-bold">FULL NAME *</label>
            <input
              type="text"
              placeholder="e.g. ALEX CHEN"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-slate-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none transition-all uppercase font-bold"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 rounded-xl font-black font-mono text-xs uppercase tracking-wider transition-all duration-300 shadow-md active:translate-y-0.5 cursor-pointer select-none bg-slate-100 hover:bg-slate-200 text-slate-950"
          >
            CONFIRM ACCESS & GENERATE ENCRYPTED PASS
          </button>
        </form>
      </div>
    </div>
  );
}
