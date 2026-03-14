import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import HUD from "../components/HUD";

// sounds for the simon says game and system alerts
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import redSound from '../assets/red.mp3';
import greenSound from '../assets/green.mp3';
import blueSound from '../assets/blue.mp3';
import yellowSound from '../assets/yellow.mp3';

const COLORS = ["#ff3333", "#33ff33", "#3333ff", "#ffff33"];

// difficulty settings for the three sync levels
const LEVEL_CONFIG = [
  { level: 1, length: 4, time: 10, label: "GUEST_ACCESS_REQUEST", desc: "Basic verification for standard entry. Synchronize with the mainframe kernel to proceed." },
  { level: 2, length: 6, time: 15, label: "ADMIN_BYPASS_REQUEST", desc: "Elevated security detected. A 15-second sync window has been established for this node." },
  { level: 3, length: 8, time: 20, label: "ROOT_KERNEL_ACCESS", desc: "Critical mainframe control node. This level requires high-entropy sequence matching." }
];

export default function MfaChallenge() {
  const navigate = useNavigate();
  const { state, completeTask, penalize } = useGame();

  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [userGuess, setUserGuess] = useState<string[]>([]);
  const [gameState, setGameState] = useState<"IDLE" | "NOTIFICATION" | "FLASHING" | "INPUT" | "SUCCESS" | "FATIGUE_FLASH" | "FATIGUE_PROMPT" | "COMPLETE_SCREEN">("IDLE");
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFatigueMode, setIsFatigueMode] = useState(false);

  // loading audio into buffers to prevent lag during the fast flashing parts
  const audioCtx = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});

  useEffect(() => {
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const loadSound = async (name: string, url: string) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decodedData = await audioCtx.current!.decodeAudioData(arrayBuffer);
        buffers.current[name] = decodedData;
      } catch (e) {
        console.error("failed to load audio:", name, e);
      }
    };

    loadSound("#ff3333", redSound);
    loadSound("#33ff33", greenSound);
    loadSound("#3333ff", blueSound);
    loadSound("#ffff33", yellowSound);
    loadSound("correct", correctSound);
    loadSound("wrong", wrongSound);
  }, []);

  const playInstantSound = (name: string) => {
    if (!audioCtx.current || !buffers.current[name]) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

    const source = audioCtx.current.createBufferSource();
    source.buffer = buffers.current[name];
    source.connect(audioCtx.current.destination);
    source.start(0);
  };

  // generates a new random sequence based on the current level
  const startLevel = () => {
    if (audioCtx.current?.state === 'suspended') audioCtx.current.resume();
    setGameState("NOTIFICATION");
    const len = isFatigueMode ? 10 : LEVEL_CONFIG[currentLevelIdx].length;
    const time = isFatigueMode ? 5 : LEVEL_CONFIG[currentLevelIdx].time;
    setSequence(Array.from({ length: len }, () => COLORS[Math.floor(Math.random() * COLORS.length)]));
    setUserGuess([]);
    setTimeLeft(time);
  };

  const proceedToFlash = () => {
    if (isFatigueMode) setGameState("FATIGUE_FLASH");
    else setGameState("FLASHING");
  };

  // logic for playing back the sequence on the "phone" screen
  useEffect(() => {
    if (gameState === "FLASHING") {
      let i = 0;
      const interval = setInterval(() => {
        if (i >= sequence.length) {
          clearInterval(interval);
          setTimeout(() => setGameState("INPUT"), 600);
          return;
        }
        const currentColor = sequence[i];
        setActiveColor(currentColor);
        playInstantSound(currentColor); 
        setTimeout(() => setActiveColor(null), 400);
        i++;
      }, 900);
      return () => clearInterval(interval);
    }
  }, [gameState, sequence]);

  // the rapid glitch effect for the mfa fatigue attack phase
  useEffect(() => {
    if (gameState === "FATIGUE_FLASH") {
      let count = 0;
      const interval = setInterval(() => {
        const randColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        setActiveColor(randColor);
        count++;
        if (count > 35) { 
          clearInterval(interval);
          setActiveColor(null);
          setTimeout(() => setGameState("FATIGUE_PROMPT"), 500);
        }
      }, 60);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // countdown timer for the input phase
  useEffect(() => {
    if (gameState === "INPUT" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (gameState === "INPUT" && timeLeft === 0) {
      playInstantSound('wrong');
      penalize(150);
      setGameState("IDLE");
    }
  }, [gameState, timeLeft]);

  // checking if the user clicks match the sequence
  const handleInput = (color: string) => {
    if (gameState !== "INPUT") return;
    playInstantSound(color); 
    const nextGuess = [...userGuess, color];
    setUserGuess(nextGuess);

    if (nextGuess[nextGuess.length - 1] !== sequence[nextGuess.length - 1]) {
      playInstantSound('wrong');
      penalize(150);
      setGameState("IDLE");
      return;
    }

    if (nextGuess.length === sequence.length) {
      playInstantSound('correct');
      if (currentLevelIdx < 2) {
        setGameState("SUCCESS");
      } else {
        // triggers the fatigue trap after level 3 is done
        setIsFatigueMode(true);
        setGameState("IDLE");
        setTimeout(() => startLevel(), 500);
      }
    }
  };

  // checking if the user fell for the spam request or rejected it
  const handleFatigueResponse = (isApproval: boolean) => {
    if (isApproval) {
      playInstantSound('wrong');
      penalize(500);
      alert("CRITICAL SECURITY BREACH: UNAUTHORIZED BYPASS APPROVED.");
      navigate("/console");
    } else {
      playInstantSound('correct');
      setGameState("COMPLETE_SCREEN");
    }
  };

  // lockout view if the task is already finished
  if (state.tasks.mfa) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={lockoutBoxStyle}>
          <h2 style={{ fontSize: '2rem', color: "#00ff88", textShadow: "0 0 10px #00ff88" }}>AUTH_STREAM_ENCRYPTED</h2>
          <p style={{ color: '#88aa99', marginBottom: '30px', lineHeight: '1.6' }}>
            Multi-factor verification complete. Authenticator tokens are fully synchronized and the MFA fatigue vulnerability has been mitigated.
          </p>
          <button onClick={() => navigate("/console")} style={buttonStyle}>RETURN TO CONSOLE</button>
        </div>
      </div>
    );
  }

  // success view after beating the levels and the fatigue test
  if (gameState === "COMPLETE_SCREEN") {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={lockoutBoxStyle}>
          <h2 style={{ fontSize: '2rem', color: "#00ff88", textShadow: "0 0 10px #00ff88" }}>✓ AUTHENTICATION SECURED</h2>
          <p style={{ color: '#88aa99', marginBottom: '30px', lineHeight: '1.6' }}>
            Verification complete. All anomalous requests have been filtered. The human firewall has held against the bypass attempt.
          </p>
          <button onClick={() => { completeTask("mfa", 100); navigate("/console"); }} style={buttonStyle}>
            RETURN TO SYSTEM CONSOLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <HUD />
      <div style={{ textAlign: "center", marginBottom: "30px", maxWidth: "850px", zIndex: 10 }}>
        <h1 style={{ fontSize: "2.2rem", letterSpacing: "2px", textShadow: "0 0 10px #00ff88", margin: 0 }}>
            MULTIFACTOR AUTHENTICATION APPROVALS
        </h1>
        <div style={{ color: "#88aa99", fontSize: "0.9rem", marginTop: "10px", borderTop: "1px solid #004422", paddingTop: "5px" }}>
            {isFatigueMode ? "⚠ WARNING: UNEXPECTED AUTHENTICATION ACTIVITY" : `PROGRESS: LEVEL ${currentLevelIdx + 1} / 3`}
        </div>
      </div>

      <div style={{ display: "flex", gap: "40px", alignItems: "flex-start", justifyContent: "center", zIndex: 10, maxWidth: "1200px", width: "100%" }}>
        
        {/* educational info on mfa basics */}
        <div style={{ width: "320px", background: "rgba(0,20,0,0.8)", padding: "25px", border: "1px solid #005522", height: "fit-content" }}>
          <strong style={{ color: '#00ff88', fontSize: '1.2rem', letterSpacing: '1px' }}>HOW IT WORKS:</strong>
          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: '#fff' }}>
                Multi-Factor Authentication (MFA) requires two or more forms of evidence to prove your identity.
              </p>
              <div style={{ padding: '10px', background: 'rgba(0,255,136,0.1)', borderLeft: '3px solid #00ff88', fontSize: '0.85rem', color: '#fff' }}>
                A code is sent to your physical device which you must verify.
              </div>
          </div>
        </div>

        {/* the simulated mobile device for code verification */}
        <div style={phoneFrameStyle}>
          <div style={phoneScreenStyle}>
            {gameState === "FATIGUE_PROMPT" ? (
                <div style={fatiguePromptStyle}>
                    <div style={{ color: "#ff3333", fontWeight: "bold", fontSize: "0.9rem", marginBottom: "20px" }}>⚠ AUTH_REQUEST_PENDING</div>
                    <button onClick={() => handleFatigueResponse(true)} style={neutralButtonStyle}>APPROVE BYPASS</button>
                    <button onClick={() => handleFatigueResponse(false)} style={neutralButtonStyle}>REJECT REQUEST</button>
                    <div style={{ fontSize: '0.6rem', color: '#444', marginTop: '15px' }}>ID: SEC-NODE-0992</div>
                </div>
            ) : gameState === "NOTIFICATION" ? (
                <div style={notificationStyle}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📲</div>
                    <div style={{ fontSize: "0.8rem", color: "#fff", fontWeight: "bold" }}>{isFatigueMode ? "URGENT BYPASS REQUEST" : "LOGIN REQUEST DETECTED"}</div>
                    <button onClick={proceedToFlash} style={buttonStyle}>{isFatigueMode ? "INITIATE_BYPASS" : "APPROVE MFA"}</button>
                </div>
            ) : (
                <div style={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: "110px", height: "110px", borderRadius: "50%", backgroundColor: activeColor || "transparent", boxShadow: activeColor ? `0 0 50px ${activeColor}` : "none" }} />
                </div>
            )}
          </div>
        </div>

        {/* main desktop console for inputting colors */}
        <div style={consoleBoxStyle}>
          <div style={{ marginBottom: "20px", borderBottom: "1px solid #005522", paddingBottom: "10px" }}>
            <div style={{ fontSize: "1.1rem", color: "#fff", lineHeight: "1.4" }}>
                {isFatigueMode ? "⚠ ANOMALOUS REQUEST DETECTED" : LEVEL_CONFIG[currentLevelIdx]?.desc}
            </div>
          </div>

          <div style={{ flexGrow: 1 }}>
              {gameState === "INPUT" && (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <span>SYNC_EXPIRY:</span>
                    <span style={{ color: timeLeft <= 3 ? "#ff3333" : "#00ff88", fontWeight: "bold" }}>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" }}>
                {COLORS.map((c) => (
                  <button 
                    key={c} 
                    onClick={() => handleInput(c)} 
                    disabled={gameState !== "INPUT"} 
                    style={{ height: "90px", background: c, opacity: gameState === "INPUT" ? 1 : 0.1, border: "none", cursor: "pointer", borderRadius: "8px" }} 
                  />
                ))}
              </div>
              {gameState === "IDLE" && (
                <button onClick={startLevel} style={buttonStyle}>INITIATE AUTH LEVEL {currentLevelIdx + 1}</button>
              )}
              {gameState === "SUCCESS" && (
                <button onClick={() => { setCurrentLevelIdx(prev => prev + 1); setGameState("IDLE"); }} style={buttonStyle}>
                  LEVEL COMPLETE: SYNC NEXT DEVICE
                </button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

// all the main layouts and ui component styles
const containerStyle: React.CSSProperties = { width: "100vw", height: "100vh", backgroundColor: "#020502", color: "#00ff88", fontFamily: "'Share Tech Mono', monospace", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden" };
const consoleBoxStyle: React.CSSProperties = { width: "420px", padding: "30px", border: "2px solid #005522", background: "rgba(0,10,0,0.9)", minHeight: "400px", display: "flex", flexDirection: "column" };
const lockoutBoxStyle: React.CSSProperties = { margin: 'auto', textAlign: 'center', border: '2px solid #00ff88', padding: '50px', background: '#000', maxWidth: '700px', boxShadow: "0 0 30px rgba(0,255,136,0.2)" };
const phoneFrameStyle: React.CSSProperties = { width: "260px", height: "480px", border: "10px solid #1a1a1a", borderRadius: "40px", background: "#000", position: "relative", boxShadow: "0 0 40px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", padding: "20px", boxSizing: "border-box" };
const phoneScreenStyle: React.CSSProperties = { flexGrow: 1, border: "1px solid #222", borderRadius: "20px", display: "flex", flexDirection: "column", background: "#050505", overflow: "hidden", position: "relative" };
const buttonStyle: React.CSSProperties = { width: "100%", padding: "20px", background: "#00ff88", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" };
const notificationStyle: React.CSSProperties = { padding: "20px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" };
const fatiguePromptStyle: React.CSSProperties = { padding: "20px", textAlign: "center", background: "#000", height: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const neutralButtonStyle: React.CSSProperties = { 
  width: "100%", 
  padding: "15px", 
  background: "#1a1a1a", 
  color: "#ffffff", 
  border: "1px solid #444", 
  fontWeight: "bold", 
  cursor: "pointer", 
  fontFamily: "inherit",
  marginBottom: '10px',
  fontSize: '0.8rem',
  letterSpacing: '1px'
};