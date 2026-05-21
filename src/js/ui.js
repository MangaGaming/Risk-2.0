// ============================================================
// UI & RENDERING
// ============================================================

import { state, multi } from './state.js';
import { CONTINENTS } from './config.js';
import { showToast, getDiePath, countTerritories, isMyTurn } from './utils.js';
import { syncTerritories } from './map3d.js';
import { syncPieces } from './pieces3d.js';

export function buildLegend() {
  const el = document.getElementById('continent-legend');
  if (!el) return;
  el.innerHTML = Object.entries(CONTINENTS).map(([name, data]) => 
    `<div class="legend-item"><span class="legend-dot" style="background:${data.color}"></span>${name} (+${data.bonus})</div>`
  ).join('');
}

export function updateHeader() {
  const pIdx = state.currentPlayer;
  const p = state.players[pIdx];
  const el = document.getElementById('turn-player');
  if (el) {
    el.textContent = p.name;
    el.style.color = p.lightColor;
  }

  const dot = document.getElementById('turn-dot');
  if (dot) {
    dot.style.background = p.lightColor;
    dot.style.boxShadow = `0 0 8px ${p.lightColor}`;
  }

  // Update all player stats
  for (let i = 0; i < 3; i++) {
    const nameLabel = document.getElementById(`p${i+1}-name-label`);
    const terrCount = document.getElementById(`p${i+1}-territories`);
    const card = document.getElementById(`stat-p${i+1}`);
    
    if (i < state.playerCount) {
      if (nameLabel) nameLabel.textContent = state.players[i].name;
      if (terrCount) terrCount.textContent = countTerritories(i);
      if (card) {
        card.style.display = '';
        const color = state.players[i].lightColor;
        const shadowColor = i === 0 ? 'rgba(231,76,60,0.3)' : (i === 1 ? 'rgba(46,134,193,0.3)' : 'rgba(39,174,96,0.3)');
        card.style.boxShadow = state.currentPlayer === i ? `0 0 0 2px ${color}, 0 4px 16px ${shadowColor}` : '';
      }
    } else {
      if (card) card.style.display = 'none';
    }
  }

  // Handle separators
  const p3Only = document.querySelectorAll('.p3-only');
  p3Only.forEach(el => el.style.display = state.playerCount === 3 ? '' : 'none');

  const phaseEl = document.getElementById('turn-phase');
  if (phaseEl) {
    const phases = { diplo: '🤝 Phase de Diplomatie', reinf: 'Placement des renforts', attack: 'Phase d\'attaque', move: 'Déplacement d\'armées' };
    phaseEl.textContent = phases[state.phase] || '';
  }
}

export function updatePhaseUI() {
  const pIdx = state.currentPlayer;
  const p = state.players[pIdx];
  const phaseDesc = document.getElementById('phase-desc');
  if (phaseDesc) {
    const phaseDescs = {
      diplo:  `Phase diplomatique : négociez des pactes, échangez des territoires, formez des alliances.`,
      reinf: `Vous avez <strong>${state.reinforcements}</strong> armée(s) à placer. Cliquez sur un de vos territoires.`,
      attack: `Cliquez sur un de vos territoires (≥2 armées) puis sur un territoire ennemi adjacent.`,
      move: `Déplacez des armées vers un territoire voisin (facultatif). Un seul déplacement par tour.`
    };
    phaseDesc.innerHTML = phaseDescs[state.phase] || '';
  }

  const allPhases = ['diplo','reinf','attack','move'];
  const psIds = ['ps-diplo','ps-reinf','ps-attack','ps-move'];
  const cur = allPhases.indexOf(state.phase);
  psIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'all 0.4s';
    if (i < cur) {
      el.className = 'phase-step done';
      el.style.background = p.color;
    } else if (i === cur) {
      el.className = 'phase-step active';
      el.style.background = i === 0 ? '#d4a017' : p.lightColor;
    } else {
      el.className = 'phase-step';
      el.style.background = '';
    }
  });

  const secDiplo = document.getElementById('section-diplo');
  const secReinf = document.getElementById('section-reinf');
  const secAttack = document.getElementById('section-attack');
  const secMove = document.getElementById('section-move');
  
  if (secDiplo) secDiplo.style.display  = state.phase === 'diplo'   ? '' : 'none';
  if (secReinf) secReinf.style.display  = state.phase === 'reinf'   ? '' : 'none';
  if (secAttack) secAttack.style.display = state.phase === 'attack'  ? '' : 'none';
  if (secMove) secMove.style.display   = state.phase === 'move'    ? '' : 'none';

  if (state.phase === 'diplo') {
    const btnOpenDiplo = document.getElementById('btn-open-diplo');
    const btnEndDiplo = document.getElementById('btn-end-diplo');
    if (btnOpenDiplo) btnOpenDiplo.disabled = !isMyTurn() || state.embargoTurns[state.currentPlayer] > 0;
    if (btnEndDiplo) btnEndDiplo.disabled = !isMyTurn();
  }

  if (state.phase === 'reinf') {
    const badge = document.getElementById('reinf-badge');
    if (badge) {
      badge.textContent = state.reinforcements;
      badge.className = 'reinf-token p' + (state.currentPlayer + 1);
    }
    const btnEndReinf = document.getElementById('btn-end-reinf');
    if (btnEndReinf) btnEndReinf.disabled = state.reinforcements > 0 || !isMyTurn();
  }

  updateHeader();

  // Update cards button
  const cardsBtn = document.getElementById('btn-show-cards');
  if (cardsBtn) {
    const p = state.currentPlayer;
    const count = state.players[p]?.cards.length || 0;
    cardsBtn.textContent = `📜 Cartes (${count})`;
    cardsBtn.disabled = !isMyTurn();
  }
}

