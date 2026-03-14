import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import HUD from '../components/HUD';

// assets for sounds
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import typingSoundFile from '../assets/typing.mp3';

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// list of files for the sorting game
const TRIAGE_DATA = [
  { id: 1, name: "PAYROLL.xlsx", encrypted: "ZKIBYVV.hvch", priority: "HIGH", desc: "Employee bank details and salary info." },
  { id: 2, name: "PASSWORDS.txt", encrypted: "ZKCCGYBNC.dhd", priority: "HIGH", desc: "Administrative credentials for the mainframe." },
  { id: 3, name: "CAT_MEMES_VOL2.zip", encrypted: "MKD_WOWOC_FYV2.jsz", priority: "LOW", desc: "Non-essential media files." },
  { id: 4, name: "OFFICE_MENU.pdf", encrypted: "YPPSMO_WOXE.znp", priority: "LOW", desc: "Weekly cafeteria schedule." },
  { id: 5, name: "CLIENTDATA.db", encrypted: "MVSOXDNKDK.nl", priority: "HIGH", desc: "Personal data for 5,000 customers." },
  { id: 6, name: "COFFEE_LOG.log", encrypted: "MYPPOO_VYQ.vyq", priority: "LOW", desc: "Maintenance logs for breakroom hardware." },
  { id: 7, name: "WALLPAPER.png", encrypted: "GKVVZKZOB.zxq", priority: "LOW", desc: "Standard corporate branding imagery." },
  { id: 8, name: "INTERNET_CACHE", encrypted: "SXDOBXOD_MKMRO", priority: "LOW", desc: "Disposable browser cache files." },
  { id: 9, name: "PRINTER_MANUAL.pdf", encrypted: "ZBSXDOB_WKXEKV.znp", priority: "LOW", desc: "Documentation for office hardware." },
];

// decorative scramble effect for the lockdown screen
const ScrambleText = ({ length }: { length: number }) => {
  const [text, setText] = useState("");
  const chars = "!@#$%^&*()_+-=[]{}|;:',.<>/?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  useEffect(() => {
    const interval = setInterval(() => {
      let result = "";
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setText(result);
    }, 60);
    return () => clearInterval(interval);
  }, [length]);
  return <span style={{ color: '#00ff88', opacity: 0.8 }}>{text}</span>;
};

