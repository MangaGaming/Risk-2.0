// ============================================================
// UI & RENDERING
// ============================================================

function buildLegend() {
  const el = document.getElementById('continent-legend');
  if (!el) return;
  el.innerHTML = Object.entries(CONTINENTS).map(([name, data]) =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${data.color}"></div>
      <span>${name} <span class="legend-bonus">+${data.bonus}</span></span>
    </div>`
  ).join('');
}

function renderMap() {
  const svg = document.getElementById('world-map');
  if (!svg) return;
  svg.innerHTML = '';

  // ── DEFS ──────────────────────────────────────────────────────────────────
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = `
    .territory { transition: fill-opacity 0.15s; }
    .territory.selected    { fill-opacity:0.4  !important; stroke:#f1c40f !important; stroke-width:3 !important; animation:pulse-gold  0.9s ease-in-out infinite; }
    .territory.attack-target { fill-opacity:0.4 !important; stroke:#ff2222 !important; stroke-width:3 !important; animation:pulse-red   0.8s ease-in-out infinite; }
    .territory.move-target   { fill-opacity:0.4 !important; stroke:#22ff66 !important; stroke-width:3 !important; animation:pulse-green 0.8s ease-in-out infinite; }
    @keyframes pulse-gold  { 0%,100%{filter:drop-shadow(0 0 0px #f1c40f)} 50%{filter:drop-shadow(0 0 12px #f1c40f)} }
    @keyframes pulse-red   { 0%,100%{filter:drop-shadow(0 0 0px #ff2222)} 50%{filter:drop-shadow(0 0 12px #ff2222)} }
    @keyframes pulse-green { 0%,100%{filter:drop-shadow(0 0 0px #22ff66)} 50%{filter:drop-shadow(0 0 12px #22ff66)} }
  `;
  defs.appendChild(styleEl);

  // Token shine gradient
  const tokenShin = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  tokenShin.id = 'token-shine';
  tokenShin.setAttribute('cx', '35%'); tokenShin.setAttribute('cy', '30%'); tokenShin.setAttribute('r', '60%');
  tokenShin.innerHTML = '<stop offset="0%" stop-color="rgba(255,255,255,0.55)"/><stop offset="100%" stop-color="rgba(0,0,0,0.4)"/>';
  defs.appendChild(tokenShin);

  // Token drop-shadow filter
  const fTok = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  fTok.id = 'tok-shadow';
  fTok.innerHTML = '<feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.6)"/>';
  defs.appendChild(fTok);

  svg.appendChild(defs);

  // ── VIEWPORT GROUP (image + territoires + tokens — suivent le zoom/pan) ──
  const viewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewGroup.id = 'map-viewport';
  applyMapTransform(viewGroup);
  svg.appendChild(viewGroup);

    // Carte SVG de fond — DANS le viewport pour suivre zoom/pan
    const bgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    bgImage.setAttribute('href', 'risk_board_real.svg');
    bgImage.setAttribute('x', '0');
    bgImage.setAttribute('y', '0');
    bgImage.setAttribute('width', '1000');
    bgImage.setAttribute('height', '700');
    bgImage.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    bgImage.setAttribute('pointer-events', 'none');
    viewGroup.appendChild(bgImage);

  // ── TERRITORIES — invisibles par défaut, cliquables ───────────────────────
  Object.entries(TERRITORY_PATHS).forEach(([name, pathData]) => {
    const terr = state.territories[name];
    if (!terr) return;

    const ownerColor = terr.owner !== null ? state.players[terr.owner].color : '#aaaaaa';

    const isSelected     = state.selectedTerritory === name || state.attackFrom === name || state.moveFrom === name;
    let   isAttackTarget = false, isMoveTarget = false;

    if (state.attackFrom && state.phase === 'attack') {
      const adj = ADJACENCY[state.attackFrom] || [];
      if (adj.includes(name) && terr.owner !== state.currentPlayer) isAttackTarget = true;
    }
    if (state.moveFrom && state.phase === 'move') {
      const adj = ADJACENCY[state.moveFrom] || [];
      if (adj.includes(name) && terr.owner === state.currentPlayer && name !== state.moveFrom) isMoveTarget = true;
    }

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'territory-group');
    g.style.cursor = 'pointer';

    // Détection path vs polygon
    const isPath = pathData.trim().startsWith('M') || pathData.trim().startsWith('m');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', isPath ? 'path' : 'polygon');
    if (isPath) {
      poly.setAttribute('d', pathData);
    } else {
      poly.setAttribute('points', pathData);
    }

    let cls = 'territory';
    if (isSelected)     cls += ' selected';
    if (isAttackTarget) cls += ' attack-target';
    if (isMoveTarget)   cls += ' move-target';
    poly.setAttribute('class', cls);
    poly.setAttribute('data-name', name);
    poly.id = 'terr-' + nameToId(name);

    // Invisible par défaut
    poly.setAttribute('fill', ownerColor);
    poly.setAttribute('fill-opacity', '0');
    poly.setAttribute('stroke', 'none');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.addEventListener('click', () => onTerritoryClick(name));
    g.appendChild(poly);

    // ── Token d'armée ─────────────────────────────────────────────────────
    if (POSITIONS[name]) {
      const [cx, cy] = POSITIONS[name];
      const tokGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tokGroup.setAttribute('pointer-events', 'none');
      tokGroup.innerHTML = `
        <ellipse cx="${cx+1.5}" cy="${cy+3}" rx="10" ry="6" fill="rgba(0,0,0,0.3)"/>
        <circle  cx="${cx}"   cy="${cy}"   r="10" fill="${ownerColor}" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" filter="url(#tok-shadow)"/>
        <circle  cx="${cx}"   cy="${cy}"   r="10" fill="url(#token-shine)"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
              font-family="Cinzel,serif" font-size="${terr.armies >= 10 ? '7' : '8'}" font-weight="700"
              fill="white" stroke="rgba(0,0,0,0.6)" stroke-width="1.5" paint-order="stroke">${terr.armies}</text>
      `;
      g.appendChild(tokGroup);
    }

    viewGroup.appendChild(g);
  });
}
function applyMapTransform(el = null) {
  const viewport = el || document.getElementById('map-viewport');
  if (!viewport) return;
  viewport.setAttribute('transform', `translate(${mapViewState.x}, ${mapViewState.y}) scale(${mapViewState.scale})`);
}

function updateHeader() {
  const p = state.players[state.currentPlayer];
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

  const p1Name = document.getElementById('p1-name-label');
  if (p1Name) p1Name.textContent = state.players[0].name;
  const p2Name = document.getElementById('p2-name-label');
  if (p2Name) p2Name.textContent = state.players[1].name;
  
  const p1Terr = document.getElementById('p1-territories');
  if (p1Terr) p1Terr.textContent = countTerritories(0);
  const p2Terr = document.getElementById('p2-territories');
  if (p2Terr) p2Terr.textContent = countTerritories(1);

  const card1 = document.getElementById('stat-p1');
  const card2 = document.getElementById('stat-p2');
  if (card1) card1.style.boxShadow = state.currentPlayer === 0 ? '0 0 0 2px var(--p1-bright), 0 4px 16px rgba(231,76,60,0.3)' : '';
  if (card2) card2.style.boxShadow = state.currentPlayer === 1 ? '0 0 0 2px var(--p2-bright), 0 4px 16px rgba(46,134,193,0.3)' : '';

  const phaseEl = document.getElementById('turn-phase');
  if (phaseEl) {
    const phases = { diplo: '🤝 Phase de Diplomatie', reinf: 'Placement des renforts', attack: 'Phase d\'attaque', move: 'Déplacement d\'armées' };
    phaseEl.textContent = phases[state.phase] || '';
  }
}

function updatePhaseUI() {
  const p = state.players[state.currentPlayer];
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
}

function showTerrInfo(name) {
  const terr = state.territories[name];
  const cont = getContinentForTerritory(name);
  const owner = terr.owner !== null ? state.players[terr.owner].name : 'Libre';
  const el = document.getElementById('terr-detail');
  if (el) {
    el.innerHTML = `
      <div class="terr-info">
        <div class="terr-info-name">${name}</div>
        <div class="terr-info-detail">🌍 ${cont}</div>
        <div class="terr-info-detail">⚑ ${owner}</div>
        <div class="terr-info-detail">⚔ ${terr.armies} armée(s)</div>
      </div>
    `;
  }
  const secInfo = document.getElementById('section-terr-info');
  if (secInfo) secInfo.style.display = '';
}

function openCombatModal(remote = false) {
  const atk = state.territories[state.attackFrom];
  const def = state.territories[state.attackTo];
  if (!atk || !def) return;
  
  const atkPlayer = state.players[atk.owner];
  const defPlayer = state.players[def.owner];

  document.getElementById('atk-name').textContent = atkPlayer.name;
  document.getElementById('atk-name').style.color = atkPlayer.lightColor;
  document.getElementById('def-name').textContent = defPlayer.name;
  document.getElementById('def-name').style.color = defPlayer.lightColor;
  document.getElementById('atk-terr').textContent = `${state.attackFrom} (${atk.armies} armées)`;
  document.getElementById('def-terr').textContent = `${state.attackTo} (${def.armies} armées)`;

  const maxAtk = Math.min(3, atk.armies - 1);
  state.atkDice = Math.max(1, maxAtk); 
  state.defDice = Math.min(2, def.armies);

  let atkBtns = '';
  for (let i = 1; i <= maxAtk; i++) {
    atkBtns += `<button class="dice-count-btn ${i === state.atkDice ? 'selected' : ''}" onclick="selectAtkDice(${i})">🎲 ${i}</button>`;
  }
  document.getElementById('atk-dice-btns').innerHTML = atkBtns;

  let defBtns = '';
  for (let i = 1; i <= state.defDice; i++) {
    defBtns += `<button class="dice-count-btn ${i === state.defDice ? 'selected' : ''}" onclick="selectDefDice(${i})">🛡 ${i}</button>`;
  }
  document.getElementById('def-dice-btns').innerHTML = defBtns;

  document.getElementById('atk-dice-display').innerHTML = '';
  document.getElementById('def-dice-display').innerHTML = '';
  document.getElementById('combat-result').textContent = '';
  document.getElementById('btn-roll').style.display = isMyTurn() ? '' : 'none';
  document.getElementById('btn-continue-atk').style.display = 'none';
  document.getElementById('btn-stop-atk').style.display = 'none';

  document.getElementById('combat-modal').classList.add('active');
}

function selectAtkDice(n) {
  state.atkDice = n;
  document.querySelectorAll('#atk-dice-btns .dice-count-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', parseInt(btn.textContent.match(/\d+/)[0]) === n);
  });
}

function selectDefDice(n) {
  state.defDice = n;
  document.querySelectorAll('#def-dice-btns .dice-count-btn').forEach((btn) => {
    btn.classList.toggle('selected', parseInt(btn.textContent.match(/\d+/)[0]) === n);
  });
}

function openMoveModal() {
  const fromT = state.territories[state.moveFrom];
  const max = fromT.armies - 1;
  const pColor = state.players[state.currentPlayer].lightColor;

  document.getElementById('move-modal-info').innerHTML =
    `Déplacer de <strong style="color:${pColor}">${state.moveFrom}</strong> vers <strong style="color:${pColor}">${state.moveTo}</strong>`;

  const badge = document.getElementById('move-count-display');
  badge.style.color = pColor;

  const slider = document.getElementById('move-slider');
  slider.min = 1;
  slider.max = max;
  slider.value = 1;
  badge.textContent = '1';

  document.getElementById('move-modal').classList.add('active');
}

function updateMoveCount(val) {
  const el = document.getElementById('move-count-display');
  if (el) el.textContent = val;
}

function updateDiploPanel() {
  const p = state.currentPlayer;

  const embargoWarn = document.getElementById('diplo-embargo-warn');
  if (state.embargoTurns[p] > 0) {
    if (embargoWarn) {
      embargoWarn.style.display = '';
      embargoWarn.innerHTML = `<div class="embargo-badge">🚫 EMBARGO — ${state.embargoTurns[p]} tour(s) restant(s)<br><small>Vous ne pouvez pas négocier.</small></div>`;
    }
    const btnOpenDiplo = document.getElementById('btn-open-diplo');
    if (btnOpenDiplo) btnOpenDiplo.disabled = true;
  } else {
    if (embargoWarn) embargoWarn.style.display = 'none';
    const btnOpenDiplo = document.getElementById('btn-open-diplo');
    if (btnOpenDiplo) btnOpenDiplo.disabled = false;
  }

  renderPactListPanel();
  renderSanctionsDisplay();
}

function renderPactListPanel() {
  const container = document.getElementById('pact-list-panel');
  const noMsg = document.getElementById('no-pacts-msg');
  if (!container) return;
  const activePacts = state.pacts.filter(pk => !pk.broken && pk.toursLeft > 0);

  if (activePacts.length === 0) {
    container.innerHTML = '';
    if (noMsg) noMsg.style.display = '';
    return;
  }
  if (noMsg) noMsg.style.display = 'none';
  container.innerHTML = activePacts.map(pk => pactCardHTML(pk, true)).join('');
}

function renderSanctionsDisplay() {
  const p = state.currentPlayer;
  const el = document.getElementById('sanctions-display');
  if (!el) return;
  let html = '';
  if (state.malusPending[p] > 0) {
    html += `<div class="sanction-badge malus">⚔ Malus prochain tour : -${state.malusPending[p]} renforts</div>`;
  }
  if (state.embargoTurns[p] > 0) {
    html += `<div class="sanction-badge embargo" style="margin-top:3px;">🚫 Embargo : ${state.embargoTurns[p]} tour(s)</div>`;
  }
  el.innerHTML = html;
}

function zoomMap(factor) {
  const oldScale = mapViewState.scale;
  let newScale = oldScale * factor;
  newScale = Math.max(0.2, Math.min(newScale, 5));
  if (newScale === oldScale) return;

  // Centre logique du viewBox (-80 -50 1100 580 -> cx approx 470, cy approx 240)
  const cx = 470;
  const cy = 240;
  
  mapViewState.x += cx * (oldScale - newScale);
  mapViewState.y += cy * (oldScale - newScale);
  mapViewState.scale = newScale;

  applyMapTransform();
}

function resetMap() {
  mapViewState.x = 0;
  mapViewState.y = 0;
  mapViewState.scale = 1;
  applyMapTransform();
}

function initMapInteractions() {
  const svg = document.getElementById('world-map');
  if (!svg) return;

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomMap(delta);
  }, { passive: false });

  let isDragging = false;
  let startX, startY;

  svg.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - mapViewState.x;
    startY = e.clientY - mapViewState.y;
    mapViewState.isDragged = false;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx - mapViewState.x) > 5 || Math.abs(dy - mapViewState.y) > 5) {
      mapViewState.isDragged = true;
    }
    mapViewState.x = dx;
    mapViewState.y = dy;
    applyMapTransform();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  let initialPinchDistance = null;

  svg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      startX = e.touches[0].clientX - mapViewState.x;
      startY = e.touches[0].clientY - mapViewState.y;
      mapViewState.isDragged = false;
    } else if (e.touches.length === 2) {
      isDragging = false;
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      mapViewState.isDragged = true;
    }
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.abs(dx - mapViewState.x) > 5 || Math.abs(dy - mapViewState.y) > 5) {
        mapViewState.isDragged = true;
      }
      mapViewState.x = dx;
      mapViewState.y = dy;
      applyMapTransform();
    } else if (e.touches.length === 2 && initialPinchDistance !== null) {
      e.preventDefault();
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      // Small smoothing to zoomMap delta
      if (currentDistance > 0 && initialPinchDistance > 0) {
        const delta = currentDistance / initialPinchDistance;
        // Don't register extremely tiny jitter as zoom
        if (Math.abs(1 - delta) > 0.02) {
           zoomMap(delta);
           initialPinchDistance = currentDistance;
        }
      }
    }
  }, { passive: false });

  svg.addEventListener('touchend', () => {
    isDragging = false;
    initialPinchDistance = null;
  });
}

// Global exposure
window.initMapInteractions = initMapInteractions;
window.zoomMap = zoomMap;
window.resetMap = resetMap;
window.updateHeader = updateHeader;
window.updatePhaseUI = updatePhaseUI;
window.showTerrInfo = showTerrInfo;
window.openCombatModal = openCombatModal;
window.selectAtkDice = selectAtkDice;
window.selectDefDice = selectDefDice;
window.openMoveModal = openMoveModal;
window.updateMoveCount = updateMoveCount;
window.updateDiploPanel = updateDiploPanel;
window.renderPactListPanel = renderPactListPanel;
window.renderSanctionsDisplay = renderSanctionsDisplay;
