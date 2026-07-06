import React, { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  allowUpload?: boolean;
}

export default function Logo({ className = '', size = 'md', allowUpload = true }: LogoProps) {
  const [customLogo, setCustomLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sanati_custom_logo');
    } catch {
      return null;
    }
  });

  const [isHovered, setIsHovered] = useState(false);
  const [brandName, setBrandName] = useState(() => {
    try {
      return localStorage.getItem('sanati_brand_name') || 'Sanati Events';
    } catch {
      return 'Sanati Events';
    }
  });

  useEffect(() => {
    const handleLogoUpdate = () => {
      try {
        setCustomLogo(localStorage.getItem('sanati_custom_logo'));
      } catch (e) {
        console.error('Error reading custom logo:', e);
      }
    };

    const handleBrandUpdate = () => {
      try {
        setBrandName(localStorage.getItem('sanati_brand_name') || 'Sanati Events');
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener('sanati-logo-updated', handleLogoUpdate);
    window.addEventListener('sanati-brand-name-updated', handleBrandUpdate);
    return () => {
      window.removeEventListener('sanati-logo-updated', handleLogoUpdate);
      window.removeEventListener('sanati-brand-name-updated', handleBrandUpdate);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (limit to 1MB to prevent localstorage quota errors)
    if (file.size > 1.5 * 1024 * 1024) {
      alert('The logo file is too large! Please upload an image smaller than 1.5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      try {
        localStorage.setItem('sanati_custom_logo', base64);
        window.dispatchEvent(new Event('sanati-logo-updated'));
      } catch (err) {
        alert('Could not save logo to local storage. Please try a smaller, highly compressed image.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      localStorage.removeItem('sanati_custom_logo');
      window.dispatchEvent(new Event('sanati-logo-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-auto max-w-[120px]',
    md: 'h-12 w-auto max-w-[180px]',
    lg: 'h-18 w-auto max-w-[240px]',
  };

  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-11 h-11' : 'w-16 h-16';
  const fontSize = size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl';

  return (
    <div 
      className={`flex items-center gap-2 relative group ${className}`} 
      id={`logo-wrapper-${size}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {customLogo ? (
        <div className="relative flex items-center justify-center">
          <img
            src={customLogo}
            alt="Sanati Events Custom Logo"
            className={`${sizeClasses[size]} object-contain rounded-lg border border-white/10 shadow-lg`}
            referrerPolicy="no-referrer"
          />
          {allowUpload && isHovered && (
            <button
              onClick={handleResetLogo}
              className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1 transition-all cursor-pointer shadow-md border border-white/20 z-25 flex items-center justify-center"
              title="Remove custom logo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        /* Graceful fallback to custom-crafted SVG badge + glowing title */
        <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-white/20 overflow-hidden cursor-pointer ${iconSize}`}>
          {/* Futuristic Grid / Inner Shine */}
          <div className="absolute inset-0.5 rounded-lg bg-slate-950 flex items-center justify-center font-mono">
            <span className={`font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-indigo-400 italic ${fontSize}`}>
              {brandName.charAt(0).toUpperCase() || 'S'}
            </span>
          </div>
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-fuchsia-500 rounded-full animate-pulse" />
        </div>
      )}

      {/* Upload hover overlay/action triggers */}
      {allowUpload && (
        <label className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-200 border-2 border-indigo-500 border-dashed z-20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-indigo-400 animate-bounce">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-[8px] font-mono font-bold text-indigo-300 uppercase tracking-widest mt-1">Upload Logo</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
