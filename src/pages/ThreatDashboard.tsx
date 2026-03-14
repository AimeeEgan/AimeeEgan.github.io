import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import type { FeatureCollection } from "geojson";
import FinancialRiskGraph from "../components/FinancialRiskGraph";

type DashboardState = "DORMANT" | "BOOTING" | "ACTIVE";

const ThreatMap = ({ tasks }: { tasks: Record<string, boolean> }) => {
  const mapRef = useRef<SVGSVGElement | null>(null);
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const completedCount = Object.values(tasks).filter(Boolean).length;
  const threatRadius = Math.max(10, 130 - (completedCount * 18));

  useEffect(() => {
    fetch("/world-geojson.json").then(res => res.json()).then(data => setWorldData(data));
  }, []);

  useEffect(() => {
    if (!mapRef.current || !worldData) return;
    const svg = d3.select(mapRef.current); svg.selectAll("*").remove();
    const projection = d3.geoMercator().scale(105).translate([250, 170]);
    const path = d3.geoPath(projection);
    const g = svg.append("g");
    
    g.selectAll("path").data(worldData.features).enter().append("path")
      .attr("d", path as any).attr("fill", "#001a00").attr("stroke", "#00ff8811").attr("stroke-width", 0.5);
    
    const targetCoords = projection([2.2137, 46.2276]); // France
    if (targetCoords) {
      const circle = g.append("circle")
        .attr("cx", targetCoords[0]).attr("cy", targetCoords[1])
        .attr("r", threatRadius).attr("fill", "rgba(255, 0, 0, 0.2)")
        .attr("stroke", "#ff3333").attr("stroke-width", 1);

      function pulse() {
        circle.transition().duration(2000).ease(d3.easeSinInOut).attr("r", threatRadius + 8).attr("opacity", 0.6)
          .transition().duration(2000).ease(d3.easeSinInOut).attr("r", threatRadius).attr("opacity", 1).on("end", pulse);
      }
      pulse();
    }
  }, [worldData, threatRadius]);

  return <svg ref={mapRef} viewBox="0 0 500 300" style={{ width: '100%', height: '100%' }} />;
};

