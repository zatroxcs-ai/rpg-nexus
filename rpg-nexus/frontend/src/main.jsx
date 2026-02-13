// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// StrictMode désactivé : cause des double-mounts qui brisent la connexion WebSocket en dev
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
