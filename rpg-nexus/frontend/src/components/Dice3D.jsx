import { useState, useEffect, useRef, useMemo } from 'react';
import './Dice3D.css';

const DICE_COLORS = {
  4:   { base: '#059669', light: '#34d399', dark: '#064e3b', glow: '#10b981' },
  6:   { base: '#2563eb', light: '#60a5fa', dark: '#1e3a5f', glow: '#3b82f6' },
  8:   { base: '#7c3aed', light: '#a78bfa', dark: '#3b0764', glow: '#8b5cf6' },
  10:  { base: '#d97706', light: '#fbbf24', dark: '#78350f', glow: '#f59e0b' },
  12:  { base: '#db2777', light: '#f472b6', dark: '#831843', glow: '#ec4899' },
  20:  { base: '#dc2626', light: '#f87171', dark: '#7f1d1d', glow: '#ef4444' },
  100: { base: '#0891b2', light: '#22d3ee', dark: '#164e63', glow: '#06b6d4' },
};

const DOT_PATTERNS = {
  1: [[50,50]],
  2: [[28,28],[72,72]],
  3: [[28,28],[50,50],[72,72]],
  4: [[30,30],[70,30],[30,70],[70,70]],
  5: [[30,30],[70,30],[50,50],[30,70],[70,70]],
  6: [[30,25],[70,25],[30,50],[70,50],[30,75],[70,75]],
};

