// ============================================================
// GAME ENGINE
// ============================================================

function initGame(isMultiHost = false) {
  const allTerr = Object.keys(POSITIONS);
  allTerr.forEach(name => { state.territories[name] = { owner: null, armies: 0 }; });

  const shuffled = [...allTerr].sort(() => Math.random() - 0.5);
  const half = Math.floor(shuffled.length / 2);
  shuffled.forEach((name, i) => {
    const owner = i < half ? 0 : 1;
    state.territories[name] = { owner, armies: 1 };
  });

  [0, 1].forEach(p => {
    const myTerrs = Object.entries(state.territories).filter(([,t]) => t.owner === p);
    let remaining = 35 - myTerrs.length;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * myTerrs.length);
      state.territories[myTerrs[idx][0]].armies++;
      remaining--;
    }
  });

  if (!isMultiHost) {
    buildLegend();
    renderMap();
    updateHeader();
    startTurn();
  }
}

function startTurn() {
  const p = state.currentPlayer;
  state.phase = 'diplo';
  state.selectedTerritory = null;
  state.attackFrom = null;
  state.attackTo = null;
  state.moveFrom = null;
  state.moveTo = null;
  state.justConquered = false;
  state.globalTurn++;

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
          
          renderMap();
        }
      }
      return false; // remove from queue
    }
    return true;
  });

  // Calculate reinforcements
  const myTerrsCount = countTerritories(p);
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

  updateHeader();
  updatePhaseUI();
  updateDiploPanel();
  renderMap();
  addLog(`${state.players[p].name} commence son tour. +${reinf} renforts.`, 'system');
}

function endTurn(remote = false) {
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }
  if (!remote) broadcast({ type: 'END_TURN' });
  decrementEmbargo();
  state.currentPlayer = 1 - state.currentPlayer;
  const terrInfo = document.getElementById('section-terr-info');
  if (terrInfo) terrInfo.style.display = 'none';
  closeDiploModal();
  startTurn();
}

function endDiplomacy(remote = false) {
  if (state.phase !== 'diplo') return;
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }

  if (!remote) broadcast({ type: 'END_PHASE', phase: 'diplo' });
  state.phase = 'reinf';
  renderMap();
  updatePhaseUI();
  addLog('Phase de renforts commencée.', 'system');
}

function onTerritoryClick(name) {
  if (mapViewState.isDragged) return;

  if (state.diploSelectTarget) {
    const selectId = state.diploSelectTarget === 'give' ? 'pact-give-terr' : 'pact-recv-terr';
    const el = document.getElementById(selectId);
    if (el) {
      el.value = name;
      el.dispatchEvent(new Event('change'));
    }
    
    state.diploSelectTarget = null;
    document.getElementById('diplo-modal').classList.remove('selecting');
    document.getElementById('map-select-instr').classList.remove('active');
    return;
  }

  if (!isMyTurn()) {
    showToast("Ce n'est pas votre tour !");
    return;
  }
  const terr = state.territories[name];
  const p = state.currentPlayer;

  if (state.phase === 'reinf') {
    if (terr.owner === p && state.reinforcements > 0) {
      terr.armies++;
      state.reinforcements--;
      addLog(`${state.players[p].name} place 1 armée sur ${name}. (${state.reinforcements} restants)`, 'p' + (p + 1));
      broadcast({ type: 'REINFORCE', territory: name });
      renderMap();
      updatePhaseUI();
    }
    return;
  }

  if (state.phase === 'attack') {
    if (!state.attackFrom) {
      if (terr.owner === p && terr.armies >= 3) {
        state.attackFrom = name;
        state.selectedTerritory = name;
        showTerrInfo(name);
        broadcast({ type: 'ATTACK_SELECT', from: name });
        document.getElementById('attack-info').innerHTML =
          `<strong style="color:${state.players[p].lightColor}">${name}</strong> sélectionné.<br>Cliquez sur un territoire ennemi adjacent.`;
        renderMap();
      }
    } else {
      if (name === state.attackFrom) {
        state.attackFrom = null;
        state.selectedTerritory = null;
        broadcast({ type: 'ATTACK_SELECT', from: null });
        document.getElementById('attack-info').innerHTML = 'Sélectionnez un de vos territoires (3+ armées) puis un territoire ennemi adjacent.';
        renderMap();
        return;
      }
      const adj = ADJACENCY[state.attackFrom] || [];
      if (terr.owner !== p && adj.includes(name)) {
        state.attackTo = name;
        broadcast({ type: 'ATTACK_TARGET', to: name });
        openCombatModal();
      } else if (terr.owner === p && terr.armies >= 3) {
        state.attackFrom = name;
        state.selectedTerritory = name;
        showTerrInfo(name);
        broadcast({ type: 'ATTACK_SELECT', from: name });
        renderMap();
      }
    }
    return;
  }

  if (state.phase === 'move') {
    if (!state.moveFrom) {
      if (terr.owner === p && terr.armies >= 2) {
        state.moveFrom = name;
        broadcast({ type: 'MOVE_SELECT', from: name });
        document.getElementById('move-info').innerHTML =
          `<strong style="color:${state.players[p].lightColor}">${name}</strong> sélectionné. Cliquez sur un territoire voisin.`;
        renderMap();
      }
    } else {
      if (name === state.moveFrom) {
        state.moveFrom = null;
        broadcast({ type: 'MOVE_SELECT', from: null });
        document.getElementById('move-info').innerHTML = '';
        renderMap();
        return;
      }
      const adj = ADJACENCY[state.moveFrom] || [];
      if (terr.owner === p && adj.includes(name)) {
        state.moveTo = name;
        openMoveModal();
      }
    }
    return;
  }
}

