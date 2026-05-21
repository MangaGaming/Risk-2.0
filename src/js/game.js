// ============================================================
// GAME ENGINE
// ============================================================

import { state, multi } from './state.js';
import { POSITIONS, CONTINENTS, ADJACENCY } from './config.js';
import { showToast, addLog, countTerritories, isMyTurn } from './utils.js';
import { broadcast } from './p2p.js';
import { closeDiploModal, addDiploHistory } from './diplo.js';

export function initGame(isMultiHost = false) {
  const allTerr = Object.keys(POSITIONS);
  allTerr.forEach(name => { state.territories[name] = { owner: null, armies: 0 }; });

  initCardDeck(allTerr);

  const shuffled = [...allTerr].sort(() => Math.random() - 0.5);
  const n = state.playerCount;

  if (n === 2) {
    shuffled.forEach((name, i) => {
      const owner = i % n;
      state.territories[name] = { owner, armies: 1 };
    });

    for (let p = 0; p < n; p++) {
      const myTerrs = Object.entries(state.territories).filter(([,t]) => t.owner === p);
      let remaining = 40 - myTerrs.length;
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * myTerrs.length);
        state.territories[myTerrs[idx][0]].armies++;
        remaining--;
      }
    }
  } else {
    shuffled.forEach((name, i) => {
      const owner = i % n;
      state.territories[name] = { owner, armies: 1 };
    });

    const startingArmies = n === 3 ? 35 : (n === 4 ? 30 : (n === 5 ? 25 : 20));

    for (let p = 0; p < n; p++) {
      const myTerrs = Object.entries(state.territories).filter(([,t]) => t.owner === p);
      let remaining = startingArmies - myTerrs.length;
      while (remaining > 0) {
        const idx = Math.floor(Math.random() * myTerrs.length);
        state.territories[myTerrs[idx][0]].armies++;
        remaining--;
      }
    }
  }

  if (!isMultiHost) {
    window.buildLegend();
    window.renderMap();
    window.updateHeader();
    startTurn();
  }
}

function initCardDeck(territories) {
  const types = ['infantry', 'cavalry', 'artillery'];
  state.cardDeck = territories.map((t, i) => ({
    territory: t,
    type: types[i % 3]
  }));
  // Add 2 wild cards
  state.cardDeck.push({ territory: null, type: 'wild' });
  state.cardDeck.push({ territory: null, type: 'wild' });
  // Shuffle deck
  state.cardDeck.sort(() => Math.random() - 0.5);
}

export function drawCard(playerIdx) {
  if (state.cardDeck.length > 0) {
    const card = state.cardDeck.pop();
    state.players[playerIdx].cards.push(card);
    addLog(`${state.players[playerIdx].name} reçoit une carte de territoire.`, 'system');
    showToast(`📜 Nouvelle carte reçue !`);
  }
}

// ── CARD TRADE-IN SYSTEM (per official Risk rules) ──

export function getCardSetValue() {
  // 1st=4, 2nd=6, 3rd=8, 4th=10, 5th=12, 6th=15, then +5 each
  const n = state.cardsTradedTotal + 1;
  if (n <= 5) return 2 + n * 2;
  if (n === 6) return 15;
  return 15 + (n - 6) * 5;
}

export function isValidCardSet(cards) {
  if (cards.length !== 3) return false;
  const types = cards.map(c => c.type);
  const wilds = types.filter(t => t === 'wild').length;
  const nonWilds = types.filter(t => t !== 'wild');

  if (wilds === 0) {
    // 3 same or 1 of each
    return (nonWilds.every(t => t === nonWilds[0])) || (new Set(nonWilds).size === 3);
  }
  // Any set containing at least 1 wild card is valid
  return true;
}

