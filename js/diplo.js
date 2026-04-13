// ============================================================
// DIPLOMACY LOGIC
// ============================================================

function openDiploModal() {
  const p = state.currentPlayer;
  if (state.embargoTurns[p] > 0) {
    showToast(`🚫 ${state.players[p].name} est sous embargo — négociation impossible !`);
    return;
  }
  // Populate territory selects
  populateTerrSelects();
  // Reset to propose tab
  switchDiploTab('propose');
  selectPactType('non-agression');
  document.getElementById('diplo-modal').classList.add('active');
}

function closeDiploModal() {
  document.getElementById('diplo-modal').classList.remove('active');
}

function switchDiploTab(tab) {
  document.querySelectorAll('.diplo-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.diplo-tab-content').forEach(t => t.classList.remove('active'));
  // Map tab name to button index
  const tabs = ['propose','active','history'];
  const idx = tabs.indexOf(tab);
  if (idx !== -1) {
    document.querySelectorAll('.diplo-tab')[idx].classList.add('active');
    document.getElementById('dtab-'+tab).classList.add('active');
  }

  if (tab === 'active') renderModalPactList();
  if (tab === 'history') renderDiploHistory();
}

function selectPactType(type) {
  state.currentPactType = type;
  ['non-agression','echange','alliance'].forEach(t => {
    const btn = document.getElementById('ptype-'+t);
    if (btn) btn.classList.toggle('selected', t === type);
    const fields = document.getElementById('pact-fields-'+t);
    if (fields) fields.style.display = t === type ? '' : 'none';
  });
  if (type === 'echange') populateTerrSelects();
}

function populateTerrSelects() {
  const p = state.currentPlayer;
  const opp = 1 - p;
  const myTerrs = Object.keys(state.territories).filter(n => state.territories[n].owner === p);
  const oppTerrs = Object.keys(state.territories).filter(n => state.territories[n].owner === opp);

  const giveEl = document.getElementById('pact-give-terr');
  const recvEl = document.getElementById('pact-recv-terr');
  if (!giveEl || !recvEl) return;

  giveEl.innerHTML = '<option value="">-- Choisir --</option>' + myTerrs.map(n =>
    `<option value="${n}">${n} (${state.territories[n].armies}⚔)</option>`).join('');
  recvEl.innerHTML = '<option value="">-- Choisir --</option>' + oppTerrs.map(n =>
    `<option value="${n}">${n} (${state.territories[n].armies}⚔)</option>`).join('');
}

function proposePact() {
  if (!isMyTurn()) { showToast("C'est le tour de l'adversaire !"); return; }
  const p = state.currentPlayer;
  const opp = 1 - p;
  const type = state.currentPactType;
  
  // Clear selection mode if active
  state.diploSelectTarget = null;
  document.getElementById('diplo-modal').classList.remove('selecting');
  document.getElementById('map-select-instr').classList.remove('active');

  if (type === 'echange') {
    const give = document.getElementById('pact-give-terr').value;
    const recv = document.getElementById('pact-recv-terr').value;
    if (!give || !recv) { showToast('⚠ Sélectionnez les deux territoires !'); return; }
    
    if (multi.active) {
       // Proposer l'échange en ligne
       const pact = {
         id: Date.now(),
         type, player0: p, player1: opp,
         note: `Échange : ${give} ⇄ ${recv}`, toursLeft: 1,
         createdTurn: state.globalTurn, broken: false, brokenBy: null,
         give, recv
       };
       broadcast({ type: 'DIPLO_PROPOSE', pact });
       showToast("Proposition d'échange envoyée...");
       closeDiploModal();
    } else {
       executeExchange(give, recv);
       closeDiploModal();
       updateDiploPanel();
    }
    return;
  }

  let note = '';
  let toursLeft = 2;

  if (type === 'non-agression') {
    toursLeft = parseInt(document.getElementById('pact-duration').value);
    note = document.getElementById('pact-note-nonagg').value.trim() ||
      `Non-agression mutuelle pendant ${toursLeft} tours.`;
  } else if (type === 'alliance') {
    toursLeft = parseInt(document.getElementById('pact-alliance-duration').value);
    note = document.getElementById('pact-note-alliance').value.trim() ||
      `Alliance militaire pour ${toursLeft} tours.`;
  }

  const pact = {
    id: Date.now(),
    type, player0: p, player1: opp,
    note, toursLeft,
    createdTurn: state.globalTurn,
    broken: false, brokenBy: null,
    give: null, recv: null
  };

  if (multi.active) {
    broadcast({ type: 'DIPLO_PROPOSE', pact });
    showToast("Proposition envoyée à l'adversaire...");
    closeDiploModal();
    return;
  }

  state.pacts.push(pact);
  addDiploHistory(`📜 Pacte "${pact.type}" scellé : ${note}`);
  addLog(`🤝 Pacte signé : ${state.players[p].name} & ${state.players[opp].name}`, 'system');
  showToast(`📜 Traité scellé !`);

  // Reset form
  document.getElementById('pact-note-nonagg').value = '';
  document.getElementById('pact-note-alliance').value = '';

  closeDiploModal();
  updateDiploPanel();
}

