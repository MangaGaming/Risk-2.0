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

  // Ocean grid dots
  const dotGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  dotGroup.setAttribute('opacity', '0.15');
  for (let x = -200; x < 1200; x += 40) {
    for (let y = -100; y < 600; y += 40) {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      dot.setAttribute('r', '1');
      dot.setAttribute('fill', 'rgba(255,255,255,0.5)');
      dotGroup.appendChild(dot);
    }
  }
  viewGroup.appendChild(dotGroup);

  // Draw connections
  const drawnEdges = new Set();
  Object.entries(ADJACENCY).forEach(([from, tos]) => {
    const fromPos = POSITIONS[from];
    if (!fromPos) return;
    const [fx, fy] = fromPos;
    tos.forEach(to => {
      const toPos = POSITIONS[to];
      if (!toPos) return;
      const key = [from, to].sort().join('|');
      if (drawnEdges.has(key)) return;
      drawnEdges.add(key);
      const [tx, ty] = toPos;
      const dist = Math.sqrt((tx-fx)**2 + (ty-fy)**2);
      if (dist < 200) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fx); line.setAttribute('y1', fy);
        line.setAttribute('x2', tx); line.setAttribute('y2', ty);
        line.setAttribute('stroke', 'rgba(255,255,255,0.12)');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '3,3');
        viewGroup.appendChild(line);
      } else {
        const mx = (fx + tx) / 2;
        const my = (fy + ty) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${fx},${fy} Q${mx},${my - 30} ${tx},${ty}`);
        path.setAttribute('stroke', 'rgba(255,255,255,0.07)');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('stroke-dasharray', '5,5');
        path.setAttribute('fill', 'none');
        viewGroup.appendChild(path);
      }
    });
  });

  // Draw territories
  const R = 22;
  Object.entries(POSITIONS).forEach(([name, [x, y]]) => {
    const terr = state.territories[name];
    if (!terr) return;
    const contColor = getContinentColor(name);
    const ownerColor = terr.owner !== null ? state.players[terr.owner].color : '#1a2a3a';
    const ownerLightColor = terr.owner !== null ? state.players[terr.owner].lightColor : '#334455';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'territory-group');
    g.style.cursor = 'pointer';

    // Outer ring
    const outerHex = hexagonPath(x, y, R + 3);
    const ringPath = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    ringPath.setAttribute('points', outerHex);
    ringPath.setAttribute('fill', contColor);
    ringPath.setAttribute('fill-opacity', '0.35');
    ringPath.setAttribute('stroke', contColor);
    ringPath.setAttribute('stroke-width', '1');
    ringPath.setAttribute('stroke-opacity', '0.6');
    g.appendChild(ringPath);

    // Main hex
    const hex = hexagonPath(x, y, R);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    path.setAttribute('points', hex);
    path.setAttribute('class', 'territory');
    path.setAttribute('data-name', name);
    path.id = 'terr-' + nameToId(name);

    if (terr.owner !== null) {
      path.setAttribute('fill', ownerColor);
      path.setAttribute('fill-opacity', '0.9');
    } else {
      path.setAttribute('fill', '#1a2a3a');
      path.setAttribute('fill-opacity', '0.5');
    }

    let strokeColor = 'rgba(0,0,0,0.5)';
    let strokeWidth = '1.5';
    if (state.selectedTerritory === name || state.attackFrom === name) {
      strokeColor = '#f1c40f';
      strokeWidth = '3';
    }
    if (state.attackFrom && state.phase === 'attack') {
      const adj = ADJACENCY[state.attackFrom] || [];
      if (adj.includes(name) && terr.owner !== state.currentPlayer) {
        strokeColor = '#ff3333';
        strokeWidth = '3';
        path.classList.add('attack-target');
      }
    }
    if (state.moveFrom && state.phase === 'move') {
      const adj = ADJACENCY[state.moveFrom] || [];
      if (adj.includes(name) && terr.owner === state.currentPlayer && name !== state.moveFrom) {
        strokeColor = '#44ff88';
        strokeWidth = '3';
        path.classList.add('move-target');
      }
    }
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', strokeWidth);

    path.addEventListener('click', () => onTerritoryClick(name));
    g.appendChild(path);

    // Army token
    const tokenRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    tokenRing.setAttribute('cx', x + R * 0.55);
    tokenRing.setAttribute('cy', y - R * 0.55);
    tokenRing.setAttribute('r', '10');
    tokenRing.setAttribute('fill', ownerColor);
    tokenRing.setAttribute('stroke', ownerLightColor);
    tokenRing.setAttribute('stroke-width', '1.5');
    tokenRing.setAttribute('pointer-events', 'none');
    g.appendChild(tokenRing);

    const armyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    armyText.setAttribute('x', x + R * 0.55);
    armyText.setAttribute('y', y - R * 0.55);
    armyText.setAttribute('class', 'terr-armies-text');
    armyText.setAttribute('font-size', terr.armies >= 10 ? '6' : '8');
    armyText.textContent = terr.armies;
    g.appendChild(armyText);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y + 2);
    label.setAttribute('class', 'terr-label');
    label.setAttribute('font-size', '5.5');
    label.textContent = shortName(name);
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
      attack: `Cliquez sur un de vos territoires (≥3 armées) puis sur un territoire ennemi adjacent.`,
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
  state.atkDice = Math.max(2, maxAtk); 
  state.defDice = 2;

  let atkBtns = '';
  for (let i = 2; i <= maxAtk; i++) {
    atkBtns += `<button class="dice-count-btn ${i === state.atkDice ? 'selected' : ''}" onclick="selectAtkDice(${i})">🎲 ${i}</button>`;
  }
  document.getElementById('atk-dice-btns').innerHTML = atkBtns;
  document.getElementById('def-dice-btns').innerHTML = `<button class="dice-count-btn selected" onclick="selectDefDice(2)">🛡 2</button>`;

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
