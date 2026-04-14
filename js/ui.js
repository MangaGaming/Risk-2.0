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

  // Create viewport group
  const viewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  viewGroup.id = 'map-viewport';
  applyMapTransform(viewGroup);
  svg.appendChild(viewGroup);

  // ── DEFS ─────────────────────────────────────────────────
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

  // Army token radial gradients
  const gradientColors = {
    '0':      ['#e74c3c', '#c0392b', '#922b21'],
    '1':      ['#3498db', '#2980b9', '#1a5276'],
    'neutral':['#95a5a6', '#7f8c8d', '#2c3e50']
  };
  Object.entries(gradientColors).forEach(([id, colors]) => {
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
    grad.id = 'pieceGradient-' + id;
    grad.setAttribute('cx', '35%'); grad.setAttribute('cy', '35%'); grad.setAttribute('r', '50%');
    ['0%','70%','100%'].forEach((offset, i) => {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      s.setAttribute('offset', offset); s.setAttribute('stop-color', colors[i]);
      grad.appendChild(s);
    });
    defs.appendChild(grad);
  });

  // Ocean gradient
  const oceanGrad = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient');
  oceanGrad.id = 'oceanGradient';
  oceanGrad.setAttribute('cx', '40%'); oceanGrad.setAttribute('cy', '40%'); oceanGrad.setAttribute('r', '75%');
  [['0%','#1f4e79'],['100%','#0a1f35']].forEach(([off, col]) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s.setAttribute('offset', off); s.setAttribute('stop-color', col);
    oceanGrad.appendChild(s);
  });
  defs.appendChild(oceanGrad);

  // Territory drop-shadow filter
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.id = 'terrShadow';
  filter.setAttribute('x', '-10%'); filter.setAttribute('y', '-10%');
  filter.setAttribute('width', '120%'); filter.setAttribute('height', '120%');
  const feDs = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
  feDs.setAttribute('dx', '1'); feDs.setAttribute('dy', '2');
  feDs.setAttribute('stdDeviation', '2.5'); feDs.setAttribute('flood-opacity', '0.45');
  filter.appendChild(feDs);
  defs.appendChild(filter);

  svg.appendChild(defs);

  // ── OCEAN BACKGROUND ──────────────────────────────────────
  const oceanRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  oceanRect.setAttribute('x', '-1000'); oceanRect.setAttribute('y', '-500');
  oceanRect.setAttribute('width', '3000'); oceanRect.setAttribute('height', '1500');
  oceanRect.setAttribute('fill', 'url(#oceanGradient)');
  viewGroup.appendChild(oceanRect);

  // Subtle ocean grid dots
  const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dotGroup.setAttribute('opacity', '0.1');
  for (let x = 0; x < 1000; x += 32) {
    for (let y = 0; y < 540; y += 28) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x + (y % 56 === 0 ? 0 : 16));
      dot.setAttribute('cy', y);
      dot.setAttribute('r', '1.2');
      dot.setAttribute('fill', '#89d4f5');
      dotGroup.appendChild(dot);
    }
  }
  viewGroup.appendChild(dotGroup);

  // ── MARITIME ROUTES ───────────────────────────────────────
  MARITIME_ROUTES.forEach(([from, to]) => {
    const fromPos = POSITIONS[from];
    const toPos   = POSITIONS[to];
    if (!fromPos || !toPos) return;

    const [fx, fy] = fromPos;
    const [tx, ty] = toPos;

    let d, midX, midY;
    const isAlaskaKam = (from === 'Alaska' || from === 'Kamchatka') &&
                        (to   === 'Alaska' || to   === 'Kamchatka');
    if (isAlaskaKam) {
      const arcY = Math.min(fy, ty) - 52;
      d = `M${fx},${fy} C${fx},${arcY} ${tx},${arcY} ${tx},${ty}`;
      midX = (fx + tx) / 2; midY = arcY + 5;
    } else {
      const mx = (fx + tx) / 2, my = (fy + ty) / 2;
      const dxr = tx - fx, dyr = ty - fy;
      const len = Math.sqrt(dxr*dxr + dyr*dyr);
      const nx = -dyr / len, ny = dxr / len;
      const curv = Math.min(len * 0.22, 45);
      const cpx = mx + nx * curv, cpy = my + ny * curv - 15;
      d = `M${fx},${fy} Q${cpx},${cpy} ${tx},${ty}`;
      midX = mx + nx * curv * 0.5; midY = my + ny * curv * 0.5 - 7;
    }

    // Shadow stroke
    const shadow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shadow.setAttribute('d', d); shadow.setAttribute('fill', 'none');
    shadow.setAttribute('stroke', 'rgba(0,0,0,0.35)'); shadow.setAttribute('stroke-width', '4');
    shadow.setAttribute('stroke-dasharray', '8,6'); shadow.setAttribute('stroke-linecap', 'round');
    viewGroup.appendChild(shadow);

    // Route line
    const route = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    route.setAttribute('d', d); route.setAttribute('fill', 'none');
    route.setAttribute('stroke', '#5bc0eb'); route.setAttribute('stroke-width', '2');
    route.setAttribute('stroke-dasharray', '8,6'); route.setAttribute('opacity', '0.85');
    route.setAttribute('stroke-linecap', 'round'); route.setAttribute('class', 'maritime-route');
    viewGroup.appendChild(route);

    // Anchor icon at midpoint
    const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    anchor.setAttribute('x', midX); anchor.setAttribute('y', midY);
    anchor.setAttribute('font-size', '9'); anchor.setAttribute('text-anchor', 'middle');
    anchor.setAttribute('dominant-baseline', 'middle');
    anchor.setAttribute('opacity', '0.65'); anchor.setAttribute('pointer-events', 'none');
    anchor.textContent = '⚓';
    viewGroup.appendChild(anchor);
  });

  // ── TERRITORY POLYGONS ────────────────────────────────────
  Object.entries(TERRITORY_PATHS).forEach(([name, pointsStr]) => {
    const terr = state.territories[name];
    if (!terr) return;

    const contColor  = getContinentColor(name);
    const ownerColor = terr.owner !== null ? state.players[terr.owner].color : null;

    const isSelected = state.selectedTerritory === name ||
                       state.attackFrom === name ||
                       state.moveFrom   === name;
    let isAttackTarget = false, isMoveTarget = false;

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

    // Territory polygon
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pointsStr);
    poly.setAttribute('class', 'territory');
    poly.setAttribute('data-name', name);
    poly.id = 'terr-' + nameToId(name);
    poly.setAttribute('filter', 'url(#terrShadow)');

    if (ownerColor) {
      poly.setAttribute('fill', ownerColor);
      poly.setAttribute('fill-opacity', isSelected ? '1' : '0.82');
    } else {
      poly.setAttribute('fill', contColor);
      poly.setAttribute('fill-opacity', '0.42');
    }

    let strokeColor = 'rgba(0,0,0,0.55)', strokeWidth = '1';
    if (isSelected)      { strokeColor = '#f1c40f'; strokeWidth = '3'; }
    else if (isAttackTarget) { strokeColor = '#ff3333'; strokeWidth = '3'; poly.classList.add('attack-target'); }
    else if (isMoveTarget)   { strokeColor = '#44ff88'; strokeWidth = '3'; poly.classList.add('move-target'); }

    poly.setAttribute('stroke', strokeColor);
    poly.setAttribute('stroke-width', strokeWidth);
    poly.setAttribute('stroke-linejoin', 'round');
    poly.addEventListener('click', () => onTerritoryClick(name));
    g.appendChild(poly);

    // ── Army token ─────────────────────
    const [px, py] = POSITIONS[name];
    const tokX = px, tokY = py - 10;

    const shadowCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shadowCircle.setAttribute('cx', tokX + 1.5); shadowCircle.setAttribute('cy', tokY + 2);
    shadowCircle.setAttribute('r', '8.5'); shadowCircle.setAttribute('fill', 'rgba(0,0,0,0.4)');
    shadowCircle.setAttribute('pointer-events', 'none');
    g.appendChild(shadowCircle);

    const token = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    token.setAttribute('cx', tokX); token.setAttribute('cy', tokY); token.setAttribute('r', '8.5');
    token.setAttribute('fill', 'url(#pieceGradient-' + (terr.owner === null ? 'neutral' : terr.owner) + ')');
    token.setAttribute('stroke', 'rgba(255,255,255,0.2)'); token.setAttribute('stroke-width', '1');
    token.setAttribute('pointer-events', 'none');
    g.appendChild(token);

    const armyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    armyText.setAttribute('x', tokX); armyText.setAttribute('y', tokY);
    armyText.setAttribute('class', 'terr-armies-text');
    armyText.setAttribute('font-size', terr.armies >= 10 ? '6' : '7.5');
    armyText.textContent = terr.armies;
    armyText.setAttribute('pointer-events', 'none');
    g.appendChild(armyText);

    // Territory label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', px); label.setAttribute('y', py + 4);
    label.setAttribute('class', 'terr-label'); label.setAttribute('font-size', '4.8');
    label.textContent = shortName(name);
    label.setAttribute('pointer-events', 'none');
    g.appendChild(label);

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
