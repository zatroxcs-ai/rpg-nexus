import { useState, useEffect, useCallback } from 'react';
import websocketService from '../services/websocket';

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const socket = websocketService.getSocket?.();
    if (!socket) return;

    const onDice = (data) => {
      const r = data.roll;
      addToast({ icon: '\u{1F3B2}', message: `${r.username} lance ${r.count || 1}d${r.diceType} = ${r.total}`, color: 'border-indigo-500' });
    };

    const onCombat = (data) => {
      addToast({ icon: '\u{2694}\uFE0F', message: 'Combat mis a jour', color: 'border-red-500' });
    };

    const onPlayerJoin = (data) => {
      addToast({ icon: '\u{1F7E2}', message: `${data.username || 'Un joueur'} a rejoint`, color: 'border-green-500' });
    };

    const onPlayerLeave = (data) => {
      addToast({ icon: '\u{1F534}', message: `${data.username || 'Un joueur'} a quitte`, color: 'border-red-500' });
    };

    socket.on('diceRolled', onDice);
    socket.on('combatUpdate', onCombat);
    socket.on('playerJoined', onPlayerJoin);
    socket.on('playerLeft', onPlayerLeave);

    return () => {
      socket.off('diceRolled', onDice);
      socket.off('combatUpdate', onCombat);
      socket.off('playerJoined', onPlayerJoin);
      socket.off('playerLeft', onPlayerLeave);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
      {toasts.map(toast => (
        <div key={toast.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#1f2937', borderLeft: `3px solid`, borderColor: 'inherit',
            borderRadius: '8px', padding: '10px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            pointerEvents: 'auto', minWidth: '250px', maxWidth: '350px',
            animation: 'slideInRight 0.3s ease-out',
          }}
          className={`border-l-4 ${toast.color}`}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>{toast.icon}</span>
          <span style={{ flex: 1, color: '#e5e7eb', fontSize: '13px' }}>{toast.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 2px', flexShrink: 0 }}>×</button>
        </div>
      ))}
    </div>
  );
}