export function tradeCards() {
  const p = state.currentPlayer;
  const player = state.players[p];
  if (state.selectedCards.length !== 3) return false;

  const tradedCards = state.selectedCards.map(i => player.cards[i]);
  if (!isValidCardSet(tradedCards)) return false;

  const baseValue = getCardSetValue();
  state.cardsTradedTotal++;

  let bonusArmies = 0;
  let bonusTerrs = [];

  for (const card of tradedCards) {
    if (card.territory && state.territories[card.territory]?.owner === p) {
      const add = Math.min(2, 2 - state.territoryBonusUsed - bonusArmies);
      if (add > 0) {
        state.territories[card.territory].armies += add;
        state.territoryBonusUsed += add;
        bonusArmies += add;
        bonusTerrs.push(card.territory);
      }
    }
  }

  state.reinforcements += baseValue;

  // If not in reinf phase (e.g. elimination mid-attack), auto-distribute
  if (state.phase !== 'reinf') {
    const myTerrs = Object.entries(state.territories).filter(([,t]) => t.owner === p);
    let remaining = state.reinforcements;
    let idx = 0;
    while (remaining > 0 && myTerrs.length > 0) {
      state.territories[myTerrs[idx % myTerrs.length][0]].armies++;
      remaining--;
      idx++;
    }
    state.reinforcements = 0;
  }

  // Remove cards from hand (descending indices)
  const indices = [...state.selectedCards].sort((a, b) => b - a);
  for (const idx of indices) {
    player.cards.splice(idx, 1);
  }

  state.selectedCards = [];

  addLog(`${player.name} échange 3 cartes pour ${baseValue} armée(s).`, 'system');
  if (bonusArmies > 0) {
    addLog(`Bonus territoire : +${bonusArmies} sur ${bonusTerrs.join(', ')}.`, 'system');
  }
  showToast(`📜 Échange : +${baseValue + bonusArmies} armées !`);

  window.renderMap();
  window.updatePhaseUI();
  return true;
}

export function openCardsModal() {
  state.selectedCards = [];
  window.renderCardsModal();
  document.getElementById('cards-modal').classList.add('active');
}

export function closeCardsModal() {
  document.getElementById('cards-modal').classList.remove('active');
  state.selectedCards = [];
}

export function startTurn() {
  const p = state.currentPlayer;
  state.phase = 'diplo';
  state.selectedTerritory = null;
  state.attackFrom = null;
  state.attackTo = null;
  state.moveFrom = null;
  state.moveTo = null;
  state.moveDone = false;
  state.justConquered = false;
  state.hasCapturedThisTurn = false;
  state.globalTurn++;
  state.territoryBonusUsed = 0;

  // Decrement pact turns only at start of first player's turn (round-based)
  if (p === 0) {
    state.pacts.forEach(pact => {
      if (!pact.broken && pact.toursLeft > 0) {
        pact.toursLeft--;
      }
    });
  }

  // Apply vengeance queue (give armies to victim)
  state.vengeanceQueue = state.vengeanceQueue.filter(v => {
    if (v.victim === p) {
      if (!multi.active || isMyTurn()) {
        const myTerrs = Object.entries(state.territories).filter(([,t]) => t.owner === p);
        if (myTerrs.length > 0) {
          const rand = myTerrs[Math.floor(Math.random() * myTerrs.length)][0];
          state.territories[rand].armies += v.amount;
          addDiploHistory(`🛡 Prime de vengeance : ${state.players[p].name} reçoit +${v.amount} armée(s) sur ${rand}.`);
          showToast(`⚔ ${state.players[p].name} reçoit +${v.amount} armée(s) (Prime à la Vengeance) !`);
          addLog(`${state.players[p].name} reçoit +${v.amount} armées (vengeance).`, 'system');
          
          if (multi.active) broadcast({ type: 'SYNC_RANDOM', target: 'vengeance', territory: rand, amount: v.amount });
          
          window.renderMap();
        }
      }
      return false; // remove from queue
    }
    return true;
  });

  // Calculate reinforcements
  const myTerrsCount = countTerritories(p);
  if (myTerrsCount === 0) {
    // Player eliminated, skip turn
    setTimeout(() => endTurn(true), 1000);
    return;
  }

  let reinf = Math.max(3, Math.floor(myTerrsCount / 3));
  Object.entries(CONTINENTS).forEach(([cont, data]) => {
    const ownsAll = data.territories.every(t => state.territories[t] && state.territories[t].owner === p);
    if (ownsAll) reinf += data.bonus;
  });

  // Apply malus
  if (state.malusPending[p] > 0) {
    const malus = state.malusPending[p];
    reinf = Math.max(1, reinf - malus);
    addDiploHistory(`⚔ Perte d'honneur : ${state.players[p].name} perd ${malus} renforts (malus de trahison).`);
    showToast(`⚔ Perte d'Honneur : -${malus} renforts pour ${state.players[p].name} !`);
    addLog(`${state.players[p].name} subit un malus de ${malus} renforts (trahison).`, 'system');
    state.malusPending[p] = 0;
  }

  state.reinforcements = reinf;

  window.updateHeader();
  window.updatePhaseUI();
  window.updateDiploPanel();
  window.renderMap();
  addLog(`${state.players[p].name} commence son tour. +${reinf} renforts.`, 'system');
  
  // Mandatory trade if 5+ cards (per official rules)
  if (state.players[p].cards.length >= 5) {
    state.mustTradeCards = true;
    showToast("📜 Vous devez échanger des cartes !");
    window.openCardsModal();
  } else {
    state.mustTradeCards = false;
  }
}

