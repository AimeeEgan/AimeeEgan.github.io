import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import themeMusic from '../assets/theme.mp3';

// importing the survey asset
import postSurveyQR from '../assets/postsurvey.png';

export default function Results() {
  const { state, resetGame } = useGame();
  const navigate = useNavigate();
  const teamName = sessionStorage.getItem("teamName") || "ANON_OPERATOR";
  // setting up the results theme music
  const audioRef = useRef(new Audio(themeMusic));

  useEffect(() => {
    // handles playing background music and cleaning up when leaving
    const audio = audioRef.current;
    audio.loop = true;
    audio.volume = 0.5;
    audio.play().catch(err => console.warn("Audio autoplay blocked:", err));
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  const stats = useMemo(() => {
    // crunching numbers to get the final score and rank
    const completedTasksCount = Object.values(state.tasks).filter(Boolean).length;
    const mitigated = 700 - state.vulnerabilities; 
    const totalTime = 900; 
    const elapsed = Math.max(0, totalTime - state.timeLeft);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = `${mins}m ${secs}s`;

    let finalScore = (completedTasksCount * 10) + (Math.max(0, mitigated / 700) * 40);
    if (state.wifiCompromised) finalScore -= 20;

    const total = Math.min(100, Math.max(0, Math.round(finalScore)));
    let gradeStr = "D (VULNERABLE)";
    if (total >= 90) gradeStr = "A+ (ELITE_DEFENDER)";
    else if (total >= 75) gradeStr = "B (SECURE_ADMIN)";
    else if (total >= 50) gradeStr = "C (SYSTEM_STABLE)";

    return { score: total, grade: gradeStr, timeTaken: timeStr };
  }, [state]);

  useEffect(() => {
    // recording the run in the local leaderboard if not in public mode
    if (true) return;

    const leaderboard = JSON.parse(localStorage.getItem('cyber_leaderboard') || '[]');
    const runId = `${teamName}-${Date.now()}`;
    const lastSavedRun = sessionStorage.getItem('last_saved_run');
    
    if (lastSavedRun !== runId && stats.score > 0) {
      const newEntry = { name: teamName, score: stats.score, time: stats.timeTaken, date: new Date().toLocaleDateString() };
      const updated = [...leaderboard, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
      localStorage.setItem('cyber_leaderboard', JSON.stringify(updated));
      sessionStorage.setItem('last_saved_run', runId);
    }
  }, [stats, teamName]);

  // cleaning up session data and restarting the game
  const handleRestart = () => {
    sessionStorage.removeItem("teamName");
    resetGame();
    navigate('/');
  };

  return (
    <div style={containerStyle}>
      <div style={contentWrapper}>
        <header style={headerStyle}>
          <h1 style={titleStyle}>SECURITY_CHECKUP_RESULTS</h1>
          <div style={{ color: '#00ff88', marginTop: '10px', letterSpacing: '2px', fontSize: '1.1rem' }}>
            OPERATOR: <span style={{ color: '#fff' }}>{teamName}</span> | TIME: <span style={{ color: '#fff' }}>{stats.timeTaken}</span>
          </div>
        </header>

        <div style={mainGrid}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* visual card for the big percentage score */}
            <div style={scoreCard}>
              <div style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '2px' }}>OVERALL SAFETY RATING</div>
              <div style={{ fontSize: '6rem', color: stats.score > 50 ? '#00ff88' : '#ff3333', margin: '20px 0', textShadow: `0 0 30px ${stats.score > 50 ? 'rgba(0,255,136,0.5)' : 'rgba(255,51,51,0.5)'}` }}>
                {stats.score}%
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: stats.score > 0 ? '#fff' : '#ff3333' }}>
                {stats.grade}
              </div>
            </div>

            {/* NEW: Post-survey feedback box */}
            <div style={{ padding: '25px', border: '1px solid #00ff88', background: 'rgba(0, 255, 136, 0.05)', textAlign: 'center', borderRadius: '4px' }}>
              <div style={{ color: '#00ff88', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px', letterSpacing: '1px' }}>MISSION COMPLETE: FEEDBACK REQUIRED</div>
              <p style={{ color: '#88aa99', fontSize: '0.8rem', marginBottom: '20px', lineHeight: '1.4' }}>
                Please scan the code below to complete the post-escape room survey and help with our research.
              </p>
              <img 
                src={postSurveyQR} 
                alt="Post-Survey QR" 
                style={{ width: '140px', height: '140px', border: '2px solid #fff', display: 'block', margin: '0 auto' }} 
              />
            </div>
          </div>

          <div style={analysisCard}>
            <h2 style={sectionTitle}>WHAT HAPPENED?</h2>
            <div style={logContainer}>
              {/* shows specific feedback based on which tasks were finished or failed */}
              <EvaluationRow 
                title="WiFi Security" 
                status={!state.tasks.wifi ? "SKIPPED" : state.wifiCompromised ? "FAILED" : "PASSED"}
                feedback={!state.tasks.wifi ? "You didn't check the WiFi. Hackers could be watching everything you do." : state.wifiCompromised ? "FAILED: You connected to a fake network. Never trust a network just because it has a familiar name." : "PASSED: You verified the network first. Your data stayed private and safe."}
              />
              <EvaluationRow 
                title="Passwords" 
                status={state.tasks.password ? "PASSED" : "SKIPPED"}
                feedback={state.tasks.password ? "PASSED: You picked strong passwords that are almost impossible for computers to guess." : "SKIPPED: Your accounts are still using '123456' or names. Hackers can crack these in seconds."}
              />
              <EvaluationRow 
                title="Verification (MFA)" 
                status={state.tasks.mfa ? "PASSED" : (state.vulnerabilities > 700 ? "FAILED" : "SKIPPED")} 
                feedback={state.tasks.mfa ? "PASSED: You didn't fall for the trick. You only let yourself in, not the hackers." : state.vulnerabilities > 700 ? "FAILED: You let a stranger into the system because they sounded urgent. Always stop and think." : "SKIPPED: You didn't set up the extra lock. One password is not enough to stay safe."}
              />
              <EvaluationRow 
                title="The Firewall" 
                status={state.tasks.firewall ? "PASSED" : "SKIPPED"}
                feedback={state.tasks.firewall ? "PASSED: You closed the 'back doors' to the system and checked everyone's bags at the entrance." : "SKIPPED: You left the doors wide open. Anyone can walk in and install a virus."}
              />
              <EvaluationRow 
                title="VPN (Hiding)" 
                status={state.tasks.vpn ? "PASSED" : "SKIPPED"}
                feedback={state.tasks.vpn ? "PASSED: You hid your location, making it impossible for hackers to find where you are." : "SKIPPED: You are browsing in the open. Hackers can see exactly where your office is located."}
              />
              <EvaluationRow 
                title="Encryption" 
                status={state.tasks.encryption ? "PASSED" : "SKIPPED"}
                feedback={state.tasks.encryption ? "PASSED: You scrambled your secret files. Even if a thief steals them, they won't be able to read them." : "SKIPPED: Your files are in plain English. If a hacker gets in, they can read all your secrets."}
              />
            </div>
          </div>
        </div>

        <div style={buttonContainer}>
          {/* leaderboard button only shows if it's not the public web version */}
          {!true && (
            <button onClick={() => navigate('/leaderboard')} style={secondaryBtn}>
              SEE THE TOP SCORES
            </button>
          )}
          
          <button onClick={handleRestart} style={restartBtn}>PLAY AGAIN</button>
        </div>
      </div>
    </div>
  );
}

