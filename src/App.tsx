import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";

// --- FAVICON ASSET ---
import favicon from "./assets/favicon.svg";

// Components
import AIHelper from "./components/AIHelper";
import AdOverlay from "./components/AdOverlay"; 

// Pages
import StartMenu from "./pages/StartMenu";
import ConsoleIntro from "./pages/ConsoleIntro";
import ConsoleMenu from "./pages/ConsoleMenu";
import WifiChallenge from "./pages/WifiChallenge";
import VpnChallenge from "./pages/VpnChallenge";
import PasswordChallenge from "./pages/PasswordChallenge";
import FirewallChallenge from "./pages/FirewallChallenge";
import MfaChallenge from "./pages/MfaChallenge";
import EncryptionChallenge from "./pages/EncryptionChallenge";
import ThreatDashboard from "./pages/ThreatDashboard";
import Results from "./pages/Results"; 
import Leaderboard from "./pages/Leaderboard";

/**
 * Main Application Component
 * Managed by React-Router-Dom to simulate a cohesive operating system environment.
 */
export default function App() {
  
  // --- PROGRAMMATIC FAVICON INJECTION ---
  useEffect(() => {
    // Find existing link or create a new one
    const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/svg';
    link.rel = 'icon';
    link.href = favicon;
    
    // Add to head
    document.getElementsByTagName('head')[0].appendChild(link);
    
    // Optional: Set document title globally
    document.title = "REVERSE ESCAPE ROOM";
  }, []);

  return (
    <GameProvider>
      <Router>
        {/* Global Persistence Layer */}
        <AIHelper />
        <AdOverlay /> {/* Triggers distractions when Wi-Fi is compromised */}

        <Routes>
          {/* --- INITIAL FLOW --- */}
          <Route path="/" element={<StartMenu />} />
          <Route path="/intro" element={<ConsoleIntro />} />
          
          {/* Central Hub */}
          <Route path="/console" element={<ConsoleMenu />} />

          {/* --- SECOND SCREEN / MONITOR --- */}
          <Route path="/dashboard" element={<ThreatDashboard />} />
          
          {/* --- DEFENSIVE CHALLENGES --- */}
          
          {/* Teaches SSID/MAC verification and secure protocols */}
          <Route path="/wifi" element={<WifiChallenge />} />
          
          {/* Teaches multi-hop obfuscation and masking origin */}
          <Route path="/vpn" element={<VpnChallenge />} />
          
          {/* Teaches password hardening and entropy */}
          <Route path="/password" element={<PasswordChallenge />} />
          
          {/* Network hardening through port configuration */}
          <Route path="/firewall" element={<FirewallChallenge />} />
          
          {/* Explains secondary verification */}
          <Route path="/mfa" element={<MfaChallenge />} />

          {/* Data Encryption Challenge: Caesar Cipher & Priority Triage */}
          <Route path="/encryption" element={<EncryptionChallenge />} />

          {/* --- FINAL LOCKDOWN RESULTS --- */}
          {/* This handles the scoring and educational debriefing */}
          <Route path="/results" element={<Results />} />

          {/* --- GLOBAL RANKINGS --- */}
          {/* New route for the separate leaderboard screen */}
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* --- CATCH-ALL --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