export function endTurn(remote = false) {
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }
  
  // Award card if captured (only draw locally; remote gets synced card)
  if (state.hasCapturedThisTurn) {
    if (!remote) {
      drawCard(state.currentPlayer);
      if (multi.active) {
        const lastCard = state.players[state.currentPlayer].cards[state.players[state.currentPlayer].cards.length - 1];
        broadcast({ type: 'DRAW_CARD', playerIdx: state.currentPlayer, card: lastCard });
      }
    }
  }

  if (!remote) broadcast({ type: 'END_TURN' });
  decrementEmbargo();
  
  // Cycle to next player, skipping eliminated ones and Neutral (idx 3)
  let nextPlayer = (state.currentPlayer + 1) % state.playerCount;
  while ((countTerritories(nextPlayer) === 0 || nextPlayer === 3) && nextPlayer !== state.currentPlayer) {
    nextPlayer = (nextPlayer + 1) % state.playerCount;
  }
  
  state.currentPlayer = nextPlayer;
  const terrInfo = document.getElementById('section-terr-info');
  if (terrInfo) terrInfo.style.display = 'none';
  closeDiploModal();
  startTurn();
}

function decrementEmbargo() {
  for (let i = 0; i < state.players.length; i++) {
    if (state.embargoTurns[i] > 0) state.embargoTurns[i]--;
  }
}

export function endDiplomacy() {
  if (!isMyTurn()) return;
  state.phase = 'reinf';
  window.updatePhaseUI();
  if (multi.active) broadcast({ type: 'SYNC_STATE', territories: state.territories, phase: state.phase, reinforcements: state.reinforcements });
}

export function endReinforcement() {
  if (!isMyTurn()) return;
  if (state.reinforcements > 0) { showToast("Placez tous vos renforts !"); return; }
  state.phase = 'attack';
  window.updatePhaseUI();
  if (multi.active) broadcast({ type: 'SYNC_STATE', territories: state.territories, phase: state.phase, reinforcements: 0 });
}

export function endAttack() {
  if (!isMyTurn()) return;
  state.phase = 'move';
  state.selectedTerritory = null;
  window.updatePhaseUI();
  window.renderMap();
  if (multi.active) broadcast({ type: 'SYNC_STATE', territories: state.territories, phase: state.phase, reinforcements: 0 });
}

export function rollCombat() {
  const atk = state.atkDice;
  const def = state.defDice;
  
  const atkResults = Array.from({length: atk}, () => Math.floor(Math.random() * 6) + 1).sort((a,b) => b-a);
  const defResults = Array.from({length: def}, () => Math.floor(Math.random() * 6) + 1).sort((a,b) => b-a);
  
  let atkLost = 0;
  let defLost = 0;
  const comparisons = Math.min(atkResults.length, defResults.length);
  
  for (let i = 0; i < comparisons; i++) {
    if (atkResults[i] > defResults[i]) defLost++;
    else atkLost++;
  }
  
  const data = {
    atkResults, defResults, atkLost, defLost,
    atkTerr: state.attackFrom,
    defTerr: state.attackTo
  };
  
  applyCombatResults(data);
  if (multi.active) broadcast({ type: 'SYNC_COMBAT', ...data });
}

