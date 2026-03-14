import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export default function Leaderboard() {
  const navigate = useNavigate();
  const { resetGame } = useGame();

  // Retrieve the persistent leaderboard from the browser storage
  const leaderboard = JSON.parse(localStorage.getItem('cyber_leaderboard') || '[]');

  const handleFullRestart = () => {
    sessionStorage.removeItem("teamName"); // Clear the current session name
    resetGame(); // Reset vulnerabilities and task progress in the global state
    navigate('/'); // Redirect to the Start Menu
  };

  return (
    <div style={containerStyle}>
      <div style={contentWrapper}>
        <h1 style={{ fontSize: '3.5rem', textShadow: '0 0 15px #00ff88', marginBottom: '10px', letterSpacing: '4px' }}>
          GLOBAL_LEADERBOARD
        </h1>
        <p style={{ color: '#008844', marginBottom: '40px', letterSpacing: '2px' }}>
          Verified Elite Defensive Operators // Local Storage Archive
        </p>

        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRowStyle}>
                <th style={thStyle}>RANK</th>
                <th style={thStyle}>UNIT_DESIGNATION</th>
                <th style={thStyle}>SCORE</th>
                <th style={thStyle}>TIME_ELAPSED</th>
                <th style={thStyle}>DATE</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length > 0 ? leaderboard.map((entry: any, i: number) => (
                <tr key={i} style={rowStyle}>
                  <td style={tdStyle}>#0{i + 1}</td>
                  <td style={{ ...tdStyle, color: '#fff', fontWeight: 'bold' }}>{entry.name}</td>
                  <td style={{ ...tdStyle, color: '#00ff88' }}>{entry.score}%</td>
                  <td style={tdStyle}>{entry.time}</td>
                  <td style={{ ...tdStyle, opacity: 0.5 }}>{entry.date}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ padding: '60px', textAlign: 'center', opacity: 0.5 }}>
                    NO_DATA_FOUND_IN_LOCAL_CACHE
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- NAVIGATION ACTIONS --- */}
        <div style={buttonGroupStyle}>
            <button onClick={handleFullRestart} style={restartBtn}>
                INITIALIZE_NEW_SESSION
            </button>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { 
  minHeight: '100vh', 
  width: '100vw', 
  background: '#020502', 
  color: '#00ff88', 
  display: 'flex', 
  flexDirection: 'column', 
  fontFamily: "'Share Tech Mono', monospace", 
  overflowY: 'auto' 
};

const contentWrapper: React.CSSProperties = { 
  flexGrow: 1, 
  padding: '60px 20px', 
  display: 'flex', 
  flexDirection: 'column', 
  alignItems: 'center',
  boxSizing: 'border-box'
};

const tableContainer: React.CSSProperties = { 
  width: '100%', 
  maxWidth: '1100px', 
  background: 'rgba(0,20,0,0.1)', 
  border: '1px solid #004422', 
  borderRadius: '4px', 
  overflow: 'hidden', 
  marginBottom: '40px', 
  boxShadow: '0 0 30px rgba(0,255,136,0.05)' 
};

const tableStyle: React.CSSProperties = { 
  width: '100%', 
  borderCollapse: 'collapse', 
  textAlign: 'left' 
};

const headerRowStyle: React.CSSProperties = { 
  background: '#001100', 
  borderBottom: '2px solid #00ff88' 
};

const thStyle: React.CSSProperties = { 
  padding: '20px', 
  fontSize: '0.8rem', 
  letterSpacing: '2px', 
  color: '#00ff88' 
};

const rowStyle: React.CSSProperties = { 
  borderBottom: '1px solid #002211', 
  transition: 'background 0.2s' 
};

const tdStyle: React.CSSProperties = { 
  padding: '20px', 
  fontSize: '1.1rem' 
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '25px',
  paddingBottom: '60px'
};

const restartBtn: React.CSSProperties = { 
  background: '#00ff88', 
  color: '#000', 
  border: 'none', 
  padding: '18px 40px', 
  fontWeight: 'bold', 
  cursor: 'pointer', 
  fontFamily: 'inherit', 
  letterSpacing: '2px' 
};