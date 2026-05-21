export interface Player {
  id: number;
  name: string;
  color: string;
  lightColor: string;
  armies: number;
  cards: Card[];
}

export interface Card {
  territory: string | null;
  type: 'infantry' | 'cavalry' | 'artillery' | 'wild';
}

export interface Territory {
  owner: number;
  armies: number;
}

export interface Pact {
  id: number;
  type: string;
  player0: number;
  player1: number;
  note: string;
  toursLeft: number;
  createdTurn: number;
  broken: boolean;
  brokenBy: number | null;
  give: string | null;
  recv: string | null;
}

export interface VengeanceItem {
  victim: number;
  amount: number;
}

export type Phase = 'diplo' | 'reinf' | 'attack' | 'move';

export interface GameState {
  players: Player[];
  playerCount: number;
  territories: Record<string, Territory>;
  currentPlayer: number;
  phase: Phase;
  reinforcements: number;
  selectedTerritory: string | null;
  attackFrom: string | null;
  attackTo: string | null;
  atkDice: number;
  defDice: number;
  moveFrom: string | null;
  moveTo: string | null;
  moveDone: boolean;
  justConquered: boolean;
  hasCapturedThisTurn: boolean;
  cardsTradedTotal: number;
  cardDeck: Card[];
  territoryBonusUsed: number;
  selectedCards: number[];
  pacts: Pact[];
  pactCounter: number;
  diplomacyHistory: string[];
  malusPending: number[];
  embargoTurns: number[];
  vengeanceQueue: VengeanceItem[];
  globalTurn: number;
  currentPactType: string;
  currentSanction: string;
  pendingBreachPactId: number | null;
  diploSelectTarget: string | null;
  incomingProposal: Pact | null;
  selectedOpponent: number;
  mustTradeCards: boolean;
}

export interface MultiState {
  peer: any | null;
  conn: any | null;
  active: boolean;
  isHost: boolean;
  localPlayerIndex: number;
  remotePlayerName: string;
  peerId: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

export interface MapViewState {
  scale: number;
  x: number;
  y: number;
  isPanning: boolean;
  lastMouseX: number;
  lastMouseY: number;
  isDragged: boolean;
  lastTouchDist: number;
}

export interface CombatData {
  atkResults: number[];
  defResults: number[];
  atkLost: number;
  defLost: number;
  atkTerr: string;
  defTerr: string;
}

export interface Continent {
  bonus: number;
  color: string;
  lightColor: string;
  territories: string[];
}

export type GameAction =
  | { type: 'SET_PLAYER_COUNT'; count: number }
  | { type: 'SET_PLAYER_NAME'; idx: number; name: string }
  | { type: 'INIT_GAME'; territories: Record<string, Territory>; cardDeck: Card[]; cardsTradedTotal: number }
  | { type: 'SET_PHASE'; phase: Phase }
  | { type: 'SET_CURRENT_PLAYER'; idx: number }
  | { type: 'SET_REINFORCEMENTS'; value: number }
  | { type: 'ADD_REINFORCEMENTS'; value: number }
  | { type: 'DEC_REINFORCEMENTS'; value?: number }
  | { type: 'SELECT_TERRITORY'; name: string | null }
  | { type: 'SET_ATTACK'; from: string | null; to: string | null }
  | { type: 'SET_ATK_DICE'; value: number }
  | { type: 'SET_DEF_DICE'; value: number }
  | { type: 'SET_MOVE'; from: string | null; to: string | null }
  | { type: 'SET_MOVE_DONE'; value: boolean }
  | { type: 'SET_JUST_CONQUERED'; value: boolean }
  | { type: 'SET_HAS_CAPTURED'; value: boolean }
  | { type: 'SET_TERRITORY_OWNER'; name: string; owner: number }
  | { type: 'ADD_ARMIES'; name: string; count: number }
  | { type: 'REMOVE_ARMIES'; name: string; count: number }
  | { type: 'MOVE_ARMIES'; from: string; to: string; count: number }
  | { type: 'INCREMENT_GLOBAL_TURN' }
  | { type: 'SET_SELECTED_CARDS'; cards: number[] }
  | { type: 'TOGGLE_CARD'; idx: number }
  | { type: 'TRADE_CARDS'; tradedIndices: number[]; value: number; bonusTerrs: string[] }
  | { type: 'DRAW_CARD'; playerIdx: number; card: Card }
  | { type: 'SET_MUST_TRADE'; value: boolean }
  | { type: 'RESET_TERRITORY_BONUS' }
  | { type: 'ADD_TERRITORY_BONUS'; value: number }
  | { type: 'ADD_PACT'; pact: Pact }
  | { type: 'BREAK_PACT'; pactId: number; breacherIdx: number }
  | { type: 'SET_SELECTED_OPPONENT'; idx: number }
  | { type: 'SET_PACT_TYPE'; pactType: string }
  | { type: 'SET_SANCTION'; sanction: string }
  | { type: 'ADD_MALUS'; playerIdx: number; amount: number }
  | { type: 'ADD_EMBARGO'; playerIdx: number; turns: number }
  | { type: 'ADD_VENGEANCE'; item: VengeanceItem }
  | { type: 'DECREMENT_EMBARGO' }
  | { type: 'ADD_DIPLO_HISTORY'; msg: string }
  | { type: 'SET_INCOMING_PROPOSAL'; pact: Pact | null }
  | { type: 'SET_DIPLO_SELECT_TARGET'; target: string | null }
  | { type: 'SET_PENDING_BREACH'; pactId: number | null }
  | { type: 'SYNC_TERRITORIES'; territories: Record<string, Territory> }
  | { type: 'RESET' }
  | { type: 'SET_MULTI'; multi: Partial<MultiState> };
