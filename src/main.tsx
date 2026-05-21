import React from 'react';
import ReactDOM from 'react-dom/client';
import { GameProvider } from '@/context/GameContext';
import App from '@/App';
import '@/css/style.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
  </React.StrictMode>
);
