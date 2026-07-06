import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

interface CameraScannerProps {
  onScan: (scannedText: string) => void;
  active: boolean;
}

export default function CameraScanner({ onScan, active }: CameraScannerProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const [scannerReady, setScannerReady] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-camera-scanner';

  useEffect(() => {
    if (!active) {
      cleanupScanner();
      return;
    }

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      initializeScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [active]);

  const initializeScanner = async () => {
    try {
      setErrorMsg(null);
      setPermissionState('checking');

      // Create scanner instance
      const scanner = new Html5Qrcode(scannerContainerId);
      qrScannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        },
      };

      // Start camera streaming
      await scanner.start(
        { facingMode: 'environment' }, // prefer back camera
        config,
        (decodedText) => {
          onScan(decodedText);
        },
        () => {
          // Silent failure callback for each frame parse fail (Standard noise)
        }
      );

      setPermissionState('granted');
      setScannerReady(true);
    } catch (err: any) {
      console.warn('Scanner initialization error:', err);
      setScannerReady(false);
      
      const errorMessage = err?.message || '';
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
        setPermissionState('denied');
        setErrorMsg('Camera access was denied. Please allow camera permissions in your browser bar.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('Requested device not found')) {
        setPermissionState('denied');
        setErrorMsg('No camera hardware found on this device.');
      } else {
        setPermissionState('denied');
        setErrorMsg('Camera initialization failed. Note: Camera scanning might be blocked in sandboxed previews. Please use the Interactive QR Simulator below!');
      }
    }
  };

  const cleanupScanner = () => {
    if (qrScannerRef.current) {
      if (qrScannerRef.current.isScanning) {
        qrScannerRef.current
          .stop()
          .then(() => {
            qrScannerRef.current = null;
            setScannerReady(false);
          })
          .catch((err) => {
            console.error('Failed to stop camera scanner on cleanup:', err);
          });
      } else {
        qrScannerRef.current = null;
        setScannerReady(false);
      }
    }
  };

  const handleRetry = () => {
    cleanupScanner();
    setTimeout(() => {
      initializeScanner();
    }, 200);
  };

  if (!active) return null;

  return (
    <div className="flex flex-col items-center bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden" id="camera-scanner-wrapper">
      {/* Laser Scanning Animation Element */}
      {scannerReady && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-200 opacity-80 animate-bounce pointer-events-none z-10 shadow-md shadow-white/40" />
      )}

      <div className="flex items-center gap-2 mb-4">
        <Camera className="text-slate-300 animate-pulse" size={18} />
        <span className="text-xs text-slate-400 font-mono tracking-wider uppercase font-black italic">
          LIVE MOBILE SCANNER
        </span>
      </div>

      {/* Main Scanner Stage */}
      <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-850 flex flex-col items-center justify-center text-center">
        {/* html5-qrcode targets this element */}
        <div id={scannerContainerId} className="w-full h-full" />

        {/* Loading Overlay */}
        {!scannerReady && permissionState === 'checking' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4">
            <RefreshCw className="text-slate-500 animate-spin mb-3" size={32} />
            <p className="text-xs text-slate-400 font-mono">Initializing camera feed...</p>
          </div>
        )}

        {/* Error / Permission Denied Overlay */}
        {permissionState === 'denied' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="text-slate-400 mb-3" size={36} />
            <p className="text-xs font-black text-slate-200 uppercase tracking-wide font-mono">Camera Blocked</p>
            <p className="text-[11px] text-slate-400 font-sans mt-2 leading-relaxed">
              {errorMsg}
            </p>
            <button
              onClick={handleRetry}
              className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-950 rounded-lg text-[10px] font-mono tracking-wider flex items-center gap-1 cursor-pointer active:scale-95 transition-all uppercase font-bold"
            >
              <RefreshCw size={12} /> Retry Camera
            </button>
          </div>
        )}

        {/* Ambient Corner brackets inside the stage when scanning */}
        {scannerReady && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-slate-400" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-400" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-400" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-slate-400" />
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs font-sans uppercase font-bold tracking-wide">
          Point device camera at any guest ticket. System will auto-detect the pass, cross-check the database, and display check-in status.
        </p>
      </div>
    </div>
  );
}
