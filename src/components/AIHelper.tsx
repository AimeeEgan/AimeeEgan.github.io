import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function AIHelper() {
  const location = useLocation();
  const { state } = useGame();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const prevVulnerabilities = useRef(state.vulnerabilities);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // function to get advice based on the current page and the current wave/phase
  const getDynamicAdvice = () => {
    const path = location.pathname;
    const currentWave = sessionStorage.getItem("active_wave") || "1";

    const adviceMap: Record<string, Record<string, string>> = {
      "/console": {
        "1": "SYSTEM_STATUS: Mainframe compromised. Secure all 6 sectors to reach zero vulnerabilities. Start with the WiFi module."
      },
      "/wifi": {
        "1": "WIFI_SECURITY: Compare the SSID and MAC Address to the reference cards. Avoid 'Open' networks or unverified URLs."
      },
      "/vpn": {
        "1": "VPN_ROUTING: Establish a multi-hop relay. Click the target countries on the map in the specific order listed in your objective."
      },
      "/password": {
        "1": "VAULT_ACCESS: Rotate the dials and LISTEN carefully. A different sound indicates the character is correctly aligned.",
        "2": "CREDENTIAL_HARDENING: Type a new 8-character key. Use symbols and numbers to increase entropy. Avoid names or birth years."
      },
      "/firewall": {
        "1": "PORT_ISOLATION: Click to slide vulnerable ports (Red) into the Quarantine zone. Essential services (Green) must stay in the Core.",
        "2": "PACKET_INSPECTION: Click moving packets to inspect code. Blacklist payloads containing SQL logic (OR 1=1) or memory addresses (0x...)."
      },
      "/mfa": {
        "1": "MFA_SYNC: Memorise the sequence of flashing colours, then repeat the pattern on the keypad before the sync timer expires."
      },
      "/encryption": {
        "1": "DATA_TRIAGE: Swipe high-priority files with senstive data to the Vault (Right). Swipe mundane files to Discard (Left).",
        "2": "CIPHER_DECODING: Input the KEY_SHIFT to rotate the wheel. To decode, find the encrypted letter on the outer wheel and read the inner letter it aligns with."
      }
    };

    return adviceMap[path]?.[currentWave] || adviceMap[path]?.["1"] || "OPERATIVE: Stay alert. Follow the on-screen protocols.";
  };

  // function to reset the 20-second idle timer
  const resetIdleTimer = () => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    
    const isChallengePage = !["/console", "/results", "/"].includes(location.pathname);
    
    if (!isExpanded && isChallengePage) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsExpanded(true);
      }, 20000); 
    }
  };

  // 1. handle page changes and global click listeners
  useEffect(() => {
    setIsExpanded(false);
    resetIdleTimer();

    window.addEventListener("mousedown", resetIdleTimer);
    return () => {
      window.removeEventListener("mousedown", resetIdleTimer);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [location.pathname]);

  // 2. auto-expand if a mistake is made
  useEffect(() => {
    if (state.vulnerabilities > prevVulnerabilities.current) {
      setIsExpanded(true);
    }
    prevVulnerabilities.current = state.vulnerabilities;
  }, [state.vulnerabilities]);

  // helper to handle manual toggle
  const toggleExpand = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setIsExpanded(!isExpanded);
  };

  if (!isVisible || location.pathname === "/" || location.pathname === "/results") return null;

  return (
    <div 
      style={{
        position: "fixed", bottom: "25px", right: "25px", 
        width: isExpanded ? "320px" : "180px",
        background: "rgba(0, 10, 5, 0.95)", 
        border: `2px solid ${isExpanded ? "#00ff88" : "#00aaaa"}`,
        padding: isExpanded ? "20px" : "10px 15px", 
        borderRadius: "8px", zIndex: 9999,
        boxShadow: isExpanded ? "0 0 30px rgba(0, 255, 136, 0.2)" : "0 0 10px rgba(0, 255, 255, 0.1)",
        fontFamily: "'Share Tech Mono', monospace",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        animation: "slideUp 0.5s ease-out",
        cursor: isExpanded ? "default" : "pointer"
      }}
      onClick={() => !isExpanded && toggleExpand()}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: isExpanded ? "12px" : "0" }}>
        <div style={{ 
          width: "10px", height: "10px", 
          background: isExpanded ? "#00ff88" : "#00ffff", 
          borderRadius: "50%", 
          animation: isExpanded ? "none" : "blink 1.5s infinite",
          boxShadow: `0 0 10px ${isExpanded ? "#00ff88" : "#00ffff"}`
        }} />
        <span style={{ fontSize: "0.65rem", color: isExpanded ? "#00ff88" : "#00ffff", letterSpacing: "1px", fontWeight: "bold" }}>
          AI_SENTINEL
        </span>
        
        <button 
          onClick={toggleExpand}
          style={{ marginLeft: "auto", background: "none", border: "none", color: "#00ff88", cursor: "pointer", fontSize: "1rem", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}
        >
          ^
        </button>
      </div>

      {isExpanded && (
        <div style={{ fontSize: "0.85rem", color: "#fff", lineHeight: "1.5", borderLeft: "2px solid #00ff88", paddingLeft: "15px", animation: "fadeIn 0.3s ease-in" }}>
          {getDynamicAdvice()}
        </div>
      )}

      <style>{`
        @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}