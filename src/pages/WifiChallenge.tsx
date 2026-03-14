import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from '../context/GameContext';
import HUD from '../components/HUD';

// loading our sounds and icons
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import eyeIcon from '../assets/eye.svg';

// simple icons for signal strength
const SignalIcon = ({ level }: { level: number }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
    <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity={level >= 3 ? 1 : 0.3}></path>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" opacity={level >= 2 ? 1 : 0.3}></path>
    <line x1="12" y1="20" x2="12.01" y2="20"></line>
  </svg>
);

// small lock icon to show if a network is open or closed
const LockIcon = ({ locked }: { locked: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {locked ? (
      <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></>
    ) : (
      <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></>
    )}
  </svg>
);

// data for the available networks. some are 'evil twins'
type Network = {
  ssid: string; bssid: string; securityType: string; isSecure: boolean; signal: number; url: string; protocol: "http" | "https"; isOpen: boolean;
};

const NETWORKS: Network[] = [
  { ssid: "off1ce_wifi", bssid: "11:22:33:AA:BB:CC", securityType: "WPA2-Enterprise", isSecure: false, signal: 3, url: "auth.secure-wifi-login.net", protocol: "https", isOpen: false },
  { ssid: "Office_WiFi", bssid: "A1:B2:C3:D4:E5:F6", securityType: "WPA2-PSK", isSecure: true, signal: 2, url: "auth.corporate-secure.net", protocol: "https", isOpen: false },
  { ssid: "ClickToLogin_Free", bssid: "FF:EE:DD:33:22:11", securityType: "Open", isSecure: false, signal: 3, url: "freewifi-ads.com/connect", protocol: "http", isOpen: true },
  { ssid: "Office-WiFl", bssid: "99:88:77:66:55:44", securityType: "Open", isSecure: false, signal: 2, url: "secure-login.office-wifi.net", protocol: "http", isOpen: true },
];

// the info cards on the right side of the screen
const WIFI_INFO_CARDS = [
  { mac: "11:22:33:AA:BB:CC", pass: "guestpw55" },
  { mac: "A1:B2:C3:D4:E5:F6", pass: "secure123" },
  { mac: "99:88:77:66:55:44", pass: "openaccess" }
];

const CORRECT_PASSWORD = "secure123";

export default function WifiChallenge() {
  const navigate = useNavigate();
  const { completeTask, penalize, setWifiCompromised } = useGame();
  
  // tracking where we are: looking at the list, the login page, or finished
  const [status, setStatus] = useState<"list" | "portal" | "success">("list");
  const [scanning, setScanning] = useState(true);
  const [selectedNet, setSelectedNet] = useState<Network | null>(null);
  const [portalPassword, setPortalPassword] = useState("");
  const [activeRevealIndex, setActiveRevealIndex] = useState<number | null>(null);

  // sound engine setup using web audio api to prevent lag
  const audioCtx = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});

  useEffect(() => {
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const loadSound = async (name: string, url: string) => {
      const resp = await fetch(url);
      const arrayBuffer = await resp.arrayBuffer();
      const decoded = await audioCtx.current!.decodeAudioData(arrayBuffer);
      buffers.current[name] = decoded;
    };
    loadSound('correct', correctSound);
    loadSound('wrong', wrongSound);

    // fake 'scanning' delay to make the terminal look busy
    if (status === "list") {
      const timer = setTimeout(() => setScanning(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const playInstant = (name: string) => {
    if (!audioCtx.current || !buffers.current[name]) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    const src = audioCtx.current.createBufferSource();
    src.buffer = buffers.current[name];
    src.connect(audioCtx.current.destination);
    src.start(0);
  };

  // this logic swaps dots with letters based on index.
  // it shows half the password, then the other half when holding the eye
  const maskPassword = (pw: string, cardIndex: number) => {
    const isThisCardRevealed = activeRevealIndex === cardIndex;
    return pw.split("").map((char, i) => {
      if (isThisCardRevealed) return (i % 2 !== 0) ? char : "•";
      return (i % 2 === 0) ? char : "•";
    }).join("");
  };

  // what happens when you click 'connect'
  const handleLogin = () => {
    // if the net is locked and password is wrong, they get penalized
    if (!selectedNet?.isOpen && portalPassword !== CORRECT_PASSWORD) {
      playInstant('wrong');
      alert("INCORRECT PASSWORD");
      penalize(50);
      return;
    }

    // if they connect to the real secure office wifi, they win
    if (selectedNet?.isSecure) {
      playInstant('correct');
      setStatus("success");
      completeTask("wifi", 100); 
    } else {
      // connecting to an evil twin hacks their system silently
      setWifiCompromised(true); 
      alert(`CONNECTED TO ${selectedNet?.ssid}. STATUS: SYSTEM ONLINE...`);
      completeTask("wifi", 0); 
      navigate("/console"); 
    }
  };

  return (
    <div style={containerStyle}>
      <style>{`
        .hardware-card { background: #111; padding: 15px; border: 1px solid #00ffff; box-shadow: inset 0 0 10px rgba(0,255,255,0.1); }
        .network-row { border: 1px solid #004422; padding: 15px; display: flex; justify-content: space-between; align-items: center; marginBottom: 10px; transition: all 0.2s; }
        .network-row:hover { background: rgba(0,255,136,0.1); }
      `}</style>
      <HUD />
      
      <div style={{ display: "flex", gap: "30px", width: "100%", maxWidth: "1350px", zIndex: 5, alignItems: 'flex-start' }}>
        
        {/* left sidebar: simple mission rules */}
        <div style={sidebarStyle}>
          <strong style={{ color: '#00ff88', fontSize: '1.2rem' }}>SIMPLE RULES TO REMEMBER:</strong>
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                Don't connect to suspicious looking open networks. Hackers create "Evil Twin" networks that look exactly like your office WiFi to steal your data.
              </p>
              <div style={{ padding: '10px', background: 'rgba(0,255,136,0.1)', borderLeft: '3px solid #00ff88', fontSize: '0.85rem', color: '#88aa99' }}>
                Always double-check that the Network Name and ID match the official equipment.
              </div>
          </div>
        </div>

        {/* center: the scanner list or the fake browser login page */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          {status === "list" && (
            <div style={panelStyle}>
              <div style={panelHeaderStyle}>
                <span>WI-FI_SCANNER_v9.0</span>
                <span style={{ color: scanning ? "#ffff00" : "#00ff88" }}>{scanning ? "SCANNING..." : "ONLINE"}</span>
              </div>
              <div style={{ padding: "20px", minHeight: "400px" }}>
                {/* the actual list of nearby routers */}
                {NETWORKS.map((net, i) => (
                  <div key={i} className="network-row" onClick={() => !scanning && (setSelectedNet(net), setStatus("portal"))}
                    style={{ cursor: scanning ? "default" : "pointer", opacity: scanning ? 0.3 : 1 }}>
                    <div style={{ display: "flex", gap: "15px" }}>
                      <SignalIcon level={net.signal} />
                      <div>
                        <div style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{net.ssid}</div>
                        <div style={{ display: "flex", gap: "8px", marginTop: '4px' }}>
                          <span style={tagStyle}>MAC: {net.bssid}</span>
                        </div>
                      </div>
                    </div>
                    <LockIcon locked={!net.isOpen} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* the browser view that shows up when you click a network */}
          {status === "portal" && selectedNet && (
            <div style={browserStyle}>
              <div style={browserAddressStyle}>
                <span style={{ color: selectedNet.protocol === "https" ? "green" : "red" }}>{selectedNet.protocol}://</span>
                <span>{selectedNet.url}</span>
              </div>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <h2 style={{ color: '#333', marginBottom: '20px' }}>{selectedNet.isOpen ? "Public Login" : "Secure Auth"}</h2>
                {!selectedNet.isOpen && (
                  <input type="password" placeholder="Key" value={portalPassword} onChange={(e) => setPortalPassword(e.target.value)} style={browserInputStyle} />
                )}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setStatus("list")} style={cancelButtonStyle}>Cancel</button>
                  <button onClick={handleLogin} style={connectButtonStyle}>Connect</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* right sidebar: saved wifi info with the reveal mechanic */}
        {true && (
          <div style={sidebarStyle}>
            <strong style={{ color: '#00ffff' }}>[WIFI_INFO]</strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
              {WIFI_INFO_CARDS.map((card, i) => (
                <div key={i} className="hardware-card">
                  <div style={{ fontSize: '0.7rem', color: '#88aa99' }}>REF_{i+1} // MAC: {card.mac}</div>
                  
                  <div style={{ fontSize: '0.65rem', color: '#00ffff', marginTop: '12px', opacity: 0.8 }}>PASSWORD:</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '1.2rem', letterSpacing: '4px', color: '#fff' }}>{maskPassword(card.pass, i)}</div>
                    
                    {/* eye button logic for holding down and seeing letters */}
                    <button 
                      onMouseDown={() => setActiveRevealIndex(i)} 
                      onMouseUp={() => setActiveRevealIndex(null)}
                      onMouseLeave={() => setActiveRevealIndex(null)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <img 
                        src={eyeIcon} 
                        alt="reveal" 
                        style={{ 
                          width: '24px', 
                          opacity: activeRevealIndex === i ? 1 : 0.6, 
                          transition: 'opacity 0.2s',
                          filter: 'invert(72%) sepia(81%) saturate(1450%) hue-rotate(95deg) brightness(101%) contrast(101%)'
                        }} 
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* final success screen when they get the right one */}
      {status === "success" && (
        <div style={successOverlayStyle}>
          <h1 style={{ color: "#00ff88", fontSize: "2.5rem" }}>CONNECTION SECURE</h1>
          <p>Hardware identity confirmed. Channel stabilized.</p>
          <button onClick={() => navigate("/console")} style={buttonStyle}>RETURN TO CONSOLE</button>
        </div>
      )}
    </div>
  );
}

// all the ui styles
const containerStyle: React.CSSProperties = { width: "100vw", height: "100vh", backgroundColor: "#050505", backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)`, backgroundSize: "30px 30px", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" };
const sidebarStyle: React.CSSProperties = { width: "320px", background: "rgba(0,20,0,0.8)", padding: "20px", border: "1px solid #005522", height: "fit-content" };
const panelStyle: React.CSSProperties = { width: "500px", border: "2px solid #005522", background: "rgba(0, 15, 0, 0.95)" };
const panelHeaderStyle: React.CSSProperties = { padding: "15px", background: "#002211", borderBottom: "1px solid #005522", display: "flex", justifyContent: "space-between", fontWeight: "bold" };
const tagStyle: React.CSSProperties = { fontSize: "0.7rem", color: "#88aa99", background: "rgba(0, 50, 20, 0.5)", padding: "2px 6px", borderRadius: "4px" };
const browserStyle: React.CSSProperties = { width: "400px", background: "#fff", borderRadius: "4px", overflow: "hidden", fontFamily: "sans-serif" };
const browserAddressStyle: React.CSSProperties = { background: "#f0f0f0", padding: "10px", borderBottom: "1px solid #ccc", fontSize: "0.8rem", color: "#333" };
const browserInputStyle: React.CSSProperties = { width: "100%", padding: "12px", marginBottom: "20px", border: "1px solid #ccc", borderRadius: "4px", color: '#000' };
const connectButtonStyle: React.CSSProperties = { flex: 1, padding: "12px", background: "#007bff", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };
const cancelButtonStyle: React.CSSProperties = { flex: 1, padding: "12px", background: "#ccc", color: "#333", border: "none", borderRadius: "4px", cursor: "pointer" };
const successOverlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, zIndex: 100, background: "rgba(0, 20, 0, 0.98)", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' };
const buttonStyle: React.CSSProperties = { background: "#00ff88", color: "#000", padding: "15px 30px", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", marginTop: '20px' };