function executeExchange(give, recv) {
  const tGive = state.territories[give];
  const tRecv = state.territories[recv];
  if (!tGive || !tRecv) return;

  const ownerA = tGive.owner;
  const ownerB = tRecv.owner;

  tGive.owner = ownerB;
  tRecv.owner = ownerA;

  addLog(`🔄 Échange : ${give} (→ ${state.players[ownerB].name}) ⇄ ${recv} (→ ${state.players[ownerA].name})`, 'system');
  renderMap(); updateHeader();
  showToast(`🔄 Échange conclu !`);
}

function openNegotiationModal(pact) {
  const opp = state.players[pact.player0];
  document.getElementById('negoc-opp-name').textContent = opp.name;
  document.getElementById('negoc-opp-name').style.color = opp.lightColor;
  
  let body = '';
  if (pact.type === 'echange') {
    body = `Échange de territoires :<br><strong>${pact.give}</strong> ⇄ <strong>${pact.recv}</strong>`;
  } else if (pact.type === 'alliance') {
    body = `Alliance militaire contre un objectif commun`;
  } else {
    body = `Pacte de non-agression mutuelle`;
  }
  
  document.getElementById('negoc-pact-type').textContent = pact.type.toUpperCase();
  document.getElementById('negoc-pact-body').innerHTML = body;
  document.getElementById('negoc-pact-duration').textContent = `Durée : ${pact.toursLeft} tours`;
  document.getElementById('negoc-pact-note').textContent = `"${pact.note || 'Pas de note particulière.'}"`;
  
  document.getElementById('negotiation-modal').classList.add('active');
}

function acceptTreaty() {
  const pact = state.incomingProposal;
  if (!pact) return;
  
  state.pacts.push(pact);
  if (pact.type === 'echange') {
    executeExchange(pact.give, pact.recv);
  }
  
  broadcast({ type: 'DIPLO_ACCEPT', pact });
  
  addDiploHistory(`🤝 Vous avez accepté le traité de ${state.players[pact.player0].name}`);
  showToast("Traité accepté !");
  updateDiploPanel();
  
  document.getElementById('negotiation-modal').classList.remove('active');
  state.incomingProposal = null;
}

function rejectTreaty() {
  const pact = state.incomingProposal;
  if (!pact) return;
  
  broadcast({ type: 'DIPLO_REJECT' });
  showToast("Offre déclinée.");
  
  document.getElementById('negotiation-modal').classList.remove('active');
  state.incomingProposal = null;
}

function renderModalPactList() {
  const container = document.getElementById('modal-pact-list');
  const noMsg = document.getElementById('modal-no-pacts');
  const active = state.pacts.filter(pk => !pk.broken && pk.toursLeft > 0);
  const expired = state.pacts.filter(pk => pk.broken || pk.toursLeft <= 0);
  const all = [...active, ...expired];

  if (all.length === 0) {
    container.innerHTML = '';
    noMsg.style.display = '';
    return;
  }
  noMsg.style.display = 'none';
  container.innerHTML = all.map(pk => pactCardHTML(pk, !pk.broken && pk.toursLeft > 0)).join('');
}

function pactCardHTML(pk, showBreak) {
  const icons = { 'non-agression': '🛡', 'echange': '🔄', 'alliance': '⚔' };
  const labels = { 'non-agression': 'Non-agression', 'echange': 'Échange', 'alliance': 'Alliance' };
  const breakBtn = showBreak
    ? `<button class="pact-break-btn" onclick="triggerBreachFlow(${pk.id})" title="Rompre ce pacte (déclenche des sanctions)">Rompre</button>`
    : '';
  return `<div class="pact-card ${pk.toursLeft <= 0 ? 'expired' : ''}">
    ${breakBtn}
    <div class="pact-type">${icons[pk.type] || '📜'} ${labels[pk.type] || pk.type}</div>
    <div class="pact-body">${pk.note || 'Pacte scellé entre les deux joueurs.'}</div>
    <div class="pact-turns">⏳ ${pk.toursLeft} tour(s) restant(s)</div>
  </div>`;
}

