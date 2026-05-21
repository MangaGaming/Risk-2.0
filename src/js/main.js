// ============================================================
// MAIN ENTRY POINT
// ============================================================

import { state, multi } from './state.js';
import { ADJACENCY } from './config.js';
import { showToast, countTerritories, isMyTurn } from './utils.js';
import { initMultiplayer, hostGame, joinGame, closeMultiModal, broadcast } from './p2p.js';
import { initGame, startTurn, endTurn, rollCombat, continueAttack, stopAttack, confirmMove, cancelMove, endDiplomacy, endReinforcement, endAttack } from './game.js';
import { renderMap, updateHeader, updatePhaseUI, buildLegend, updateDiploPanel, renderSanctionsDisplay, updateMoveCount } from './ui.js';
import { openDiploModal, selectOpponent, switchDiploTab, selectPactType, proposePact, startMapPick, acceptTreaty, rejectTreaty, applySanction, dismissSanction, selectSanction } from './diplo.js';
import { initRenderer, getScene, getCamera, getRenderer } from './renderer3d.js';
import { buildTerritories, handlePointerMove, handlePointerDown, syncTerritories } from './map3d.js';
import { initPieces, syncPieces } from './pieces3d.js';

window.addEventListener('DOMContentLoaded', () => {
  // UI Event Listeners
  document.getElementById('btn-start-intro')?.addEventListener('click', showSetup);
  document.getElementById('btn-multi-intro')?.addEventListener('click', initMultiplayer);
  document.getElementById('btn-count-2')?.addEventListener('click', () => setPlayerCount(2));
  document.getElementById('btn-count-3')?.addEventListener('click', () => setPlayerCount(3));
  document.getElementById('btn-start-battle')?.addEventListener('click', startGame);
  

  
  document.getElementById('btn-open-diplo')?.addEventListener('click', openDiploModal);
  document.getElementById('btn-end-diplo')?.addEventListener('click', endDiplomacy);
  document.getElementById('btn-end-reinf')?.addEventListener('click', endReinforcement);
  document.getElementById('btn-end-attack')?.addEventListener('click', endAttack);
  document.getElementById('btn-end-turn')?.addEventListener('click', () => endTurn());
  
  document.getElementById('btn-roll')?.addEventListener('click', rollCombat);
  document.getElementById('btn-continue-atk')?.addEventListener('click', continueAttack);
  document.getElementById('btn-stop-atk')?.addEventListener('click', stopAttack);
  
  document.getElementById('move-slider')?.addEventListener('input', updateMoveCount);
  document.getElementById('btn-confirm-move')?.addEventListener('click', confirmMove);
  document.getElementById('btn-cancel-move')?.addEventListener('click', cancelMove);
  
  document.getElementById('btn-host-game')?.addEventListener('click', hostGame);
  document.getElementById('btn-join-game')?.addEventListener('click', joinGame);
  document.getElementById('btn-close-multi')?.addEventListener('click', closeMultiModal);
  document.getElementById('btn-multi-setup')?.addEventListener('click', showSetup);
  
  document.getElementById('tab-btn-new')?.addEventListener('click', () => switchDiploTab('new'));
  document.getElementById('tab-btn-active')?.addEventListener('click', () => switchDiploTab('active'));
  document.getElementById('tab-btn-history')?.addEventListener('click', () => switchDiploTab('history'));
  
  document.getElementById('type-peace')?.addEventListener('click', () => selectPactType('peace'));
  document.getElementById('type-territory')?.addEventListener('click', () => selectPactType('territory'));
  document.getElementById('type-alliance')?.addEventListener('click', () => selectPactType('alliance'));
  
  document.getElementById('btn-pick-give')?.addEventListener('click', () => startMapPick('give'));
  document.getElementById('btn-pick-recv')?.addEventListener('click', () => startMapPick('recv'));
  document.getElementById('btn-propose-pact')?.addEventListener('click', proposePact);
  document.getElementById('btn-close-diplo')?.addEventListener('click', () => document.getElementById('diplo-modal').classList.remove('active'));
  document.getElementById('btn-close-diplo-active')?.addEventListener('click', () => document.getElementById('diplo-modal').classList.remove('active'));
  document.getElementById('btn-close-diplo-history')?.addEventListener('click', () => document.getElementById('diplo-modal').classList.remove('active'));
  
  document.getElementById('btn-accept-treaty')?.addEventListener('click', acceptTreaty);
  document.getElementById('btn-reject-treaty')?.addEventListener('click', rejectTreaty);
  
  document.getElementById('sanc-opt-malus')?.addEventListener('click', () => selectSanction('malus'));
  document.getElementById('sanc-opt-embargo')?.addEventListener('click', () => selectSanction('embargo'));
  document.getElementById('sanc-opt-vengeance')?.addEventListener('click', () => selectSanction('vengeance'));
  document.getElementById('btn-apply-sanction')?.addEventListener('click', applySanction);
  document.getElementById('btn-dismiss-sanction')?.addEventListener('click', dismissSanction);
  
  document.getElementById('sanction-malus')?.addEventListener('click', () => {
    document.getElementById('sanction-malus').classList.add('selected');
    document.getElementById('sanction-embargo').classList.remove('selected');
    // For pact creation
  });
  document.getElementById('sanction-embargo')?.addEventListener('click', () => {
    document.getElementById('sanction-malus').classList.remove('selected');
    document.getElementById('sanction-embargo').classList.add('selected');
  });

  document.getElementById('btn-show-cards')?.addEventListener('click', () => {
    if (isMyTurn()) {
      state.mustTradeCards = false;
      window.openCardsModal();
    } else {
      showToast("Ce n'est pas votre tour !");
    }
  });

  document.getElementById('btn-trade-cards')?.addEventListener('click', () => {
    if (window.tradeCards()) {
      const p = state.currentPlayer;
      const remaining = state.players[p].cards.length;
      // If mandatory, keep modal until hand is ≤4
      if (state.mustTradeCards && remaining >= 5) {
        state.selectedCards = [];
        window.renderCardsModal();
      } else if (state.mustTradeCards && remaining <= 4) {
        state.mustTradeCards = false;
        window.closeCardsModal();
      } else {
        window.closeCardsModal();
      }
    }
  });
  document.getElementById('btn-pass-trade')?.addEventListener('click', () => {
    state.mustTradeCards = false;
    window.closeCardsModal();
  });

  document.getElementById('btn-replay')?.addEventListener('click', () => location.reload());

  // Show intro
  document.getElementById('intro').classList.add('active');
});

