import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom"; 
import { useGame } from "../context/GameContext"; 
import type { FeatureCollection, Feature } from "geojson";
import HUD from "../components/HUD"; 

// sounds for clicks and typing
import correctSound from '../assets/correct.mp3';
import wrongSound from '../assets/wrong.mp3';
import typingSoundFile from '../assets/typing.mp3';

// country lists sorted by difficulty for the random target generator
const EASY_LIST = ["United States of America", "Germany", "France", "Spain","Canada","Italy","Madagascar"];
const MEDIUM_LIST = ["South Korea", "Brazil", "Portugal", "Japan", "Iceland","Norway","Australia","India"];
const HARD_LIST = ["Taiwan", "Hungary", "Chile", "South Africa", "New Zealand","Peru"];


const getRandomCountry = (list: string[]) => {
  return list[Math.floor(Math.random() * list.length)];
};

export default function VpnChallenge() {
  const navigate = useNavigate(); 
  const { state, completeTask } = useGame(); 
  
  // refs for map and sound engine
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [worldData, setWorldData] = useState<FeatureCollection | null>(null);
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [targetCountries, setTargetCountries] = useState<string[]>([]);
  const [showIntro, setShowIntro] = useState(true); 
  const [guessesLeft, setGuessesLeft] = useState(3);
  const [isComplete, setIsComplete] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  // briefing text animation state
  const [introLines, setIntroLines] = useState<string[]>([]);
  const [typingComplete, setTypingComplete] = useState(false);
  const typingAudio = useRef(new Audio(typingSoundFile));

  // low latency sound setup
  const audioCtx = useRef<AudioContext | null>(null);
  const buffers = useRef<Record<string, AudioBuffer>>({});

  useEffect(() => {
    audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const loadSound = async (name: string, url: string) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const decodedData = await audioCtx.current!.decodeAudioData(arrayBuffer);
      buffers.current[name] = decodedData;
    };
    loadSound('correct', correctSound);
    loadSound('wrong', wrongSound);
  }, []);

  const playInstantSound = (name: 'correct' | 'wrong') => {
    if (!audioCtx.current || !buffers.current[name]) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();
    const source = audioCtx.current.createBufferSource();
    source.buffer = buffers.current[name];
    source.connect(audioCtx.current.destination);
    source.start(0);
  };

  const introScript = [
    { text: "SECURE_TUNNEL_LOGISTICS", color: "#00ff88", isHeader: true },
    { text: "A Virtual Private Network (VPN) creates a private, encrypted tunnel over a public network. By routing your traffic through multiple countries (multi-hop), you mask your true location.", color: "#fff", isHeader: false },
    { text: "MISSION: Establish a 3-node multi-hop relay to hide the BoE mainframe traffic.", color: "#00ff88", isHeader: false }
  ];

  // handles the scrolling text for the intro
  useEffect(() => {
    if (!showIntro) return;
    typingAudio.current.loop = true;
    let lineIdx = 0; let charIdx = 0; let currentLines = [""];
    const typeWriter = () => {
      if (lineIdx === 0 && charIdx === 0) typingAudio.current.play().catch(() => {});
      if (lineIdx >= introScript.length) { setTypingComplete(true); typingAudio.current.pause(); return; }
      const fullText = introScript[lineIdx].text;
      currentLines[currentLines.length - 1] = fullText.substring(0, charIdx + 1);
      setIntroLines([...currentLines]);
      charIdx++;
      if (charIdx === fullText.length) {
        lineIdx++; charIdx = 0;
        if (lineIdx < introScript.length) { currentLines.push(""); setTimeout(typeWriter, 500); }
        else { typeWriter(); }
      } else { setTimeout(typeWriter, 25); }
    };
    typeWriter();
    return () => { typingAudio.current.pause(); };
  }, [showIntro]);

  // get the map data and pick target countries on load
  useEffect(() => {
    setTargetCountries([getRandomCountry(EASY_LIST), getRandomCountry(MEDIUM_LIST), getRandomCountry(HARD_LIST)]);
    fetch("/world-geojson.json").then(res => res.json()).then(data => setWorldData(data));
  }, []);

  // check if they already finished this task
  if (state.tasks.vpn) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={modalBoxStyle}>
          <h2 style={{ fontSize: '2rem' }}>CONNECTION_STABLE</h2>
          <p style={{ color: '#88aa99', marginBottom: '30px' }}>The VPN multi-hop circuit is already locked.</p>
          <button onClick={() => navigate("/console")} style={buttonStyle}>RETURN TO CONSOLE</button>
        </div>
      </div>
    );
  }

  // huge block of code to handle the big d3 world map
  useEffect(() => {
    if (!svgRef.current || !worldData || targetCountries.length < 3 || showIntro || isLockedOut || isComplete) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const width = 1100; const height = 600;
    
    // settings for the map view projection
    const projection = d3.geoMercator().scale(150).translate([width / 2, height / 1.4]);
    const path = d3.geoPath(projection);

    // floating text box for country names
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute").style("background", "#002211").style("color", "#00ff88")
      .style("padding", "6px 12px").style("border", "1px solid #00ff88").style("font-family", "monospace")
      .style("pointer-events", "none").style("opacity", 0).style("z-index", "9999");

    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 8]).on("zoom", (event) => { g.attr("transform", event.transform); });
    (svg as any).call(zoom);

    // drawing all the countries from the json data
    g.selectAll("path.country").data(worldData.features).join("path").attr("class", "country")
      .attr("d", path as any).attr("fill", (d: any) => selected.includes(d.properties.admin) ? "#00ff88" : "#111")
      .attr("stroke", "#005522").attr("stroke-width", 0.7)
      .on("mouseover", (_event: any, d: Feature) => { tooltip.style("opacity", 1).html(d.properties?.admin); })
      .on("mousemove", (event: any) => { tooltip.style("top", event.pageY + 15 + "px").style("left", event.pageX + 15 + "px"); })
      .on("mouseout", () => tooltip.style("opacity", 0))
      .on("click", (_event: any, d: Feature) => {
        const country = d.properties?.admin;
        // check if they clicked the correct target country
        if (country === targetCountries[step]) {
          playInstantSound('correct');
          setMessage(`[OK] NODE ESTABLISHED: ${country}`);
          const nextStep = step + 1;
          setStep(nextStep);
          setGuessesLeft(3);
          setSelected([...selected, country as string]);
          
          if (nextStep === 3) {
            setTimeout(() => setIsComplete(true), 3000);
          }
        } else {
          // wrong country click logic
          playInstantSound('wrong');
          const remaining = guessesLeft - 1;
          setGuessesLeft(remaining);
          if (remaining <= 0) { setIsLockedOut(true); setMessage("[FATAL] PROTOCOL LOCKOUT"); }
          else setMessage(`[ERROR] NODE REJECTED. ${remaining} ATTEMPTS LEFT.`);
        }
      });

    // helper function to draw connecting lines between nodes
    const drawConnection = (startName: string, endName: string, color: string, animate: boolean) => {
      const startFeature = worldData.features.find(f  => f.properties?.admin === startName);
      const endFeature = worldData.features.find(f => f.properties?.admin === endName);
      if (!startFeature || !endFeature) return;
      const startCoords = projection(d3.geoCentroid(startFeature));
      const endCoords = projection(d3.geoCentroid(endFeature));
      if (!startCoords || !endCoords) return;
      const line = g.append("path").attr("d", `M${startCoords[0]},${startCoords[1]} L${endCoords[0]},${endCoords[1]}`).attr("stroke", color).attr("stroke-width", 2).attr("fill", "none");
      if (animate) {
        const totalLength = (line.node() as any).getTotalLength();
        line.attr("stroke-dasharray", `${totalLength} ${totalLength}`).attr("stroke-dashoffset", totalLength)
          .transition().duration(800).attr("stroke-dashoffset", 0);
      }
    };
    if (step >= 1) drawConnection("United Kingdom", targetCountries[0], "#00ffff", step === 1);
    if (step >= 2) drawConnection(targetCountries[0], targetCountries[1], "#ffff00", step === 2);
    if (step >= 3) drawConnection(targetCountries[1], targetCountries[2], "#00ff88", step === 3);

    return () => { tooltip.remove(); };
  }, [worldData, step, selected, targetCountries, showIntro, guessesLeft, isLockedOut, isComplete]);

  const finalizeVpn = (points: number) => {
    completeTask("vpn", points);
    navigate("/console");
  };

  // win screen layout
  if (isComplete) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={modalBoxStyle}>
          <h2 style={{ fontSize: '2.5rem' }}>TUNNEL ESTABLISHED</h2>
          <p style={{ color: "#88aa99", marginBottom: "35px" }}>BoE Mainframe traffic is now routing through an untraceable circuit.</p>
          <button onClick={() => finalizeVpn(100)} style={buttonStyle}>CONTINUE MISSION</button>
        </div>
      </div>
    );
  }

  // failure screen layout
  if (isLockedOut) {
    return (
      <div style={containerStyle}>
        <HUD />
        <div style={{ ...modalBoxStyle, borderColor: '#ff3333' }}>
          <h2 style={{ fontSize: '2.5rem', color: '#ff3333' }}>PROTOCOL LOCKOUT</h2>
          <button onClick={() => finalizeVpn(step === 1 ? 33 : step === 2 ? 66 : 0)} style={{ ...buttonStyle, background: '#ff3333' }}>CONTINUE MISSION</button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <HUD />
      {/* instruction popup before the map loads */}
      {showIntro && (
        <div style={overlayStyle}>
          <div style={{ ...modalBoxStyle, width: '600px' }}>
            {introLines.map((line, idx) => (
              <div key={idx} style={{ fontSize: introScript[idx].isHeader ? "2rem" : "1.1rem", marginBottom: "20px", color: introScript[idx].color }}>{line}</div>
            ))}
            {typingComplete && <button onClick={() => setShowIntro(false)} style={buttonStyle}>START ENCRYPTION</button>}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2.2rem" }}>VPN_TUNNEL_PROTOCOL</h1>
          
          <div style={{ 
            marginTop: "10px", 
            padding: "10px 20px", 
            background: "rgba(0, 255, 136, 0.1)", 
            borderLeft: "4px solid #00ff88",
            display: "inline-block"
          }}>
            <span style={{ color: "#fff", fontSize: "1.2rem", letterSpacing: "1px" }}>CURRENT OBJECTIVE: </span>
            <span style={{ 
              color: "#00ff88", 
              fontSize: "1.6rem", 
              fontWeight: "bold", 
              textTransform: "uppercase" 
            }}>
              CLICK ON {targetCountries[step] || "SECURED"}
            </span>
          </div>
        </div>
        
        {/* visual for how many fails they have left */}
        <div style={{ textAlign: 'right', border: '1px solid #00ff88', padding: '10px 20px', background: 'rgba(0,40,0,0.5)' }}>
            <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>ATTEMPTS_REMAINING</div>
            <div style={{ fontSize: "1.5rem", color: guessesLeft === 1 ? "#ff3333" : "#00ff88" }}>{guessesLeft}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "25px", flexGrow: 1, overflow: "hidden" }}>
        <div style={{ width: "320px", display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ background: "rgba(0,20,0,0.8)", padding: "15px", border: "1px solid #005522" }}>
            <div style={{ fontSize: "0.8rem", color: "#88aa99" }}>MISSION_PROGRESS</div>
            <div style={{ display: "flex", gap: 5, marginTop: "10px" }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: "6px", background: step > i ? "#00ff88" : "#002211", border: "1px solid #00ff88" }} />)}
            </div>
            
            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #004422', fontSize: '0.85rem', lineHeight: '1.4', color: '#fff' }}>
              <strong style={{ color: '#00ff88' }}>HOW IT WORKS:</strong><br/>
              A VPN hides your IP address by bouncing your connection through servers in other countries. By using multiple "hops," it makes it nearly impossible for hackers to trace traffic back to our local office.
            </div>
          </div>
          
          {/* status monitor for errors and node connections */}
          <div style={{ background: message.includes("ERROR") || isLockedOut ? "#330000" : "#002200", color: message.includes("ERROR") || isLockedOut ? "#ff3333" : "#00ff88", padding: "10px", fontSize: "0.8rem", border: "1px solid currentColor" }}>
            {message || "> SCANNING GEOPOLITICAL DATA..."}
          </div>
        </div>
        {/* container for the d3 map svg */}
        <div style={{ flexGrow: 1, background: "rgba(0,0,0,0.5)", border: "1px solid #005522", position: "relative" }}>
          <svg ref={svgRef} viewBox="0 0 1100 600" style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
}

// all the main ui styling for pages and modals
const containerStyle: React.CSSProperties = { width: "100vw", height: "100vh", backgroundColor: "#020502", color: "#00ff88", display: "flex", flexDirection: "column", fontFamily: "'Share Tech Mono', monospace", padding: "60px 30px 20px 30px", boxSizing: "border-box", overflow: "hidden", position: "relative" };
const modalBoxStyle: React.CSSProperties = { margin: 'auto', textAlign: 'center', border: '2px solid #00ff88', padding: '50px', background: '#000', boxShadow: "0 0 30px rgba(0,255,136,0.2)" };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,10,0,0.95)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const buttonStyle: React.CSSProperties = { width: "100%", padding: "15px", background: "#00ff88", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: '1.1rem' };