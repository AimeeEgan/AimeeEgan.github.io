import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// audio assets for time warnings
import alert15 from '../assets/15mins.mp3';
import alertHalf from '../assets/halfway.mp3';
import alert5 from '../assets/5mins.mp3';
import alert2 from '../assets/2mins.mp3';

export type TaskKeys = 'wifi' | 'vpn' | 'password' | 'firewall' | 'mfa' | 'encryption' | 'forensics' | 'incident';

type GameState = {
  vulnerabilities: number; 
  timeLeft: number;
  isGameOver: boolean;
  isPaused: boolean; 
  isDecisionPhase: boolean; // track the 15-minute expiration choice
  tasks: Record<TaskKeys, boolean>;
  wifiCompromised: boolean; 
};

type GameContextType = {
  state: GameState;
  penalize: (amount: number) => void;
  completeTask: (task: TaskKeys, reduction: number) => void;
  setWifiCompromised: (status: boolean) => void;
  pauseTimer: () => void; 
  extendTime: (seconds: number) => void; 
  resetGame: () => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

// constants
const START_TIME = 15 * 60; 
const START_VULNERABILITIES = 700; 
const VULNERABILITY_CAP = 5000; 

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem('cyber_escape_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          isPaused: false,
          isDecisionPhase: false, // reset decision phase on refresh
          vulnerabilities: parsed.vulnerabilities ?? START_VULNERABILITIES
        };
      } catch (e) {
        console.error("Failed to parse saved state:", e);
      }
    }
    return {
      vulnerabilities: START_VULNERABILITIES,
      timeLeft: START_TIME,
      isGameOver: false,
      isPaused: false,
      isDecisionPhase: false,
      tasks: { 
        wifi: false, vpn: false, password: false, firewall: false, 
        mfa: false, encryption: false, forensics: false, incident: false 
      },
      wifiCompromised: false
    };
  });

  // keeps track of which warnings have already been played to avoid repeats
  const playedAlerts = useRef({
    start: false,
    halfway: false,
    fiveMin: false,
    twoMin: false
  });

  // helper function to play the tts files
  const playWarning = (file: string) => {
    const audio = new Audio(file);
    audio.play().catch(e => console.warn("audio playback blocked by browser:", e));
  };

  // 1. MAIN GAME TIMER WITH DECISION PHASE & AUDIO LOGIC
  useEffect(() => {
    if (state.isGameOver || state.isPaused) return;

    // trigger decision phase when time hits zero
    if (state.timeLeft <= 0) {
        if (!state.isDecisionPhase) {
            setState(prev => ({ ...prev, isDecisionPhase: true }));
        }
        return;
    }

    // time-based audio warning triggers
    const time = state.timeLeft;
    
    // 15 minute mark (start)
    if (time === 900 && !playedAlerts.current.start) {
        playWarning(alert15);
        playedAlerts.current.start = true;
    } 
    // halfway mark (7m 30s)
    else if (time === 450 && !playedAlerts.current.halfway) {
        playWarning(alertHalf);
        playedAlerts.current.halfway = true;
    }
    // 5 minutes remaining
    else if (time === 300 && !playedAlerts.current.fiveMin) {
        playWarning(alert5);
        playedAlerts.current.fiveMin = true;
    }
    // 2 minutes remaining
    else if (time === 120 && !playedAlerts.current.twoMin) {
        playWarning(alert2);
        playedAlerts.current.twoMin = true;
    }

    const timer = setInterval(() => {
      setState(prev => ({
        ...prev,
        timeLeft: prev.timeLeft - 1
      }));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [state.timeLeft, state.isGameOver, state.isPaused, state.isDecisionPhase]);

  // 2. PASSIVE VULNERABILITY LEAK
  useEffect(() => {
    if (!state.wifiCompromised || state.isGameOver || state.isPaused || state.isDecisionPhase) return;
    
    const leakInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        vulnerabilities: Math.min(VULNERABILITY_CAP, prev.vulnerabilities + 5)
      }));
    }, 3000);

    return () => clearInterval(leakInterval);
  }, [state.wifiCompromised, state.isGameOver, state.isPaused, state.isDecisionPhase]);

  // actions
  const pauseTimer = () => setState(prev => ({ ...prev, isPaused: true }));

  const extendTime = (seconds: number) => {
    setState(prev => ({ 
        ...prev, 
        timeLeft: prev.timeLeft + seconds,
        isDecisionPhase: false // resume game and hide decision modal
    }));
  };

  const penalize = (amount: number) => {
    setState(prev => ({ 
      ...prev, 
      vulnerabilities: Math.min(VULNERABILITY_CAP, prev.vulnerabilities + amount) 
    }));
  };

  const setWifiCompromised = (status: boolean) => {
    setState(prev => ({ ...prev, wifiCompromised: status }));
  };

  const completeTask = (task: TaskKeys, reduction: number) => {
    setState(prev => {
      const newState = {
        ...prev,
        vulnerabilities: Math.max(0, prev.vulnerabilities - reduction),
        tasks: { ...prev.tasks, [task]: true },
        wifiCompromised: task === 'wifi' && reduction > 0 ? false : prev.wifiCompromised 
      };
      localStorage.setItem('cyber_escape_state', JSON.stringify(newState));
      return newState;
    });
  };

  const resetGame = () => {
    // reset audio alerts memory
    playedAlerts.current = { start: false, halfway: false, fiveMin: false, twoMin: false };
    
    const newState = {
      vulnerabilities: START_VULNERABILITIES,
      timeLeft: START_TIME,
      isGameOver: false,
      isPaused: false,
      isDecisionPhase: false,
      tasks: { 
        wifi: false, vpn: false, password: false, firewall: false, 
        mfa: false, encryption: false, forensics: false, incident: false 
      },
      wifiCompromised: false
    };
    setState(newState);
    localStorage.setItem('cyber_escape_state', JSON.stringify(newState));
  };

  return (
    <GameContext.Provider value={{ state, penalize, completeTask, setWifiCompromised, pauseTimer, extendTime, resetGame }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};