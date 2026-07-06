import React, { useState } from 'react';
import { Ticket, TicketStatus } from '../types';
import { 
  Users, UserCheck, Search, ShieldCheck, AlertTriangle, XCircle, 
  Trash2, Plus, Download, Upload, RefreshCw, Grid, Play, ShieldAlert, CheckSquare, X
} from 'lucide-react';

interface BouncerDashboardProps {
  tickets: Ticket[];
  selectedEvent: string;
  uniqueEvents: string[];
  onEventChange: (ev: string) => void;
  onCheckIn: (ticketId: string) => any;
  onUndoCheckIn: (ticketId: string) => void;
  onAddTicket: (name: string) => void;
  onDeleteTicket: (ticketId: string) => void;
  onClearTickets: () => void;
  onImportTickets: (imported: Ticket[]) => void;
  activeScanResult: { status: 'success' | 'warning' | 'error' | null; message: string; ticket?: Ticket } | null;
  onClearScanResult: () => void;
  onSimulateScan: (ticketId: string) => void;
  isDoorman?: boolean;
}

export default function BouncerDashboard({
  tickets,
  selectedEvent,
  uniqueEvents,
  onEventChange,
  onCheckIn,
  onUndoCheckIn,
  onAddTicket,
  onDeleteTicket,
  onClearTickets,
  onImportTickets,
  activeScanResult,
  onClearScanResult,
  onSimulateScan,
  isDoorman = false,
}: BouncerDashboardProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'checked-in'>('all');

  // New Attendee Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');

  // Inline Confirmation States
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Search and Filter Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchesEvent = selectedEvent === 'All Events' || t.eventName === selectedEvent;

    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'checked-in' && t.status === 'checked-in') ||
      (statusFilter === 'valid' && t.status === 'valid');

    return matchesEvent && matchesSearch && matchesStatus;
  });

  // Stats calculation
  const eventTickets = tickets.filter(t => selectedEvent === 'All Events' || t.eventName === selectedEvent);
  const totalTickets = eventTickets.length;
  const totalCheckedIn = eventTickets.filter(t => t.status === 'checked-in').length;
  const totalNotCheckedIn = eventTickets.filter(t => t.status !== 'checked-in').length;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddTicket(newName);
    setNewName('');
    setShowAddForm(false);
  };

  // Export Tickets to JSON
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `underground_party_guestlist_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Tickets from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportTickets(parsed);
          alert(`Successfully imported ${parsed.length} tickets!`);
        } else {
          alert('Invalid format. File must contain an array of tickets.');
        }
      } catch (err) {
        alert('Failed to parse file. Ensure it is a valid JSON guest list.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6" id="bouncer-dashboard-container">
      {/* 1. Validation Overlay (Scan Feedback Panel) */}
      {activeScanResult && (
        <div 
          className={`p-6 border-2 rounded-3xl shadow-2xl animate-fade-in flex flex-col md:flex-row items-center md:items-start justify-between gap-4 transition-all duration-300 relative overflow-hidden ${
            activeScanResult.status === 'success' 
              ? 'bg-emerald-950/40 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-emerald-100' 
              : activeScanResult.status === 'warning' 
              ? 'bg-amber-950/40 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] text-amber-100' 
              : 'bg-rose-950/40 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)] text-rose-100'
          }`}
          id="verification-result-panel"
        >
          {/* Neon Scanner Line overlay on active scan results */}
          <div className={`absolute top-0 bottom-0 left-0 w-1 transition-all ${
            activeScanResult.status === 'success' ? 'bg-emerald-400' : activeScanResult.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
          }`} />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className={`p-4 rounded-xl shrink-0 ${
              activeScanResult.status === 'success' 
                ? 'bg-emerald-500/15 text-emerald-400' 
                : activeScanResult.status === 'warning' 
                ? 'bg-amber-500/15 text-amber-400' 
                : 'bg-rose-500/15 text-rose-400'
            }`}>
              {activeScanResult.status === 'success' && <ShieldCheck size={40} className="animate-bounce" />}
              {activeScanResult.status === 'warning' && <ShieldAlert size={40} className="animate-pulse" />}
              {activeScanResult.status === 'error' && <XCircle size={40} />}
            </div>

            <div className="text-center sm:text-left space-y-1">
              <span className={`text-[10px] uppercase tracking-widest font-mono font-bold px-2 py-0.5 rounded-md ${
                activeScanResult.status === 'success' 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : activeScanResult.status === 'warning' 
                  ? 'bg-amber-500/20 text-amber-300' 
                  : 'bg-rose-500/20 text-rose-300'
              }`}>
                {activeScanResult.status === 'success' && 'ACCESS GRANTED'}
                {activeScanResult.status === 'warning' && 'WARNING - DOUBLE ENTRY'}
                {activeScanResult.status === 'error' && 'ACCESS DENIED'}
              </span>

              <h3 className="text-xl font-bold tracking-tight mt-1 uppercase italic font-mono text-white">
                {activeScanResult.message}
              </h3>

              {activeScanResult.ticket && (
                <div className="pt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300 font-mono">
                  <p>
                    <span className="text-slate-500 font-bold">NAME:</span>{' '}
                    <strong className="text-white uppercase">{activeScanResult.ticket.name}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500 font-bold">ID:</span>{' '}
                    <span className="text-indigo-300 font-bold">{activeScanResult.ticket.id}</span>
                  </p>
                  {activeScanResult.ticket.checkedInAt && (
                    <p>
                      <span className="text-slate-500 font-bold">ADMITTED:</span>{' '}
                      <span className="text-slate-300 font-bold">{new Date(activeScanResult.ticket.checkedInAt).toLocaleTimeString()}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onClearScanResult}
            className="shrink-0 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer active:scale-95 transition-all self-start md:self-center"
            title="Dismiss verification screen"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 2. Key Metrics & stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-dashboard">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold">GUESTS REGISTERED</p>
            <h4 className="text-3xl font-black font-mono text-white mt-1">{totalTickets}</h4>
          </div>
          <div className="p-2.5 bg-slate-800 text-slate-300 rounded-xl border border-slate-700">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold">DOOR COUNT</p>
            <h4 className="text-3xl font-black font-mono text-emerald-400 mt-1">{totalCheckedIn}</h4>
          </div>
          <div className="p-2.5 bg-emerald-950/60 text-emerald-400 rounded-xl border border-emerald-900/30">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-bold">NOT CHECKED IN YET</p>
            <h4 className="text-3xl font-black font-mono text-amber-400 mt-1">{totalNotCheckedIn}</h4>
          </div>
          <div className="p-2.5 bg-amber-950/40 text-amber-400 rounded-xl border border-amber-900/30">
            <AlertTriangle size={18} />
          </div>
        </div>
      </div>

      {/* 3. Action Controls, Filter, Search, and Registry */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl" id="registry-controls-wrapper">
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white flex items-center gap-2 italic uppercase">
              <Grid size={18} className="text-slate-300" />
              GUEST REGISTRY
            </h3>
            <p className="text-xs text-slate-400">Manage admissions, registers, and manual gatekeeper bypass audits</p>
          </div>

          {!isDoorman && (
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5"
              >
                <Plus size={14} /> Add Guest
              </button>
              <button
                onClick={handleExport}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5"
                title="Export database as JSON to back up"
              >
                <Download size={14} /> Export Backup
              </button>
              <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer active:translate-y-0.5 text-center">
                <Upload size={14} /> Import List
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImport} 
                  className="hidden" 
                />
              </label>
              {showResetConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/50 p-1 rounded-xl animate-fade-in">
                  <span className="text-[10px] text-rose-400 font-bold font-mono px-1">DELETE ALL GUESTS?</span>
                  <button
                    onClick={() => {
                      onClearTickets();
                      setShowResetConfirm(false);
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                  >
                    YES, RESET
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-[10px] font-bold uppercase cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3 py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/50 text-rose-400 rounded-xl text-xs font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Clear all tickets"
                >
                  <Trash2 size={14} /> Reset list
                </button>
              )}
            </div>
          )}
        </div>

        {/* Guest Form (Collapsible Addition Panel) */}
        {!isDoorman && showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-5 bg-slate-950 border-b border-slate-800 flex items-end gap-3 animate-fade-in animate-none" id="add-guest-form">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-slate-400 font-mono block uppercase font-bold">GUEST NAME *</label>
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none uppercase font-bold"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase transition-all cursor-pointer h-10 flex items-center justify-center active:translate-y-0.5"
            >
              Add Pass
            </button>
          </form>
        )}

        {/* Filter and Search Bar */}
        <div className="p-4 bg-slate-950/20 border-b border-slate-800 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search guest registry by Name or Ticket ID code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedEvent}
              onChange={(e) => onEventChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono font-bold uppercase focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="All Events">All Events</option>
              {uniqueEvents.filter(ev => ev !== 'All Events').map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-slate-500"
            >
              <option value="all">All Door Status</option>
              <option value="valid">Not Checked In</option>
              <option value="checked-in">Checked In</option>
            </select>
          </div>
        </div>

        {/* Main Database Table Grid */}
        <div className="overflow-x-auto">
          {filteredTickets.length > 0 ? (
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3.5 px-5 font-black uppercase">GUEST DETAIL</th>
                  <th className="py-3.5 px-4 font-black uppercase">TICKET REF ID</th>
                  <th className="py-3.5 px-4 font-black uppercase">DOOR STATUS</th>
                  <th className="py-3.5 px-5 font-black uppercase text-right">OPERATIONS / TEST SIMULATOR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 text-slate-300">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-950/40 transition-all group">
                    {/* Guest Detail */}
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-white uppercase">{ticket.name}</p>
                      <p className="text-[10px] text-slate-500 font-sans mt-0.5 uppercase tracking-tight">
                        {ticket.eventName || 'Secret Assembly'}
                      </p>
                    </td>

                    {/* Ticket Ref ID */}
                    <td className="py-3.5 px-4 text-slate-400 select-all font-bold">
                      {ticket.id}
                    </td>

                    {/* Check In Status Badge */}
                    <td className="py-3.5 px-4">
                      {ticket.status === 'checked-in' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-md text-[10px] uppercase">
                            <CheckSquare size={10} /> Checked In
                          </span>
                          {ticket.checkedInAt && (
                            <p className="text-[9px] text-slate-500 block">
                              {new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-bold bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-md text-[10px] uppercase">
                          Not Checked In
                        </span>
                      )}
                    </td>

                    {/* Quick Simulation & Manual Controls */}
                    <td className="py-3.5 px-5 text-right space-x-1.5 whitespace-nowrap">
                      {/* 1. Simulate Scan Button (Extremely convenient for preview test!) */}
                      <button
                        onClick={() => onSimulateScan(ticket.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-lg text-[10px] font-black tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-slate-700 shadow-sm"
                        title="Simulate scanning this guest's QR code"
                      >
                        <Play size={10} /> SCAN SIM
                      </button>

                      {/* 2. Manual Toggle Checkin */}
                      {ticket.status === 'checked-in' ? (
                        <button
                          onClick={() => onUndoCheckIn(ticket.id)}
                          className="px-2 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-300 rounded-lg text-[10px] cursor-pointer transition-all active:scale-95"
                          title="Undo Door Check-In"
                        >
                          Undo Check
                        </button>
                      ) : (
                        <button
                          onClick={() => onCheckIn(ticket.id)}
                          className="px-2 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 rounded-lg text-[10px] font-semibold cursor-pointer transition-all active:scale-95"
                          title="Manually mark guest as arrived"
                        >
                          Check In
                        </button>
                      )}

                      {/* 3. Delete Guest Pass */}
                      {!isDoorman && (
                        <div className="inline-flex items-center gap-1.5 pl-1">
                          {deletingTicketId === ticket.id ? (
                            <div className="flex items-center gap-1 bg-rose-950/40 border border-rose-900/40 p-1 rounded-lg animate-fade-in">
                              <span className="text-[9px] text-rose-400 font-bold uppercase font-mono px-0.5">DEL?</span>
                              <button
                                onClick={() => {
                                  onDeleteTicket(ticket.id);
                                  setDeletingTicketId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold uppercase cursor-pointer"
                              >
                                YES
                              </button>
                              <button
                                onClick={() => setDeletingTicketId(null)}
                                className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[8px] font-bold uppercase cursor-pointer"
                              >
                                NO
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingTicketId(ticket.id)}
                              className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg cursor-pointer transition-all inline-block opacity-60 group-hover:opacity-100"
                              title="Delete ticket registration"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
              <ShieldAlert className="text-slate-600" size={32} />
              <p className="font-mono text-xs">No matching tickets found in guest registry.</p>
              <p className="text-[11px] text-slate-600 font-sans">Modify your searches, clear filters, or sign up guests to register.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
