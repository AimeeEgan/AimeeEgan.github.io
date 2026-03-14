import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import HUD from '../components/HUD';
import { useGame } from "../context/GameContext";

// audio assets for the vault and vishing parts
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import phoneRing from '../assets/phoneRing.mp3';
import aiCall from '../assets/aiCall.mp3';
import clickSound from '../assets/click.mp3';
import mechanicalSound from '../assets/mechanical.mp3';

// types for the accounts and strength results
type Account = { 
  id: string; 
  name: string; 
  weakPassword: string;
  dob: string; 
};

type StrengthResult = {
  score: number;
  strengthLabel: "Weak" | "Medium" | "Strong";
  feedback: string[];
  isSecure: boolean;
  seqIndices: number[];
  personalInfoIndices: number[];
  commonPatternIndices: number[];
  crackTime: string;
};

// data for the three people whose accounts we need to fix
const ACCOUNTS: Account[] = [
  { id: "john", name: "John Smith", weakPassword: "123456", dob: "12/04/1985" },
  { id: "aiden", name: "Aiden Baker", weakPassword: "pixel2013", dob: "05/09/1992" },
  { id: "melanie", name: "Melanie Hughes", weakPassword: "password", dob: "22/11/1988" },
];

const COMMON_PATTERNS = ["password", "123456", "hello", "admin", "letmein", "qwerty", "asdf", "pass"];

