import { useState } from "react";
import { useNavigate } from "react-router-dom";

// assets for the survey modal
import preSurveyQR from "../assets/presurvey.png";
import postSurveyQR from "../assets/postsurvey.png";

const styles = `
  @keyframes scanline {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .cyber-btn:hover {
    background: rgba(0, 255, 136, 0.1) !important;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.4) !important;
  }
  .important-btn {
    border: 1px solid #ffaa00 !important;
    color: #ffaa00 !important;
  }
  .important-btn:hover {
    background: rgba(255, 170, 0, 0.1) !important;
    box-shadow: 0 0 20px rgba(255, 170, 0, 0.4) !important;
  }
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.9); 
    display: flex; align-items: center; justify-content: center; z-index: 1000;
    backdrop-filter: blur(5px);
  }
  .qr-container {
    display: flex; justify-content: space-around; gap: 20px; margin-top: 20px;
  }
  .qr-card {
    text-align: center; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px;
  }
  .qr-image {
    width: 150px; height: 150px; margin-top: 10px; border: 2px solid #fff;
  }
`;

export default function StartMenu() {
  const navigate = useNavigate();
  const [showProtocols, setShowProtocols] = useState(false);
  const [showSurveys, setShowSurveys] = useState(false);

  return (
    <div style={{
      width: "100vw", height: "100vh", backgroundColor: "#050505",
      backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)`,
      backgroundSize: "30px 30px", color: "#00ff88", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", fontFamily: "'Share Tech Mono', monospace",
      position: "relative", overflow: "hidden"
    }}>
      <style>{styles}</style>
      
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, transparent 50%, #000 120%)', pointerEvents: 'none' }} />

      {/* protocols modal */}
      {showProtocols && (
        <div className="modal-overlay" onClick={() => setShowProtocols(false)}>
          <div style={{ 
            background: "#000", border: "2px solid #00ff88", padding: "40px", 
            width: "600px", boxShadow: "0 0 50px rgba(0, 255, 136, 0.3)",
            maxHeight: '80vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ textAlign: "center", color: "#fff", textShadow: "0 0 10px #00ff88", marginBottom: '30px' }}>SYSTEM_OPERATING_PROTOCOLS</h2>
            
            <div style={{ color: '#88aa99', fontSize: '0.9rem', lineHeight: '1.6' }}>
              <p><strong style={{ color: '#00ff88' }}>[OBJECTIVE]:</strong> Secure the mainframe by neutralizing vulnerabilities across 6 security sectors.</p>
              <p><strong style={{ color: '#00ff88' }}>[VULNERABILITY_SYSTEM]:</strong> You begin with <span style={{ color: '#ff3333' }}>1,000 Vulnerabilities</span>. Each successful challenge reduces this number.</p>
              <p><strong style={{ color: '#00ff88' }}>[TIME_LIMIT]:</strong> You have <span style={{ color: '#ff3333' }}>15:00 minutes</span> to complete lockdown.</p>
            </div>

            <button onClick={() => setShowProtocols(false)} className="cyber-btn" style={{ 
              marginTop: "30px", width: "100%", padding: "12px", background: "#00ff88", 
              border: "none", color: "#000", cursor: "pointer", fontFamily: "inherit", fontWeight: 'bold'
            }}>ACKNOWLEDGE_PROTOCOLS</button>
          </div>
        </div>
      )}

      {/* important survey modal */}
      {showSurveys && (
        <div className="modal-overlay" onClick={() => setShowSurveys(false)}>
          <div style={{ 
            background: "#000", border: "2px solid #ffaa00", padding: "40px", 
            width: "600px", boxShadow: "0 0 50px rgba(255, 170, 0, 0.2)"
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ textAlign: "center", color: "#fff", textShadow: "0 0 10px #ffaa00", marginBottom: '20px' }}>IMPORTANT: RESEARCH DATA</h2>
            <p style={{ color: "#fff", textAlign: 'center', marginBottom: '20px' }}>Please fill in the surveys before and after completing the escape room.</p>
            
            <div className="qr-container">
              <div className="qr-card">
                <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>PRE-SURVEY</div>
                <img src={preSurveyQR} alt="Pre-Survey QR" className="qr-image" />
              </div>
              <div className="qr-card">
                <div style={{ color: '#ffaa00', fontWeight: 'bold' }}>POST-SURVEY</div>
                <img src={postSurveyQR} alt="Post-Survey QR" className="qr-image" />
              </div>
            </div>

            <button onClick={() => setShowSurveys(false)} className="cyber-btn" style={{ 
              marginTop: "30px", width: "100%", padding: "12px", background: "#ffaa00", 
              border: "none", color: "#000", cursor: "pointer", fontFamily: "inherit", fontWeight: 'bold'
            }}>CLOSE</button>
          </div>
        </div>
      )}

      <div style={{ 
        position: "absolute", top: "25%", width: "100%", maxWidth: "650px", 
        display: "flex", justifyContent: "space-between", fontSize: "0.65rem", 
        letterSpacing: "1px", opacity: 0.8, borderBottom: "1px solid rgba(0,255,136,0.3)", paddingBottom: "5px" 
      }}>
        <span>SECURE_CONNECTION: ESTABLISHED</span>
        <span>ENCRYPTION: AES-256</span>
      </div>

      <div style={{ textAlign: "center", marginBottom: "40px", zIndex: 10 }}>
        <h2 style={{ fontSize: "2.2rem", margin: 0, color: "#00ff88", letterSpacing: "8px" }}>REVERSE</h2>
        <h1 style={{ 
          fontSize: "3.8rem", margin: "5px 0", color: "#fff", 
          textShadow: "0 0 20px #fff, 0 0 30px #fff", letterSpacing: "4px" 
        }}>CYBER-SECURITY</h1>
        <h2 style={{ fontSize: "2.2rem", margin: 0, color: "#00ff88", letterSpacing: "8px" }}>ESCAPE ROOM</h2>
      </div>

      <div style={{ display: "flex", gap: "15px", zIndex: 10 }}>
        <button onClick={() => navigate("/intro")} className="cyber-btn" style={{
          padding: "12px 30px", background: "none", border: "1px solid #00ff88", 
          color: "#00ff88", fontSize: "0.9rem", cursor: "pointer", fontWeight: "bold",
          display: "flex", alignItems: "center", gap: "10px", borderRadius: "4px"
        }}>
          <span>▶</span> INITIALIZE MISSION
        </button>

        <button onClick={() => setShowProtocols(true)} className="cyber-btn" style={{
          padding: "12px 30px", background: "none", border: "1px solid #fff", 
          color: "#fff", fontSize: "0.9rem", cursor: "pointer", borderRadius: "4px",
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span>i</span> PROTOCOLS
        </button>

        <button onClick={() => setShowSurveys(true)} className="cyber-btn important-btn" style={{
          padding: "12px 30px", background: "none", fontSize: "0.9rem", cursor: "pointer", borderRadius: "4px",
          display: "flex", alignItems: "center", gap: "10px"
        }}>
          <span>!</span> IMPORTANT
        </button>
      </div>

      <div style={{
        position: 'absolute', inset: 0, background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%)',
        backgroundSize: '100% 4px', pointerEvents: 'none', opacity: 0.3
      }} />
    </div>
  );
}