export default function ThreatDashboard() {
  const [viewState, setViewState] = useState<DashboardState>("DORMANT");
  const [gameData, setGameData] = useState<any>({
    vulnerabilities: 700,
    tasks: { wifi: false, vpn: false, password: false, firewall: false, mfa: false, forensics: false, incident: false }
  });

  const taskLabels: Record<string, string> = {
    wifi: "WiFi Protocol Secure", vpn: "VPN Tunnel Established", password: "Authentication Keys Hardened",
    firewall: "Firewall Rules Active", mfa: "Multi-Factor Auth Synced", forensics: "Forensic Trace Complete", incident: "Incident Report Filed"
  };

  useEffect(() => {
    const syncState = () => {
      const saved = localStorage.getItem('cyber_escape_state');
      if (saved) {
        const parsed = JSON.parse(saved); setGameData(parsed);
        if (!parsed.tasks?.wifi && viewState !== "DORMANT") setViewState("DORMANT");
        else if (parsed.tasks?.wifi && viewState === "DORMANT") setViewState("BOOTING");
      }
    };
    syncState();
    window.addEventListener('storage', syncState);
    return () => window.removeEventListener('storage', syncState);
  }, [viewState]);

  useEffect(() => {
    if (viewState === "BOOTING") {
      const msgs = ["{'>'} SYNC_CORE...", "{'>'} MONITOR_LIVE."];
      let i = 0;
      const interval = setInterval(() => {
        if (i >= msgs.length) { clearInterval(interval); setTimeout(() => setViewState("ACTIVE"), 400); }
      }, 400);
      return () => clearInterval(interval);
    }
  }, [viewState]);

  const currentTasks = gameData.tasks;
  const progressPercent = Math.round(((700 - gameData.vulnerabilities) / 700) * 100);
  const vColor = gameData.vulnerabilities > 400 ? '#ff3333' : gameData.vulnerabilities > 0 ? '#ffff33' : '#00ff88';

  if (viewState === "DORMANT") return <div style={containerStyle}><div style={panelStyle}><h1>[OFFLINE]</h1></div></div>;

  return (
    <div style={gridContainerStyle}>
      <div style={{ ...containerStyle, padding: '20px', background: 'transparent' }}>
        <header style={headerStyle}>
          <div style={{ 
            fontSize: '1.4rem', letterSpacing: '3px', color: '#ffffff', fontWeight: 'bold',
            textShadow: '0 0 10px rgba(0, 255, 136, 0.8), 0 0 20px rgba(0, 255, 136, 0.5)' 
          }}>
            SECURITY_DASHBOARD
          </div>
          <div style={{ color: vColor, fontWeight: 'bold', fontSize: '1.3rem' }}>VULNERABILITIES: {gameData.vulnerabilities}</div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexGrow: 1, maxHeight: 'calc(100vh - 100px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                <h2 style={sectionHeadingStyle}>LOCKDOWN_STATUS</h2>
                <span style={{ fontSize: '1.1rem', color: vColor, fontWeight: 'bold' }}>{progressPercent}% COMPLETE</span>
              </div>
              <div style={trackContainerStyle}>
                <span style={{ fontSize: '1.5rem', opacity: gameData.vulnerabilities === 0 ? 0.1 : 1 }}>💀</span>
                <div style={{ flexGrow: 1, position: 'relative', height: '30px', display: 'flex', alignItems: 'center', margin: '0 20px' }}>
                  <div style={{ position: 'absolute', width: '100%', height: '2px', background: '#003311' }} />
                  <div style={{ position: 'absolute', width: `${(gameData.vulnerabilities / 700) * 100}%`, height: '2px', background: '#ff3333', transition: '1s' }} />
                  <div style={{ position: 'absolute', width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    {Object.keys(currentTasks).map((t) => (
                      <div key={t} title={taskLabels[t]} style={{ 
                        width: '20px', height: currentTasks[t] ? '30px' : '6px', background: currentTasks[t] ? '#00ff88' : '#004422', 
                        transition: '0.4s', display: 'flex', justifyContent: 'center', cursor: currentTasks[t] ? 'help' : 'default' 
                      }}>
                        {currentTasks[t] && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{ marginTop: '8px' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <span style={{ fontSize: '1.5rem' }}>🏦</span>
              </div>
            </div>

            <div style={{ ...panelStyle, flexGrow: 1 }}>
              <h2 style={sectionHeadingStyle}>PINPOINTING_HACKER_LOCATION</h2>
              <div style={{ flexGrow: 1, overflow: 'hidden' }}><ThreatMap tasks={currentTasks} /></div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ ...panelStyle, height: '180px', background: '#000800' }}>
              <h2 style={sectionHeadingStyle}>DEFENSE_LOG</h2>
              <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', overflowY: 'auto' }}>
                 {Object.keys(currentTasks).filter(k => currentTasks[k]).map(k => (
                   <div key={k} style={{ color: '#00ff88', marginBottom: '8px', borderLeft: '2px solid #00ff88', paddingLeft: '8px' }}>
                     {'{'}{'>'}{'}'} SECURED: {k.toUpperCase()}_SECTOR<br/>{'{'}+{'}'} 100_VULNERABILITIES_PATCHED
                   </div>
                 ))}
              </div>
            </div>

            <FinancialRiskGraph vulnerabilities={gameData.vulnerabilities} />

            <div style={{ ...panelStyle, background: 'rgba(15, 0, 0, 0.9)', borderColor: '#ff333344' }}>
              <h2 style={{ ...sectionHeadingStyle, color: '#ff3333', borderColor: '#ff333322' }}>INCOMING_THREAT_VECTORS</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={statBoxStyle} title="BRUTE_FORCE: Automated password guessing attacks."><div style={{ fontSize: '2rem', color: '#ff3333', fontWeight: 'bold' }}>1,284</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>BRUTE_FORCE_ATTEMPTS</div></div>
                <div style={statBoxStyle} title="PACKET_SNIFFING: Intercepting network traffic for data theft."><div style={{ fontSize: '2rem', color: '#ff3333', fontWeight: 'bold' }}>943</div><div style={{ fontSize: '0.6rem', opacity: 0.7 }}>PACKET_INTERCEPTS</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const statBoxStyle: React.CSSProperties = { background: 'rgba(50, 0, 0, 0.2)', border: '1px solid #ff333322', padding: '12px', textAlign: 'center', borderRadius: '4px', cursor: 'help' };
const containerStyle: React.CSSProperties = { width: '100vw', height: '100vh', color: '#00ff88', display: 'flex', flexDirection: 'column', fontFamily: "'Share Tech Mono', monospace", overflow: 'hidden', boxSizing: 'border-box' };
const gridContainerStyle: React.CSSProperties = { ...containerStyle, backgroundColor: '#020502', backgroundImage: `linear-gradient(rgba(0, 255, 136, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.05) 1px, transparent 1px)`, backgroundSize: '30px 30px' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #005522', padding: '10px 40px', background: 'rgba(0,15,0,0.2)' };
const panelStyle: React.CSSProperties = { border: '1px solid #005522', background: 'rgba(0,10,0,0.85)', padding: '20px', borderRadius: '4px', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const sectionHeadingStyle: React.CSSProperties = { fontSize: '0.9rem', color: '#00ff88', opacity: 0.8, letterSpacing: '3px', marginBottom: '10px', borderBottom: '1px solid #003311', paddingBottom: '5px', fontWeight: 'bold' };
const trackContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', background: '#050505', padding: '15px', borderRadius: '4px', border: '1px solid #111' };