export default function Dice3D({ diceType = 20, result, total, formula, username, onComplete }) {
  const [phase, setPhase] = useState('rolling');
  const [showResult, setShowResult] = useState(false);
  const [flickerValues, setFlickerValues] = useState([]);
  const flickerRef = useRef(null);

  const isCrit = diceType === 20 && result === 20;
  const isFumble = diceType === 20 && result === 1;
  const color = DICE_COLORS[diceType] || DICE_COLORS[20];
  const finalValue = result || total || '?';

  const faceNumbers = useMemo(() => {
    const max = diceType === 100 ? 100 : diceType;
    const faces = [];
    faces.push(finalValue);
    const used = new Set([finalValue]);
    for (let i = 1; faces.length < 6; i++) {
      const v = ((finalValue + i * 3) % max) + 1;
      if (!used.has(v)) { used.add(v); faces.push(v); }
      if (faces.length >= 6) break;
      const v2 = ((finalValue - i * 2 + max) % max) + 1;
      if (!used.has(v2)) { used.add(v2); faces.push(v2); }
    }
    while (faces.length < 6) faces.push(Math.ceil(Math.random() * max));
    return faces;
  }, [diceType, finalValue]);

  useEffect(() => {
    let interval;
    if (phase === 'rolling') {
      const max = diceType === 100 ? 100 : diceType;
      interval = setInterval(() => {
        setFlickerValues(Array.from({ length: 6 }, () => Math.ceil(Math.random() * max)));
      }, 80);
      flickerRef.current = interval;
    }
    return () => { if (interval) clearInterval(interval); };
  }, [phase, diceType]);

  useEffect(() => {
    const t1 = setTimeout(() => {
      if (flickerRef.current) clearInterval(flickerRef.current);
      setPhase('settle');
    }, 2000);
    const t2 = setTimeout(() => {
      setShowResult(true);
    }, 2500);
    const t3 = setTimeout(() => {
      setPhase('fade');
    }, 4500);
    const t4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const renderFaceContent = (faceIdx) => {
    const value = phase === 'rolling'
      ? (flickerValues[faceIdx] || faceNumbers[faceIdx])
      : faceNumbers[faceIdx];

    if (diceType === 6 && value >= 1 && value <= 6) {
      return (
        <div className="dice3d-dots">
          {DOT_PATTERNS[value].map(([x, y], i) => (
            <div key={i} className="dice3d-dot"
              style={{ left: `${x}%`, top: `${y}%` }} />
          ))}
        </div>
      );
    }

    return (
      <span className="dice3d-num">
        {diceType === 100 ? `${Math.floor(value / 10)}0` : value}
      </span>
    );
  };

  const glitterBg = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 3,
      delay: Math.random() * 3,
      dur: 1.5 + Math.random() * 2,
      color: i % 4 === 0 ? color.light : (i % 4 === 1 ? '#fff' : (i % 4 === 2 ? color.glow : 'rgba(255,255,255,0.7)')),
    })), [color]);

  const trailSparks = useMemo(() =>
    Array.from({ length: 24 }, (_, i) => ({
      angle: i * 15,
      dist: 30 + Math.random() * 60,
      delay: i * 0.06,
      dur: 0.4 + Math.random() * 0.5,
      size: 2 + Math.random() * 5,
      color: i % 3 === 0 ? color.light : (i % 3 === 1 ? '#fff' : color.glow),
    })), [color]);

  const revealBurst = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      angle: i * 12,
      dist: 80 + Math.random() * 120,
      delay: Math.random() * 0.3,
      dur: 0.6 + Math.random() * 0.6,
      size: 2 + Math.random() * 5,
      color: i % 5 === 0 ? '#fff' : (i % 5 === 1 ? color.light : (i % 5 === 2 ? color.glow : (i % 5 === 3 ? 'rgba(255,255,200,0.9)' : color.base))),
    })), [color]);

  return (
    <div className={`dice3d-overlay ${phase === 'fade' ? 'dice3d-fadeout' : ''}`}>
      <div className="dice3d-backdrop" />

      <div className="dice3d-glitter-bg">
        {glitterBg.map((g, i) => (
          <div key={i} className="dice3d-glitter-dot"
            style={{
              left: `${g.x}%`, top: `${g.y}%`,
              '--g-size': `${g.size}px`,
              '--g-delay': `${g.delay}s`,
              '--g-dur': `${g.dur}s`,
              '--g-color': g.color,
            }} />
        ))}
      </div>

      <div className="dice3d-stage">
        <div className="dice3d-perspective">
          <div className={`dice3d-cube ${phase === 'rolling' ? 'dice3d-anim-roll' : 'dice3d-anim-settle'} ${isCrit && showResult ? 'dice3d-crit-glow' : ''} ${isFumble && showResult ? 'dice3d-fumble-glow' : ''}`}
            style={{
              '--dice-base': color.base,
              '--dice-light': color.light,
              '--dice-dark': color.dark,
              '--dice-glow': color.glow,
            }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className={`dice3d-face dice3d-f${i}`}>
                <div className="dice3d-face-bg">
                  <div className="dice3d-face-shine" />
                  <div className="dice3d-face-edge" />
                  {renderFaceContent(i)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dice3d-shadow-container">
          <div className={`dice3d-floor-shadow ${phase === 'rolling' ? 'dice3d-shadow-roll' : 'dice3d-shadow-settle'}`}
            style={{ background: `radial-gradient(ellipse, ${color.glow}50 0%, transparent 70%)` }} />
        </div>

        {phase === 'rolling' && (
          <div className="dice3d-trail">
            {trailSparks.map((s, i) => (
              <div key={i} className="dice3d-trail-spark"
                style={{
                  '--t-angle': `${s.angle}deg`,
                  '--t-dist': `${s.dist}px`,
                  '--t-delay': `${s.delay}s`,
                  '--t-dur': `${s.dur}s`,
                  '--t-size': `${s.size}px`,
                  '--t-color': s.color,
                }} />
            ))}
          </div>
        )}

        {showResult && (
          <div className="dice3d-reveal-burst">
            {revealBurst.map((b, i) => (
              <div key={i} className="dice3d-burst-particle"
                style={{
                  '--b-angle': `${b.angle}deg`,
                  '--b-dist': `${b.dist}px`,
                  '--b-delay': `${b.delay}s`,
                  '--b-dur': `${b.dur}s`,
                  '--b-size': `${b.size}px`,
                  '--b-color': b.color,
                }} />
            ))}
          </div>
        )}

        {isCrit && showResult && (
          <div className="dice3d-crit-burst">
            {[...Array(16)].map((_, i) => (
              <div key={i} className="dice3d-crit-ray"
                style={{ '--ray-angle': `${i * 22.5}deg` }} />
            ))}
          </div>
        )}
      </div>

      {showResult && (
        <div className="dice3d-info">
          <div className="dice3d-info-formula">{formula || `d${diceType}`}</div>
          <div className={`dice3d-info-total ${isCrit ? 'dice3d-info-crit' : ''} ${isFumble ? 'dice3d-info-fumble' : ''}`}
            style={{ '--glow-color': color.glow }}>
            {total || result || '?'}
          </div>
          {isCrit && <div className="dice3d-info-label dice3d-info-label-crit">CRITIQUE !</div>}
          {isFumble && <div className="dice3d-info-label dice3d-info-label-fumble">ECHEC CRITIQUE !</div>}
          {username && <div className="dice3d-info-user">{username}</div>}
        </div>
      )}
    </div>
  );
}