function renderDiploHistory() {
  const el = document.getElementById('diplo-history-list');
  const noEl = document.getElementById('diplo-no-history');
  if (!el) return;
  if (state.diplomacyHistory.length === 0) {
    el.innerHTML = '';
    if (noEl) noEl.style.display = '';
    return;
  }
  if (noEl) noEl.style.display = 'none';
  el.innerHTML = [...state.diplomacyHistory].reverse().map(h =>
    `<div style="padding:4px 6px;border-left:2px solid var(--gold-dark);opacity:0.8;line-height:1.4;">${h}</div>`
  ).join('');
}

function addDiploHistory(msg) {
  state.diplomacyHistory.push(`[Tour ${state.globalTurn}] ${msg}`);
}

function triggerBreachFlow(pactId) {
  const pact = state.pacts.find(pk => pk.id === pactId);
  if (!pact) return;
  state.pendingBreachPactId = pactId;

  const breacherIdx = state.currentPlayer;
  const victimIdx = 1 - breacherIdx;
  document.getElementById('sanction-breach-desc').innerHTML =
    `<strong style="color:var(--p1-light)">${state.players[breacherIdx].name}</strong> rompt le pacte :<br>
    <em style="color:var(--parchment-dark)">"${pact.note}"</em><br><br>
    <strong style="color:var(--p2-light)">${state.players[victimIdx].name}</strong> choisit la sanction.`;

  selectSanction('malus');
  closeDiploModal();
  document.getElementById('sanction-modal').classList.add('active');
}

function selectSanction(type) {
  state.currentSanction = type;
  ['malus','embargo','vengeance'].forEach(t => {
    const opt = document.getElementById('sanc-opt-'+t);
    if (opt) opt.classList.toggle('selected', t === type);
  });
}

function applySanction() {
  const pactId = state.pendingBreachPactId;
  const sanctionType = state.currentSanction;
  if (!pactId) { dismissSanction(); return; }

  broadcast({ type: 'DIPLO_BREACH', pactId, sanction: sanctionType });
  applySanctionLogic(pactId, sanctionType);
  dismissSanction();
}

function applySanctionLogic(pactId, s, remote = false) {
  const pact = state.pacts.find(pk => pk.id === pactId);
  if (!pact) return;

  const traitorIdx = remote ? state.currentPlayer : (1 - state.currentPlayer);
  const victimIdx = 1 - traitorIdx;

  pact.broken = true;
  pact.brokenBy = traitorIdx;
  
  let sanctionDesc = "";

  if (s === 'malus') {
    state.malusPending[traitorIdx] += 3;
    sanctionDesc = `Malus de -3 renforts pour ${state.players[traitorIdx].name}.`;
    showToast(`⚔ Sanction : -3 renforts pour ${state.players[traitorIdx].name} !`);
  } else if (s === 'embargo') {
    state.embargoTurns[traitorIdx] += 3;
    sanctionDesc = `Embargo diplomatique de 3 tours pour ${state.players[traitorIdx].name}.`;
    showToast(`🚫 Sanction : Embargo sur ${state.players[traitorIdx].name} !`);
  } else if (s === 'vengeance') {
    state.vengeanceQueue.push({ victim: victimIdx, amount: 2 });
    sanctionDesc = `Droit à la vengeance (+2 armées) pour ${state.players[victimIdx].name}.`;
    showToast(`🛡 Sanction : Vengeance pour ${state.players[victimIdx].name} !`);
  }

  addDiploHistory(`💔 Pacte rompu par ${state.players[traitorIdx].name}. Sanction : ${sanctionDesc}`);
  addLog(`💔 Trahison ! ${sanctionDesc}`, 'system');

  document.getElementById('sanction-modal').classList.remove('active');
  state.pendingBreachPactId = null;
  updateDiploPanel();
  renderMap();
}

function dismissSanction() {
  const pactId = state.pendingBreachPactId;
  const pact = state.pacts.find(pk => pk.id === pactId);
  if (pact) { pact.broken = true; pact.brokenBy = state.currentPlayer; }
  addDiploHistory(`🕊 Pardon accordé par ${state.players[1-state.currentPlayer].name} — aucune sanction.`);
  document.getElementById('sanction-modal').classList.remove('active');
  state.pendingBreachPactId = null;
  updateDiploPanel();
}

function decrementEmbargo() {
  const p = state.currentPlayer;
  if (state.embargoTurns[p] > 0) {
    state.embargoTurns[p] = Math.max(0, state.embargoTurns[p] - 1);
  }
}