export function renderMap() {
  syncTerritories();
  syncPieces(state);
}

export function updateDiploPanel() {
  const container = document.getElementById('pact-list-panel');
  const noMsg = document.getElementById('no-pacts-msg');
  const active = state.pacts.filter(pk => !pk.broken && pk.toursLeft > 0);
  
  if (active.length === 0) {
    container.innerHTML = '';
    if (noMsg) noMsg.style.display = '';
  } else {
    if (noMsg) noMsg.style.display = 'none';
    container.innerHTML = active.map(pk => {
      const p0 = state.players[pk.player0].name;
      const p1 = state.players[pk.player1].name;
      return `<div class="pact-small-card">
        <strong>${pk.type.toUpperCase()}</strong> (${p0} & ${p1})<br>
        ⏳ ${pk.toursLeft} tr
      </div>`;
    }).join('');
  }
  
  const warn = document.getElementById('diplo-embargo-warn');
  if (warn) {
    if (state.embargoTurns[state.currentPlayer] > 0) {
      warn.innerHTML = `<div style="background:rgba(192,57,43,0.2); border:1px solid #c0392b; color:#e74c3c; padding:5px; font-size:0.6rem; border-radius:4px; margin-bottom:0.5rem; text-align:center;">🚫 SOUS EMBARGO (${state.embargoTurns[state.currentPlayer]} tr)</div>`;
      warn.style.display = '';
    } else {
      warn.style.display = 'none';
    }
  }
}

export function renderSanctionsDisplay() {
  const el = document.getElementById('sanctions-display');
  if (!el) return;
  let html = '';
  state.players.forEach((p, i) => {
    if (state.malusPending[i] > 0) html += `<div class="sanction-tag malus">${p.name}: -${state.malusPending[i]}⚔</div>`;
    if (state.embargoTurns[i] > 0) html += `<div class="sanction-tag embargo">${p.name}: 🚫 ${state.embargoTurns[i]}tr</div>`;
  });
  el.innerHTML = html;
}

export function showCombatResult(data) {
  const diceView = document.getElementById('dice-display');
  const section = document.getElementById('section-dice');
  if (diceView && section) {
    section.style.display = '';
    
    let html = '<div class="dice-row"><span>ATK</span>';
    data.atkResults.forEach(v => html += getDiePath(v, state.territories[data.atkTerr].owner));
    html += ` <span style="color:#e74c3c">(-${data.atkLost})</span></div>`;
    
    html += '<div class="dice-row"><span>DEF</span>';
    data.defResults.forEach(v => html += getDiePath(v, state.territories[data.defTerr].owner));
    html += ` <span style="color:#e74c3c">(-${data.defLost})</span></div>`;
    
    diceView.innerHTML = html;
  }
  
  // Update Modal
  const modalAtkDice = document.getElementById('atk-dice-display');
  const modalDefDice = document.getElementById('def-dice-display');
  const modalResult = document.getElementById('combat-result');
  
  if (modalAtkDice) modalAtkDice.innerHTML = data.atkResults.map(v => getDiePath(v, state.territories[data.atkTerr].owner)).join('');
  if (modalDefDice) modalDefDice.innerHTML = data.defResults.map(v => getDiePath(v, state.territories[data.defTerr].owner)).join('');
  
  if (modalResult) {
    if (state.territories[data.defTerr].armies <= 0) {
      modalResult.innerHTML = `<span style="color:#27ae60; font-weight:bold;">TERRITOIRE CONQUIS !</span>`;
      document.getElementById('btn-roll').style.display = 'none';
      document.getElementById('btn-stop-atk').style.display = 'none';
      document.getElementById('btn-continue-atk').style.display = 'none';
    } else if (state.territories[data.atkTerr].armies <= 1) {
      modalResult.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">OFFENSIVE BRISÉE !</span>`;
      document.getElementById('btn-roll').style.display = 'none';
      document.getElementById('btn-stop-atk').style.display = 'inline-block';
      document.getElementById('btn-continue-atk').style.display = 'none';
    } else {
      modalResult.innerHTML = `L'attaquant perd ${data.atkLost} ⚔, le défenseur perd ${data.defLost} ⚔`;
      document.getElementById('btn-roll').style.display = 'none';
      document.getElementById('btn-stop-atk').style.display = 'inline-block';
      document.getElementById('btn-continue-atk').style.display = 'inline-block';
    }
  }
}