// little helper component for the feedback rows
const EvaluationRow = ({ title, status, feedback }: { title: string, status: string, feedback: string }) => {
  const color = status === 'PASSED' ? '#00ff88' : '#ff3333';
  return (
    <div style={{ marginBottom: '22px', borderLeft: `3px solid ${color}`, paddingLeft: '18px' }}>
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', letterSpacing: '1px', color: color }}>
          {title.toUpperCase()}
        </span>
        <span style={{ fontSize: '0.6rem', color, border: `1px solid ${color}`, padding: '1px 6px', borderRadius: '2px' }}>
          {status}
        </span>
      </div>
      <p style={{ fontSize: '0.85rem', color: '#88aa99', margin: 0, lineHeight: '1.5' }}>{feedback}</p>
    </div>
  );
};

// basic styling for the layout
const containerStyle: React.CSSProperties = { height: '100vh', width: '100vw', background: '#020502', color: '#00ff88', display: 'flex', flexDirection: 'column', fontFamily: "'Share Tech Mono', monospace", overflowY: 'auto' };
const contentWrapper: React.CSSProperties = { minHeight: '100vh', padding: '40px 50px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box' };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '30px' };
const titleStyle: React.CSSProperties = { fontSize: '2.5rem', margin: 0, letterSpacing: '4px', textShadow: '0 0 10px #00ff88' };
const mainGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '350px 1fr', gap: '40px', width: '100%', maxWidth: '1200px', flexGrow: 1 };
const scoreCard: React.CSSProperties = { background: 'rgba(0,20,0,0.3)', border: '1px solid #004422', padding: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'fit-content' };
const analysisCard: React.CSSProperties = { background: 'rgba(0,10,0,0.6)', border: '1px solid #004422', padding: '30px' };
const sectionTitle: React.CSSProperties = { fontSize: '1rem', color: '#fff', borderBottom: '1px solid #004422', paddingBottom: '10px', marginBottom: '25px' };
const logContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column' };
const buttonContainer: React.CSSProperties = { display: 'flex', gap: '30px', marginTop: '40px', paddingBottom: '40px' };
const restartBtn: React.CSSProperties = { background: '#00ff88', color: '#000', border: 'none', padding: '18px 50px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '2px', fontSize: '1rem' };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: '#00ff88', border: '2px solid #00ff88', padding: '18px 50px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '2px', fontSize: '1rem' };