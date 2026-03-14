import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import HUD from '../components/HUD';
import LockdownAnimation from '../components/LockdownAnimation'; 

// graphics and icons
import wifiIcon from '../assets/wifi.svg';
import shieldIcon from '../assets/shield.svg';
import lockIcon from '../assets/lock.svg';
import firewallIcon from '../assets/brick_wall.svg';
import mfaIcon from '../assets/smartphone-call.svg';

const styles = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  @keyframes pulse-red-glow { 0% { box-shadow: 0 0 5px #ff3333; } 50% { box-shadow: 0 0 25px #ff3333; } 100% { box-shadow: 0 0 5px #ff3333; } }
  .task-pod-container:hover .outer-ring { border-color: #ffffff; opacity: 0.8; }
  .task-pod-container:hover .inner-circle { transform: scale(1.05); background: rgba(0, 40, 0, 0.8); }
  
  .command-bar {
    position: absolute;
    bottom: 0;
    width: 100%;
    height: 85px;
    background: rgba(0, 8, 0, 0.98);
    border-top: 1px solid #005522;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 40px;
    box-sizing: border-box;
    backdrop-filter: blur(15px);
    z-index: 20;
  }

  .lockdown-trigger {
    background: rgba(255, 0, 0, 0.1);
    border: 1px solid #ff3333;
    color: #ff3333;
    padding: 12px 40px;
    font-family: 'Share Tech Mono', monospace;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: pulse-red-glow 2s infinite;
    font-size: 1rem;
  }

  .lockdown-trigger:hover {
    background: #ff3333;
    color: #000;
    box-shadow: 0 0 30px #ff3333;
    transform: translateY(-2px);
  }

  .extend-btn {
    background: transparent;
    border: 1px solid #00ff88;
    color: #00ff88;
    padding: 6px 12px;
    font-family: inherit;
    cursor: pointer;
    font-size: 0.75rem;
    opacity: 0.6;
    transition: 0.3s;
    margin-left: 20px;
  }

  .extend-btn:hover {
    opacity: 1;
    background: rgba(0, 255, 136, 0.1);
  }
`;

const TaskPod = ({ to, iconSrc, title, isComplete }: { to: string; iconSrc: string; title: string; isComplete: boolean; }) => {
  const mainColor = isComplete ? '#00ff88' : '#ff3333';
  const dimColor = isComplete ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 51, 51, 0.2)';

  return (
    <Link
      to={to}
      className="task-pod-container"
      style={{
        position: 'relative', width: '180px', height: '180px', margin: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        textDecoration: 'none', cursor: 'pointer',
      }}
    >
      <div className="outer-ring" style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          borderRadius: '50%', border: `2px dashed ${mainColor}`, opacity: 0.4,
          animation: 'spin 10s linear infinite', transition: 'all 0.3s ease',
      }} />

      <div style={{
          position: 'absolute', top: '10px', left: '10px',
          width: 'calc(100% - 20px)', height: 'calc(100% - 20px)',
          borderRadius: '50%', border: `1px solid ${mainColor}`,
          opacity: 0.6, boxShadow: `0 0 15px ${mainColor}`,
      }} />

      <div className="inner-circle" style={{
          width: '120px', height: '120px', borderRadius: '50%',
          background: 'rgba(0, 10, 0, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          transition: 'all 0.3s', zIndex: 2, border: `1px solid ${dimColor}`,
      }}>
        <img src={iconSrc} alt={title} style={{
            width: '35px', height: '35px', marginBottom: '8px', transition: 'filter 0.3s',
            filter: isComplete 
              ? 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(118%) contrast(119%) drop-shadow(0 0 5px #00ff88)' 
              : 'invert(19%) sepia(63%) saturate(6968%) hue-rotate(355deg) brightness(99%) contrast(115%) drop-shadow(0 0 5px #ff3333)',
        }} />

        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontWeight: 'bold', fontSize: '0.85rem', color: '#fff', textShadow: `0 0 5px ${mainColor}`, letterSpacing: '1px' }}>
          {title.toUpperCase()}
        </span>
        
        <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.6rem', color: mainColor, marginTop: '5px', background: dimColor, padding: '2px 6px', borderRadius: '4px' }}>
          {isComplete ? 'SECURE' : 'VULNERABLE'}
        </span>
      </div>
    </Link>
  );
};

export default function ConsoleMenu() {
  const { state, pauseTimer, extendTime } = useGame();
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasExtended, setHasExtended] = useState(false);
  
  // tracks if the final lockdown animation is happening
  const [isLockingDown, setIsLockingDown] = useState(false);

  // show the purge animation if active
  if (isLockingDown) {
    return <LockdownAnimation onComplete={() => navigate('/results')} />;
  }

  const confirmLockdown = () => {
    pauseTimer();
    setIsLockingDown(true); // start animation then go to results
  };

  const handleExtend = () => {
    setHasExtended(true);
    extendTime(300);
  };

  return (
    <>
      <HUD />
      <style>{styles}</style>
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: '#050505',
        backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)`,
        backgroundSize: '30px 30px', color: '#00ff88',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Share Tech Mono', monospace", overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 40%, #000 100%)', pointerEvents: 'none' }} />

        <div style={{ zIndex: 5, textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '3.2rem', margin: 0, color: '#fff', textShadow: '0 0 15px #00ff88', letterSpacing: '6px' }}>
            OPERATIONS_CENTER
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#00aa55', marginTop: '5px', opacity: 0.8 }}>
            Manage core protocols and mitigate active breaches.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '900px', zIndex: 5, marginBottom: '100px' }}>
          <TaskPod to="/wifi" iconSrc={wifiIcon} title="WiFi Protocol" isComplete={state.tasks.wifi} />
          <TaskPod to="/vpn" iconSrc={shieldIcon} title="VPN Tunnel" isComplete={state.tasks.vpn} />
          <TaskPod to="/password" iconSrc={lockIcon} title="Auth Keys" isComplete={state.tasks.password} />
          <TaskPod to="/firewall" iconSrc={firewallIcon} title="Firewall" isComplete={state.tasks.firewall} />
          <TaskPod to="/mfa" iconSrc={mfaIcon} title="MFA Sync" isComplete={state.tasks.mfa} />
          <TaskPod to="/encryption" iconSrc={lockIcon} title="Encryption" isComplete={state.tasks.encryption} />
        </div>

        <div className="command-bar">
          <div style={{ display: 'flex', alignItems: 'center' }}>
             <div style={{ fontSize: '0.65rem', color: '#005522', borderLeft: '2px solid #005522', paddingLeft: '12px', lineHeight: '1.4' }}>
                TERMINAL_ID: 884-XJ <br/>
                USER_AUTH: {sessionStorage.getItem("teamName") || "UNKNOWN"}
             </div>
             {!hasExtended && (
               <button className="extend-btn" onClick={handleExtend}>[ EXTEND_SESSION +5M ]</button>
             )}
          </div>

          <button className="lockdown-trigger" onClick={() => setShowConfirm(true)}>
              Execute System Lockdown
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
             <div style={{ fontSize: '0.65rem', color: '#005522', textAlign: 'right', borderRight: '2px solid #005522', paddingRight: '12px' }}>
                LOCAL_IP: 192.168.1.104 <br/>
                UPLINK: ACTIVE
             </div>
          </div>
        </div>

        {/* what shows when time runs out */}
        {state.isDecisionPhase && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,0,0,0.98)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
            <div style={{ width: '600px', padding: '60px', background: '#000', border: '2px solid #ff3333', textAlign: 'center', boxShadow: '0 0 80px rgba(255,0,0,0.4)' }}>
              <h1 style={{ color: '#ff3333', fontSize: '2.5rem', marginBottom: '20px', letterSpacing: '4px', textShadow: '0 0 20px #ff3333' }}>CRITICAL_TIME_EXPIRATION</h1>
              <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '40px' }}>
                The standard operational window has closed. Mainframe stability is decreasing. You must choose between an emergency extension or immediate isolation.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <button onClick={handleExtend} style={{ flex: 1, padding: '18px', background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>[ EXTEND 5m ]</button>
                <button onClick={confirmLockdown} style={{ flex: 1, padding: '18px', background: '#ff3333', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>[ LOCKDOWN ]</button>
              </div>
            </div>
          </div>
        )}

        {/* confirm screen before ending */}
        {showConfirm && !state.isDecisionPhase && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '450px', padding: '40px', background: '#000', border: '2px solid #ff3333', textAlign: 'center', boxShadow: '0 0 60px rgba(255,51,51,0.25)' }}>
              <h2 style={{ color: '#ff3333', fontSize: '1.8rem', marginBottom: '20px', letterSpacing: '2px' }}>⚠ INITIATE LOCKDOWN?</h2>
              <p style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '35px' }}>
                Team <strong>{sessionStorage.getItem("teamName")}</strong>, you are about to terminate this session. All configurations will be committed.
              </p>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button onClick={confirmLockdown} style={{ flex: 1, padding: '15px', background: '#ff3333', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>CONFIRM</button>
                <button onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '15px', background: 'transparent', border: '1px solid #fff', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>ABORT</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}