// 📍 Fichier : frontend/src/main.jsx
// 🎯 Rôle : Point d'entrée de l'application React
// 💡 Monte l'application dans le DOM

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
