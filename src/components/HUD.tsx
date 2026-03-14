import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function HUD() {
  const { state } = useGame();
  const navigate = useNavigate();
  const location = useLocation();

  const [scoreChange, setScoreChange] = useState<{ val: string; color: string; id: number } | null>(null);
  const [pulse, setPulse] = useState(false);

  const teamName = sessionStorage.getItem("teamName") || "UNKNOWN_OPERATIVE";
  const isChallengePage = !['/', '/intro', '/console'].includes(location.pathname);

  useEffect(() => {
    // 1. Get the score we "last saw" from session storage (persists across pages)
    const lastSeenScoreRaw = sessionStorage.getItem('last_seen_vulnerabilities');
    const lastSeenScore = lastSeenScoreRaw ? parseInt(lastSeenScoreRaw) : state.vulnerabilities;

    // 2. If the current score is different from the last score we saw...
    if (state.vulnerabilities !== lastSeenScore) {
      const diff = state.vulnerabilities - lastSeenScore;
      const isIncrease = diff > 0;

      // Trigger animation
      setScoreChange({
        val: isIncrease ? `+${diff}` : `${diff}`,
        color: isIncrease ? '#ff3333' : '#00ff88',
        id: Date.now() 
      });

      setPulse(true);

      const timer = setTimeout(() => {
        setScoreChange(null);
        setPulse(false);
      }, 2000);

      // 3. Update the storage so we don't trigger it again on the next render
      sessionStorage.setItem('last_seen_vulnerabilities', state.vulnerabilities.toString());
      
      return () => clearTimeout(timer);
    } else {
      // If they are the same, just ensure storage is initialized
      sessionStorage.setItem('last_seen_vulnerabilities', state.vulnerabilities.toString());
    }
  }, [state.vulnerabilities]);

  const getVulnerabilityColor = () => {
    if (state.vulnerabilities === 0) return '#00ff88';
    if (state.vulnerabilities < 300) return '#ffff33';
    return '#ff3333';
  };

  return (
    <>
      <style>{`
        @keyframes floatUpFade {
          0% { opacity: 0; transform: translate(0, 0); }
          20% { opacity: 1; transform: translate(10px, -20px); }
          80% { opacity: 1; transform: translate(20px, -40px); }
          100% { opacity: 0; transform: translate(25px, -60px); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(1); text-shadow: none; }
          50% { transform: scale(1.4); text-shadow: 0 0 20px currentColor; }
          100% { transform: scale(1); text-shadow: none; }
        }
      `}</style>

      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '50px',
        background: 'rgba(0, 10, 0, 0.95)', borderBottom: '1px solid #00ff88',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 30px', boxSizing: 'border-box', zIndex: 99999,
        fontFamily: "'Share Tech Mono', monospace", color: '#00ff88'
      }}>
        {/* LEFT: Navigation & Sector Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {isChallengePage && (
            <button 
              onClick={() => navigate('/console')}
              style={{
                background: '#ff3333', color: '#000', border: 'none',
                padding: '4px 12px', fontSize: '0.75rem', fontWeight: 'bold',
                cursor: 'pointer', letterSpacing: '1px'
              }}
            >
              &lt; TERMINATE_SESSION
            </button>
          )}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              SECTOR: {location.pathname.toUpperCase().replace('/', '') || 'CORE_CONSOLE'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#fff', borderLeft: '1px solid #004422', paddingLeft: '15px' }}>
              OPERATIVE: <span style={{ color: '#00ff88' }}>{teamName.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {/* CENTER: System Identity */}
        <div style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: getVulnerabilityColor(), 
            boxShadow: `0 0 10px ${getVulnerabilityColor()}`,
            transition: 'background 0.5s ease'
          }} />
          MAINFRAME_INTEGRITY_MONITOR
        </div>

        {/* RIGHT: Game Stats */}
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', position: 'relative', display: 'flex', alignItems: 'center' }}>
            VULNERABILITIES: 
            <span 
              key={state.vulnerabilities}
              style={{ 
                display: 'inline-block',
                marginLeft: '10px',
                color: getVulnerabilityColor(),
                fontWeight: 'bold',
                animation: pulse ? 'pulseGlow 0.6s ease-in-out' : 'none'
              }}
            >
              {state.vulnerabilities}
            </span>

            {/* FLOATING INDICATOR */}
            {scoreChange && (
              <div 
                key={scoreChange.id}
                style={{
                  position: 'absolute',
                  right: '-20px',
                  top: '-10px',
                  color: scoreChange.color,
                  fontWeight: 'bold',
                  fontSize: '1.6rem',
                  pointerEvents: 'none',
                  animation: 'floatUpFade 1.5s forwards',
                  textShadow: '0 0 10px rgba(0,0,0,0.8)',
                  zIndex: 100000
                }}
              >
                {scoreChange.val}
              </div>
            )}
          </div>
          
          <div style={{ 
            fontSize: '0.9rem', 
            color: state.timeLeft < 60 ? '#ff3333' : '#00ff88',
            borderLeft: '1px solid #004422',
            paddingLeft: '20px'
          }}>
            TIME_REMAINING: {Math.floor(state.timeLeft / 60)}:{(state.timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </>
  );
}