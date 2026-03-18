import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import HUD from "../components/HUD";

// audio files and the net image for phase 2
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import typingSoundFile from '../assets/typing.mp3';
import netImage from '../assets/net.png';

// definitions for the ports and packets
type PortTile = { id: number; service: string; isRequired: boolean; position: number; desc: string; };
type Packet = { id: number; ip: string; port: number; x: number; y: number; isAttack: boolean; speed: number; payload: string; type: string; insight: string; };

// the list of ports used in the sliding puzzle
const INITIAL_TILES: PortTile[] = [
  { id: 80, service: "HTTP", isRequired: true, position: 0, desc: "Standard web traffic." },
  { id: 21, service: "FTP", isRequired: false, position: 1, desc: "Unencrypted file transfer. Risks data theft." },
  { id: 443, service: "HTTPS", isRequired: true, position: 2, desc: "Encrypted web traffic." },
  { id: 23, service: "TELNET", isRequired: false, position: 3, desc: "Obsolete remote access. Plain-text passwords." },
  { id: 53, service: "DNS", isRequired: true, position: 4, desc: "Domain name resolution." },
  { id: 3389, service: "RDP", isRequired: false, position: 5, desc: "Remote Desktop. Target for brute-force." },
  { id: 22, service: "SSH", isRequired: true, position: 6, desc: "Secure admin access." },
  { id: 123, service: "NTP", isRequired: true, position: 7, desc: "Time synchronization logs." },
];

// helpful text for when players hover over traffic code
const TRAFFIC_INTEL: Record<string, string> = {
  "CMD: LOGIN_RETRY; USER: ADMIN; PASS: 123456": "Multiple rapid login variables detected. common in automated 'Brute Force' guessing attempts.",
  "GET /search?id=1' OR '1'='1'-- HTTP/1.1": "Payload contains a logic statement that is 'always true'. often used to bypass database authentication filters.",
  "POST /api/v1/debug HTTP/1.1 { BUFFER_OVERFLOW: 0xDEADBEEF }": "Payload contains low-level memory addresses (hexadecimal). Suggests an attempt to overwrite system memory buffers.",
  "GET /about-us.html HTTP/1.1; REF: google.com": "Standard request for a public resource. Behavior appears consistent with normal browsing.",
  "POST /login HTTP/1.1; AUTH: BEARER_TOKEN_0x99": "Authorized secure token exchange. standard encrypted authentication handshake.",
  "QUERY: mainframe.boe.gov.uk; TYPE: A": "Standard lookup request. Required for internal network routing.",
  "SYNC_CLOCK: STRATUM_2; OFFSET: +0.002ms": "Regular time-keeping signal used for accurate system timestamps.",
  "GET /api/v1/balance-check HTTP/1.1": "Standard API request for data retrieval within expected parameters."
};

const ATTACK_TYPES = [
  { type: "BRUTE_FORCE", port: 22, payload: "CMD: LOGIN_RETRY; USER: ADMIN; PASS: 123456" },
  { type: "SQL_INJECTION", port: 80, payload: "GET /search?id=1' OR '1'='1'-- HTTP/1.1" },
  { type: "EXPLOIT_PROBE", port: 443, payload: "POST /api/v1/debug HTTP/1.1 { BUFFER_OVERFLOW: 0xDEADBEEF }" }
];

const ALLOWED_TRAFFIC = [
  { port: 80, payload: "GET /about-us.html HTTP/1.1; REF: google.com" },
  { port: 443, payload: "POST /login HTTP/1.1; AUTH: BEARER_TOKEN_0x99" },
  { port: 53, payload: "QUERY: mainframe.boe.gov.uk; TYPE: A" },
  { port: 123, payload: "SYNC_CLOCK: STRATUM_2; OFFSET: +0.002ms" }
];

