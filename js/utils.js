// ============================================================
// UTILITIES
// ============================================================

function getContinentForTerritory(name) {
  for (const [cont, data] of Object.entries(CONTINENTS)) {
    if (data.territories.includes(name)) return cont;
  }
  return null;
}

function getContinentColor(name) {
  const cont = getContinentForTerritory(name);
  return cont ? CONTINENTS[cont].color : '#555';
}

function getTerritoryFill(name) {
  const terr = state.territories[name];
  if (terr.owner === null) return '#1a2a1a';
  const pColor = state.players[terr.owner].color;
  return pColor;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('active');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('active'), 3000);
}

function addLog(msg, type = 'system') {
  const container = document.getElementById('log-entries');
  if (!container) return;
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = msg;
  container.prepend(entry);
  while (container.children.length > 50) container.lastChild.remove();
}

function renderDie(value, type, winLose) {
  const pipPositions = DIE_PIPS[value] || [];
  const cells = [];
  for (let i = 1; i <= 9; i++) {
    cells.push(`<div class="pip ${pipPositions.includes(i) ? '' : 'empty'}"></div>`);
  }
  let cls = `die ${type}`;
  if (winLose === 'win') cls += ' win';
  if (winLose === 'lose') cls += ' lose';
  return `<div class="${cls}">${cells.join('')}</div>`;
}

function rollDie() { return Math.floor(Math.random() * 6) + 1; }

function hexagonPath(cx, cy, r) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

function nameToId(name) {
  return name.replace(/[^a-zA-Z]/g, '_');
}

function shortName(name) {
  const shorts = {
    'Amérique Centrale': 'Am.Cent.',
    'États-Unis de l\'Est': 'USA Est',
    'États-Unis de l\'Ouest': 'USA Oue.',
    'Afrique du Nord': 'Afr.Nord',
    'Afrique Centrale': 'Afr.Cent.',
    'Afrique de l\'Est': 'Afr.Est',
    'Afrique du Sud': 'Afr.Sud',
    'Amérique du Sud': 'Am.Sud',
    'Europe du Nord': 'Eur.Nord',
    'Europe du Sud': 'Eur.Sud',
    'Europe de l\'Ouest': 'Eur.Oue.',
    'Australie de l\'Est': 'Aus.Est',
    'Australie de l\'Ouest': 'Aus.Oue.',
    'Nouvelle-Guinée': 'N.Guinée',
    'Grande-Bretagne': 'G.Bret.',
    'Moyen-Orient': 'Moy-Ori.',
    'Amérique du Nord': 'Am.Nord',
    'Argentine': 'Argent.',
    'Venezuela': 'Venezu.',
    'Afghanistan': 'Afghan.',
    'Indonésie': 'Indonés.',
    'Scandinavie': 'Scand.',
    'Madagascar': 'Madagas.',
  };
  return shorts[name] || name;
}

function countTerritories(player) {
  return Object.values(state.territories).filter(t => t.owner === player).length;
}

function isMyTurn() {
  if (!multi.active) return true;
  return state.currentPlayer === multi.localPlayerIndex;
}
