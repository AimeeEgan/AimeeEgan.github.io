import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

// importing the typing mp3
import typingSoundFile from '../assets/typing.mp3';

const styles = `
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes pulse-red {
    0% { box-shadow: 0 0 10px rgba(255, 50, 50, 0.2); border-color: #ff3333; }
    50% { box-shadow: 0 0 30px rgba(255, 50, 50, 0.6); border-color: #ff0000; }
    100% { box-shadow: 0 0 10px rgba(255, 50, 50, 0.2); border-color: #ff3333; }
  }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.9); 
    display: flex; align-items: center; justify-content: center; z-index: 1000;
  }
  .cyber-input {
    background: #000; border: 1px solid #00ff88; color: #fff; padding: 15px;
    width: 100%; box-sizing: border-box; font-family: inherit; font-size: 1.2rem;
    outline: none; margin-top: 20px; text-align: center;
  }
`;

export default function ConsoleIntro() {
  const navigate = useNavigate();
  const { resetGame } = useGame();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [teamName, setTeamName] = useState("");

  // audio reference for the typewriter sound
  const typingAudio = useRef(new Audio(typingSoundFile));

  // the text that the system types out
  const script = [
    { text: "ESTABLISHING SECURE CONNECTION...", color: "#008844", delay: 30 },
    { text: "ACCESSING BANK OF ENGLAND MAINFRAME...", color: "#008844", delay: 30 },
    { text: "AUTHENTICATION: VERIFIED.", color: "#00ff88", delay: 50 },
    { text: "----------------------------------------", color: "#005522", delay: 10 },
    { text: "INCOMING PRIORITY ALERT:", color: "#fff", delay: 80 },
    { text: "⚠️ MAJOR CYBER ATTACK IMMINENT.", color: "#ff3333", delay: 60 },
    { text: "   ESTIMATED IMPACT: 15 MINUTES.", color: "#ff3333", delay: 60 },
    { text: "⚠️ DECREASE THE NUMBER OF VULNERABILITIES.", color: "#ff0000", delay: 60 },
    { text: "⚠️ LOCK DOWN THE SYSTEM NOW.", color: "#ff0000", delay: 60 },
  ];

  useEffect(() => {
    // sound setup: no looping, plays through once
    const audio = typingAudio.current;
    audio.loop = false; 
    audio.preload = 'auto';

    let lineIndex = 0;
    let charIndex = 0;
    let currentLines = [""];

    const typeWriter = () => {
      // only start the audio when the first character is actually typed
      // this prevents the sound from playing during the screen transition
      if (lineIndex === 0 && charIndex === 1) {
        audio.play().catch(() => {
          // fallback if the browser blocks the sound
          window.addEventListener('click', () => audio.play(), { once: true });
        });
      }

      if (lineIndex >= script.length) {
        setIsComplete(true);
        // kill the sound the moment the text is finished
        audio.pause();
        audio.currentTime = 0;
        return;
      }

      const currentLineData = script[lineIndex];
      const fullLineText = currentLineData.text;
      
      currentLines[currentLines.length - 1] = fullLineText.substring(0, charIndex + 1);
      setDisplayedLines([...currentLines]);
      charIndex++;

      if (charIndex === fullLineText.length) {
        lineIndex++;
        charIndex = 0;
        if (lineIndex < script.length) {
          currentLines.push("");
          // wait a beat between lines
          setTimeout(typeWriter, 300);
        } else {
          setTimeout(typeWriter, 100);
        }
      } else {
        // speed of characters based on the script data
        setTimeout(typeWriter, currentLineData.delay);
      }
    };

    // tiny delay before starting the loop to ensure the page is ready
    const startTimeout = setTimeout(typeWriter, 100);

    return () => {
      clearTimeout(startTimeout);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // navigate to main console after name entry
  const handleStartGame = () => {
    if (teamName.trim().length < 2) {
        alert("Please enter a valid Team Designation.");
        return;
    }
    
    sessionStorage.setItem("teamName", teamName);
    resetGame(); 
    navigate("/console");
  };

  return (
    <>
      <style>{styles}</style>
      <div style={{
          width: "100vw", height: "100vh", backgroundColor: "#050505",
          backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)`,
          backgroundSize: "30px 30px", color: "#00ff88", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", fontFamily: "'Share Tech Mono', monospace", padding: "20px", overflow: "hidden",
      }}>
        
        {/* team name entry popup */}
        {showPrompt && (
            <div className="modal-overlay">
                <div style={{ background: "#000", border: "2px solid #00ff88", padding: "40px", width: "400px", textAlign: "center" }}>
                    <h3 style={{ margin: 0, letterSpacing: "2px" }}>UNIT_DESIGNATION</h3>
                    <p style={{ color: "#aaa", fontSize: "0.8rem", marginTop: "10px" }}>Identify your team.</p>
                    <input 
                        type="text" 
                        className="cyber-input" 
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="TEAM_NAME..."
                        autoFocus
                    />
                    <button 
                        onClick={handleStartGame}
                        style={{ marginTop: "30px", padding: "15px 40px", background: "#00ff88", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer", width: "100%" }}
                    >
                        START MISSION
                    </button>
                </div>
            </div>
        )}

        {/* terminal window for the intro text */}
        <div style={{ zIndex: 3, width: "100%", maxWidth: "800px", border: `2px solid ${isComplete ? '#ff3333' : '#005522'}`, backgroundColor: "rgba(0, 10, 0, 0.9)", animation: isComplete ? "pulse-red 2s infinite" : "none", transition: "all 0.5s ease" }}>
          <div style={{ background: isComplete ? "#330000" : "#002211", padding: "10px 20px", borderBottom: `1px solid ${isComplete ? '#ff3333' : '#005522'}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: "bold", letterSpacing: "2px", color: isComplete ? "#ff5555" : "#00ff88" }}>
              {isComplete ? "⚠ EMERGENCY BROADCAST" : "SYSTEM TERMINAL_v4.0"}
            </span>
          </div>

          <div style={{ padding: "30px", minHeight: "300px", textAlign: "left", fontSize: "1.2rem", lineHeight: "1.6" }}>
            {/* loops through the lines and renders them with a cursor */}
            {displayedLines.map((line, index) => {
              const color = script[index]?.color || "#00ff88"; 
              return (
                <div key={index} style={{ color: color, textShadow: `0 0 5px ${color}` }}>
                  <span style={{ marginRight: "10px", opacity: 0.5, fontSize: "0.8rem" }}>{`> `}</span>
                  {line}
                  {index === displayedLines.length - 1 && !isComplete && (
                    <span style={{ display: "inline-block", width: "10px", height: "1.2rem", background: color, marginLeft: "5px", verticalAlign: "middle", animation: "blink 0.2s infinite" }}></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* button to trigger the name entry modal */}
        <div style={{ height: "80px", marginTop: "40px", zIndex: 10 }}>
            {isComplete && (
                <button
                    className="cyber-btn"
                    onClick={() => setShowPrompt(true)}
                    style={{ background: "rgba(0,0,0,0.8)", color: "#00ff88", border: "2px solid #00ff88", padding: "15px 40px", fontSize: "1.4rem", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", fontWeight: "bold" }}
                >
                    ▶ INITIATE COUNTER-MEASURES
                </button>
            )}
        </div>
      </div>
    </>
  );
}