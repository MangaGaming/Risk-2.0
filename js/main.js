// ============================================================
// MAIN ENTRY POINT
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
  // Initialize Map Interactions
  initMapInteractions();

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered'))
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