export function syncCombatResult(data) {
  state.territories[data.atkTerr].armies -= data.atkLost;
  state.territories[data.defTerr].armies -= data.defLost;
  
  window.setupCombat(data.atkTerr, data.defTerr);
  showCombatResult(data);
  renderMap();
  
  if (state.territories[data.defTerr].armies <= 0) {
     const winner = state.territories[data.atkTerr].owner;
     const loser = state.territories[data.defTerr].owner;
     state.territories[data.defTerr].owner = winner;
     state.justConquered = true;
     state.hasCapturedThisTurn = true;
     if (window.checkWin) window.checkWin(winner, loser);
  }
}

export function setupCombat(atkTerr, defTerr) {
  state.attackFrom = atkTerr;
  state.attackTo = defTerr;
  
  const modal = document.getElementById('combat-modal');
  modal.classList.add('active');
  
  const atk = state.players[state.territories[atkTerr].owner];
  const def = state.players[state.territories[defTerr].owner];
  
  document.getElementById('atk-name').textContent = atk.name;
  document.getElementById('atk-name').style.color = atk.lightColor;
  document.getElementById('atk-terr').textContent = `${atkTerr} (${state.territories[atkTerr].armies}⚔)`;
  
  document.getElementById('def-name').textContent = def.name;
  document.getElementById('def-name').style.color = def.lightColor;
  document.getElementById('def-terr').textContent = `${defTerr} (${state.territories[defTerr].armies}⚔)`;
  
  document.getElementById('combat-result').textContent = "Prêt au combat ?";
  document.getElementById('atk-dice-display').innerHTML = "";
  document.getElementById('def-dice-display').innerHTML = "";
  
  document.getElementById('btn-roll').style.display = isMyTurn() ? 'inline-block' : 'none';
  document.getElementById('btn-continue-atk').style.display = 'none';
  document.getElementById('btn-stop-atk').style.display = isMyTurn() ? 'inline-block' : 'none';

  renderDiceSelectors();
}

export function renderDiceSelectors() {
  const maxAtk = Math.min(3, state.territories[state.attackFrom].armies - 1);
  const maxDef = Math.min(2, state.territories[state.attackTo].armies);
  
  state.atkDice = maxAtk;
  state.defDice = maxDef;

  const gAtk = document.getElementById('atk-dice-btns');
  const gDef = document.getElementById('def-dice-btns');
  
  gAtk.innerHTML = '';
  for (let i=1; i<=maxAtk; i++) {
    const btn = document.createElement('button');
    btn.className = 'dice-btn' + (state.atkDice === i ? ' selected' : '');
    btn.textContent = i;
    btn.onclick = () => { state.atkDice = i; renderDiceSelectors(); };
    if (!isMyTurn()) btn.disabled = true;
    gAtk.appendChild(btn);
  }
  
  gDef.innerHTML = '';
  for (let i=1; i<=maxDef; i++) {
    const btn = document.createElement('button');
    btn.className = 'dice-btn' + (state.defDice === i ? ' selected' : '');
    btn.textContent = i;
    btn.onclick = () => { state.defDice = i; renderDiceSelectors(); };
    // Defense is usually controlled by the defender player if online? 
    // For simplicity here, the local attacker chooses if local game.
    // If online, only defender should choose.
    if (multi.active) {
       if (state.territories[state.attackTo].owner === multi.localPlayerIndex) btn.disabled = false;
       else btn.disabled = true;
    }
    gDef.appendChild(btn);
  }
}

export function openMoveModal(from, to, mustMove = false) {
  state.moveFrom = from;
  state.moveTo = to;
  const modal = document.getElementById('move-modal');
  modal.classList.add('active');
  
  const max = state.territories[from].armies - 1;
  const slider = document.getElementById('move-slider');
  slider.min = mustMove ? state.atkDice : 1;
  slider.max = max;
  slider.value = slider.min;
  
  document.getElementById('move-modal-info').innerHTML = `Déployer des troupes de <strong>${from}</strong> vers <strong>${to}</strong>.`;
  document.getElementById('btn-cancel-move').style.display = mustMove ? 'none' : 'inline-block';
  updateMoveCount();
}