function endReinforcement(remote = false) {
  if (state.phase !== 'reinf') return;
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }
  if (state.reinforcements > 0 && !remote) { showToast("Placez tous vos renforts !"); return; }

  if (!remote) broadcast({ type: 'END_PHASE', phase: 'reinf' });
  state.phase = 'attack';
  state.selectedTerritory = null;
  renderMap();
  updatePhaseUI();
  addLog('Phase d\'attaque commencée.', 'system');
}

function endAttack(remote = false) {
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }
  if (!remote) broadcast({ type: 'END_PHASE', phase: 'attack' });
  state.phase = 'move';
  state.attackFrom = null;
  state.selectedTerritory = null;
  state.moveFrom = null;
  updatePhaseUI();
  renderMap();
  const terrInfo = document.getElementById('section-terr-info');
  if (terrInfo) terrInfo.style.display = 'none';
  addLog('Phase de déplacement commencée.', 'system');
}

function rollCombat() {
  const atkRolls = Array.from({ length: state.atkDice }, rollDie).sort((a, b) => b - a);
  const defRolls = Array.from({ length: state.defDice }, rollDie).sort((a, b) => b - a);
  
  if (multi.active) {
    broadcast({ type: 'COMBAT_ROLL', atkRolls, defRolls });
  }
  
  resolveCombat(atkRolls, defRolls);
}

function resolveCombat(atkRolls, defRolls) {
  const atk = state.territories[state.attackFrom];
  const def = state.territories[state.attackTo];

  let atkLoss = 0, defLoss = 0;
  const comparisons = Math.min(atkRolls.length, defRolls.length);

  for (let i = 0; i < comparisons; i++) {
    if (atkRolls[i] > defRolls[i]) defLoss++;
    else atkLoss++;
  }

  atk.armies -= atkLoss;
  def.armies -= defLoss;

  // UI Updates for combat
  const atkContainer = document.getElementById('atk-dice-display');
  const defContainer = document.getElementById('def-dice-display');
  if (atkContainer && defContainer) {
    atkContainer.innerHTML = '';
    defContainer.innerHTML = '';
    atkRolls.forEach((v, i) => {
      const winLose = i < comparisons ? (atkRolls[i] > defRolls[i] ? 'win' : 'lose') : '';
      atkContainer.innerHTML += renderDie(v, 'attack', winLose);
    });
    defRolls.forEach((v, i) => {
      const winLose = i < comparisons ? (defRolls[i] >= atkRolls[i] ? 'win' : 'lose') : '';
      defContainer.innerHTML += renderDie(v, 'defend', winLose);
    });
  }

  let result = '';
  if (atkLoss > 0) result += `⚔ Attaquant perd ${atkLoss} armée(s). `;
  if (defLoss > 0) result += `🛡 Défenseur perd ${defLoss} armée(s).`;
  const resEl = document.getElementById('combat-result');
  if (resEl) resEl.textContent = result;

  const atkPlayer = state.players[atk.owner];
  addLog(`${state.attackFrom} → ${state.attackTo} : [${atkRolls.join(',')}] vs [${defRolls.join(',')}]. Atk:-${atkLoss}, Déf:-${defLoss}`, atk.owner === 0 ? 'p1' : 'p2');

  if (def.armies <= 0) {
    def.owner = atk.owner;
    def.armies = state.atkDice;
    atk.armies -= state.atkDice;
    state.justConquered = true;

    addLog(`${atkPlayer.name} conquiert ${state.attackTo} !`, atk.owner === 0 ? 'p1' : 'p2');
    renderMap();
    updateHeader();

    if (resEl) resEl.textContent = `🏳 ${atkPlayer.name} conquiert ${state.attackTo} !`;
    const btnRoll = document.getElementById('btn-roll');
    const btnContinue = document.getElementById('btn-continue-atk');
    const btnStop = document.getElementById('btn-stop-atk');
    if (isMyTurn()) {
      if (btnRoll) btnRoll.style.display = 'none';
      if (btnContinue) btnContinue.style.display = 'none';
      if (btnStop) btnStop.style.display = '';
    } else {
      if (btnRoll) btnRoll.style.display = 'none';
      if (btnContinue) btnContinue.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
    }

    const diceDisplay = document.getElementById('dice-display');
    if (diceDisplay) {
        document.getElementById('section-dice').style.display = '';
        diceDisplay.innerHTML =
          `<div class="dice-row">${atkRolls.map(v => renderDie(v, 'attack', 'win')).join('')}</div>
           <div class="dice-row">${defRolls.map(v => renderDie(v, 'defend', 'lose')).join('')}</div>`;
    }

    checkWin(atk.owner);
    document.getElementById('atk-terr').textContent = `${state.attackFrom} (${atk.armies} armées)`;
    document.getElementById('def-terr').textContent = `${state.attackTo} — conquis!`;
    return;
  }

  if (atk.armies < 3) {
    addLog(`${atkPlayer.name} n'a plus assez d'armées pour attaquer (min 3 Requis pour 2 dés).`, 'system');
    if (resEl) resEl.textContent += ' Plus assez d\'armées pour l\'assaut obligatoire.';
    document.getElementById('btn-roll').style.display = 'none';
    document.getElementById('btn-continue-atk').style.display = 'none';
    document.getElementById('btn-stop-atk').style.display = '';
    renderMap();
    return;
  }

  renderMap();
  document.getElementById('atk-terr').textContent = `${state.attackFrom} (${atk.armies} armées)`;
  document.getElementById('def-terr').textContent = `${state.attackTo} (${def.armies} armées)`;
  if (isMyTurn()) {
    document.getElementById('btn-roll').style.display = 'none';
    document.getElementById('btn-continue-atk').style.display = '';
    document.getElementById('btn-stop-atk').style.display = '';
  } else {
    document.getElementById('btn-roll').style.display = 'none';
    document.getElementById('btn-continue-atk').style.display = 'none';
    document.getElementById('btn-stop-atk').style.display = 'none';
  }

  const maxAtk2 = Math.min(3, atk.armies - 1);
  state.atkDice = Math.max(2, Math.min(state.atkDice, maxAtk2));
  state.defDice = 2; 

  let atkBtns2 = '';
  for (let i = 2; i <= maxAtk2; i++) {
    atkBtns2 += `<button class="dice-count-btn ${i === state.atkDice ? 'selected' : ''}" onclick="selectAtkDice(${i})">🎲 ${i}</button>`;
  }
  document.getElementById('atk-dice-btns').innerHTML = atkBtns2 || '';
  document.getElementById('def-dice-btns').innerHTML = `<button class="dice-count-btn selected" onclick="selectDefDice(2)">🛡 2</button>`;
}