let rendererInitialized = false;

export function init3D() {
  if (rendererInitialized) return;
  const container = document.getElementById('map-container');
  if (!container) return;
  const { scene, camera, renderer } = initRenderer(container);
  buildTerritories(scene);
  initPieces(scene);

  // Wire 3D events
  const canvas = renderer.domElement;
  canvas.addEventListener('pointermove', (e) => {
    handlePointerMove(e, camera, canvas);
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button === 0) {
      handlePointerDown(e, camera, canvas, handleTerritoryClick);
    }
  });

  rendererInitialized = true;
}

// --- GAME ACTIONS ---

export function handleTerritoryClick(name) {
  if (!isMyTurn()) return;

  // Diplo Pick Mode
  if (state.diploSelectTarget) {
    const opp = state.selectedOpponent;
    const owner = state.territories[name].owner;
    
    if (state.diploSelectTarget === 'give') {
      if (owner !== state.currentPlayer) { showToast("Choisissez un de VOS territoires !"); return; }
      document.getElementById('pact-give-terr').value = name;
    } else {
      if (owner !== opp) { showToast(`Choisissez un territoire appartenant à ${state.players[opp].name} !`); return; }
      document.getElementById('pact-recv-terr').value = name;
    }
    
    state.diploSelectTarget = null;
    document.getElementById('map-select-instr').classList.remove('active');
    document.getElementById('diplo-modal').classList.remove('selecting');
    document.getElementById('diplo-modal').classList.add('active');
    return;
  }

  const t = state.territories[name];
  const p = state.currentPlayer;

  if (state.phase === 'reinf') {
    if (t.owner === p && state.reinforcements > 0) {
      t.armies++;
      state.reinforcements--;
      updatePhaseUI();
      renderMap();
    }
  } else if (state.phase === 'attack') {
    if (t.owner === p) {
      if (t.armies > 1) {
        state.selectedTerritory = name;
        renderMap();
      } else {
        showToast("Pas assez d'armées pour attaquer !");
      }
    } else if (state.selectedTerritory) {
      // Is adjacent?
      const adj = ADJACENCY[state.selectedTerritory] || [];
      if (adj.includes(name)) {
        // Combat!
        window.setupCombat(state.selectedTerritory, name);
      } else {
        showToast("Territoire non adjacent !");
      }
    }
  } else if (state.phase === 'move') {
    if (t.owner === p) {
      if (!state.selectedTerritory) {
        state.selectedTerritory = name;
        renderMap();
      } else if (state.selectedTerritory === name) {
        state.selectedTerritory = null;
        renderMap();
      } else {
        const adj = ADJACENCY[state.selectedTerritory] || [];
        if (adj.includes(name)) {
          window.openMoveModal(state.selectedTerritory, name);
        } else {
          state.selectedTerritory = name;
          renderMap();
        }
      }
    }
  }
}

export function showSetup() {
  document.getElementById('intro').classList.remove('active');
  const setup = document.getElementById('setup');
  if (setup) setup.classList.add('active');
  if (multi.active) {
    closeMultiModal();
  }
}

export function setPlayerCount(n) {
  state.playerCount = n;
  document.getElementById('btn-count-2')?.classList.toggle('active', n === 2);
  document.getElementById('btn-count-3')?.classList.toggle('active', n === 3);
  const p3Card = document.getElementById('p3-setup-card');
  if (p3Card) p3Card.style.display = n === 3 ? '' : 'none';
}

export function startGame() {
  const p1NameInput = document.getElementById('p1-name');
  const p2NameInput = document.getElementById('p2-name');
  const p3NameInput = document.getElementById('p3-name');
  
  state.players[0].name = (p1NameInput && p1NameInput.value) || 'Joueur Rouge';
  state.players[1].name = (p2NameInput && p2NameInput.value) || 'Joueur Bleu';
  state.players[2].name = (p3NameInput && p3NameInput.value) || 'Joueur Vert';
  
  if (multi.active && multi.isHost) {
    // Multiplayer currently only supports 2 players
    state.playerCount = 2;
    initGame(true); 
    broadcast({ 
      type: 'START_GAME', 
      territories: state.territories,
      cardDeck: state.cardDeck,
      cardsTradedTotal: state.cardsTradedTotal,
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
  init3D();
  initGame();
}

export function initGameMulti() {
  init3D();
  buildLegend();
  renderMap();
  updateHeader();
  updatePhaseUI();
  updateDiploPanel();
  renderSanctionsDisplay();
  startTurn();
}

window.handleTerritoryClick = handleTerritoryClick;
window.initGameMulti = initGameMulti;
window.showSetup = showSetup;
window.setPlayerCount = setPlayerCount;
window.startGame = startGame;