export function updateMoveCount() {
  const val = document.getElementById('move-slider').value;
  document.getElementById('move-count-display').textContent = val;
}

export function closeCombatModal() {
  document.getElementById('combat-modal').classList.remove('active');
  renderMap();
}

export function closeMoveModal() {
  document.getElementById('move-modal').classList.remove('active');
  state.justConquered = false;
  renderMap();
}

// ── CARDS MODAL ──

export function renderCardsModal() {
  const p = state.currentPlayer;
  const player = state.players[p];
  const cards = player.cards;
  const container = document.getElementById('cards-container');
  if (!container) return;

  const typeEmoji = { infantry: '⚔️', cavalry: '🐎', artillery: '🔫', wild: '🃏' };
  const typeName = { infantry: 'Infanterie', cavalry: 'Cavalerie', artillery: 'Artillerie', wild: 'Joker' };
  const value = window.getCardSetValue();

  document.getElementById('cards-value-display').textContent = `Valeur du prochain échange : ${value} armée(s)`;

  container.innerHTML = cards.map((card, i) => {
    const emoji = typeEmoji[card.type] || '🃏';
    const tname = typeName[card.type] || 'Joker';
    const terr = card.territory || '—';
    const owned = card.territory && state.territories[card.territory]?.owner === p;
    return `<div class="card-item" data-index="${i}" onclick="window.toggleCardSelect(${i})">
      <div class="card-item-check">✓</div>
      <div class="card-item-terr">${terr}</div>
      <div class="card-item-type">${emoji} ${tname}</div>
      ${owned ? '<div class="card-item-owned">★ Possédé</div>' : ''}
    </div>`;
  }).join('');

  state.selectedCards = [];
  document.getElementById('btn-trade-cards').disabled = true;
  document.getElementById('trade-info').textContent = 'Sélectionnez 3 cartes pour former un set.';

  // Show/hide pass button
  const passBtn = document.getElementById('btn-pass-trade');
  if (passBtn) {
    passBtn.style.display = state.mustTradeCards ? 'none' : 'inline-block';
  }
}

export function toggleCardSelect(index) {
  const p = state.currentPlayer;
  const player = state.players[p];
  if (index < 0 || index >= player.cards.length) return;

  if (state.selectedCards.includes(index)) {
    state.selectedCards = state.selectedCards.filter(i => i !== index);
  } else {
    if (state.selectedCards.length >= 3) {
      showToast("Sélectionnez exactement 3 cartes !");
      return;
    }
    state.selectedCards.push(index);
  }
  updateCardsSelection();
}

function updateCardsSelection() {
  const p = state.currentPlayer;
  const player = state.players[p];
  const cards = player.cards;
  const selected = state.selectedCards;
  const tradeBtn = document.getElementById('btn-trade-cards');
  const info = document.getElementById('trade-info');
  if (!tradeBtn || !info) return;

  document.querySelectorAll('.card-item').forEach(el => {
    const idx = parseInt(el.dataset.index);
    el.classList.toggle('selected', selected.includes(idx));
  });

  if (selected.length !== 3) {
    tradeBtn.disabled = true;
    info.textContent = `Sélectionnez 3 cartes (${selected.length}/3)`;
    return;
  }

  const tradedCards = selected.map(i => cards[i]);
  if (window.isValidCardSet(tradedCards)) {
    tradeBtn.disabled = false;
    const val = window.getCardSetValue();
    let bonusTotal = 0;
    for (const card of tradedCards) {
      if (card.territory && state.territories[card.territory]?.owner === p) {
        bonusTotal += 2;
      }
    }
    const remaining = Math.max(0, 2 - state.territoryBonusUsed);
    const displayBonus = Math.min(bonusTotal, remaining);
    const bonusText = displayBonus > 0 ? ` (+${displayBonus} bonus territoire)` : '';
    info.textContent = `Set valide ! Valeur : ${val} armée(s)${bonusText}`;
  } else {
    tradeBtn.disabled = true;
    info.textContent = 'Ces 3 cartes ne forment pas un set valide.';
  }
}

// Global exports
window.buildLegend = buildLegend;
window.updateHeader = updateHeader;
window.updatePhaseUI = updatePhaseUI;
window.renderMap = renderMap;
window.updateDiploPanel = updateDiploPanel;
window.renderSanctionsDisplay = renderSanctionsDisplay;
window.showCombatResult = showCombatResult;
window.syncCombatResult = syncCombatResult;
window.setupCombat = setupCombat;
window.openMoveModal = openMoveModal;
window.updateMoveCount = updateMoveCount;
window.closeCombatModal = closeCombatModal;
window.closeMoveModal = closeMoveModal;
window.renderCardsModal = renderCardsModal;
window.toggleCardSelect = toggleCardSelect;
