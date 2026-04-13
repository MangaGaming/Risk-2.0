// ============================================================
// PEER-TO-PEER MULTIPLAYER
// ============================================================

function showMultiModal() {
  document.getElementById('multi-modal').classList.add('active');
}

function closeMultiModal() {
  document.getElementById('multi-modal').classList.remove('active');
  if (multi.peer && !multi.active) {
    multi.peer.destroy();
    multi.peer = null;
  }
}

function hostGame() {
  document.getElementById('multi-initial').style.display = 'none';
  document.getElementById('multi-wait').style.display = 'block';
  document.getElementById('multi-status').textContent = 'Initialisation PeerJS...';

  // Générer un ID court (4 chars)
  const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
  
  multi.peer = new Peer(shortId);
  multi.isHost = true;
  multi.localPlayerIndex = 0;

  multi.peer.on('open', (id) => {
    document.getElementById('my-id-display').textContent = id;
    document.getElementById('multi-status').textContent = 'En attente d\'un adversaire...';
  });

  multi.peer.on('connection', (connection) => {
    multi.conn = connection;
    setupConnection();
  });

  multi.peer.on('error', (err) => {
    console.error(err);
    alert('Erreur PeerJS: ' + err.type);
    location.reload();
  });
}

function joinGame() {
  const hostId = document.getElementById('join-id').value.trim().toUpperCase();
  if (!hostId) return;

  document.getElementById('multi-initial').style.display = 'none';
  document.getElementById('multi-status').textContent = 'Connexion à ' + hostId + '...';

  multi.peer = new Peer();
  multi.isHost = false;
  multi.localPlayerIndex = 1;

  multi.peer.on('open', () => {
    multi.conn = multi.peer.connect(hostId);
    setupConnection();
  });

  multi.peer.on('error', (err) => {
    console.error(err);
    alert('Connexion impossible. Vérifiez l\'ID.');
    location.reload();
  });
}

function setupConnection() {
  multi.conn.on('open', () => {
    multi.active = true;
    document.getElementById('multi-wait').style.display = 'none';
    document.getElementById('multi-connected').style.display = 'block';
    document.getElementById('multi-status').textContent = 'Connecté !';
    
    // Envoyer son nom
    const myName = document.getElementById(multi.localPlayerIndex === 0 ? 'p1-name' : 'p2-name').value;
    broadcast({ type: 'HANDSHAKE', name: myName });
    
    if (!multi.isHost) {
      document.getElementById('btn-multi-setup').style.display = 'none';
      document.getElementById('opp-name-display').textContent = 'Attente du lancement par l\'Hôte...';
    }
  });

  multi.conn.on('data', (data) => {
    handleRemoteMessage(data);
  });

  multi.conn.on('close', () => {
    alert('Connexion perdue avec l\'adversaire.');
    location.reload();
  });
}

function broadcast(data) {
  if (multi.active && multi.conn) {
    multi.conn.send(data);
  }
}

function handleRemoteMessage(msg) {
  console.log('Remote Message:', msg);
  
  switch(msg.type) {
    case 'HANDSHAKE':
      multi.remotePlayerName = msg.name;
      document.getElementById('opp-name-display').textContent = 'Adversaire : ' + msg.name;
      break;
    case 'START_GAME':
      state.territories = msg.territories;
      state.players[0].name = msg.p1Name;
      state.players[1].name = msg.p2Name;
      document.getElementById('intro').classList.remove('active');
      document.getElementById('multi-modal').classList.remove('active');
      document.getElementById('game').classList.add('active');
      initGameMulti();
      break;
    case 'REINFORCE':
      const terr = state.territories[msg.territory];
      terr.armies++;
      state.reinforcements--;
      addLog(`${state.players[state.currentPlayer].name} place 1 armée sur ${msg.territory}.`, 'p' + (state.currentPlayer + 1));
      renderMap();
      updatePhaseUI();
      break;
    case 'END_PHASE':
      if (msg.phase === 'reinf') endReinforcement(true);
      if (msg.phase === 'attack') endAttack(true);
      if (msg.phase === 'diplo') endDiplomacy(true);
      break;
    case 'END_TURN':
      endTurn(true);
      break;
    case 'ATTACK_SELECT':
      state.attackFrom = msg.from;
      state.selectedTerritory = msg.from;
      showTerrInfo(msg.from);
      renderMap();
      break;
    case 'ATTACK_TARGET':
      state.attackTo = msg.to;
      openCombatModal(true);
      break;
    case 'COMBAT_ROLL':
      resolveCombat(msg.atkRolls, msg.defRolls);
      break;
    case 'CONTINUE_ATTACK':
      continueAttack(true);
      break;
    case 'STOP_ATTACK':
      stopAttack(true);
      break;
    case 'MOVE_SELECT':
      state.moveFrom = msg.from;
      renderMap();
      break;
    case 'MOVE_CONFIRM':
      state.moveTo = msg.to;
      executeMove(msg.count, true);
      break;
    case 'DIPLO_PROPOSE':
      state.incomingProposal = msg.pact;
      openNegotiationModal(msg.pact);
      break;
    case 'DIPLO_ACCEPT':
      const acceptedPact = msg.pact;
      state.pacts.push(acceptedPact);
      if (acceptedPact.type === 'echange') {
        executeExchange(acceptedPact.give, acceptedPact.recv);
      }
      addDiploHistory(`🤝 Traité accepté par ${state.players[acceptedPact.player1].name}`);
      showToast("Traité officiellement scellé !");
      updateDiploPanel();
      break;
    case 'DIPLO_REJECT':
      showToast("L'adversaire a décliné votre proposition.");
      break;
    case 'DIPLO_BREACH':
      applySanctionLogic(msg.pactId, msg.sanction, true);
      break;
    case 'DIPLO_PACT':
      state.pacts.push(msg.pact);
      addDiploHistory(`📜 Pacte scellé : ${msg.pact.note}`);
      addLog(`🤝 Pacte signé : ${msg.pact.note}`, 'system');
      updateDiploPanel();
      break;
    case 'DIPLO_EXCHANGE':
      executeExchange(msg.give, msg.recv);
      break;
    case 'SYNC_RANDOM':
      if (msg.target === 'vengeance') {
        state.territories[msg.territory].armies += msg.amount;
        renderMap();
      }
      break;
  }
}

function handleRemoteBreach(pactId, sanction) {
  applySanctionLogic(pactId, sanction);
  updateDiploPanel();
}

function proceedToMultiSetup() {
  // L'hôte prépare le setup initial
  document.getElementById('multi-modal').classList.remove('active');
  showSetup();
}

function initGameMulti() {
  buildLegend();
  renderMap();
  updateHeader();
  startTurn();
}

window.hostGame = hostGame;
window.joinGame = joinGame;
window.closeMultiModal = closeMultiModal;
window.proceedToMultiSetup = proceedToMultiSetup;
window.showMultiModal = showMultiModal;
window.openNegotiationModal = openNegotiationModal;
window.acceptTreaty = acceptTreaty;
window.rejectTreaty = rejectTreaty;
