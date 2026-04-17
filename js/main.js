// ============================================================
// MAIN ENTRY POINT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Map Interactions safely
  if (typeof window.initMapInteractions === 'function') {
    window.initMapInteractions();
  } else {
    console.error('CRITICAL: initMapInteractions not found. UI scripts may have failed to load or execute.');
    // Attempt fallback if possible or show user hint
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker registered');
        // Handle updates
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
               console.log('New update available. Refresh to apply changes.');
               // Optional: window.location.reload(); 
            }
          };
        };
      })
      .catch(err => console.log('Service Worker registration failed', err));
  }
});

function showSetup() {
  document.getElementById('intro').classList.remove('active');
  const setup = document.getElementById('setup');
  if (setup) setup.classList.add('active');
}

function startGame() {
  const p1NameInput = document.getElementById('p1-name');
  const p2NameInput = document.getElementById('p2-name');
  
  state.players[0].name = (p1NameInput && p1NameInput.value) || 'Joueur Rouge';
  state.players[1].name = (p2NameInput && p2NameInput.value) || 'Joueur Bleu';
  
  if (multi.active && multi.isHost) {
    initGame(true); 
    broadcast({ 
      type: 'START_GAME', 
      territories: state.territories,
      p1Name: state.players[0].name,
      p2Name: state.players[1].name
    });
    document.getElementById('setup').classList.remove('active');
    document.getElementById('game').classList.add('active');
    initGameMulti();
    return;
  }

  document.getElementById('setup').classList.remove('active');
  document.getElementById('game').classList.add('active');
  initGame();
}
window.showSetup = showSetup;
window.startGame = startGame;
