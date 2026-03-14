import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

type AIContent = { msg: string };

const CONTENT_MAP: Record<string, AIContent> = {
  "/console": { 
    msg: "WELCOME: I am the AI_HELPER. The BofE mainframe has been compromised. You must secure each sector to regain control. Start with Wifi." 
  },
  "/wifi": { 
    msg: "WIFI_PROTOCOL: Consider checking the router for details other than passwords." 
  },
  "/vpn": { 
    msg: "VPN_TUNNEL: We need an encrypted pathway. Click on the corresponding Countries to complete the secure circuit." 
  },
  "/password": { 
    msg: "AUTH_KEYS: Brute force attacks are incoming. Strengthen the entropy by adding varied characters." 
  },
  "/firewall": { 
    msg: "GATEWAY_CONTROL: Structural hardening is required. Isolate legacy ports and block the SQLi burst." 
  },
  "/mfa": { 
    msg: "MFA_APPROVALS: You might want a notepad and pen." 
  },
  "/encryption": {
    msg: "CRYPTO_LAYER: Use the physical cipher wheel and the key to decode the file names. Prioritize corporate secrets over mundane data."
  }
};

export default function AIHelper() {
  const location = useLocation();
  const [currentContent, setCurrentContent] = useState<AIContent | undefined>(CONTENT_MAP[location.pathname]);
  const [isVisible, setIsVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  // NEW: State for collapsed/expanded view
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const content = CONTENT_MAP[location.pathname];
    if (content) {
      setCurrentContent(content);
      setIsVisible(true);
      setShowHint(false);
      setIsExpanded(false); // Default to collapsed on new page
    } else {
      setCurrentContent(undefined);
      setIsVisible(false);
    }
  }, [location.pathname]);

  if (!currentContent || !isVisible) return null;

  return (
    <div style={{
      position: "fixed", 
      bottom: "25px", 
      right: "25px", 
      // Toggle width based on state
      width: isExpanded ? "320px" : "180px",
      background: "rgba(0, 10, 5, 0.95)", 
      border: "2px solid #00ffff",
      padding: isExpanded ? "20px" : "10px 15px", 
      borderRadius: "8px", 
      zIndex: 9999,
      boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
      fontFamily: "'Share Tech Mono', monospace",
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      animation: "slideUp 0.5s ease-out"
    }}>
      {/* Header Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: isExpanded ? "12px" : "0" }}>
        <div style={{ 
          width: "10px", 
          height: "10px", 
          background: "#00ffff", 
          borderRadius: "50%", 
          animation: showHint ? "blink 1s infinite" : "none",
          boxShadow: showHint ? "0 0 10px #00ffff" : "none"
        }} />
        <span style={{ fontSize: "0.65rem", color: "#00ffff", letterSpacing: "1px", fontWeight: "bold" }}>
          AI_SENTINEL
        </span>
        
        {/* Toggle Expand/Collapse Button */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          style={{ 
            marginLeft: "auto", 
            background: "none", 
            border: "none", 
            color: "#00ffff", 
            cursor: "pointer", 
            fontSize: "1rem",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s"
          }}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          ^
        </button>

        {isExpanded && (
          <button 
            onClick={() => setIsVisible(false)}
            style={{ background: "none", border: "none", color: "#ff3333", cursor: "pointer", fontSize: "1.2rem", padding: "0 5px" }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content Section - only shows when expanded */}
      {isExpanded && (
        <div style={{ minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px", animation: "fadeIn 0.3s ease-in" }}>
          {!showHint ? (
            <button 
              onClick={() => setShowHint(true)}
              style={{
                background: "rgba(0, 255, 255, 0.1)",
                border: "1px solid #00ffff",
                color: "#00ffff",
                padding: "10px 20px",
                fontFamily: "inherit",
                fontSize: "0.8rem",
                fontWeight: "bold",
                cursor: "pointer",
                letterSpacing: "1px"
              }}
            >
              [ DECRYPT_HINT ]
            </button>
          ) : (
            <div style={{ 
              fontSize: "0.85rem", 
              color: "#fff", 
              lineHeight: "1.5", 
              borderLeft: "2px solid #00ffff", 
              paddingLeft: "15px"
            }}>
              {currentContent.msg}
            </div>
          )}
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