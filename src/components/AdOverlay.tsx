import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

type Ad = {
  id: number;
  title: string;
  content: string;
  buttonText: string;
  top: number;
  left: number;
};

const AD_TEMPLATES = [
  { title: "⚠️ SYSTEM CRITICAL", content: "Your drivers are outdated. CLICK HERE to optimize now!", buttonText: "OPTIMIZE" },
  { title: "WINNER!!", content: "You are the 1,000,000th visitor! Claim your iPhone 16 Pro.", buttonText: "CLAIM" },
  { title: "RE: INVOICE #9921", content: "Payment overdue. Open attachment to avoid legal action.", buttonText: "OPEN" },
  { title: "SECURITY ALERT", content: "Bank of England account compromised. Verify credentials.", buttonText: "VERIFY" },
  { title: "FREEE BITCOIN", content: "Start mining from your browser with one click!", buttonText: "START" },
  { title: "RAM_LOW_99%", content: "System performance is degraded. Clear cache now.", buttonText: "PURGE" },
  { title: "URGENT_MSG", content: "HR has sent you a secure document. Open to sign.", buttonText: "SIGN" },
  { title: "VPN_FAILURE", content: "Your IP is exposed to the public web. Reconnect safely.", buttonText: "RECONNECT" },
  { title: "AMAZON_GIFT", content: "A £500 voucher has been added to your account. Claim.", buttonText: "REDEEM" },
  { title: "MALWARE_FOUND", content: "3 threats detected on this workstation. Run deep scan.", buttonText: "SCAN" },
  { title: "WIFI_OPTIMIZER", content: "Signal strength is low. Boost connection now.", buttonText: "BOOST" },
  { title: "FREE_MONEY", content: "Government grant available for local residents.", buttonText: "APPLY" }
];

export default function AdOverlay() {
  const { state, penalize } = useGame();
  const [ads, setAds] = useState<Ad[]>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (state.wifiCompromised) {
      // Spawns ads every 5 to 10 seconds to increase pressure
      interval = setInterval(() => {
        const template = AD_TEMPLATES[Math.floor(Math.random() * AD_TEMPLATES.length)];
        const newAd: Ad = {
          id: Date.now(),
          ...template,
          top: Math.random() * 65 + 5,
          left: Math.random() * 65 + 5
        };
        setAds(prev => [...prev, newAd]);
      }, Math.random() * 5000 + 5000);
    } else {
      setAds([]); 
    }

    return () => clearInterval(interval);
  }, [state.wifiCompromised]);

  const closeAd = (id: number) => {
    setAds(prev => prev.filter(ad => ad.id !== id));
  };

  const handleActionClick = (id: number) => {
    // ❌ Only this button interaction increases vulnerabilities
    penalize(100); 
    closeAd(id);
  };

  if (ads.length === 0) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {ads.map(ad => (
        <div 
          key={ad.id} 
          style={{
            position: 'absolute',
            top: `${ad.top}%`,
            left: `${ad.left}%`,
            width: '280px',
            background: '#fff',
            border: '2px solid #ff3333',
            boxShadow: '8px 8px 0px #000',
            color: '#000',
            fontFamily: 'Arial, sans-serif',
            pointerEvents: 'auto',
            animation: 'popIn 0.15s ease-out'
          }}
        >
          {/* Header */}
          <div style={{ background: '#ff3333', color: '#fff', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>{ad.title}</span>
            <button 
              onClick={() => closeAd(ad.id)}
              style={{ background: '#000', color: '#fff', border: 'none', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              X
            </button>
          </div>
          
          {/* Content Body */}
          <div style={{ padding: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px 0' }}>{ad.content}</p>
            {/* The Trap Button */}
            <button 
              onClick={() => handleActionClick(ad.id)}
              style={{ 
                background: '#007bff', 
                color: '#fff', 
                border: 'none', 
                padding: '8px 15px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                width: '100%' 
              }}
            >
              {ad.buttonText}
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}