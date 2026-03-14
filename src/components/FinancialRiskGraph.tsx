import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';

export default function FinancialRiskGraph({ vulnerabilities }: { vulnerabilities: number }) {
  const { state } = useGame();
  const timeLeft = state.timeLeft;
  const totalTime = 15 * 60; // 900 seconds
  
  const maxCost = 5000000;
  const floor = 500000;
  
  const currentLoss = vulnerabilities === 0 ? 0 : floor + (vulnerabilities / 700) * (maxCost - floor);

  const currencyFormatter = new Intl.NumberFormat('en-GB', {
    style: 'currency', currency: 'GBP', maximumFractionDigits: 0,
  });

  const timeProgressX = ((totalTime - timeLeft) / totalTime) * 100;
  
  const { linePoints, areaPoints, dataPoints } = useMemo(() => {
    const pts = [];
    const steps = 100;
    const tY = 95 - ((currentLoss / maxCost) * 85);

    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 100;
      const progress = i / steps;
      const startY = 95; 
      const jitter = (Math.random() - 0.5) * 1.5;
      const y = startY + ((tY - startY) * progress) + jitter;
      
      const val = ((95 - y) / 85) * maxCost;
      pts.push({ x, y, val: val < 0 ? 0 : val });
    }

    return { 
      linePoints: pts.map(p => `${p.x},${p.y}`).join(' '), 
      areaPoints: `0,100 ${pts.map(p => `${p.x},${p.y}`).join(' ')} 100,100`,
      dataPoints: pts,
      targetY: tY
    };
  }, [vulnerabilities, currentLoss]);

  // FIX: Find the Y coordinate on the line that corresponds to the current time progress
  const currentDotY = useMemo(() => {
    // Find the point in our array closest to the current X (time) position
    const closestPoint = dataPoints.reduce((prev, curr) => 
      Math.abs(curr.x - timeProgressX) < Math.abs(prev.x - timeProgressX) ? curr : prev
    );
    return closestPoint.y;
  }, [dataPoints, timeProgressX]);

  const [hoverData, setHoverData] = useState<typeof dataPoints[0] | null>(null);

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes pulse-red-dot {
          0% { r: 1.5; opacity: 1; stroke-width: 0; }
          50% { r: 3.5; opacity: 0.6; stroke-width: 6; }
          100% { r: 1.5; opacity: 1; stroke-width: 0; }
        }
      `}</style>

      <div style={headerStyle}>
        <div>
          <h2 style={sectionHeadingStyle}>PROJECTED_FINANCIAL_LOSS</h2>
          <div style={{ fontSize: '0.7rem', color: '#ff3333', opacity: 0.5 }}>RESIDUAL_RISK_MONITOR</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={priceStyle}>-{currencyFormatter.format(currentLoss)}</div>
          <div style={{ fontSize: '0.7rem', color: '#ff3333', fontWeight: 'bold' }}>TOTAL_LIABILITY</div>
        </div>
      </div>

      <div style={graphContainerStyle}>
        <div style={yLabelStyle(10)}>£5M</div>
        <div style={yLabelStyle(95)}>£0</div>

        <svg 
          viewBox="0 0 100 100" 
          preserveAspectRatio="none" 
          style={svgStyle} 
          onMouseMove={(e) => {
            const dim = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - dim.left) / dim.width) * 100;
            const closest = dataPoints.reduce((p, c) => Math.abs(c.x - x) < Math.abs(p.x - x) ? c : p);
            setHoverData(closest);
          }} 
          onMouseLeave={() => setHoverData(null)}
        >
          <polyline points={areaPoints} fill="rgba(255, 51, 51, 0.1)" />
          <polyline points={linePoints} fill="none" stroke="#ff3333" strokeWidth="1.5" />

          {/* FIXED: cy now uses currentDotY to stay attached to the line path */}
          <circle 
            cx={timeProgressX} 
            cy={currentDotY} 
            r="1.5" 
            fill="#ff3333" 
            stroke="rgba(255, 51, 51, 0.4)"
            style={{ animation: 'pulse-red-dot 2s infinite ease-in-out' }}
          />

          {hoverData && (
              <line x1={hoverData.x} y1="0" x2={hoverData.x} y2="100" stroke="#ff3333" strokeWidth="0.5" strokeDasharray="1,1" />
          )}
        </svg>

        <div style={xAxisContainer}>
          <span style={xLabelStyle}>0m</span>
          <span style={xLabelStyle}>5m</span>
          <span style={xLabelStyle}>10m</span>
          <span style={xLabelStyle}>15m</span>
        </div>

        {hoverData && (
          <div style={{
            position: 'absolute',
            left: `${hoverData.x}%`,
            top: `${hoverData.y}%`,
            transform: hoverData.x > 50 ? 'translate(calc(-100% - 15px), -50%)' : 'translate(15px, -50%)',
            background: '#000',
            border: '2px solid #ff3333',
            padding: '8px 14px',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '1rem',
            whiteSpace: 'nowrap',
            zIndex: 20,
            pointerEvents: 'none',
            boxShadow: '0 0 15px rgba(255, 51, 51, 0.5)'
          }}>
            -£{Math.round(hoverData.val / 1000).toLocaleString()}K
          </div>
        )}
      </div>
    </div>
  );
}

// Styles remain unchanged
const panelStyle: React.CSSProperties = { background: '#0a0000', border: '1px solid #440000', padding: '25px', borderRadius: '4px', fontFamily: "'Share Tech Mono', monospace" };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '15px' };
const sectionHeadingStyle: React.CSSProperties = { fontSize: '1.2rem', color: '#ff3333', letterSpacing: '2px', margin: 0, fontWeight: 'bold' };
const priceStyle: React.CSSProperties = { color: '#ff3333', fontSize: '2.4rem', fontWeight: '900' };
const graphContainerStyle: React.CSSProperties = { position: 'relative', height: '220px', margin: '20px 10px 40px 85px', borderLeft: '2px solid #330000', borderBottom: '2px solid #330000', overflow: 'visible' };
const svgStyle: React.CSSProperties = { width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' };
const yLabelStyle = (top: number): React.CSSProperties => ({ position: 'absolute', left: '-80px', top: `${top}%`, fontSize: '1rem', color: '#880000', transform: 'translateY(-50%)', fontWeight: 'bold' });
const xAxisContainer: React.CSSProperties = { position: 'absolute', bottom: '-30px', width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 5px' };
const xLabelStyle: React.CSSProperties = { fontSize: '1rem', color: '#880000', fontWeight: 'bold' };