export function applyCombatResults(data) {
  state.territories[data.atkTerr].armies -= data.atkLost;
  state.territories[data.defTerr].armies -= data.defLost;
  
  window.showCombatResult(data);
  window.renderMap();
  
  if (state.territories[data.defTerr].armies <= 0) {
    const winner = state.territories[data.atkTerr].owner;
    const loser = state.territories[data.defTerr].owner;
    state.territories[data.defTerr].owner = winner;
    state.justConquered = true;
    state.hasCapturedThisTurn = true;
    window.openMoveModal(data.atkTerr, data.defTerr, true);
    checkWin(winner, loser);
  } else if (state.territories[data.atkTerr].armies <= 1) {
    window.closeCombatModal();
  }
}

export function continueAttack() {
  window.setupCombat(state.attackFrom, state.attackTo);
}

export function stopAttack() {
  window.closeCombatModal();
}

export function confirmMove() {
  const val = parseInt(document.getElementById('move-slider').value);
  const wasConquest = state.justConquered;
  executeMove(val);
  window.closeMoveModal();
  if (wasConquest) {
    window.closeCombatModal();
  }
  if (multi.active) {
    broadcast({ type: 'SYNC_STATE', territories: state.territories, phase: state.phase, reinforcements: 0 });
  }
}

export function cancelMove() {
  if (state.justConquered) {
    executeMove(state.atkDice);
  }
  window.closeMoveModal();
}

export function executeMove(n, remote = false) {
  state.territories[state.moveFrom].armies -= n;
  state.territories[state.moveTo].armies += n;
  if (!remote) addLog(`${state.players[state.currentPlayer].name} déplace ${n} armée(s) de ${state.moveFrom} vers ${state.moveTo}.`, 'p' + (state.currentPlayer + 1));
  
  if (state.phase === 'move') {
    state.moveDone = true;
    state.selectedTerritory = null;
  }
  
  window.renderMap();
}

export function checkWin(player, loserIdx) {
  const total = Object.values(state.territories).length;
  const owned = countTerritories(player);
  if (owned === total) {
    setTimeout(() => {
      const title = document.getElementById('win-title');
      const sub = document.getElementById('win-subtitle');
      if (title) title.textContent = 'VICTOIRE !';
      if (sub) sub.textContent = `${state.players[player].name} a conquis le monde entier !`;
      document.getElementById('win-screen').classList.add('active');
    }, 500);
    return;
  }

  // Check if opponent was eliminated (ignore neutral)
  if (loserIdx !== undefined && loserIdx !== 3 && countTerritories(loserIdx) === 0) {
    const loser = state.players[loserIdx];
    const winner = state.players[player];
    addLog(`${winner.name} a éliminé ${loser.name} !`, 'system');
    showToast(`💀 ${loser.name} est éliminé !`);

    // Transfer cards
    if (loser.cards.length > 0) {
      addLog(`${winner.name} récupère ${loser.cards.length} carte(s) de ${loser.name}.`, 'system');
      winner.cards.push(...loser.cards);
      loser.cards = [];
      
      // If winner now has 6+ cards, must trade to ≤4 (per official rules)
      if (winner.cards.length >= 6) {
        state.mustTradeCards = true;
        showToast("📜 Trop de cartes ! Échange obligatoire immédiat.");
        window.openCardsModal();
      }
    }
  }

  // Check if only one player remains (excluding neutral)
  let activePlayers = 0;
  let winnerFinal = -1;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== 3 && countTerritories(i) > 0) {
      activePlayers++;
      winnerFinal = i;
    }
  }

  if (activePlayers === 1) {
    setTimeout(() => {
      const title = document.getElementById('win-title');
      const sub = document.getElementById('win-subtitle');
      if (title) title.textContent = 'VICTOIRE !';
      if (sub) sub.textContent = `${state.players[winnerFinal].name} a éliminé tous ses adversaires !`;
      document.getElementById('win-screen').classList.add('active');
    }, 500);
  }
}

// Global exports
window.initGame = initGame;
window.checkWin = checkWin;
window.endTurn = endTurn;
window.endDiplomacy = endDiplomacy;
window.endReinforcement = endReinforcement;
window.endAttack = endAttack;
window.rollCombat = rollCombat;
window.continueAttack = continueAttack;
window.stopAttack = stopAttack;
window.confirmMove = confirmMove;
window.cancelMove = cancelMove;
window.tradeCards = tradeCards;
window.openCardsModal = openCardsModal;
window.closeCardsModal = closeCardsModal;
window.getCardSetValue = getCardSetValue;
window.isValidCardSet = isValidCardSet;