function continueAttack(remote = false) {
  if (!remote) broadcast({ type: 'CONTINUE_ATTACK' });
  document.getElementById('btn-roll').style.display = '';
  document.getElementById('btn-continue-atk').style.display = 'none';
  document.getElementById('btn-stop-atk').style.display = 'none';
  document.getElementById('combat-result').textContent = '';
}

function stopAttack(remote = false) {
  if (!isMyTurn() && !remote) { showToast("Ce n'est pas votre tour !"); return; }
  if (!remote) broadcast({ type: 'STOP_ATTACK' });
  document.getElementById('combat-modal').classList.remove('active');
  state.attackFrom = null;
  state.attackTo = null;
  state.selectedTerritory = null;
  const atkInfo = document.getElementById('attack-info');
  if (atkInfo) atkInfo.innerHTML = 'Sélectionnez un de vos territoires (3+ armées) puis un territoire ennemi adjacent.';
  renderMap();
}

function confirmMove() {
  if (!isMyTurn()) { showToast("Ce n'est pas votre tour !"); return; }
  const n = parseInt(document.getElementById('move-slider').value);
  broadcast({ type: 'MOVE_CONFIRM', to: state.moveTo, count: n });
  executeMove(n);
  document.getElementById('move-modal').classList.remove('active');
  endTurn();
}

function cancelMove() {
  document.getElementById('move-modal').classList.remove('active');
  state.moveFrom = null;
  state.moveTo = null;
  renderMap();
}

function executeMove(n, remote = false) {
  state.territories[state.moveFrom].armies -= n;
  state.territories[state.moveTo].armies += n;
  if (!remote) addLog(`${state.players[state.currentPlayer].name} déplace ${n} armée(s) de ${state.moveFrom} vers ${state.moveTo}.`, 'p' + (state.currentPlayer + 1));
  renderMap();
}

function checkWin(player) {
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
  }
  const other = 1 - player;
  if (countTerritories(other) === 0) {
    setTimeout(() => {
      const title = document.getElementById('win-title');
      const sub = document.getElementById('win-subtitle');
      if (title) title.textContent = 'VICTOIRE !';
      if (sub) sub.textContent = `${state.players[player].name} a éliminé son adversaire !`;
      document.getElementById('win-screen').classList.add('active');
    }, 500);
  }
}