// working out how long a computer would take to hack the password
function calculateCrackTime(pw: string): string {
  if (!pw) return "0 seconds";
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;
  const combinations = Math.pow(pool, pw.length);
  const speed = 10_000_000_000; 
  const seconds = combinations / speed;
  if (seconds < 1) return "Instant";
  if (seconds < 60) return `${Math.floor(seconds)} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  if (seconds < 31536000) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 3153600000) return `${Math.floor(seconds / 31536000)} years`;
  return "Centuries";
}

// finding numbers that go in a row like 123 or 321
function checkSequentialDigits(pw: string): number[] {
  const indices: number[] = [];
  const digits = "0123456789";
  const revDigits = "9876543210";
  for (let i = 0; i < pw.length - 2; i++) {
    const sub = pw.substring(i, i+3);
    if (digits.includes(sub) || revDigits.includes(sub)) {
      indices.push(i, i+1, i+2);
    }
  }
  return [...new Set(indices)];
}

// finding where specific words start in the password
function getIndicesOf(sub: string, main: string): number[] {
  if (!sub || !main) return [];
  const indices: number[] = [];
  let pos = main.indexOf(sub);
  while (pos !== -1) {
    for (let i = 0; i < sub.length; i++) indices.push(pos + i);
    pos = main.indexOf(sub, pos + 1);
  }
  return indices;
}

// checking the password for names, dates, and general entropy
function calculateStrength(pw: string, account: Account): StrengthResult {
  const feedback: string[] = [];
  let score = 0;
  const pwLower = pw.toLowerCase();
  const [firstName, lastName] = account.name.toLowerCase().split(" ");
  const birthYear = account.dob.split("/")[2]; 
  const shortYear = birthYear.slice(-2); 
  
  let personalInfoIndices: number[] = [];
  if (pwLower.includes(firstName)) personalInfoIndices.push(...getIndicesOf(firstName, pwLower));
  if (pwLower.includes(lastName)) personalInfoIndices.push(...getIndicesOf(lastName, pwLower));
  if (pw.includes(birthYear)) personalInfoIndices.push(...getIndicesOf(birthYear, pw));
  if (pw.includes(shortYear)) personalInfoIndices.push(...getIndicesOf(shortYear, pw));
  personalInfoIndices = [...new Set(personalInfoIndices)];

  let commonPatternIndices: number[] = [];
  COMMON_PATTERNS.forEach(pat => {
    if (pwLower.includes(pat)) commonPatternIndices.push(...getIndicesOf(pat, pwLower));
  });
  commonPatternIndices = [...new Set(commonPatternIndices)];

  if (personalInfoIndices.length > 0) {
      if (pwLower.includes(firstName) || pwLower.includes(lastName)) feedback.push("Do not use your name");
      if (pw.includes(birthYear) || pw.includes(shortYear)) feedback.push("Do not use your birth year");
  }
  if (commonPatternIndices.length > 0) feedback.push("Avoid common words/patterns");

  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const isLengthy = pw.length >= 8;
  const seqIndices = checkSequentialDigits(pw);

  if (hasLower) score++;
  if (hasUpper) score++;
  if (hasNumber) score++;
  if (hasSymbol) score++;
  if (isLengthy) score++;

  if (seqIndices.length > 0) { score = Math.min(score, 3); feedback.push("Avoid sequential numbers"); }
  if (personalInfoIndices.length > 0) score = Math.min(score, 2); 
  if (commonPatternIndices.length > 0) score = Math.min(score, 3);

  if (!isLengthy) feedback.push("Too short (min 8)");
  if (!hasLower) feedback.push("Add lowercase");
  if (!hasUpper) feedback.push("Add uppercase");
  if (!hasNumber) feedback.push("Add numbers");
  if (!hasSymbol) feedback.push("Add symbols");

  let label: "Weak" | "Medium" | "Strong" = "Weak";
  if (score < 3 || personalInfoIndices.length > 0) label = "Weak";
  else if (score < 5 || seqIndices.length > 0 || commonPatternIndices.length > 0) label = "Medium"; 
  else label = "Strong";

  return {
    score, strengthLabel: label, feedback,
    isSecure: feedback.length === 0 && seqIndices.length === 0 && personalInfoIndices.length === 0 && commonPatternIndices.length === 0,
    seqIndices, personalInfoIndices, commonPatternIndices, crackTime: calculateCrackTime(pw)
  };
}

// choosing colors for the UI based on what we found in the password
function getTileStyle(char: string, index: number, strengthLabel: string, seqIndices: number[], personalInfoIndices: number[], commonPatternIndices: number[]) {
  const isNum = /[0-9]/.test(char);
  const isSym = /[^A-Za-z0-9]/.test(char);
  if (personalInfoIndices.includes(index)) return { bgColor: "#ff3333", tooltip: "⚠️ Risk: Personal Info" };
  if (commonPatternIndices.includes(index) || (isNum && seqIndices.includes(index))) return { bgColor: "#ffcc00", tooltip: "⚠️ Weakness: Pattern detected" };
  if (isSym || isNum) return { bgColor: "#00ff00", tooltip: "✅ Good: High entropy" };
  if (strengthLabel === "Strong") return { bgColor: "#00ff00", tooltip: "✅ Secure" };
  return strengthLabel === "Medium" ? { bgColor: "#ffcc00", tooltip: "⚠ Moderate" } : { bgColor: "#ff3333", tooltip: "❌ Vulnerable" };
}

export default function PasswordChallenge() {
  const navigate = useNavigate();
  const { state, completeTask, penalize } = useGame();
  
  const [securedAccounts, setSecuredAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [phase2Account, setPhase2Account] = useState<Account | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [analysisDisplay, setAnalysisDisplay] = useState<{ feedback: string[], time: string } | null>(null);
  const [showVishingEducation, setShowVishingEducation] = useState(false);

  // rotary dial state
  const [dialPositions, setDialPositions] = useState<number[]>([]);
  const [dialData, setDialData] = useState<string[][]>([]);

  // vishing state
  const [incomingCall, setIncomingCall] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [showCallChoice, setShowCallChoice] = useState(false);

  const correctAudio = useRef(new Audio(correctSound));
  const wrongAudio = useRef(new Audio(wrongSound));
  const ringerAudio = useRef(new Audio(phoneRing));
  const voiceAudio = useRef(new Audio(aiCall));

  // using the web audio api so sounds happen instantly without lag
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
        console.error("failed to load sound:", name, e);
      }
    };

    loadSound('click', clickSound);
    loadSound('mechanical', mechanicalSound);

    correctAudio.current.preload = 'auto';
    wrongAudio.current.preload = 'auto';
    ringerAudio.current.loop = true;
  }, []);

  const playInstantSound = (name: string) => {
    if (!audioCtx.current || !buffers.current[name]) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

    const source = audioCtx.current.createBufferSource();
    source.buffer = buffers.current[name];
    source.connect(audioCtx.current.destination);
    source.start(0);
  };

  // setting up the random characters for the dials
  useEffect(() => {
    if (activeAccount) {
      const pool = "abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*".split("");
      const newDialData = activeAccount.weakPassword.split("").map(char => {
        const distractors = pool.filter(c => c !== char).sort(() => Math.random() - 0.5).slice(0, 9);
        return [char, ...distractors].sort(() => Math.random() - 0.5);
      });
      setDialData(newDialData);
      setDialPositions(new Array(activeAccount.weakPassword.length).fill(0).map(() => Math.floor(Math.random() * 10)));
    }
  }, [activeAccount]);

  // guard for if they finished already
  if (state.tasks.password) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={{ margin: 'auto', textAlign: 'center', border: '2px solid #00ff88', padding: '50px', background: '#000', maxWidth: '600px', boxShadow: "0 0 30px rgba(0,255,136,0.2)" }}>
          <h2 style={{ fontSize: '2rem', color: "#00ff88" }}>VAULT_LOCKED</h2>
          <p style={{ color: '#88aa99', lineHeight: '1.6', marginBottom: '30px' }}>
            All account credentials have been remediated and the human firewall test is complete. Access to the remediation terminal is now restricted.
          </p>
          <button onClick={() => navigate("/console")} style={{ padding: '15px 40px', background: '#00ff88', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>RETURN TO CONSOLE</button>
        </div>
      </div>
    );
  }

  const playFeedback = (isCorrect: boolean) => {
    const audio = isCorrect ? correctAudio.current : wrongAudio.current;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn("audio blocked:", e));
  };

  // handles answering the fake hacker call
  const answerCall = () => {
    ringerAudio.current.pause();
    ringerAudio.current.currentTime = 0;
    setCallActive(true);
    voiceAudio.current.play().catch(e => console.warn(e));
    voiceAudio.current.onended = () => setShowCallChoice(true);
  };

  // what happens when they decide to send the code or hang up
  const handleVishingChoice = (sendCode: boolean) => {
    setCallActive(false);
    setIncomingCall(false);
    voiceAudio.current.pause();
    if (sendCode) {
      completeTask("password", 50);
      alert("SECURITY_BREACH: Credentials compromised. Attackers have bypassed the vault.");
      navigate("/console");
    } else {
      playFeedback(true);
      completeTask("password", 100);
      setShowVishingEducation(true);
    }
  };

  // handles the clicking sound for the dials
  const handleRotate = (index: number, direction: number) => {
    if (!activeAccount) return;
    const newPositions = [...dialPositions];
    const newPos = (newPositions[index] + direction + 10) % 10;
    newPositions[index] = newPos;
    setDialPositions(newPositions);

    const targetChar = activeAccount.weakPassword[index];
    const currentChar = dialData[index][newPos];

    if (currentChar === targetChar) {
      playInstantSound('mechanical'); 
    } else {
      playInstantSound('click'); 
    }
  };

  // checks if the dial combination matches the weak password
  const verifyWeakPassword = () => {
    if (!activeAccount) return;
    const currentEntry = dialPositions.map((pos, i) => dialData[i][pos]).join("");
    if (currentEntry === activeAccount.weakPassword) {
      playFeedback(true);
      setPhase2Account(activeAccount);
      setActiveAccount(null);
    } else {
      playFeedback(false);
      alert("ACCESS DENIED: Combination Incorrect");
      penalize(50);
    }
  };

  // handles submitting the new fixed password
  const submitGuess = () => {
    if (!phase2Account) return;
    if (guessInput.length !== 8) {
      playFeedback(false);
      alert("Error: New encryption key must be exactly 8 characters.");
      return;
    }
    const result = calculateStrength(guessInput, phase2Account);
    setGuesses([...guesses, guessInput]);
    setAnalysisDisplay({ feedback: result.feedback, time: result.crackTime });
    setGuessInput("");
    if (result.isSecure) {
      playFeedback(true);
      const updatedSecured = [...securedAccounts, phase2Account.id];
      setSecuredAccounts(updatedSecured);
      if (updatedSecured.length === ACCOUNTS.length) {
        setTimeout(() => {
          setIncomingCall(true);
          ringerAudio.current.play().catch(e => console.warn(e));
        }, 1500);
      } else {
        setPhase2Account(null);
        setGuesses([]);
        setAnalysisDisplay(null);
      }
    } else {
      playFeedback(false);
      if (guesses.length + 1 >= 5) {
        alert("SYSTEM LOCKOUT: Attempt limit reached.");
        setGuesses([]);
        setAnalysisDisplay(null);
      }
    }
  };

  // updates the strength info when they hover over a previous guess
  const handleGuessHover = (guess: string) => {
    if(!phase2Account) return;
    const res = calculateStrength(guess, phase2Account);
    setAnalysisDisplay({ feedback: res.feedback, time: res.crackTime });
  };

  return (
    <div style={containerStyle}>
      <HUD />
      <style>{`
        @keyframes flipIn { 0% { transform: rotateX(-90deg); opacity: 0; } 100% { transform: rotateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes wave { 0%, 100% { height: 10px; } 50% { height: 40px; } }
        .tile-animate { animation: flipIn 0.6s ease-out forwards; backface-visibility: hidden; transform-origin: center; }
        .wave { width: 5px; background: #00ffff; animation: wave 1s infinite ease-in-out; }
        .rotary-dial { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        
        .dial-char { 
            width: 55px; 
            height: 80px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: linear-gradient(180deg, #111 0%, #222 50%, #111 100%); 
            border: 1px solid #444; 
            color: #fff; 
            font-size: 2.2rem; 
            font-weight: bold; 
            border-radius: 6px; 
            transition: all 0.2s; 
            user-select: none;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }
        .nav-btn { 
            background: none; 
            border: 1px solid #00ff88; 
            color: #00ff88; 
            cursor: pointer; 
            padding: 5px 15px; 
            font-family: inherit; 
            border-radius: 4px;
            transition: background 0.2s;
            user-select: none;
        }
        .nav-btn:hover { background: rgba(0, 255, 136, 0.1); }
      `}</style>

      {/* header stuff */}
      <header style={{ marginTop: "60px", padding: "20px 40px", borderBottom: "1px solid #005522", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <h1 style={{ margin: 0, fontSize: "2rem", textShadow: "0 0 10px #00ff88" }}>PASSWORD_REMEDIATION</h1>
           <small style={{ color: "#00aa55" }}>BANK OF ENGLAND SECURITY PROTOCOL_v4.2</small>
        </div>
        <div style={{ textAlign: 'right', opacity: 0.8 }}>
            <div>STATUS: <span style={{ color: phase2Account ? "#ffff00" : "#00ff88" }}>{phase2Account ? "PATCHING_VULNERABILITY" : "SYSTEM_SCAN"}</span></div>
            <div>PROGRESS: {securedAccounts.length} / {ACCOUNTS.length} SECURED</div>
        </div>
      </header>

      <main style={{ flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
        
        {/* selecting which person to help */}
        {!phase2Account && !showVishingEducation && !incomingCall && !activeAccount && (
          <div style={{ width: "100%", maxWidth: "1200px", animation: "fadeIn 0.5s ease" }}>
            <p style={{ textAlign: "center", marginBottom: "40px", fontSize: "1.2rem" }}>[MISSION]: The following passwords have been identified as Vulnerable. Access the accounts to start patching.</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "30px", flexWrap: "wrap" }}>
              {ACCOUNTS.map((acc) => {
                const isSecured = securedAccounts.includes(acc.id);
                return (
                  <div key={acc.id} style={{ 
                    width: "280px", background: "rgba(0, 15, 0, 0.9)", padding: "30px", 
                    border: `1px solid ${isSecured ? "#00ff88" : "#ff3333"}`, 
                    boxShadow: `0 0 20px ${isSecured ? "rgba(0,255,136,0.1)" : "rgba(255,0,0,0.1)"}`
                  }}>
                    <h2 style={{ marginTop: 0, color: "#fff" }}>{acc.name}</h2>
                    <div style={{ marginBottom: "15px", fontSize: "0.8rem", color: "#88aa99" }}>ID_REF: {acc.id.toUpperCase()}<br/>DOB_DATA: {acc.dob}</div>
                    <p style={{ color: isSecured ? "#00ff88" : "#ff3333", fontWeight: "bold" }}>
                        {isSecured ? ">> STATUS: SECURE" : ">> STATUS: VULNERABLE"}
                    </p>
                    {!isSecured && (
                      <button 
                        style={{ marginTop: "20px", padding: "12px", width: "100%", background: "transparent", border: "1px solid #ff3333", color: "#ff3333", cursor: "pointer", fontFamily: "inherit", fontWeight: "bold" }} 
                        onClick={() => setActiveAccount(acc)}
                      >
                        ENTER PASSWORD
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* typing in the new secure password */}
        {phase2Account && !showVishingEducation && !incomingCall && (
          <div style={{ width: "100%", maxWidth: "800px", textAlign: "center", animation: "fadeIn 0.5s ease" }}>
             <h2 style={{ color: "#fff", fontSize: "1.8rem", marginBottom: "5px" }}>CREATE NEW SECURE PASSWORD</h2>
             <div style={{ color: "#88aa99", marginBottom: "30px", fontSize: "0.9rem" }}>USER_ID: {phase2Account.id} // DOB_LOCK: {phase2Account.dob}</div>
             <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", marginBottom: "30px" }}>
                {guesses.map((g, rowIdx) => {
                  const res = calculateStrength(g, phase2Account);
                  return (
                    <div key={rowIdx} style={{ display: "flex", gap: "10px" }} onMouseEnter={() => handleGuessHover(g)}>
                      {g.split("").map((char, charIdx) => {
                        const style = getTileStyle(char, charIdx, res.strengthLabel, res.seqIndices, res.personalInfoIndices, res.commonPatternIndices);
                        return <div key={charIdx} className="tile-animate" title={style.tooltip} style={{ width: "55px", height: "55px", background: style.bgColor, color: "#000", fontSize: "1.6rem", fontWeight: "bold", display: "flex", justifyContent: "center", alignItems: "center", animationDelay: `${charIdx * 0.1}s`, opacity: 0 }}>{char}</div>;
                      })}
                    </div>
                  );
                })}
                {guesses.length < 5 && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} style={{ width: "55px", height: "55px", border: "1px solid #004422", background: "rgba(0, 255, 136, 0.05)", color: "#00ff88", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "1.6rem" }}>
                        {guessInput[i] || ""}
                      </div>
                    ))}
                  </div>
                )}
             </div>
             <div style={{ display: "flex", justifyContent: "center", gap: "15px" }}>
                <input maxLength={8} autoFocus value={guessInput} placeholder="NEW_PASSWORD" onChange={(e) => setGuessInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitGuess()} style={{ width: "250px", padding: "15px", background: "#000", border: "1px solid #00ff88", color: "#00ff88", fontSize: "1.2rem", textAlign: "center", letterSpacing: "4px", fontFamily: "inherit", outline: "none" }} />
                <button onClick={submitGuess} style={{ padding: "0 30px", background: "#00ff88", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", fontFamily: "inherit" }}>ENCRYPT</button>
             </div>
             <div style={{ marginTop: "40px", background: "rgba(0,30,0,0.5)", padding: "20px", border: "1px solid #005522", width: "100%" }}>
                {analysisDisplay ? (
                   <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                      <div style={{ fontSize: "1.1rem" }}>ESTIMATED CRACK_TIME: <span style={{ color: analysisDisplay.time === "Instant" ? "#ff3333" : "#00ff88" }}>{analysisDisplay.time}</span></div>
                      <div style={{ color: "#ff5555", fontSize: "0.9rem", textAlign: "left" }}>
                         {analysisDisplay.feedback.map((f, i) => <div key={i}>⚠ {f}</div>)}
                      </div>
                   </div>
                ) : <div style={{ opacity: 0.5 }}>[WAITING_FOR_INPUT]: Entropy analysis offline.</div>}
             </div>
          </div>
        )}

        {/* the fake hacker phone call overlay */}
        {incomingCall && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#000', border: '2px solid #00ffff', padding: '50px', textAlign: 'center', width: '500px', boxShadow: '0 0 30px rgba(0,255,255,0.2)' }}>
              {!callActive ? (
                <>
                  <div style={{ color: '#00ffff', animation: 'blink 1s infinite', fontWeight: 'bold' }}>⚠ INCOMING VOICE COMM...</div>
                  <div style={{ fontSize: '2.5rem', margin: '20px 0', color: '#fff' }}>+33 1 42 92 42 92</div>
                  <div style={{ color: '#aaa', marginBottom: '30px' }}>LOCATION: PARIS, FRANCE</div>
                  <button onClick={answerCall} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>ACCEPT_CONNECTION</button>
                </>
              ) : (
                <>
                  <div style={{ color: '#ff3333', letterSpacing: '2px', fontWeight: 'bold' }}>VOICE_SESSION_ACTIVE</div>
                  <div style={{ display: 'flex', gap: '5px', height: '60px', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
                    <div className="wave" style={{ animationDelay: '0s' }} />
                    <div className="wave" style={{ animationDelay: '0.2s' }} />
                    <div className="wave" style={{ animationDelay: '0.4s' }} />
                  </div>
                  {showCallChoice && (
                    <div style={{ animation: 'fadeIn 0.5s' }}>
                      <p style={{ color: '#fff', marginBottom: '20px' }}>[INCOMING]: "I need those 8-character keys immediately or we lose everything."</p>
                      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button onClick={() => handleVishingChoice(true)} style={{ background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', padding: '15px 30px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>SEND_CODES</button>
                        <button onClick={() => handleVishingChoice(false)} style={{ background: 'transparent', border: '1px solid #00ff88', color: '#00ff88', padding: '15px 30px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>IGNORE_&_HANG_UP</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* education screen about phone phishing */}
        {showVishingEducation && (
          <div style={{ background: '#000', border: '2px solid #00ff88', padding: '50px', maxWidth: '650px', textAlign: 'left', animation: 'fadeIn 0.5s' }}>
             <h2 style={{ color: '#00ff88' }}>THREAT_NEUTRALIZED</h2>
             <p style={{ lineHeight: '1.6', fontSize: '1.1rem' }}>
                You successfully identified an <strong>AI Vishing (Voice Phishing)</strong> attempt. 
                Attackers use synthesized voices to impersonate trusted colleagues, leveraging urgency 
                and psychological pressure to bypass technical security.
             </p>
             <div style={{ borderLeft: '3px solid #00ff88', paddingLeft: '20px', margin: '30px 0', fontSize: '0.9rem', color: '#88aa99' }}>
                SECURITY LOG: Call origin traced to unverified Node in Paris, France (+33). 
                Technical hardening is only effective if the human firewall holds.
             </div>
             <button onClick={() => navigate("/console")} style={{ background: '#00ff88', color: '#000', border: 'none', padding: '15px 30px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>RETURN TO CONSOLE</button>
          </div>
        )}
      </main>

      {/* dial combination lock for getting into the accounts */}
      {activeAccount && dialData.length > 0 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 }}>
          <div style={{ background: "#001a00", padding: "40px", borderRadius: "8px", width: "600px", border: "2px solid #00ff88", boxShadow: "0 0 30px rgba(0,255,136,0.1)" }}>
            <h2 style={{ marginTop: 0, borderBottom: "1px solid #005522", paddingBottom: "10px" }}>ACCESS ACCOUNT</h2>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", color: "#aaa", fontSize: "0.8rem" }}>
              <div>USER: {activeAccount.name.toUpperCase()}</div>
              <div>DOB: <span style={{ color: "#fff" }}>{activeAccount.dob}</span></div>
            </div>
            
            <p>Rotate the dials to align the credentials found in the vault:</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '30px 0' }}>
              {dialData.map((chars, i) => {
                return (
                  <div key={i} className="rotary-dial">
                    <button className="nav-btn" onClick={() => handleRotate(i, -1)}>▲</button>
                    <div className="dial-char">
                      {chars[dialPositions[i]]}
                    </div>
                    <button className="nav-btn" onClick={() => handleRotate(i, 1)}>▼</button>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button 
                onClick={verifyWeakPassword} 
                style={{ flex: 1, padding: "15px", background: "#00ff88", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}
              >
                CONFIRM
              </button>
              <button onClick={() => { setActiveAccount(null); }} style={{ flex: 1, padding: "15px", border: "1px solid #ff3333", background: "transparent", color: "#ff3333", cursor: "pointer", fontFamily: "inherit" }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* footer bar */}
      <footer style={{ height: "40px", borderTop: "1px solid #005522", background: "rgba(0, 10, 0, 0.8)", display: "flex", alignItems: "center", padding: "0 40px", fontSize: "0.8rem", color: "#005522" }}>
        TERMINAL_CONNECTED // {new Date().toLocaleDateString()} // BOE_INTERNAL_NETWORK
      </footer>
    </div>
  );
}

// basic container styles
const containerStyle: React.CSSProperties = { 
  backgroundColor: "#020502", 
  backgroundImage: "linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)",
  backgroundSize: "30px 30px", 
  width: "100vw", 
  height: "100vh", 
  display: "flex", 
  flexDirection: "column",
  color: "#00ff88", 
  fontFamily: "'Share Tech Mono', monospace", 
  overflow: "hidden" 
};