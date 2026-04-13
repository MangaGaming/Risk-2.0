// ============================================================
// GAME STATE
// ============================================================

let state = {
  players: [
    { id: 0, name: 'Joueur Rouge', color: '#c0392b', lightColor: '#e74c3c', armies: 35 },
    { id: 1, name: 'Joueur Bleu', color: '#1a5276', lightColor: '#2e86c1', armies: 35 }
  ],
  territories: {},
  currentPlayer: 0,
  phase: 'diplo',      // diplo | reinf | attack | move
  reinforcements: 0,
  selectedTerritory: null,
  attackFrom: null,
  attackTo: null,
  atkDice: 1,
  defDice: 1,
  moveFrom: null,
  moveTo: null,
  justConquered: false,

  // === DIPLOMACY STATE ===
  pacts: [],           // { id, type, player0, player1, note, toursLeft, createdTurn, broken, brokenBy }
  pactCounter: 0,
  diplomacyHistory: [], // log of events
  // Per-player sanctions
  malusPending: [0, 0],      // armies to subtract from next reinf
  embargoTurns: [0, 0],      // turns remaining on diplomatic embargo
  vengeanceQueue: [],         // { victim, amount } — armies to give immediately
  globalTurn: 0,
  currentPactType: 'non-agression',
  currentSanction: 'malus',
  pendingBreachPactId: null,
  diploSelectTarget: null, // 'give' or 'recv'
  incomingProposal: null
};

let mapViewState = {
  scale: 1,
  x: 0,
  y: 0,
  isPanning: false,
  lastMouseX: 0,
  lastMouseY: 0,
  isDragged: false,
  lastTouchDist: 0
};

// ============================================================
// MULTIPLAYER STATE
// ============================================================

let multi = {
  peer: null,
  conn: null,
  active: false,
  isHost: false,
  localPlayerIndex: 0, // 0 for Host (Red), 1 for Joined (Blue)
  remotePlayerName: 'Adversaire'
};
