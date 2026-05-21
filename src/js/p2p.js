// ============================================================
// P2P MULTIPLAYER (PeerJS)
// ============================================================

import { state, multi } from './state.js';
import { showToast, addLog } from './utils.js';
import Peer from 'peerjs';

export function initMultiplayer() {
  const modal = document.getElementById('multi-modal');
  if (modal) modal.classList.add('active');
  
  if (!multi.peer) {
    multi.peer = new Peer();
    multi.peer.on('open', (id) => {
      const el = document.getElementById('my-id-display');
      if (el) el.textContent = id;
    });
    multi.peer.on('connection', (conn) => {
      if (multi.active) {
        conn.close();
        return;
      }
      setupConnection(conn);
      multi.isHost = true;
      multi.localPlayerIndex = 0;
    });
    multi.peer.on('error', (err) => {
      console.error(err);
      showToast("Erreur PeerJS : " + err.type);
    });
  }
}

export function hostGame() {
  document.getElementById('multi-initial').style.display = 'none';
  document.getElementById('multi-wait').style.display = 'block';
}

export function joinGame() {
  const hostId = document.getElementById('join-id').value.trim();
  if (!hostId) { showToast("ID de l'hôte manquant !"); return; }
  
  const conn = multi.peer.connect(hostId);
  setupConnection(conn);
  multi.isHost = false;
  multi.localPlayerIndex = 1;
  showToast("Connexion en cours...");
}

function setupConnection(conn) {
  multi.conn = conn;
  
  conn.on('open', () => {
    multi.active = true;
    showToast("🤝 Connecté !");
    document.getElementById('multi-wait').style.display = 'none';
    document.getElementById('multi-initial').style.display = 'none';
    document.getElementById('multi-connected').style.display = 'block';
    
    // Exchange names
    conn.send({ type: 'HANDSHAKE', name: state.players[multi.localPlayerIndex].name });
  });

  conn.on('data', (data) => {
    handleIncomingData(data);
  });

  conn.on('close', () => {
    multi.active = false;
    showToast("💔 Connexion perdue.");
    location.reload();
  });
}

function handleIncomingData(data) {
  console.log("RECVD:", data);
  switch (data.type) {
    case 'HANDSHAKE':
      multi.remotePlayerName = data.name;
      const el = document.getElementById('opp-name-display');
      if (el) el.textContent = `${data.name} est prêt.`;
      break;
    case 'START_GAME':
      state.territories = data.territories;
      state.cardDeck = data.cardDeck;
      state.cardsTradedTotal = data.cardsTradedTotal || 0;
      state.players[0].name = data.p1Name;
      state.players[1].name = data.p2Name;
      state.playerCount = 2;
      document.getElementById('setup').classList.remove('active');
      document.getElementById('game').classList.add('active');
      window.initGameMulti();
      break;
    case 'SYNC_STATE':
      state.territories = data.territories;
      state.phase = data.phase;
      state.reinforcements = data.reinforcements;
      window.renderMap();
      window.updateHeader();
      window.updatePhaseUI();
      break;
    case 'END_TURN':
      window.endTurn(true);
      break;
    case 'DIPLO_PROPOSE':
      state.incomingProposal = data.pact;
      window.openNegotiationModal(data.pact);
      break;
    case 'DIPLO_ACCEPT':
      state.pacts.push(data.pact);
      if (data.pact.type === 'territory') window.executeExchange(data.pact.give, data.pact.recv);
      showToast(`🤝 ${state.players[data.pact.player1].name} a accepté le traité.`);
      window.updateDiploPanel();
      break;
    case 'DIPLO_REJECT':
      showToast("❌ L'adversaire a refusé votre proposition.");
      break;
    case 'DIPLO_BREACH':
      window.applySanctionLogic(data.pactId, data.sanction, true);
      break;
    case 'SYNC_RANDOM':
       if (data.target === 'vengeance') {
          state.territories[data.territory].armies += data.amount;
          addLog(`${state.players[state.currentPlayer].name} reçoit +${data.amount} armées (vengeance).`, 'system');
          window.renderMap();
       }
       break;
    case 'DRAW_CARD':
       state.players[data.playerIdx].cards.push(data.card);
       // Remove from local deck to prevent duplicate draws
       const deckIdx = state.cardDeck.findIndex(c => c.territory === data.card.territory && c.type === data.card.type);
       if (deckIdx !== -1) state.cardDeck.splice(deckIdx, 1);
       break;
    case 'SYNC_COMBAT':
       window.syncCombatResult(data);
       break;
  }
}

export function broadcast(data) {
  if (multi.active && multi.conn) {
    multi.conn.send(data);
  }
}

export function closeMultiModal() {
  document.getElementById('multi-modal').classList.remove('active');
}