export default function FirewallChallenge() {
  const navigate = useNavigate();
  const { state, completeTask } = useGame();
  
  // tracking game progress across waves
  const [wave, setWave] = useState(1);
  const [status, setStatus] = useState<"briefing" | "playing" | "complete">("briefing");
  const [tiles, setTiles] = useState<PortTile[]>(INITIAL_TILES);
  const [emptyPos, setEmptyPos] = useState(8);
  const [hoveredDesc, setHoveredDesc] = useState<string | null>(null);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [inspectedPacket, setInspectedPacket] = useState<Packet | null>(null);
  const [isPayloadHovered, setIsPayloadHovered] = useState(false);
  const [caughtThreatTypes, setCaughtThreatTypes] = useState<string[]>([]);
  const packetIdRef = useRef(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // setting up the audio engine to avoid lag when sounds play
  const audioCtx = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});

  useEffect(() => {
    // initialize wave tracking for the AI bot
    sessionStorage.setItem("active_wave", "1");

    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const loadSound = async (name: string, url: string) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedData = await audioCtx.current!.decodeAudioData(arrayBuffer);
      buffers.current[name] = decodedData;
    };
    loadSound('correct', correctSound);
    loadSound('wrong', wrongSound);
  }, []);

  const playInstantSound = (name: 'correct' | 'wrong') => {
    if (!audioCtx.current || !buffers.current[name]) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    const source = audioCtx.current.createBufferSource();
    source.buffer = buffers.current[name];
    source.connect(audioCtx.current.destination);
    source.start(0);
  };

  const [introLines, setIntroLines] = useState<string[]>([]);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingAudio = useRef(new Audio(typingSoundFile));

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  // what shows up in the typing intro for each wave
  const introScript = wave === 1 ? [
    { text: "PROTOCOL_OVERVIEW: FIREWALL_ISOLATION", color: "#00ff88", isHeader: true },
    { text: "A firewall is a network security system that monitors and controls incoming and outgoing network traffic based on predetermined security rules. It acts as a barrier between a trusted internal network and untrusted external traffic.", color: "#fff" },
    { text: "MISSION: Secure the core network by clicking to slide vulnerable ports into the Red Quarantine Zone on the right.", color: "#ff3333" }
  ] : [
    { text: "PROTOCOL_OVERVIEW: DEEP_PACKET_INSPECTION", color: "#00ff88", isHeader: true },
    { text: "Advanced firewalls perform Deep Packet Inspection (DPI). This goes beyond simple IP/Port rules to analyze the actual 'payload' of the data to find hidden malicious commands.", color: "#fff" },
    { text: "MISSION: Inspect moving traffic and block 3 unique attack signatures.", color: "#00ff88" }
  ];

  // handling the typewriter effect for the instructions
  useEffect(() => {
    if (status !== "briefing") return;
    typingAudio.current.loop = true;
    setIntroLines([""]);
    setTypingComplete(false);
    let lineIdx = 0; let charIdx = 0; let currentLines = [""];
    const typeWriter = () => {
      if (lineIdx === 0 && charIdx === 0) typingAudio.current.play().catch(() => {});
      if (lineIdx >= introScript.length) { setTypingComplete(true); typingAudio.current.pause(); return; }
      const fullText = introScript[lineIdx].text;
      currentLines[currentLines.length - 1] = fullText.substring(0, charIdx + 1);
      setIntroLines([...currentLines]);
      charIdx++;
      if (charIdx === fullText.length) {
        lineIdx++; charIdx = 0;
        if (lineIdx < introScript.length) { currentLines.push(""); setTimeout(typeWriter, 500); }
        else { typeWriter(); }
      } else { setTimeout(typeWriter, 20); }
    };
    typeWriter();
    return () => typingAudio.current.pause();
  }, [status, wave]);

  if (state.tasks.firewall) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={lockoutBoxStyle}>
          <h2 style={{ color: "#ff3333" }}>Challenge Complete</h2>
          <button onClick={() => navigate("/console")} style={buttonStyle}>RETURN TO CONSOLE</button>
        </div>
      </div>
    );
  }

  // randomizing the ports on the grid
  const shuffleTiles = () => {
    let positions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    const shuffled = INITIAL_TILES.map((tile, idx) => ({ ...tile, position: positions[idx] }));
    setTiles(shuffled);
    setEmptyPos(positions[8]);
    setStatus("playing");
  };

  // sliding tile logic to check if a port can move to the empty slot
  const handleMove = (index: number) => {
    if (wave !== 1 || status !== "playing") return;
    const pos = tiles[index].position;
    const isAdjacent = [pos - 1, pos + 1, pos - 3, pos + 3].includes(emptyPos) &&
      !(pos % 3 === 0 && emptyPos === pos - 1) &&
      !(pos % 3 === 2 && emptyPos === pos + 1);
    if (isAdjacent) {
      const newTiles = tiles.map((tile, i) => i === index ? { ...tile, position: emptyPos } : tile);
      setEmptyPos(pos);
      setTiles(newTiles);
    }
  };

  // checking if the player sorted all ports correctly to finish wave 1
  useEffect(() => {
    if (wave !== 1 || status !== "playing") return;
    const allQuarantined = tiles.filter(t => !t.isRequired).every(t => t.position % 3 === 2);
    const essentialsSafe = tiles.filter(t => t.isRequired).every(t => t.position % 3 !== 2);
    if (allQuarantined && essentialsSafe) { 
      playInstantSound('correct');
      setWave(2); 
      sessionStorage.setItem("active_wave", "2"); // Notify AI sentinel
      setStatus("briefing"); 
    }
  }, [tiles, wave, status]);

  // logic for wave 2 packet spawning
  useEffect(() => {
    if (wave !== 2 || status !== "playing" || inspectedPacket || caughtThreatTypes.length >= 3) return;
    const interval = setInterval(() => {
      const remainingAttacks = ATTACK_TYPES.filter(a => !caughtThreatTypes.includes(a.type));
      const isAttack = Math.random() > 0.6 && remainingAttacks.length > 0;
      const data = isAttack ? remainingAttacks[Math.floor(Math.random() * remainingAttacks.length)] : ALLOWED_TRAFFIC[Math.floor(Math.random() * ALLOWED_TRAFFIC.length)];
      const newPacket: Packet = {
        id: packetIdRef.current++,
        ip: isAttack ? "10.44.92.21" : `${Math.floor(Math.random() * 255)}.168.1.${Math.floor(Math.random() * 255)}`,
        port: data.port, x: -100, y: Math.random() * 300 + 50, isAttack, speed: isAttack ? 2.5 : 2,
        payload: data.payload, type: (data as any).type || "NORMAL", insight: TRAFFIC_INTEL[data.payload] || "Standard behavior."
      };
      setPackets(prev => [...prev, newPacket]);
    }, 1500);
    return () => clearInterval(interval);
  }, [wave, status, inspectedPacket, caughtThreatTypes]);

  // moves packets across the screen
  useEffect(() => {
    if (wave !== 2 || status !== "playing" || inspectedPacket) return;
    const moveInterval = setInterval(() => {
      setPackets(prev => prev.map(p => ({ ...p, x: p.x + p.speed })).filter(p => p.x < 1100));
    }, 16);
    return () => clearInterval(moveInterval);
  }, [wave, status, inspectedPacket]);

  // handles the button clicks for blocking or allowing traffic
  const handleAction = (wasBlacklisted: boolean) => {
    if (!inspectedPacket) return;
    if (wasBlacklisted && inspectedPacket.isAttack) {
      playInstantSound('correct');
      const updatedCaught = [...caughtThreatTypes, inspectedPacket.type];
      setCaughtThreatTypes(updatedCaught);
      if (updatedCaught.length >= 3) setStatus("complete");
    } else if (!wasBlacklisted && !inspectedPacket.isAttack) {
      playInstantSound('correct');
    } else {
      playInstantSound('wrong');
      setMistakeCount(prev => prev + 1); 
    }
    setPackets(prev => prev.filter(p => p.id !== inspectedPacket.id));
    setInspectedPacket(null);
  };

  const finalizeChallenge = () => {
    completeTask("firewall", mistakeCount === 0 ? 100 : Math.max(0, 100 - (mistakeCount * 25)));
    navigate("/console");
  };

  return (
    <div style={containerStyle} onMouseMove={handleMouseMove}>
      <HUD />

      {/* visual for the cursor net in wave 2 */}
      {wave === 2 && status === "playing" && !inspectedPacket && (
        <img 
          src={netImage} 
          alt="Fishing Net" 
          style={{
            position: 'fixed', left: mousePos.x, top: mousePos.y,
            width: '60px', height: '60px', pointerEvents: 'none', zIndex: 9999,
            transform: 'translate(-50%, -50%)', filter: 'drop-shadow(0 0 5px #00ff88)'
          }}
        />
      )}
      
      {/* intro popup screen */}
      {status === "briefing" && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            {introLines.map((line, idx) => (
              <div key={idx} style={{ fontSize: introScript[idx].isHeader ? "1.8rem" : "1.1rem", marginBottom: "20px", color: introScript[idx].color, lineHeight: "1.6" }}>{line}</div>
            ))}
            {typingComplete && <button onClick={wave === 1 ? shuffleTiles : () => setStatus("playing")} style={{ ...buttonStyle, marginTop: "20px", width: "100%" }}>START PHASE</button>}
          </div>
        </div>
      )}

      <h1 style={{ letterSpacing: "5px", marginBottom: "5px" }}>FIREWALL_v4</h1>
      
      {wave === 1 && status === "playing" && (
        <p style={{ color: '#ff3333', fontSize: '1rem', marginBottom: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>Click to Slide vulnerable ports into the Red Quarantine Zone on the right.</p>
      )}

      <div style={intelBar}>{`> ${hoveredDesc || "Monitoring network layers..."}`}</div>

      <div style={{ display: "flex", gap: "25px", width: "100%", maxWidth: "1350px", justifyContent: "center", alignItems: "flex-start", flexGrow: 1 }}>
        
        {/* educational sidebar for hints */}
        {status === "playing" && (
          <div style={{ width: "320px", background: "rgba(0,20,0,0.8)", padding: "25px", border: "1px solid #005522", height: "fit-content" }}>
            <strong style={{ color: '#00ff88', fontSize: '1.2rem', letterSpacing: '1px' }}>HOW IT WORKS:</strong>
            <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {wave === 1 ? (
                  <>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                      Think of a Firewall like a secure gate. In this step, we are managing Port Security. 
                    </p>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                      Unnecessary "ports" left open are like unlocked back doors. By moving insecure services into quarantine, you prevent entry.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                      Standard firewalls only check the address on the outside of a package. Deep Packet Inspection actually opens the package to look inside.
                    </p>
                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                      By analyzing the "payload," we can find hidden SQL commands or brute-force scripts that a normal filter would miss. 
                    </p>
                    <div style={{ padding: '10px', background: 'rgba(0,255,136,0.1)', borderLeft: '3px solid #00ff88', fontSize: '0.85rem' }}>
                      <span style={{ color: '#00ff88', fontWeight: 'bold' }}>HINT:</span> Click moving packets to inspect their internal code.
                    </div>
                  </>
                )}
            </div>
          </div>
        )}

        {/* the grid for the wave 1 sliding puzzle */}
        {wave === 1 && status === "playing" && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', width: '380px', marginBottom: '10px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <div style={{ flex: 2, color: '#00ff88' }}>[ CORE_NETWORK ]</div>
              <div style={{ flex: 1, color: '#ff3333', textAlign: 'center' }}>[ QUARANTINE ]</div>
            </div>
            <div style={gridStyle}>
                <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "125px", background: "rgba(255,0,0,0.15)", borderLeft: "2px dashed #f33", zIndex: 1 }} />
                {tiles.map((tile, index) => (
                  <div key={tile.id} onClick={() => handleMove(index)} onMouseEnter={() => setHoveredDesc(`${tile.service}: ${tile.desc}`)} onMouseLeave={() => setHoveredDesc(null)} style={{ ...tileStyle, gridColumnStart: (tile.position % 3) + 1, gridRowStart: Math.floor(tile.position / 3) + 1, zIndex: 2 }}>
                    <strong style={{ fontSize: '1.1rem' }}>{tile.service}</strong>
                    <small style={{ opacity: 0.7 }}>PORT {tile.id}</small>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* the screen where packets move across in wave 2 */}
        {wave === 2 && status === "playing" && (
          <div style={{ ...streamContainer, cursor: inspectedPacket ? 'default' : 'none' }}>
             <div style={threatCounter}>ISOLATED: {caughtThreatTypes.length}/3</div>
             {packets.map(p => (
               <div key={p.id} onClick={() => setInspectedPacket(p)} style={{ ...packetStyle, left: p.x, top: p.y }}>{p.ip}</div>
             ))}
             {/* overlay that pops up when you click a packet to inspect it */}
             {inspectedPacket && (
               <div style={inspectionOverlay}>
                 <h3>DEEP_PACKET_INSPECTION</h3>
                 <div style={{ display: 'flex', gap: '20px' }}>
                    <div style={dataField}>
                      <div>IP: {inspectedPacket.ip}</div>
                      <div className="payload-hover" onMouseEnter={() => setIsPayloadHovered(true)} onMouseLeave={() => setIsPayloadHovered(false)} style={payloadStyle}>{inspectedPacket.payload}</div>
                    </div>
                    <div style={intelField}><small>INTEL:</small><p>{isPayloadHovered ? inspectedPacket.insight : "Hover payload to analyze..."}</p></div>
                 </div>
                 <div style={{ marginTop: '20px', display: 'flex', gap: '15px' }}>
                   <button onClick={() => handleAction(true)} style={{ ...buttonStyle, background: '#f33' }}>BLACKLIST</button>
                   <button onClick={() => handleAction(false)} style={buttonStyle}>ALLOW</button>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* final confirmation screen after finishing the game */}
      {status === "complete" && (
        <div style={overlayStyle}>
          <div style={lockoutBoxStyle}>
            <h2 style={{ color: "#fff", textShadow: "0 0 20px #00ff88" }}>HARDENING_SUCCESS</h2>
            <button onClick={finalizeChallenge} style={buttonStyle}>APPLY CONFIG & RETURN</button>
          </div>
        </div>
      )}
    </div>
  );
}

// styling for the containers and UI elements
const containerStyle: React.CSSProperties = { width: "100vw", height: "100vh", background: "#020502", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", overflow: 'hidden' };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,10,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalStyle: React.CSSProperties = { border: '2px solid #00ff88', padding: '40px', background: '#000', width: '650px', textAlign: 'center' };
const lockoutBoxStyle: React.CSSProperties = { margin: 'auto', textAlign: 'center', border: '2px solid #00ff88', padding: '50px', background: '#000', maxWidth: '600px' };
const buttonStyle: React.CSSProperties = { padding: "12px 30px", background: "#00ff88", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", fontFamily: 'inherit' };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 120px)", gridTemplateRows: "repeat(3, 120px)", gap: "10px", padding: "10px", border: "2px solid #005522", position: 'relative', background: 'rgba(0,10,0,0.3)' };
const tileStyle: React.CSSProperties = { background: "rgba(0,255,136,0.1)", border: "1px solid #00ff88", height: "120px", width: "120px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", position: 'relative', userSelect: 'none', transition: 'all 0.1s' };
const intelBar: React.CSSProperties = { background: "rgba(0,255,136,0.05)", border: "1px solid #004422", padding: "15px", width: "100%", maxWidth: "800px", margin: "20px 0", textAlign: 'center', minHeight: '50px' };
const streamContainer: React.CSSProperties = { width: "1000px", height: "500px", border: "2px solid #005522", position: "relative", overflow: "hidden", background: "#000" };
const packetStyle: React.CSSProperties = { position: "absolute", padding: "5px 10px", background: "rgba(0,255,136,0.2)", border: "1px solid #00ff88", cursor: "pointer", fontSize: "0.8rem" };
const inspectionOverlay: React.CSSProperties = { position: 'absolute', inset: 0, background: 'rgba(0,20,0,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', zIndex: 100 };
const dataField: React.CSSProperties = { flex: 1.2, textAlign: 'left', background: '#000', padding: '15px', border: '1px solid #005522' };
const intelField: React.CSSProperties = { flex: 1, textAlign: 'left', background: 'rgba(0,50,0,0.2)', padding: '15px', border: '1px solid #005522' };
const payloadStyle: React.CSSProperties = { background: '#050505', padding: '10px', fontSize: '0.8rem', border: '1px solid #333', height: '100px', wordBreak: 'break-all', marginTop: '5px' };
const threatCounter: React.CSSProperties = { position: 'absolute', top: 10, left: 10, color: '#00ff88', fontSize: '0.8rem' };