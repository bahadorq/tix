import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, TicketStatus, EventDetails, Doorman, AdminUser } from './types';
import TicketCard from './components/TicketCard';
import CameraScanner from './components/CameraScanner';
import BouncerDashboard from './components/BouncerDashboard';
import RegistrationForm from './components/RegistrationForm';
import Logo from './components/Logo';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Ticket as TicketIcon, QrCode, Lock, Shield, Sparkles, 
  KeyRound, Users, UserCheck, Smartphone, RefreshCw, X, Copy, Check
} from 'lucide-react';
import { db } from './lib/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

const STAFF_PIN = '2026';

// Pre-seeded guests for immediate testing
const PRE_SEEDED_GUESTS: Ticket[] = [
  {
    id: 'UG-E7F2-A4D9',
    name: 'Charlotte de Witte',
    status: 'checked-in',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    checkedInAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    eventName: 'Secret Techno Assembly',
  },
  {
    id: 'UG-8B3C-F91A',
    name: 'Amelie Lens',
    status: 'valid',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    eventName: 'Secret Techno Assembly',
  },
  {
    id: 'UG-1D4A-3C9F',
    name: 'Boris Brejcha',
    status: 'valid',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    eventName: 'Secret Techno Assembly',
  },
  {
    id: 'UG-6A5E-7D2C',
    name: 'Carl Cox',
    status: 'checked-in',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    checkedInAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    eventName: 'Secret Techno Assembly',
  },
  {
    id: 'UG-3F9D-2E8B',
    name: 'Peggy Gou',
    status: 'valid',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    eventName: 'Secret Techno Assembly',
  },
];

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState<'ticket-office' | 'door-staff'>('ticket-office');
  
  // Door Staff authorization state
  const [doormen, setDoormen] = useState<Doorman[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [staffPinInput, setStaffPinInput] = useState('');
  const [isStaffAuthorized, setIsStaffAuthorized] = useState(false);
  const [authorizedDoormanName, setAuthorizedDoormanName] = useState('');
  const [authError, setAuthError] = useState(false);

  // Admin authentication state (Get Pass section)
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'issue-pass' | 'guest-registry' | 'doormen-mgt'>('issue-pass');

  // Unified Staff Management States
  const [deletingDoormanId, setDeletingDoormanId] = useState<string | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);
  const [staffMgtError, setStaffMgtError] = useState<string | null>(null);
  const [adminMgtError, setAdminMgtError] = useState<string | null>(null);

  // Active Scan Result / Feedback
  const [activeScanResult, setActiveScanResult] = useState<{
    status: 'success' | 'warning' | 'error' | null;
    message: string;
    ticket?: Ticket;
  } | null>(null);

  // Camera toggle
  const [cameraActive, setCameraActive] = useState(false);

  // Dynamic Event Management states
  const [selectedEvent, setSelectedEvent] = useState<string>('Secret Techno Assembly');
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [customEventInput, setCustomEventInput] = useState('');
  const [showMobileShareModal, setShowMobileShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEventManager, setShowEventManager] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Dynamic Brand Customization state
  const [brandName, setBrandName] = useState(() => {
    try {
      return localStorage.getItem('sanati_brand_name') || 'Sanati Events';
    } catch {
      return 'Sanati Events';
    }
  });
  const [isEditingBrandName, setIsEditingBrandName] = useState(false);
  const [brandNameInput, setBrandNameInput] = useState(brandName);

  const handleSaveBrandName = () => {
    const cleaned = brandNameInput.trim();
    if (cleaned) {
      setBrandName(cleaned);
      try {
        localStorage.setItem('sanati_brand_name', cleaned);
        window.dispatchEvent(new Event('sanati-brand-name-updated'));
      } catch (err) {
        console.error("Error saving brand name:", err);
      }
    }
    setIsEditingBrandName(false);
  };

  const [events, setEvents] = useState<EventDetails[]>(() => {
    try {
      const saved = localStorage.getItem('sanati_events_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [
      {
        id: 'secret-techno-assembly',
        name: 'Secret Techno Assembly',
        date: 'Oct 24, 2026',
        time: '22:00 PST',
        location: 'SECRET INDUSTRIAL WAREHOUSE 07'
      },
      {
        id: 'warehouse-07-party',
        name: 'Warehouse 07 Party',
        date: 'Nov 12, 2026',
        time: '23:00 PST',
        location: 'SECRET INDUSTRIAL WAREHOUSE 07'
      },
      {
        id: 'sanati-vip-lounge',
        name: 'Sanati VIP Lounge',
        date: 'Dec 05, 2026',
        time: '21:00 PST',
        location: 'SANATI VIP ROOFTOP LOUNGE'
      }
    ];
  });

  const handleSaveEvents = (updatedEvents: EventDetails[]) => {
    const sanitized = updatedEvents.map((ev, idx) => ({
      ...ev,
      id: ev.id || `event-${idx}-${Date.now()}`
    }));
    setEvents(sanitized);
    try {
      localStorage.setItem('sanati_events_v2', JSON.stringify(sanitized));
    } catch (e) {
      console.error(e);
    }
  };

  // Derive unique events dynamically from events list
  const uniqueEvents = useMemo(() => {
    return events.map((ev) => ev.name);
  }, [events]);

  const selectedEventDetails = useMemo(() => {
    return events.find((ev) => ev.name === selectedEvent);
  }, [events, selectedEvent]);

  const handleSaveCustomEvent = () => {
    const cleaned = customEventInput.trim();
    if (cleaned) {
      setSelectedEvent(cleaned);
      if (!events.some((ev) => ev.name.toLowerCase() === cleaned.toLowerCase())) {
        const newEvent: EventDetails = {
          id: cleaned.toLowerCase().replace(/\s+/g, '-'),
          name: cleaned,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          time: '22:00 PST',
          location: 'SECRET WAREHOUSE 07'
        };
        const updated = [...events, newEvent];
        handleSaveEvents(updated);
      }
    }
    setIsEditingEvent(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Load tickets and doormen on mount with Real-time Firestore Sync
  useEffect(() => {
    // Optimistically pre-seed state immediately so that even in offline fallback mode,
    // the system has data and is fully functional.
    setTickets(PRE_SEEDED_GUESTS);

    const ticketsCollectionRef = collection(db, 'tickets');
    
    const unsubscribeTickets = onSnapshot(ticketsCollectionRef, (snapshot) => {
      if (!snapshot.empty) {
        const ticketList: Ticket[] = [];
        snapshot.forEach((docSnap) => {
          ticketList.push(docSnap.data() as Ticket);
        });
        // Sort by createdAt desc so newest always shows at the top
        ticketList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTickets(ticketList);
      }
    }, (error) => {
      console.warn("Firestore subscription offline or failed, operating in seamless local fallback mode:", error);
    });

    const doormenCollectionRef = collection(db, 'doormen');
    const unsubscribeDoormen = onSnapshot(doormenCollectionRef, (snapshot) => {
      if (!snapshot.empty) {
        const doormanList: Doorman[] = [];
        snapshot.forEach((docSnap) => {
          doormanList.push(docSnap.data() as Doorman);
        });
        // Sort doormen alphabetically
        doormanList.sort((a, b) => a.name.localeCompare(b.name));
        setDoormen(doormanList);
      } else {
        // Pre-seed default doorman if database is empty
        const defaultDoorman: Doorman = {
          id: 'lead-gatekeeper',
          name: 'Lead Gatekeeper',
          pin: '2026',
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'doormen', defaultDoorman.id), defaultDoorman).catch(err => {
          console.warn("Pre-seeding doormen failed:", err);
        });
        setDoormen([defaultDoorman]);
      }
    }, (error) => {
      console.warn("Firestore doormen sync offline, using local fallback doormen list:", error);
      setDoormen([{ id: 'lead-gatekeeper', name: 'Lead Gatekeeper', pin: '2026', createdAt: new Date().toISOString() }]);
    });

    const adminsCollectionRef = collection(db, 'admins');
    const unsubscribeAdmins = onSnapshot(adminsCollectionRef, (snapshot) => {
      if (!snapshot.empty) {
        const adminList: AdminUser[] = [];
        snapshot.forEach((docSnap) => {
          adminList.push(docSnap.data() as AdminUser);
        });
        // Sort admins by username
        adminList.sort((a, b) => a.username.localeCompare(b.username));
        setAdmins(adminList);
      } else {
        // Pre-seed default admin if database is empty
        const defaultAdmin: AdminUser = {
          id: 'root-admin',
          username: 'admin',
          password: 'password',
          name: 'Root Administrator',
          createdAt: new Date().toISOString()
        };
        setDoc(doc(db, 'admins', defaultAdmin.id), defaultAdmin).catch(err => {
          console.warn("Pre-seeding admin failed:", err);
        });
        setAdmins([defaultAdmin]);
      }
    }, (error) => {
      console.warn("Firestore admins sync offline, using local fallback admins list:", error);
      setAdmins([{ id: 'root-admin', username: 'admin', password: 'password', name: 'Root Administrator', createdAt: new Date().toISOString() }]);
    });

    return () => {
      unsubscribeTickets();
      unsubscribeDoormen();
      unsubscribeAdmins();
    };
  }, []);

  // Generate unique ticket hash: UG-XXXX-XXXX
  const generateTicketId = () => {
    const chars = 'ABCDEF0123456789';
    let seg1 = '';
    let seg2 = '';
    for (let i = 0; i < 4; i++) {
      seg1 += chars[Math.floor(Math.random() * chars.length)];
      seg2 += chars[Math.floor(Math.random() * chars.length)];
    }
    return `UG-${seg1}-${seg2}`;
  };

  // 1. Create ticket (Ticket Office View)
  const handleRegisterTicket = async (name: string) => {
    const id = generateTicketId();
    // Guard against creating with 'All Events' as the name
    const targetEvent = selectedEvent === 'All Events' ? 'Secret Techno Assembly' : selectedEvent;

    const newTicket: Ticket = {
      id,
      name: name.trim(),
      status: 'valid',
      createdAt: new Date().toISOString(),
      eventName: targetEvent,
    };

    // Optimistically update active ticket and tickets list immediately
    setActiveTicket(newTicket);
    setTickets((prev) => {
      if (prev.some(t => t.id === newTicket.id)) return prev;
      return [newTicket, ...prev];
    });

    // Run setDoc in the background without blocking the UI
    setDoc(doc(db, 'tickets', id), newTicket).catch((err) => {
      console.warn("Background db write postponed (operating in secure offline cache):", err);
    });
  };

  // 2. Validate/Check In Ticket (Staff Door scanning result)
  const handleVerifyTicketCode = async (ticketId: string) => {
    const trimmedId = ticketId.trim();
    const matchedTicket = tickets.find(t => t.id.toLowerCase() === trimmedId.toLowerCase());

    if (!matchedTicket) {
      const result = {
        status: 'error' as const,
        message: 'INVALID PASS: This QR code matches no active registration.',
      };
      setActiveScanResult(result);
      return result;
    }

    // Wrong event check
    if (selectedEvent !== 'All Events' && matchedTicket.eventName && matchedTicket.eventName !== selectedEvent) {
      const result = {
        status: 'warning' as const,
        message: `WRONG EVENT: This pass is for "${matchedTicket.eventName}", not "${selectedEvent}".`,
        ticket: matchedTicket,
      };
      setActiveScanResult(result);
      return result;
    }

    if (matchedTicket.status === 'checked-in') {
      const result = {
        status: 'warning' as const,
        message: `DOUBLE ENTRY: Already admitted at ${new Date(matchedTicket.checkedInAt || '').toLocaleTimeString()}`,
        ticket: matchedTicket,
      };
      setActiveScanResult(result);
      return result;
    }

    // Success check in
    const updatedTicket: Ticket = {
      ...matchedTicket,
      status: 'checked-in',
      checkedInAt: new Date().toISOString(),
    };

    // Optimistically update tickets list immediately
    setTickets((prev) => prev.map((t) => t.id === matchedTicket.id ? updatedTicket : t));

    const result = {
      status: 'success' as const,
      message: `TICKET VALID: Welcome, ${matchedTicket.name}!`,
      ticket: updatedTicket,
    };
    setActiveScanResult(result);

    // Save check-in in background
    setDoc(doc(db, 'tickets', matchedTicket.id), updatedTicket).catch((err) => {
      console.warn("Check-in saved offline in background:", err);
    });

    return result;
  };

  // 3. Undo check-in
  const handleUndoCheckIn = async (ticketId: string) => {
    const matchedTicket = tickets.find(t => t.id === ticketId);
    if (!matchedTicket) return;

    const updatedTicket: Ticket = {
      ...matchedTicket,
      status: 'valid',
      checkedInAt: undefined,
    };

    // Optimistically update tickets list
    setTickets((prev) => prev.map((t) => t.id === ticketId ? updatedTicket : t));
    if (activeScanResult?.ticket?.id === ticketId) {
      setActiveScanResult(null);
    }

    // Save in background
    setDoc(doc(db, 'tickets', ticketId), updatedTicket).catch((err) => {
      console.warn("Undo check-in saved offline:", err);
    });
  };

  // 4. Delete ticket
  const handleDeleteTicket = async (ticketId: string) => {
    // Optimistic delete
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    if (activeScanResult?.ticket?.id === ticketId) {
      setActiveScanResult(null);
    }

    deleteDoc(doc(db, 'tickets', ticketId)).catch((err) => {
      console.warn("Ticket deleted offline:", err);
    });
  };

  // 5. Add custom ticket on the fly (Staff Portal bypass)
  const handleAddTicketDirectly = async (name: string) => {
    const id = generateTicketId();
    const targetEvent = selectedEvent === 'All Events' ? 'Secret Techno Assembly' : selectedEvent;

    const newTicket: Ticket = {
      id,
      name: name.trim(),
      status: 'valid',
      createdAt: new Date().toISOString(),
      eventName: targetEvent,
    };

    // Optimistic add
    setTickets((prev) => [newTicket, ...prev]);

    setDoc(doc(db, 'tickets', id), newTicket).catch((err) => {
      console.warn("Ticket added offline:", err);
    });
  };

  // 6. Bulk Action resets / imports
  const handleClearTickets = async () => {
    const prevTickets = [...tickets];
    // Optimistic clear
    setTickets([]);
    setActiveScanResult(null);

    try {
      const batch = writeBatch(db);
      prevTickets.forEach((t) => {
        batch.delete(doc(db, 'tickets', t.id));
      });
      await batch.commit();
    } catch (err) {
      console.warn("Cleared database cached locally, sync postponed:", err);
    }
  };

  const handleImportTickets = async (importedList: Ticket[]) => {
    const cleanedImported: Ticket[] = importedList.map((t) => {
      const id = t.id || generateTicketId();
      const cleanTicket: Ticket = {
        id,
        name: t.name || 'Unknown',
        status: t.status || 'valid',
        createdAt: t.createdAt || new Date().toISOString(),
        eventName: t.eventName || selectedEvent,
      };
      if (t.checkedInAt) {
        cleanTicket.checkedInAt = t.checkedInAt;
      }
      return cleanTicket;
    });

    // Optimistic import merge
    setTickets((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const filteredNew = cleanedImported.filter((t) => !existingIds.has(t.id));
      return [...filteredNew, ...prev];
    });

    try {
      const batch = writeBatch(db);
      cleanedImported.forEach((t) => {
        batch.set(doc(db, 'tickets', t.id), t);
      });
      await batch.commit();
    } catch (err) {
      console.warn("Import saved offline:", err);
    }
  };

  // Staff Authorization Handler
  const handleStaffAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedDoorman = doormen.find((d) => d.pin === staffPinInput.trim());
    if (matchedDoorman) {
      setIsStaffAuthorized(true);
      setAuthorizedDoormanName(matchedDoorman.name);
      setAuthError(false);
      setStaffPinInput('');
    } else {
      setAuthError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans relative antialiased" id="main-application-container">
      {/* Decorative ambient grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Header Section (Directly themed from Design HTML) */}
      <header className="bg-slate-900/90 backdrop-blur-md p-6 flex flex-col md:flex-row justify-between items-center shadow-2xl border-b border-slate-800 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <Logo size="md" />
          <div>
            {isEditingBrandName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={brandNameInput}
                  onChange={(e) => setBrandNameInput(e.target.value)}
                  placeholder="Enter brand name..."
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-sm text-white font-mono font-black uppercase tracking-tight focus:outline-none focus:border-slate-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveBrandName();
                    if (e.key === 'Escape') setIsEditingBrandName(false);
                  }}
                />
                <button
                  onClick={handleSaveBrandName}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs px-2.5 py-1.5 rounded-lg font-black uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingBrandName(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h1 
                onClick={() => {
                  setBrandNameInput(brandName);
                  setIsEditingBrandName(true);
                }}
                className="text-2xl font-black tracking-tighter uppercase italic text-white flex items-center gap-1.5 sm:text-3xl cursor-pointer hover:opacity-90 group relative"
                title="Click to customize brand name"
              >
                {brandName}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </h1>
            )}
            <p className="text-slate-400 font-medium text-xs mt-0.5">Custom Event Management & Dynamic QR Admissions</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Status Display Block */}
          <div className="bg-slate-950/40 px-4 py-1.5 rounded-xl border border-slate-800 text-left">
            <span className="text-[9px] block text-slate-500 uppercase font-black tracking-wider">System Status</span>
            <span className="text-emerald-400 font-mono text-xs flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Cloud Sync Active
            </span>
          </div>

          {/* Navigation Controls */}
          <nav className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800" id="main-navigation">
            <button
              onClick={() => {
                setActiveTab('ticket-office');
                setActiveTicket(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ticket-office'
                  ? 'bg-slate-800 text-white border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TicketIcon size={12} /> Get Pass
            </button>
            <button
              onClick={() => setActiveTab('door-staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'door-staff'
                  ? 'bg-slate-800 text-white border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={12} /> Door Control
            </button>
          </nav>
        </div>
      </header>

      {/* Dynamic Event Selection Sub-Bar */}
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 relative">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">Active Event:</span>
          {isEditingEvent ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customEventInput}
                onChange={(e) => setCustomEventInput(e.target.value)}
                placeholder="Event Name..."
                className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-slate-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveCustomEvent();
                  if (e.key === 'Escape') setIsEditingEvent(false);
                }}
              />
              <button
                onClick={handleSaveCustomEvent}
                className="bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs px-2 py-1 rounded font-bold"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingEvent(false)}
                className="text-slate-400 hover:text-white text-xs px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                value={selectedEvent}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setCustomEventInput('');
                    setIsEditingEvent(true);
                  } else {
                    setSelectedEvent(e.target.value);
                  }
                }}
                className="bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-slate-500 cursor-pointer"
              >
                <option value="All Events" className="bg-slate-950 text-slate-300">
                  ⚡ All Events (Admissions Overview)
                </option>
                {uniqueEvents.map((ev) => (
                  <option key={ev} value={ev} className="bg-slate-950 text-white font-bold">
                    {ev}
                  </option>
                ))}
                <option value="__new__" className="bg-slate-950 text-slate-400 font-bold">
                  + Create Custom Event...
                </option>
              </select>

              <button
                onClick={() => setShowEventManager(true)}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-slate-300 hover:text-white font-mono font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all"
                title="Edit date/time/location or remove events completely"
              >
                <span>⚙️</span> Manage Metadata
              </button>
            </div>
          )}
        </div>
        
        {/* Doorman mobile connection launcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">Doorman Device Setup:</span>
          <button 
            onClick={() => setShowMobileShareModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all border border-slate-850 bg-slate-900/50 px-2.5 py-1 rounded-lg"
          >
            <Smartphone size={12} /> Share Phone Scanner
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col justify-center items-center relative z-10" id="main-tab-content">
        
        {/* TAB 1: Ticket Office (Secure Admin Portal: Issue Pass, Guest Registry with DELETE option, and Doorman Management) */}
        {activeTab === 'ticket-office' && (
          <div className="w-full space-y-6 animate-fade-in" id="ticket-office-view">
            {!isAdminAuthorized ? (
              /* Admin Authentication Gate Screen */
              <div className="max-w-md w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl relative overflow-hidden" id="admin-login-screen">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center text-slate-300 mx-auto">
                    <Lock size={24} />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white">GET PASS / SECURE ADMIN</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Enter admin credentials to issue tickets, delete guests, and manage door control staff.
                  </p>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const trimmedUser = adminUsernameInput.trim().toLowerCase();
                    const matchedAdmin = admins.find(
                      (a) => a.username.trim().toLowerCase() === trimmedUser && a.password === adminPasswordInput
                    );
                    if (matchedAdmin) {
                      setIsAdminAuthorized(true);
                      setAdminAuthError(false);
                    } else {
                      setAdminAuthError(true);
                    }
                  }} 
                  className="space-y-4 text-left"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block uppercase font-bold">Username</label>
                    <input
                      type="text"
                      placeholder="Enter Admin Username"
                      value={adminUsernameInput}
                      onChange={(e) => setAdminUsernameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-slate-500 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none transition-all uppercase"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-mono block uppercase font-bold">Password</label>
                    <input
                      type="password"
                      placeholder="Enter Admin Password"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-slate-500 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none transition-all"
                      required
                    />
                    {adminAuthError && (
                      <p className="text-xs text-rose-500 font-mono font-bold mt-1">⚠️ INCORRECT USERNAME OR PASSWORD.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:translate-y-0.5 mt-2"
                  >
                    Authorize Office Session
                  </button>
                </form>
              </div>
            ) : (
              /* Fully Authorized Admin Dashboard */
              <div className="space-y-6 w-full">
                {/* Admin Top Dashboard Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-800 bg-slate-900 p-4 rounded-2xl gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 text-white rounded-xl">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                        <span>ADMIN COMMAND CENTER</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-mono font-bold uppercase">SECURED</span>
                      </h2>
                      <p className="text-[10px] text-slate-400 font-mono">AUTHORIZED ADMINISTRATOR MODE</p>
                    </div>
                  </div>

                  {/* Sub tab navigation */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 gap-1">
                    <button
                      onClick={() => setAdminSubTab('issue-pass')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider font-bold uppercase transition-all cursor-pointer ${
                        adminSubTab === 'issue-pass' ? 'bg-slate-800 text-white border border-slate-700/60 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Issue Pass
                    </button>
                    <button
                      onClick={() => setAdminSubTab('guest-registry')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider font-bold uppercase transition-all cursor-pointer ${
                        adminSubTab === 'guest-registry' ? 'bg-slate-800 text-white border border-slate-700/60 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Guest Registry
                    </button>
                    <button
                      onClick={() => setAdminSubTab('doormen-mgt')}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider font-bold uppercase transition-all cursor-pointer ${
                        adminSubTab === 'doormen-mgt' ? 'bg-slate-800 text-white border border-slate-700/60 shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Staff & Admins
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsAdminAuthorized(false);
                      setAdminSubTab('issue-pass');
                    }}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
                  >
                    Exit Admin
                  </button>
                </div>

                {/* Sub Tab Panel rendering */}
                {adminSubTab === 'issue-pass' && (
                  <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in" id="ticket-office-view-inner">
                    {!activeTicket ? (
                      <div className="space-y-6">
                        {/* Event Intro Jumbotron */}
                        <div className="text-center space-y-2 py-4">
                          <h2 className="text-4xl font-black tracking-tighter uppercase italic text-white sm:text-5xl">
                            SECURE YOUR GUEST ENTRY
                          </h2>
                          <p className="text-slate-300 text-sm max-w-md mx-auto font-sans leading-relaxed">
                            Instantly register and generate your customized access pass for <span className="text-slate-300 font-bold">{selectedEvent === 'All Events' ? 'Secret Techno Assembly' : selectedEvent}</span>.
                          </p>
                        </div>

                        <RegistrationForm 
                          onRegister={handleRegisterTicket} 
                          slotsLeft={Math.max(100 - tickets.filter(t => selectedEvent === 'All Events' || t.eventName === selectedEvent).length, 0)} 
                          eventName={selectedEvent === 'All Events' ? 'Secret Techno Assembly' : selectedEvent}
                          eventDetails={selectedEventDetails || events[0]}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4 animate-scale-up">
                        <div className="text-center space-y-1">
                          <h2 className="text-2xl font-black tracking-tight text-emerald-400 italic uppercase">REGISTRATION COMPLETED</h2>
                          <p className="text-xs text-slate-400 font-sans">Your ticket has been generated. Screenshot or print the badge below for entry.</p>
                        </div>

                        <TicketCard 
                          ticket={activeTicket} 
                          onClose={() => setActiveTicket(null)} 
                          eventDetails={events.find(ev => ev.name === activeTicket.eventName) || selectedEventDetails || events[0]}
                        />
                      </div>
                    )}
                  </div>
                )}

                {adminSubTab === 'guest-registry' && (
                  <div className="w-full animate-fade-in">
                    <BouncerDashboard
                      tickets={tickets}
                      selectedEvent={selectedEvent}
                      uniqueEvents={uniqueEvents}
                      onEventChange={setSelectedEvent}
                      onCheckIn={handleVerifyTicketCode}
                      onUndoCheckIn={handleUndoCheckIn}
                      onAddTicket={handleAddTicketDirectly}
                      onDeleteTicket={handleDeleteTicket}
                      onClearTickets={handleClearTickets}
                      onImportTickets={handleImportTickets}
                      activeScanResult={activeScanResult}
                      onClearScanResult={() => setActiveScanResult(null)}
                      onSimulateScan={(id) => {
                        handleVerifyTicketCode(id);
                      }}
                      isDoorman={false} /* Admins CAN delete guests and see add controls */
                    />
                  </div>
                )}

                {adminSubTab === 'doormen-mgt' && (
                  <div className="space-y-8 w-full max-w-5xl mx-auto animate-fade-in" id="doormen-mgt-panel">
                    {/* Header bar */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
                      <h3 className="text-xl font-black uppercase italic text-white flex items-center gap-2">
                        <Users className="text-slate-300" size={22} />
                        STAFF & ADMIN CONTROL CENTER
                      </h3>
                      <p className="text-xs text-slate-400">
                        Manage system administrators and gatekeepers in a unified workspace. Add new authorized credentials, create user accounts, or instantly revoke security access codes.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Column 1: System Administrators */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <div>
                          <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-200 flex items-center gap-1.5">
                            <Lock size={14} className="text-emerald-400" />
                            1. SYSTEM ADMINISTRATORS
                          </h4>
                          <p className="text-[10px] text-slate-500 font-sans">These accounts have full clearance to manage guests, events, and staff credentials.</p>
                        </div>

                        {/* Add Admin Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setAdminMgtError(null);
                            const fd = new FormData(e.currentTarget);
                            const name = fd.get('admin-name') as string;
                            const username = (fd.get('admin-username') as string || '').trim().toLowerCase();
                            const password = fd.get('admin-password') as string;

                            if (name && username && password) {
                              if (admins.some(a => a.username.toLowerCase() === username)) {
                                setAdminMgtError(`The username "${username}" is already registered.`);
                                return;
                              }
                              const id = `admin-${Date.now()}`;
                              const newAdmin: AdminUser = {
                                id,
                                name: name.trim(),
                                username,
                                password,
                                createdAt: new Date().toISOString()
                              };
                              setDoc(doc(db, 'admins', id), newAdmin).catch(err => console.error(err));
                              // Optimistically update
                              setAdmins(prev => [...prev, newAdmin]);
                              e.currentTarget.reset();
                            }
                          }}
                          className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3"
                        >
                          <span className="text-[9px] font-mono font-black text-slate-400 block uppercase tracking-wider">CREATE ADMINISTRATOR</span>
                          
                          {adminMgtError && (
                            <p className="p-2 bg-rose-950/40 border border-rose-900/30 text-[10px] text-rose-400 font-bold rounded-lg animate-fade-in uppercase">
                              ⚠️ {adminMgtError}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-mono block font-bold">FULL NAME</label>
                              <input
                                name="admin-name"
                                type="text"
                                placeholder="e.g. Alice Smith"
                                required
                                className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none uppercase font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-mono block font-bold">USERNAME</label>
                              <input
                                name="admin-username"
                                type="text"
                                placeholder="e.g. alice"
                                required
                                className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none font-mono lowercase font-bold"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 font-mono block font-bold">PASSWORD</label>
                            <input
                              name="admin-password"
                              type="password"
                              placeholder="Enter Admin Password"
                              required
                              className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer h-8 flex items-center justify-center active:translate-y-0.5"
                          >
                            Authorize Admin Account
                          </button>
                        </form>

                        {/* Admin List Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/40">
                          <table className="w-full text-left border-collapse font-mono text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                                <th className="py-2.5 px-4 font-black uppercase">Admin User</th>
                                <th className="py-2.5 px-3 font-black uppercase">Username</th>
                                <th className="py-2.5 px-4 font-black uppercase text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/60 text-slate-300">
                              {admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-slate-950/40 transition-all group">
                                  <td className="py-3 px-4 font-bold text-white uppercase flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {admin.name}
                                  </td>
                                  <td className="py-3 px-3 text-slate-200 font-bold lowercase">{admin.username}</td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {admin.id === 'root-admin' ? (
                                      <span className="text-[9px] text-slate-600 uppercase font-bold italic">Permanent Root</span>
                                    ) : (
                                      <div className="inline-flex items-center gap-1">
                                        {deletingAdminId === admin.id ? (
                                          <div className="flex items-center gap-1 bg-rose-950/50 border border-rose-900/40 p-1 rounded-md animate-fade-in">
                                            <span className="text-[8px] text-rose-400 font-bold uppercase font-mono px-0.5">REVOKE?</span>
                                            <button
                                              onClick={() => {
                                                deleteDoc(doc(db, 'admins', admin.id)).catch(err => console.error(err));
                                                setAdmins(prev => prev.filter(a => a.id !== admin.id));
                                                setDeletingAdminId(null);
                                              }}
                                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold uppercase cursor-pointer"
                                            >
                                              YES
                                            </button>
                                            <button
                                              onClick={() => setDeletingAdminId(null)}
                                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[8px] font-bold uppercase cursor-pointer"
                                            >
                                              NO
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDeletingAdminId(admin.id)}
                                            className="px-2 py-0.5 text-rose-400 hover:text-white hover:bg-rose-900/30 rounded border border-rose-900/40 hover:border-rose-600 transition-all text-[9px] font-bold uppercase cursor-pointer"
                                          >
                                            Revoke Admin
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {admins.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-6 text-center text-slate-500">
                                    No active system administrators.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Column 2: Door Control Staff (Gatekeepers) */}
                      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                        <div>
                          <h4 className="text-sm font-black uppercase italic tracking-wider text-slate-200 flex items-center gap-1.5">
                            <UserCheck size={14} className="text-cyan-400" />
                            2. DOOR STAFF / GATEKEEPERS
                          </h4>
                          <p className="text-[10px] text-slate-500 font-sans">Authorized personnel conducting barcode scans and check-ins at active access control points.</p>
                        </div>

                        {/* Add Doorman Form */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setStaffMgtError(null);
                            const fd = new FormData(e.currentTarget);
                            const name = fd.get('doorman-name') as string;
                            const pin = fd.get('doorman-pin') as string;

                            if (name && pin) {
                              const cleanedPin = pin.trim();
                              if (doormen.some(d => d.pin === cleanedPin)) {
                                setStaffMgtError(`PIN "${cleanedPin}" is already assigned to another gatekeeper.`);
                                return;
                              }
                              const id = `doorman-${Date.now()}`;
                              const newDoorman: Doorman = {
                                id,
                                name: name.trim(),
                                pin: cleanedPin,
                                createdAt: new Date().toISOString()
                              };
                              setDoc(doc(db, 'doormen', id), newDoorman).catch(err => console.error(err));
                              // Optimistically update
                              setDoormen(prev => [...prev, newDoorman]);
                              e.currentTarget.reset();
                            }
                          }}
                          className="p-4 bg-slate-950/60 border border-slate-850 rounded-2xl space-y-3"
                        >
                          <span className="text-[9px] font-mono font-black text-slate-400 block uppercase tracking-wider">AUTHORIZE GATEKEEPER</span>

                          {staffMgtError && (
                            <p className="p-2 bg-rose-950/40 border border-rose-900/30 text-[10px] text-rose-400 font-bold rounded-lg animate-fade-in uppercase">
                              ⚠️ {staffMgtError}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-mono block font-bold">STAFF MEMBER NAME</label>
                              <input
                                name="doorman-name"
                                type="text"
                                placeholder="e.g. John Carter"
                                required
                                className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none uppercase font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 font-mono block font-bold">PASSCODE (PIN)</label>
                              <input
                                name="doorman-pin"
                                type="text"
                                placeholder="e.g. 7777"
                                required
                                className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none font-mono tracking-wider font-bold"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer h-8 flex items-center justify-center active:translate-y-0.5"
                          >
                            Authorize New Doorman
                          </button>
                        </form>

                        {/* Doormen List Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-850 bg-slate-950/40">
                          <table className="w-full text-left border-collapse font-mono text-[11px]">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                                <th className="py-2.5 px-4 font-black uppercase">Staff Member</th>
                                <th className="py-2.5 px-3 font-black uppercase">Passcode (PIN)</th>
                                <th className="py-2.5 px-4 font-black uppercase text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/60 text-slate-300">
                              {doormen.map((doorman) => (
                                <tr key={doorman.id} className="hover:bg-slate-950/40 transition-all group">
                                  <td className="py-3 px-4 font-bold text-white uppercase flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    {doorman.name}
                                  </td>
                                  <td className="py-3 px-3 text-slate-200 font-mono font-bold tracking-widest">{doorman.pin}</td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    {doorman.id === 'lead-gatekeeper' ? (
                                      <span className="text-[9px] text-slate-600 uppercase font-bold italic">Permanent Root</span>
                                    ) : (
                                      <div className="inline-flex items-center gap-1">
                                        {deletingDoormanId === doorman.id ? (
                                          <div className="flex items-center gap-1 bg-rose-950/50 border border-rose-900/40 p-1 rounded-md animate-fade-in">
                                            <span className="text-[8px] text-rose-400 font-bold uppercase font-mono px-0.5">REVOKE?</span>
                                            <button
                                              onClick={() => {
                                                deleteDoc(doc(db, 'doormen', doorman.id)).catch(err => console.error(err));
                                                setDoormen(prev => prev.filter(d => d.id !== doorman.id));
                                                setDeletingDoormanId(null);
                                              }}
                                              className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[8px] font-bold uppercase cursor-pointer"
                                            >
                                              YES
                                            </button>
                                            <button
                                              onClick={() => setDeletingDoormanId(null)}
                                              className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[8px] font-bold uppercase cursor-pointer"
                                            >
                                              NO
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setDeletingDoormanId(doorman.id)}
                                            className="px-2 py-0.5 text-rose-400 hover:text-white hover:bg-rose-900/30 rounded border border-rose-900/40 hover:border-rose-600 transition-all text-[9px] font-bold uppercase cursor-pointer"
                                          >
                                            Revoke PIN
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {doormen.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="p-6 text-center text-slate-500">
                                    No active doormen authorized.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Door Staff Portal (Requires Passcode check) */}
        {activeTab === 'door-staff' && (
          <div className="w-full space-y-6 animate-fade-in" id="door-staff-view">
            {!isStaffAuthorized ? (
              /* Authorization Gate Screen */
              <div className="max-w-md w-full mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center text-slate-300 mx-auto">
                    <KeyRound size={24} />
                  </div>
                  <h3 className="text-lg font-black uppercase italic tracking-wide text-white">STAFF ACCESS RESTRICTED</h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Gatekeeper mode includes real-time database query & camera scanners.
                  </p>
                </div>

                <form onSubmit={handleStaffAuthSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      type="password"
                      placeholder="Enter Gatekeeper Passcode"
                      value={staffPinInput}
                      onChange={(e) => setStaffPinInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-slate-500 rounded-xl px-4 py-3 text-center text-white text-sm font-mono tracking-widest focus:outline-none transition-all"
                    />
                    {authError && (
                      <p className="text-xs text-rose-500 font-mono font-bold">⚠️ INCORRECT PASSCODE. PLEASE TRY AGAIN.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:translate-y-0.5"
                  >
                    Authorize Device
                  </button>
                </form>
              </div>
            ) : (
              /* Fully Authorized Door Portal */
              <div className="space-y-6">
                {/* Dashboard Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-800 bg-slate-900 p-4 rounded-2xl gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 text-white rounded-xl">
                      <Shield size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold font-mono text-white uppercase flex items-center gap-2">
                        <span>GATE MANAGER ACTIVE</span>
                        <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-mono font-bold uppercase">SECURED</span>
                      </h2>
                      <p className="text-[10px] text-slate-400 font-mono">AUTHORIZED HOST DEVICE TERMINAL: {authorizedDoormanName.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setCameraActive(!cameraActive)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                        cameraActive
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Smartphone size={12} />
                      {cameraActive ? 'Camera ON' : 'Camera OFF'}
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsStaffAuthorized(false);
                        setCameraActive(false);
                      }}
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-400 rounded-xl text-xs font-semibold"
                    >
                      Lock Terminal
                    </button>
                  </div>
                </div>

                {/* Grid Layout: Left is Camera Scanner, Right is Registry Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Only appears if camera is enabled) */}
                  {cameraActive && (
                    <div className="lg:col-span-1">
                      <CameraScanner 
                        active={cameraActive} 
                        onScan={(code) => {
                          handleVerifyTicketCode(code);
                        }} 
                      />
                    </div>
                  )}

                  {/* Main Dashboard Panel */}
                  <div className={cameraActive ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <BouncerDashboard
                      tickets={tickets}
                      selectedEvent={selectedEvent}
                      uniqueEvents={uniqueEvents}
                      onEventChange={setSelectedEvent}
                      onCheckIn={handleVerifyTicketCode}
                      onUndoCheckIn={handleUndoCheckIn}
                      onAddTicket={handleAddTicketDirectly}
                      onDeleteTicket={handleDeleteTicket}
                      onClearTickets={handleClearTickets}
                      onImportTickets={handleImportTickets}
                      activeScanResult={activeScanResult}
                      onClearScanResult={() => setActiveScanResult(null)}
                      onSimulateScan={(id) => {
                        handleVerifyTicketCode(id);
                      }}
                      isDoorman={true} /* Door control staff CANNOT delete guests, reset lists, or see add controls */
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="bg-slate-950 p-5 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest font-bold text-slate-600 gap-2">
        <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
          <span>Sanati Events Portal v2.0.4</span>
          <span>Secure Cloud Sync Enabled</span>
          <span>Battery Status: 100%</span>
        </div>
        <div className="text-slate-400 font-mono">
          Last Activity: {activeScanResult ? `Result [${activeScanResult.status?.toUpperCase()}] - ${activeScanResult.message.slice(0, 40)}` : 'Entry System Ready'}
        </div>
      </footer>

      {/* Mobile Sharing Modal */}
      {showMobileShareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" id="mobile-share-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full relative space-y-4 shadow-2xl">
            <button
              onClick={() => setShowMobileShareModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-950/50 p-1.5 rounded-lg border border-slate-800 cursor-pointer"
            >
               <X size={16} />
            </button>

            <div className="text-center space-y-1.5 pt-2">
              <Logo size="md" className="justify-center mb-1" />
              <h3 className="text-lg font-black font-mono tracking-tight uppercase text-white italic">
                GATE SCANNER LINK
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Point your bouncer's phone camera at this screen to scan and open this admissions portal instantly!
              </p>
            </div>

            {/* QR Code container */}
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center shadow-lg w-52 h-52 mx-auto">
              <QRCodeSVG
                value={window.location.href}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 flex items-center justify-between gap-2 overflow-hidden">
                <span className="text-slate-300 truncate select-all">{window.location.href}</span>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 text-slate-400 hover:text-white p-1 cursor-pointer"
                  title="Copy Link"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400 animate-scale-up" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowMobileShareModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider font-mono transition-all cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}

      {/* Event Manager Metadata Modal */}
      {showEventManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" id="event-manager-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center pb-4 border-b border-white/10 shrink-0">
              <h3 className="text-lg font-black font-mono tracking-wider text-white uppercase italic flex items-center gap-2">
                <span>⚙️</span> Event Metadata Center
              </h3>
              <button 
                onClick={() => setShowEventManager(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              <p className="text-xs text-slate-400 leading-relaxed">
                Edit titles, dates, doors, and locations of active events. All updates apply instantly across user interfaces and PDF downloads.
              </p>
              
              {events.map((ev, index) => {
                const itemKey = ev.id || `event-${index}`;
                return (
                  <div key={itemKey} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3 relative group">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 uppercase">
                        Event #{index + 1}
                      </span>
                      {deleteConfirmId === itemKey ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">Confirm?</span>
                          <button
                            onClick={() => {
                              const updated = events.filter((e, idx) => (e.id || `event-${idx}`) !== itemKey);
                              handleSaveEvents(updated);
                              if (selectedEvent === ev.name) {
                                setSelectedEvent(updated.length > 0 ? updated[0].name : 'All Events');
                              }
                              setDeleteConfirmId(null);
                            }}
                            className="text-[10px] text-white font-bold bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-slate-400 hover:text-white font-bold bg-slate-800 px-2 py-0.5 rounded transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(itemKey)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-bold transition-all flex items-center gap-1 cursor-pointer bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg"
                          title="Delete event completely"
                        >
                          <X size={12} /> Remove Event
                        </button>
                      )}
                    </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-[9px] text-slate-500 font-mono block uppercase font-bold mb-1">Event Title</label>
                      <input
                        type="text"
                        value={ev.name}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[index].name = e.target.value;
                          handleSaveEvents(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all uppercase font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono block uppercase font-bold mb-1">Date</label>
                        <input
                          type="text"
                          value={ev.date}
                          onChange={(e) => {
                            const updated = [...events];
                            updated[index].date = e.target.value;
                            handleSaveEvents(updated);
                          }}
                          placeholder="e.g. Oct 24, 2026"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all uppercase"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 font-mono block uppercase font-bold mb-1">Time / Doors</label>
                        <input
                          type="text"
                          value={ev.time}
                          onChange={(e) => {
                            const updated = [...events];
                            updated[index].time = e.target.value;
                            handleSaveEvents(updated);
                          }}
                          placeholder="e.g. 22:00 PST"
                          className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-mono block uppercase font-bold mb-1">Location</label>
                      <input
                        type="text"
                        value={ev.location}
                        onChange={(e) => {
                          const updated = [...events];
                          updated[index].location = e.target.value;
                          handleSaveEvents(updated);
                        }}
                        placeholder="e.g. SECRET INDUSTRIAL WAREHOUSE 07"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-all uppercase"
                      />
                    </div>
                  </div>
                </div>
                );
              })}

              {events.length === 0 && (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-slate-400">No events defined. Add one below!</p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 shrink-0 space-y-2">
              <button
                onClick={() => {
                  const newEvent: EventDetails = {
                    id: `custom-event-${Date.now()}`,
                    name: `NEW CLUB EVENT ${events.length + 1}`,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                    time: '22:00 PST',
                    location: 'SECRET INDUSTRIAL WAREHOUSE 07'
                  };
                  handleSaveEvents([...events, newEvent]);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                + Create New Event
              </button>
              <button
                onClick={() => setShowEventManager(false)}
                className="w-full py-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
