import React, { useState, useEffect } from 'react';

interface LockdownProps {
  onComplete: () => void;
}

export default function LockdownAnimation({ onComplete }: LockdownProps) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("INITIALIZING_PURGE...");
  
  // random hex codes for the background "scrolling" effect
  const [hexLogs, setHexLogs] = useState<string[]>([]);

  const logs = [
    "ENFORCING_FIREWALL_BLOCKADES...",
    "FLUSHING_UNAUTHORIZED_TOKENS...",
    "ENCRYPTING_CORE_DIRECTORIES...",
    "DISCONNECTING_REMOTE_NODES...",
    "FINALIZING_SYSTEM_LOCKDOWN...",
    "PURGE_COMPLETE."
  ];

  useEffect(() => {
    // progress Bar Timer
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 1200); 
          return 100;
        }
        return prev + 1;
      });
    }, 40);

    // Status Text Rotation
    const logInterval = setInterval(() => {
      setStatusText(logs[Math.floor(Math.random() * logs.length)]);
    }, 800);

    // terminal Log Generation
    const hexInterval = setInterval(() => {
      const code = `0x${Math.random().toString(16).slice(2, 8).toUpperCase()}_NODE_PURGED`;
      setHexLogs(prev => [code, ...prev].slice(0, 12));
    }, 150);

    return () => {
      clearInterval(timer);
      clearInterval(logInterval);
      clearInterval(hexInterval);
    };
  }, []);

  return (
    <div style={overlayStyle}>
      <style>{`
        @keyframes strobe { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        @keyframes scanline { 0% { transform: translateY(-100vh); } 100% { transform: translateY(100vh); } }
        .red-glow { text-shadow: 0 0 20px #ff3333; }
      `}</style>
      
      {/* Moving Scanline */}
      <div style={scanlineStyle} />
      
      <div style={contentStyle}>
        <h1 style={alertStyle}>⚠️ CRITICAL_SYSTEM_LOCKDOWN ⚠️</h1>
        
        {/* Progress Bar */}
        <div style={progressWrapper}>
          <div style={{ ...progressInner, width: `${progress}%` }} />
        </div>
        
        <div style={statusLabel}>
          {statusText} <span style={{ float: 'right' }}>{progress}%</span>
        </div>

        {/* Scrolling Purge Logs */}
        <div style={terminalContainer}>
          {hexLogs.map((log, i) => (
            <div key={i} style={{ opacity: (12 - i) / 12, marginBottom: '4px' }}>
              {`> ${log}... [OK]`}
            </div>
          ))}
        </div>
      </div>

      {/* Decorative corners */}
      <div style={{ ...corner, top: 20, left: 20, borderTop: '4px solid #ff3333', borderLeft: '4px solid #ff3333' }} />
      <div style={{ ...corner, top: 20, right: 20, borderTop: '4px solid #ff3333', borderRight: '4px solid #ff3333' }} />
      <div style={{ ...corner, bottom: 20, left: 20, borderBottom: '4px solid #ff3333', borderLeft: '4px solid #ff3333' }} />
      <div style={{ ...corner, bottom: 20, right: 20, borderBottom: '4px solid #ff3333', borderRight: '4px solid #ff3333' }} />
    </div>
  );
}

// --- Styles ---
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: '#050000', zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center', 
  fontFamily: "'Share Tech Mono', monospace", color: '#ff3333', overflow: 'hidden'
};

const scanlineStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, 
  background: 'linear-gradient(to bottom, transparent, rgba(255,0,0,0.15), transparent)',
  height: '200px', width: '100%', animation: 'scanline 3s linear infinite', pointerEvents: 'none'
};

const contentStyle: React.CSSProperties = { textAlign: 'center', width: '700px', zIndex: 10 };

const alertStyle: React.CSSProperties = {
  fontSize: '2.8rem', letterSpacing: '2px', textShadow: '0 0 20px #ff3333', 
  animation: 'strobe 0.15s infinite', margin: 0 
};

const progressWrapper: React.CSSProperties = {
  width: '100%', height: '40px', border: '2px solid #ff3333', marginTop: '50px', 
  background: '#000', padding: '4px', boxSizing: 'border-box'
};

const progressInner: React.CSSProperties = { 
  height: '100%', background: '#ff3333', transition: 'width 0.05s linear',
  boxShadow: '0 0 15px #ff3333'
};

const statusLabel: React.CSSProperties = { 
  marginTop: '15px', fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'left' 
};

const terminalContainer: React.CSSProperties = {
  marginTop: '50px', textAlign: 'left', color: '#880000', fontSize: '0.9rem', 
  lineHeight: '1.4', borderTop: '1px solid #440000', paddingTop: '20px', height: '240px'
};

const corner: React.CSSProperties = { position: 'absolute', width: '40px', height: '40px' };