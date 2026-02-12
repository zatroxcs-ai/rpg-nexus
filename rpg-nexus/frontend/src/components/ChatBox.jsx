// 📍 Fichier : frontend/src/components/ChatBox.jsx
// 🎯 Rôle : Composant de chat en temps réel
// 💡 Affiche les messages et permet d'en envoyer

import { useState, useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

export default function ChatBox() {
  const { messages: rawMessages, sendMessage } = useGame();
  const messages = rawMessages || [];
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll vers le bas quand un nouveau message arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (inputMessage.trim()) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          💬 Chat
          {messages.length > 0 && (
            <span className="text-xs bg-indigo-600 px-2 py-1 rounded-full">
              {messages.length}
            </span>
          )}
        </h3>
      </div>

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-8">
            <div className="text-4xl mb-2">💬</div>
            <p>Aucun message pour le moment...</p>
            <p className="text-xs mt-1">Sois le premier à parler !</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.username === user?.username;
            const isMJ = msg.role === 'ADMIN';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Nom et heure */}
                <div className="flex items-center gap-2 mb-1 px-2">
                  {!isMe && (
                    <span className="text-xs font-semibold">
                      {isMJ ? '🎭' : '⚔️'} {msg.username}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTime(msg.timestamp)}
                  </span>
                  {isMe && (
                    <span className="text-xs font-semibold">
                      Vous {isMJ ? '🎭' : '⚔️'}
                    </span>
                  )}
                </div>

                {/* Bulle de message */}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg ${
                    isMe
                      ? isMJ
                        ? 'bg-purple-600 text-white' // MJ qui parle
                        : 'bg-indigo-600 text-white' // Joueur qui parle
                      : isMJ
                      ? 'bg-purple-900 bg-opacity-50 text-white' // MJ autre
                      : 'bg-gray-700 text-white' // Joueur autre
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Formulaire d'envoi */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Envoie un message..."
            className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📤
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-right">
          {inputMessage.length}/500
        </div>
      </form>
    </div>
  );
}