export default function EncryptionChallenge() {
  const { state, completeTask } = useGame();
  const navigate = useNavigate();

  // keeping track of which part of the challenge the player is on
  const [phase, setPhase] = useState<'INTRO' | 'TRIAGE' | 'QUIZ' | 'ENCRYPTING' | 'SUCCESS'>('INTRO');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [vaultFiles, setVaultFiles] = useState<any[]>([]);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);

  // score tracking
  const [mistakeCount, setMistakeCount] = useState(0);
  const [successfullyEncrypted, setSuccessfullyEncrypted] = useState<any[]>([]);

  // mouse and touch dragging logic
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  // quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [animStep, setAnimStep] = useState(0);
  
  // shift key for the online cipher tool
  const [cipherShift, setCipherShift] = useState<string | number>(0);

  const typingAudio = useRef(new Audio(typingSoundFile));
  const correctAudio = useRef(new Audio(correctSound));
  const wrongAudio = useRef(new Audio(wrongSound));

  const [introText, setIntroText] = useState("");
  const fullIntro = "Encryption is the process of scrambling plaintext into unreadable ciphertext using a mathematical algorithm and a secret key. Even if the hacker breaches our servers, they cannot read sensitive data without the specific Cypher Key. Your mission: Decide which files are our high-priority assets and encrypt them.";

  // stop them from playing again if they already finished
  if (state.tasks.encryption) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={modalStyle}>
          <h2 style={glowText}>ENCRYPTION_COMPLETE</h2>
          <p>This sector's data triage and cryptographic protocols are active. The vault is secure.</p>
          <button onClick={() => navigate('/console')} style={actionBtn}>RETURN TO CONSOLE</button>
        </div>
      </div>
    );
  }

  // handles the typewriter effect on start
  useEffect(() => {
    if (phase !== 'INTRO') {
      typingAudio.current.pause();
      typingAudio.current.currentTime = 0;
      return;
    }
    let i = 0;
    typingAudio.current.loop = true;
    typingAudio.current.play().catch(() => {});
    const interval = setInterval(() => {
      setIntroText(fullIntro.substring(0, i));
      i++;
      if (i > fullIntro.length) {
        clearInterval(interval);
        typingAudio.current.pause();
      }
    }, 25);
    return () => { clearInterval(interval); typingAudio.current.pause(); };
  }, [phase]);

  // timer for the final loading bar animation
  useEffect(() => {
    if (phase !== 'ENCRYPTING') return;
    setTimeout(() => setAnimStep(1), 500);
    setTimeout(() => setAnimStep(2), 3000);
    setTimeout(() => setPhase('SUCCESS'), 5000);
  }, [phase]);

  // logic for when a card is swiped or clicked
  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeDir || phase !== 'TRIAGE') return;

    const currentFile = TRIAGE_DATA[currentIndex];
    setSwipeDir(direction);
    // high priority files must go right to the vault
    const isCorrect = (direction === 'right' && currentFile.priority === 'HIGH') || 
                      (direction === 'left' && currentFile.priority === 'LOW');

    setTimeout(() => {
      if (isCorrect) {
        correctAudio.current.currentTime = 0;
        correctAudio.current.play().catch(() => {});
      } else {
        wrongAudio.current.currentTime = 0;
        wrongAudio.current.play().catch(() => {});
        setMistakeCount(prev => prev + 1);
      }
      if (direction === 'right') setVaultFiles(prev => [...prev, currentFile]);
      
      // move to next card or start the quiz
      if (currentIndex < TRIAGE_DATA.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSwipeDir(null);
        setOffsetX(0);
      } else {
        if (vaultFiles.length === 0 && direction !== 'right') setPhase('SUCCESS');
        else setPhase('QUIZ');
      }
    }, 400);
  };

  // checking quiz answers
  const handleQuizChoice = (choice: string) => {
    if (quizFeedback) return;
    setSelectedChoice(choice);
    const currentFile = vaultFiles[quizIndex];
    const isCorrect = choice === currentFile.encrypted;
    
    if (isCorrect) {
      setQuizFeedback('CORRECT');
      correctAudio.current.currentTime = 0;
      correctAudio.current.play().catch(() => {});
      setSuccessfullyEncrypted(prev => [...prev, currentFile]);
    } else {
      setQuizFeedback('WRONG');
      wrongAudio.current.currentTime = 0;
      wrongAudio.current.play().catch(() => {});
      setMistakeCount(prev => prev + 1);
    }

    setTimeout(() => {
      setQuizFeedback(null);
      setSelectedChoice(null);
      if (quizIndex < vaultFiles.length - 1) {
        setQuizIndex(prev => prev + 1);
      } else {
        const finalPoolSize = isCorrect ? successfullyEncrypted.length + 1 : successfullyEncrypted.length;
        if (finalPoolSize > 0) setPhase('ENCRYPTING');
        else setPhase('SUCCESS');
      }
    }, 1200);
  };

  // calculate the final score and send it to the game context
  const finalizeChallenge = () => {
    let scoreReduction = 0;
    if (mistakeCount === 0) scoreReduction = 100;
    else if (mistakeCount === 1) scoreReduction = 75;
    else if (mistakeCount === 2) scoreReduction = 50;
    else if (mistakeCount === 3) scoreReduction = 25;
    else scoreReduction = 0;

    completeTask('encryption', scoreReduction);
    navigate('/console');
  };

  // handles mouse down for swiping
  const onDragStart = (e: any) => { 
    if (!swipeDir && phase === 'TRIAGE') { 
      setIsDragging(true); 
      setDragStartX('touches' in e ? e.touches[0].clientX : e.clientX); 
    } 
  };

  // tracks mouse movement to slide the card
  const onDragMove = (e: any) => { 
    if (isDragging && !swipeDir) { 
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX; 
      setOffsetX(x - dragStartX); 
    } 
  };

  // fires when you let go of the card
  const onDragEnd = () => { 
    if (isDragging) { 
      setIsDragging(false); 
      if (offsetX > 120) handleSwipe('right'); 
      else if (offsetX < -120) handleSwipe('left'); 
      else setOffsetX(0); 
    } 
  };

  // builds the multiple choice options for the quiz
  const quizOptions = useMemo(() => {
    if (phase !== 'QUIZ' || !vaultFiles[quizIndex]) return [];
    const correct = vaultFiles[quizIndex].encrypted;
    const distractors = TRIAGE_DATA.filter(d => d.encrypted !== correct).sort(() => 0.5 - Math.random()).slice(0, 2).map(d => d.encrypted);
    return [correct, ...distractors].sort(() => 0.5 - Math.random());
  }, [phase, quizIndex, vaultFiles]);

  if (phase === 'INTRO') return (
    <div style={containerStyle}>
      <HUD />
      <div style={modalStyle}>
        <h2 style={glowText}>ENCRYPTION_TRIAGE_INIT</h2>
        <p style={{ lineHeight: '1.6', height: '110px' }}>{introText}</p>
        {introText.length >= fullIntro.length && <button onClick={() => setPhase('TRIAGE')} style={actionBtn}>INITIALIZE TRIAGE</button>}
      </div>
    </div>
  );

  return (
    <div style={containerStyle} onMouseMove={onDragMove} onMouseUp={onDragEnd} onTouchMove={onDragMove} onTouchEnd={onDragEnd}>
      <HUD />
      
      {/* this container scales the triage and quiz layout to fit the screen better */}
      <div style={{ display: 'flex', width: '100%', height: 'calc(100% - 100px)', alignItems: 'center', justifyContent: 'center', gap: '40px', padding: '20px 40px', marginTop: '40px' }}>
        
        {/* sidebar tool for the quiz phase */}
        {phase === 'QUIZ' && (
            <div style={sidebarStyle}>
            <strong style={{ color: '#00ff88', fontSize: '1.2rem' }}>HOW IT WORKS:</strong>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', marginTop: '15px' }}>
                A Caesar Cipher shifts the alphabet by a fixed number. If the key is 3, A becomes D.
            </p>
            <div style={{ padding: '10px', background: 'rgba(255,165,0,0.1)', borderLeft: '3px solid #ffa500', fontSize: '0.85rem' }}>
                <strong>TOOL:</strong> Use the wheel below to simulate the shift.
            </div>

            {true && (
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <div style={{ position: 'relative', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ ...wheelBase, transform: `rotate(-${Number(cipherShift) * (360/26)}deg)` }}>
                        {ALPHABET.map((letter, i) => (
                        <div key={i} style={{ ...letterStyle, transform: `rotate(${i * (360/26)}deg) translateY(-85px)` }}>{letter}</div>
                        ))}
                    </div>
                    <div style={innerWheel}>
                        {ALPHABET.map((letter, i) => (
                        <div key={i} style={{ ...letterStyle, transform: `rotate(${i * (360/26)}deg) translateY(-55px)`, fontSize: '0.6rem', color: '#00ffff' }}>{letter}</div>
                        ))}
                    </div>
                </div>
                <div style={{ marginTop: '20px' }}>
                    <label style={{ fontSize: '0.7rem' }}>KEY_SHIFT (0-25):</label>
                    <input 
                        type="number" 
                        min="0" max="25" 
                        value={cipherShift} 
                        onChange={(e) => setCipherShift(e.target.value === '' ? '' : Number(e.target.value))} 
                        style={cipherInput} 
                    />
                </div>
                </div>
            )}
            </div>
        )}

        {/* main gameplay section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {phase === 'TRIAGE' && (
            <>
              <header style={{ textAlign: 'center', marginBottom: '15px' }}>
                <h1 style={{ ...glowText, fontSize: '1.8rem' }}>PHASE_01: DATA_TRIAGE</h1>
                <p style={instructionStyle}>SWIPE RIGHT for sensitive // SWIPE LEFT for low priority</p>
              </header>
              <div style={swiperArea}>
                <div onMouseDown={onDragStart} onTouchStart={onDragStart} style={{ ...cardStyle, transform: swipeDir === 'right' ? 'translateX(1000px) rotate(45deg)' : swipeDir === 'left' ? 'translateX(-1000px) rotate(-45deg)' : `translateX(${offsetX}px) rotate(${offsetX / 15}deg)`, opacity: swipeDir ? 0 : 1, transition: isDragging ? 'none' : 'all 0.4s ease-out' }}>
                  <div style={cardHeader}>NODE_ID: {TRIAGE_DATA[currentIndex].id}</div>
                  <div style={{ fontSize: '3.5rem', margin: '10px 0' }}>📄</div>
                  <h2 style={fileName}>{TRIAGE_DATA[currentIndex].name}</h2>
                  <p style={fileDesc}>{TRIAGE_DATA[currentIndex].desc}</p>
                  {offsetX > 50 && <div style={vaultIndicator}>VAULT</div>}
                  {offsetX < -50 && <div style={discardIndicator}>DISCARD</div>}
                </div>
                <div style={controlArea}>
                  <button style={discardBtn} onClick={() => handleSwipe('left')}>← DISCARD</button>
                  <button style={vaultBtn} onClick={() => handleSwipe('right')}>VAULT →</button>
                </div>
              </div>
            </>
          )}

          {phase === 'QUIZ' && (
            <div style={quizContainer}>
              <h1 style={{ ...glowText, fontSize: '1.8rem' }}>PHASE_02: CIPHER_VERIFICATION</h1>
              <div style={quizQuestionCard}>
                <div style={questionFileName}>{vaultFiles[quizIndex].name}</div>
                <div style={scrambleVisual}>{"<< ONE GUESS PERMITTED >>"}</div>
              </div>
              <div style={optionsGrid}>
                {quizOptions.map((option, idx) => (
                  <button key={idx} onClick={() => handleQuizChoice(option)} style={{ ...optionBtnStyle, background: (quizFeedback === 'CORRECT' && option === vaultFiles[quizIndex].encrypted) ? '#00ff88' : (quizFeedback === 'WRONG' && option === selectedChoice) ? '#ff3333' : (quizFeedback === 'WRONG' && option === vaultFiles[quizIndex].encrypted) ? '#00ff88' : idx === 0 ? '#e21b3c' : idx === 1 ? '#1368ce' : '#ffa602', opacity: quizFeedback && option !== selectedChoice && option !== vaultFiles[quizIndex].encrypted ? 0.3 : 1 }}>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'ENCRYPTING' && (
            <div style={{...modalStyle, width: '800px', margin: 0}}>
              <h2 style={glowText}>VAULT_LOCKDOWN_IN_PROGRESS...</h2>
              <div style={animListContainer}>
                {successfullyEncrypted.map((f, i) => (
                  <div key={i} style={animFileRow}>
                    <div style={{flex: 1, textAlign: 'left', fontWeight: 'bold'}}>
                      {animStep === 0 ? f.name : animStep === 1 ? <ScrambleText length={f.name.length} /> : f.encrypted}
                    </div>
                    {animStep === 2 && <span style={{color: '#00ff88'}}>LOCKED ✓</span>}
                  </div>
                ))}
              </div>
              <div style={progressBarContainer}><div style={{...progressBarInner, width: animStep === 0 ? '0%' : animStep === 1 ? '60%' : '100%'}} /></div>
            </div>
          )}

          {phase === 'SUCCESS' && (
            <div style={{...modalStyle, margin: 0}}>
              <h2 style={glowText}>VAULT_LOCKED</h2>
              <p>Triage and verification complete. High-priority assets are now protected.</p>
              <button onClick={finalizeChallenge} style={actionBtn}>RETURN TO CONSOLE</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// all the styles for cards and modals
const containerStyle: React.CSSProperties = { height: '100vh', width: '100vw', background: '#020502', color: '#00ff88', fontFamily: "'Share Tech Mono', monospace", display: 'flex', flexDirection: 'column', overflow: 'hidden', userSelect: 'none' };
const sidebarStyle: React.CSSProperties = { width: "300px", background: "rgba(0,20,0,0.8)", padding: "20px", border: "1px solid #005522", height: "fit-content" };
const modalStyle: React.CSSProperties = { margin: 'auto', width: '650px', padding: '40px', border: '2px solid #00ff88', background: '#000', textAlign: 'center', boxShadow: '0 0 40px rgba(0,255,136,0.3)' };
const glowText: React.CSSProperties = { margin: 0, color: '#fff', textShadow: '0 0 10px #00ff88', letterSpacing: '2px' };
const instructionStyle: React.CSSProperties = { color: '#008844', fontSize: '0.85rem', margin: '5px 0 0 0', letterSpacing: '1px', fontWeight: 'bold' };
const actionBtn: React.CSSProperties = { width: '100%', padding: '15px', background: '#00ff88', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px', fontFamily: 'inherit' };
const swiperArea: React.CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' };
const cardStyle: React.CSSProperties = { width: '320px', height: '400px', background: 'rgba(0,25,0,0.95)', border: '2px solid #005522', borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', position: 'relative', touchAction: 'none' };
const cardHeader: React.CSSProperties = { fontSize: '0.7rem', color: '#00ff88', opacity: 0.5, alignSelf: 'flex-start' };
const fileName: React.CSSProperties = { fontSize: '1.2rem', color: '#fff', marginBottom: '10px' };
const fileDesc: React.CSSProperties = { fontSize: '0.85rem', color: '#88aa99', lineHeight: '1.4' };
const controlArea: React.CSSProperties = { display: 'flex', gap: '20px', marginTop: '25px' };
const discardBtn: React.CSSProperties = { padding: '12px 25px', border: '1px solid #ff3333', color: '#ff3333', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' };
const vaultBtn: React.CSSProperties = { padding: '12px 25px', background: '#00ff88', color: '#000', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' };
const vaultIndicator: React.CSSProperties = { position: 'absolute', top: '15px', right: '15px', color: '#00ff88', border: '2px solid #00ff88', padding: '5px 10px', fontWeight: 'bold', borderRadius: '4px', transform: 'rotate(15deg)' };
const discardIndicator: React.CSSProperties = { position: 'absolute', top: '15px', left: '15px', color: '#ff3333', border: '2px solid #ff3333', padding: '5px 10px', fontWeight: 'bold', borderRadius: '4px', transform: 'rotate(-15deg)' };
const quizContainer: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '550px', textAlign: 'center' };
const quizQuestionCard: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid #005522', padding: '30px', textAlign: 'center', borderRadius: '8px' };
const questionFileName: React.CSSProperties = { fontSize: '2.2rem', color: '#fff', fontWeight: 'bold', marginBottom: '10px' };
const scrambleVisual: React.CSSProperties = { fontSize: '0.7rem', color: '#00ff88', letterSpacing: '4px', opacity: 0.6 };
const optionsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr', gap: '12px' };
const optionBtnStyle: React.CSSProperties = { border: 'none', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontFamily: 'inherit', color: '#fff', fontSize: '1rem', fontWeight: 'bold' };
const animListContainer: React.CSSProperties = { margin: '20px 0', border: '1px solid #003311', background: '#050505', padding: '20px', borderRadius: '4px' };
const animFileRow: React.CSSProperties = { display: 'flex', padding: '10px 0', borderBottom: '1px solid #001100', fontFamily: 'Share Tech Mono', fontSize: '0.9rem' };
const progressBarContainer: React.CSSProperties = { height: '8px', width: '100%', background: '#001100', borderRadius: '4px', overflow: 'hidden' };
const progressBarInner: React.CSSProperties = { height: '100%', background: '#00ff88', transition: 'width 2.5s ease-in-out' };

// styles for the digital wheel component
const wheelBase: React.CSSProperties = { width: '200px', height: '200px', border: '2px solid #00ff88', borderRadius: '50%', position: 'absolute', transition: 'transform 0.5s ease' };
const innerWheel: React.CSSProperties = { width: '120px', height: '120px', border: '1px solid #00ffff', borderRadius: '50%', position: 'absolute' };
const letterStyle: React.CSSProperties = { position: 'absolute', left: '50%', top: '50%', width: '20px', marginLeft: '-10px', marginTop: '-10px', textAlign: 'center', fontSize: '0.8rem' };
const cipherInput: React.CSSProperties = { width: '100%', padding: '10px', background: '#000', border: '1px solid #00ff88', color: '#00ff88', marginTop: '5px', textAlign: 'center', fontFamily: 'inherit' };