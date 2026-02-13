import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import websocketService from '../services/websocket';

export default function ChatBox() {
  const { user } = useAuth();
  const { currentGame, players } = useGame();
  const [inputMessage, setInputMessage] = useState('');
  const [whisperTarget, setWhisperTarget] = useState(null);
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState(() => [...(websocketService.store?.messages || [])]);
  const [diceRolls, setDiceRolls] = useState(() => [...(websocketService.store?.diceRolls || [])]);

  const isGameMaster = currentGame?.ownerId === user?.id;

  useEffect(() => {
    setMessages([...(websocketService.store?.messages || [])]);

    const handler = (data) => {
      setMessages(prev => [...prev, data.message]);
    };

    const diceHandler = (data) => {
      setDiceRolls(prev => [...prev, data.roll]);
    };

    const historyHandler = (data) => {
      setMessages(data.messages || []);
    };

    const attachHandler = () => {
      const socket = websocketService.getSocket?.();
      if (socket) {
        socket.off('chatMessage', handler);
        socket.on('chatMessage', handler);
        socket.off('diceRolled', diceHandler);
        socket.on('diceRolled', diceHandler);
        socket.off('chatHistory', historyHandler);
        socket.on('chatHistory', historyHandler);

        // Si le socket est déjà connecté et qu'on a manqué le chatHistory initial, le redemander
        const gameId = websocketService.store?.currentGame?.id;
        if (gameId && socket.connected) {
          socket.emit('getChatHistory', { gameId });
        }

        return true;
      }
      return false;
    };

    if (!attachHandler()) {
      const interval = setInterval(() => {
        if (attachHandler()) clearInterval(interval);
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    }

    return () => {
      const socket = websocketService.getSocket?.();
      if (socket) {
        socket.off('chatMessage', handler);
        socket.off('diceRolled', diceHandler);
        socket.off('chatHistory', historyHandler);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const combinedMessages = [
    ...messages.map(m => ({ ...m, _type: 'chat' })),
    ...diceRolls.map(r => ({ ...r, _type: 'dice', timestamp: r.createdAt || r.timestamp || new Date().toISOString() })),
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const gameId = websocketService.store?.currentGame?.id;
    const connected = websocketService.isConnected?.();

    if (gameId && connected) {
      if (whisperTarget) {
        websocketService.sendWhisper(gameId, whisperTarget, inputMessage);
      } else {
        websocketService.sendChatMessage(gameId, inputMessage);
      }
      setInputMessage('');
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch { return '--:--'; }
  };

  const getWhisperTargetName = () => {
    if (!whisperTarget) return '';
    if (currentGame?.owner?.id === whisperTarget) return currentGame.owner.username;
    const p = players.find(pl => pl.id === whisperTarget);
    return p ? p.username : '?';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#111827', color: '#fff' }}>

      <div style={{ padding: '16px', borderBottom: '1px solid #374151', flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Chat
          {combinedMessages.length > 0 && (
            <span style={{ fontSize: '11px', background: '#4f46e5', padding: '2px 8px', borderRadius: '999px' }}>
              {combinedMessages.length}
            </span>
          )}
        </h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#111827' }}>
        {combinedMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '32px' }}>
            <p>Aucun message pour le moment...</p>
          </div>
        ) : (
          combinedMessages.map((item, i) => {
            if (item._type === 'dice') {
              return (
                <div key={'dice-' + i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0' }}>
                  <div style={{ background: '#1e1b4b', border: '1px solid #4338ca', borderRadius: '12px', padding: '8px 16px', maxWidth: '80%', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#a5b4fc', marginBottom: '2px' }}>
                      {item.username} a lance les des
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                      {item.count || 1}d{item.diceType} {item.modifier > 0 ? '+' + item.modifier : item.modifier < 0 ? item.modifier : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#818cf8' }}>
                      [{(item.results || []).join(', ')}]
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>
                      = {item.total}
                    </div>
                    {item.reason && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>({item.reason})</div>}
                  </div>
                </div>
              );
            }

            const msg = item;
            const isMe = msg.username === user?.username;
            const isMJ = msg.role === 'ADMIN';
            const isWhisper = msg.isWhisper;

            let bg;
            if (isWhisper) {
              bg = '#4c1d95';
            } else if (isMe) {
              bg = isMJ ? '#7c3aed' : '#059669';
            } else {
              bg = isMJ ? '#4c1d95' : '#374151';
            }

            return (
              <div key={msg.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', padding: '0 8px' }}>
                  {!isMe && <span style={{ fontSize: '12px', fontWeight: 600 }}>{isMJ ? 'MJ' : 'PJ'} {msg.username}</span>}
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatTime(msg.timestamp)}</span>
                  {isMe && <span style={{ fontSize: '12px', fontWeight: 600, color: '#d1d5db' }}>Vous {isMJ ? 'MJ' : 'PJ'}</span>}
                  {isWhisper && (
                    <span style={{ fontSize: '10px', background: '#7c3aed', color: '#e9d5ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Whisper
                    </span>
                  )}
                </div>
                <div style={{
                  maxWidth: '80%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: bg,
                  color: '#fff',
                  fontStyle: isWhisper ? 'italic' : 'normal',
                  border: isWhisper ? '1px solid #7c3aed' : 'none',
                }}>
                  <p style={{ margin: 0, fontSize: '14px', wordBreak: 'break-word' }}>{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #374151', backgroundColor: '#1f2937', flexShrink: 0 }}>
        {(() => {
          const whisperTargets = [];
          if (!isGameMaster && currentGame?.owner) {
            whisperTargets.push({ id: currentGame.owner.id, username: currentGame.owner.username, isMJ: true });
          }
          players.forEach(p => {
            if (p.id !== user?.id && p.id !== currentGame?.ownerId) {
              whisperTargets.push({ id: p.id, username: p.username, isMJ: false });
            }
          });
          if (whisperTargets.length === 0) return null;
          return (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setWhisperTarget(null)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: !whisperTarget ? '#4f46e5' : '#374151',
                  color: !whisperTarget ? '#fff' : '#9ca3af',
                  transition: 'all 0.15s',
                }}
              >
                Public
              </button>
              {whisperTargets.map(t => (
                <button
                  key={t.id}
                  onClick={() => setWhisperTarget(t.id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: whisperTarget === t.id ? '#7c3aed' : '#374151',
                    color: whisperTarget === t.id ? '#fff' : '#9ca3af',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.isMJ ? 'MJ' : ''} {t.username}
                </button>
              ))}
            </div>
          );
        })()}
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={whisperTarget ? `Message prive a ${getWhisperTargetName()}...` : 'Envoie un message...'}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: whisperTarget ? '#2d1b69' : '#374151',
              color: '#fff',
              border: whisperTarget ? '1px solid #7c3aed' : 'none',
              borderRadius: '8px',
              outline: 'none',
              fontSize: '14px',
            }}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: whisperTarget ? '#7c3aed' : '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              opacity: inputMessage.trim() ? 1 : 0.5,
            }}
          >
            {whisperTarget ? 'Whisper' : 'Envoyer'}
          </button>
        </form>
        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textAlign: 'right' }}>
          {inputMessage.length}/500
        </div>
      </div>
    </div>
  );
}
