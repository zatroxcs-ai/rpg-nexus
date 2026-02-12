// 📍 Fichier : frontend/src/components/AnimationPlayer.jsx
// 🎯 Rôle : Moteur d'affichage des animations
// 💡 Affiche les animations déclenchées en temps réel

import './AnimationPlayer.css';

export default function AnimationPlayer({ animations }) {
  // GameContext gere le cycle de vie (ajout + suppression apres timeout)
  // On affiche directement le tableau recu, sans state interne
  return (
    <div className="animation-player">
      {animations.map((anim) => (
        <div
          key={anim._uid || anim.id}
          className={`animation animation-${anim.effect}`}
          style={{
            left: `${anim.position?.x || 50}%`,
            top: `${anim.position?.y || 50}%`,
          }}
        >
          {renderAnimation(anim)}
        </div>
      ))}
    </div>
  );
}

function renderAnimation(anim) {
  switch (anim.effect) {
    case 'explosion':
      return (
        <div className="explosion-effect">
          <div className="explosion-core">💥</div>
          <div className="explosion-ring"></div>
          <div className="explosion-particles">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="particle" style={{ '--i': i }}></div>
            ))}
          </div>
        </div>
      );

    case 'fireball':
      return (
        <div className="fireball-effect">
          <div className="fireball">🔥</div>
          <div className="fireball-trail"></div>
        </div>
      );

    case 'heal':
      return (
        <div className="heal-effect">
          <div className="heal-icon">✨</div>
          <div className="heal-particles">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="heal-particle" style={{ '--i': i }}>
                ✨
              </div>
            ))}
          </div>
        </div>
      );

    case 'lightning':
      return (
        <div className="lightning-effect">
          <div className="lightning-bolt">⚡</div>
          <div className="lightning-flash"></div>
        </div>
      );

    case 'shield':
      return (
        <div className="shield-effect">
          <div className="shield-icon">🛡️</div>
          <div className="shield-ring"></div>
        </div>
      );

    case 'poison':
      return (
        <div className="poison-effect">
          <div className="poison-cloud">☠️</div>
          <div className="poison-bubbles">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bubble" style={{ '--i': i }}></div>
            ))}
          </div>
        </div>
      );

    case 'freeze':
      return (
        <div className="freeze-effect">
          <div className="freeze-icon">❄️</div>
          <div className="freeze-wave"></div>
        </div>
      );

    case 'buff':
      return (
        <div className="buff-effect">
          <div className="buff-icon">💪</div>
          <div className="buff-aura"></div>
        </div>
      );

    case 'critical':
      return (
        <div className="critical-effect">
          <div className="critical-text">CRITICAL!</div>
          <div className="critical-slash">⚔️</div>
        </div>
      );

    case 'teleport':
      return (
        <div className="teleport-effect">
          <div className="teleport-spiral">🌀</div>
          <div className="teleport-ring"></div>
        </div>
      );

    case 'smoke':
      return (
        <div className="smoke-effect">
          <div className="smoke-cloud">💨</div>
        </div>
      );

    case 'sparkles':
      return (
        <div className="sparkles-effect">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="sparkle" style={{ '--i': i }}>
              ✨
            </div>
          ))}
        </div>
      );

    default:
      return <div className="default-effect">✨</div>;
  }
}
