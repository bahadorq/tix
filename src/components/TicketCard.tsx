import React, { useRef, useState, useEffect } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Ticket, EventDetails } from '../types';
import { Download, Share2, Sparkles, Calendar, MapPin, Clock, ArrowRight } from 'lucide-react';
import Logo from './Logo';

interface TicketCardProps {
  ticket: Ticket;
  onClose?: () => void;
  eventDetails?: EventDetails;
}

export default function TicketCard({ ticket, onClose, eventDetails }: TicketCardProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [brandName, setBrandName] = useState(() => {
    try {
      return localStorage.getItem('sanati_brand_name') || 'Sanati Events';
    } catch {
      return 'Sanati Events';
    }
  });

  useEffect(() => {
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

  const handleDownload = () => {
    try {
      const qrCanvas = document.getElementById(`qr-canvas-${ticket.id}`) as HTMLCanvasElement;
      if (!qrCanvas) {
        console.error("QR Canvas not found!");
        return;
      }

      // Create a high-res canvas for downloading
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set dimensions
      const width = 400;
      const height = 500;
      canvas.width = width;
      canvas.height = height;

      // 1. Draw Background (Dark sleek aesthetic matching the brand)
      ctx.fillStyle = '#09090b'; // Zinc 950
      ctx.fillRect(0, 0, width, height);

      // Add a cool gradient border
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#475569'); // Slate 600
      gradient.addColorStop(0.5, '#94a3b8'); // Slate 400
      gradient.addColorStop(1, '#334155'); // Slate 700
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, width - 16, height - 16);

      // 2. Draw Header Text (Brand name)
      ctx.fillStyle = '#cbd5e1'; // Zinc 300
      ctx.font = '900 14px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(brandName.toUpperCase(), width / 2, 50);

      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.font = '500 11px sans-serif';
      ctx.fillText('ADMISSION PASS', width / 2, 75);

      // 3. Draw white background card for QR Code (to make it highly scannable)
      const qrSize = 220;
      const qrX = (width - qrSize) / 2;
      const qrY = 110;
      ctx.fillStyle = '#ffffff';
      
      // Rounded rect helper or standard fill
      ctx.beginPath();
      ctx.rect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
      ctx.fill();

      // Draw the QR Code onto the canvas
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 4. Draw Guest Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold italic 22px sans-serif';
      ctx.fillText(ticket.name.toUpperCase(), width / 2, 385);

      // 5. Draw Event Name
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.font = '600 13px sans-serif';
      ctx.fillText((ticket.eventName || 'SECRET TECHNO ASSEMBLY').toUpperCase(), width / 2, 415);

      // 6. Draw Ticket ID
      ctx.fillStyle = '#e2e8f0'; // Zinc 200
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`ID: ${ticket.id}`, width / 2, 445);

      // 7. Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `TICKET-${ticket.name.replace(/\s+/g, '_').toUpperCase()}-${ticket.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating downloaded ticket image:", err);
    }
  };

  const theme = {
    bg: 'from-slate-900 to-black',
    border: 'border-slate-800',
    text: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-750',
    accent: 'slate-400',
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-md w-full mx-auto" id="ticket-card-container">
      {/* Ticket Pass Outer Container */}
      <div 
        ref={ticketRef}
        className={`relative w-full overflow-hidden bg-gradient-to-b ${theme.bg} border-2 ${theme.border} rounded-3xl shadow-2xl shadow-${theme.accent}/10 font-mono text-white transition-all`}
      >
        {/* Aesthetic Scanlines & Cyber Grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_100%)] pointer-events-none" />

        {/* Decorative Ticket Side Cuts (Ticket Stubs effect) */}
        <div className="absolute left-[-12px] top-2/3 w-6 h-6 bg-[#0A0A0B] border-r border-slate-800 rounded-full z-10" />
        <div className="absolute right-[-12px] top-2/3 w-6 h-6 bg-[#0A0A0B] border-l border-slate-800 rounded-full z-10" />

        {/* Header (Branding & Identity) */}
        <div className="p-6 pb-4 border-b border-white/10 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Logo size="sm" allowUpload={false} />
                <p className="text-[10px] tracking-widest text-slate-400 uppercase font-bold">{brandName}</p>
              </div>
              <h3 className="text-xl font-black tracking-tight text-white italic uppercase">
                {ticket.eventName || 'Secret Techno Assembly'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Verified Digital Access Pass</p>
            </div>
            <span className={`px-2.5 py-1 rounded-md text-[11px] font-black border uppercase tracking-wider ${theme.badge}`}>
              ADMISSION
            </span>
          </div>

          {/* Aesthetic barcode element */}
          <div className="mt-4 flex gap-0.5 h-6 opacity-30 select-none">
            {[...Array(24)].map((_, i) => (
              <div 
                key={i} 
                className="bg-white h-full" 
                style={{ width: `${(i % 3 === 0 ? 3 : i % 2 === 0 ? 1 : 2)}px` }} 
              />
            ))}
          </div>
        </div>

        {/* Ticket Details Body */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">ATTENDEE NAME</p>
            <p className="text-lg font-black text-white tracking-wide mt-0.5 uppercase italic">{ticket.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-bold">
                <Calendar size={10} className={theme.text} /> DATE
              </p>
              <p className="text-xs font-black text-slate-300 mt-1 uppercase">{eventDetails ? 'EVENT DATE' : 'TONIGHT'}</p>
              <p className="text-[10px] text-slate-500">{eventDetails ? eventDetails.date : 'Oct 24, 2026'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-bold">
                <Clock size={10} className={theme.text} /> DOORS OPEN
              </p>
              <p className="text-xs font-black text-slate-300 mt-1 uppercase">{eventDetails ? eventDetails.time : '22:00 PST'}</p>
              <p className="text-[10px] text-slate-500">Late Admission allowed</p>
            </div>
          </div>

          <div className="pt-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-bold">
              <MapPin size={10} className={theme.text} /> LOCATION
            </p>
            <p className="text-xs font-black text-slate-300 mt-1 uppercase">
              {eventDetails ? eventDetails.location : 'SECRET INDUSTRIAL WAREHOUSE 07'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Location details attached to pass.</p>
          </div>
        </div>

        {/* Divider dashed line for stub separation */}
        <div className="border-t-2 border-dashed border-white/10 my-1 relative px-6">
          <div className="absolute left-0 right-0 h-[1px] bg-white/5 top-0" />
        </div>

        {/* Stub Area (QR Code, Security Hash) */}
        <div className="p-6 bg-black/40 flex flex-col items-center justify-center text-center relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60 pointer-events-none" />
          
          <p className="text-[10px] text-slate-500 tracking-wider mb-3 uppercase font-bold">SCAN AT WAREHOUSE GATE</p>
          
          {/* QR Code Wrapper with clean container */}
          <div className="relative p-3 bg-white rounded-xl shadow-lg border border-white/20 transition-transform hover:scale-105">
            <QRCodeSVG 
              value={ticket.id} 
              size={140}
              includeMargin={false}
              fgColor="#000000"
              bgColor="#ffffff"
            />
            {/* Hidden QRCodeCanvas for image download generation */}
            <div className="hidden">
              <QRCodeCanvas 
                id={`qr-canvas-${ticket.id}`}
                value={ticket.id} 
                size={256}
                includeMargin={false}
                fgColor="#000000"
                bgColor="#ffffff"
              />
            </div>
            {/* Visual scan target brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-slate-400 -mt-1 -ml-1" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-slate-400 -mt-1 -mr-1" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-slate-400 -mb-1 -ml-1" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-slate-400 -mb-1 -mr-1" />
          </div>

          <div className="mt-4">
            <p className="text-[10px] text-slate-500 font-bold">PASS REGISTER ID</p>
            <p className={`text-xs font-mono font-black tracking-widest ${theme.text} mt-0.5`}>
              {ticket.id}
            </p>
          </div>
        </div>
      </div>

      {/* Ticket Download & Actions Bar */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full" id="ticket-actions">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white px-4 py-3 rounded-xl transition-all font-bold text-xs uppercase tracking-wider cursor-pointer shadow-sm active:translate-y-0.5"
        >
          <Download size={16} />
          Save / Print Pass
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-950 px-4 py-3 rounded-xl transition-all font-black text-xs uppercase tracking-wider cursor-pointer shadow-md active:translate-y-0.5"
          >
            Register Another
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      <p className="text-slate-500 text-[10px] text-center mt-4 font-sans max-w-xs leading-relaxed uppercase tracking-wider font-bold">
        ⚠️ PLEASE KEEP A SCREENSHOT OF THIS BADGE IN CASE OF OFFLINE DEVICE OR CELL SIGNAL ISSUES.
      </p>
    </div>
  );
}
