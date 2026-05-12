// ============================================================
// UTILITIES
// ============================================================

import { state, multi } from './state.js';
import { CONTINENTS, DIE_PIPS } from './config.js';

export function getContinentForTerritory(name) {
  for (const [cont, data] of Object.entries(CONTINENTS)) {
    if (data.territories.includes(name)) return cont;
  }
  return null;
}

export function showToast(msg, duration = 2500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'active';
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    el.className = '';
  }, duration);
}

export function addLog(msg, type = 'system') {
  const el = document.getElementById('log-entries');
  if (!el) return;
  const entry = document.createElement('div');
  entry.className = 'log-entry ' + type;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
  el.prepend(entry);
}

export function getDiePath(val, pIdx) {
  const pips = DIE_PIPS[val] || [];
  let dots = pips.map(pos => {
    const r = 2.5;
    const cx = 10 + ((pos - 1) % 3) * 10;
    const cy = 10 + Math.floor((pos - 1) / 3) * 10;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" />`;
  }).join('');
  
  const colors = ['#c0392b', '#1a5276', '#27ae60'];
  const color = colors[pIdx] || '#555';

  return `
    <svg width="40" height="40" viewBox="0 0 40 40">
      <rect x="2" y="2" width="36" height="36" rx="6" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="2" />
      ${dots}
    </svg>
  `;
}

export function countTerritories(player) {
  return Object.values(state.territories).filter(t => t.owner === player).length;
}

export function isMyTurn() {
  if (!multi.active) return true;
  return state.currentPlayer === multi.localPlayerIndex;
}
