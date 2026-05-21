import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { GameState, GameAction, MultiState, Player, Card, Territory, Pact, Phase, VengeanceItem } from '@/types/game';

interface State extends GameState {
  multi: MultiState;
}

const initialState: State = {
  players: [
    { id: 0, name: 'Joueur Rouge', color: '#c0392b', lightColor: '#e74c3c', armies: 35, cards: [] },
    { id: 1, name: 'Joueur Bleu', color: '#1a5276', lightColor: '#2e86c1', armies: 35, cards: [] },
    { id: 2, name: 'Joueur Vert', color: '#27ae60', lightColor: '#2ecc71', armies: 35, cards: [] },
    { id: 3, name: 'Neutre', color: '#95a5a6', lightColor: '#bdc3c7', armies: 0, cards: [] },
  ],
  playerCount: 2,
  territories: {},
  currentPlayer: 0,
  phase: 'diplo',
  reinforcements: 0,
  selectedTerritory: null,
  attackFrom: null,
  attackTo: null,
  atkDice: 1,
  defDice: 1,
  moveFrom: null,
  moveTo: null,
  moveDone: false,
  justConquered: false,
  hasCapturedThisTurn: false,
  cardsTradedTotal: 0,
  cardDeck: [],
  territoryBonusUsed: 0,
  selectedCards: [],
  pacts: [],
  pactCounter: 0,
  diplomacyHistory: [],
  malusPending: [0, 0, 0, 0],
  embargoTurns: [0, 0, 0, 0],
  vengeanceQueue: [],
  globalTurn: 0,
  currentPactType: 'peace',
  currentSanction: 'malus',
  pendingBreachPactId: null,
  diploSelectTarget: null,
  incomingProposal: null,
  selectedOpponent: 1,
  mustTradeCards: false,
    multi: {
      peer: null,
      conn: null,
      active: false,
      isHost: false,
      localPlayerIndex: 0,
      remotePlayerName: 'Adversaire',
      peerId: null,
      connected: false,
      connecting: false,
      error: null,
    },
};

function gameReducer(state: State, action: GameAction): State {
  switch (action.type) {
    case 'SET_PLAYER_COUNT':
      return { ...state, playerCount: action.count };

    case 'SET_PLAYER_NAME':
      return {
        ...state,
        players: state.players.map((p, i) =>
          i === action.idx ? { ...p, name: action.name } : p
        ),
      };

    case 'INIT_GAME':
      return {
        ...state,
        territories: action.territories,
        cardDeck: action.cardDeck,
        cardsTradedTotal: action.cardsTradedTotal,
        currentPlayer: 0,
        phase: 'diplo',
        reinforcements: 0,
        selectedTerritory: null,
        attackFrom: null,
        attackTo: null,
        atkDice: 1,
        defDice: 1,
        moveFrom: null,
        moveTo: null,
        moveDone: false,
        justConquered: false,
        hasCapturedThisTurn: false,
        territoryBonusUsed: 0,
        selectedCards: [],
        pacts: [],
        pactCounter: 0,
        diplomacyHistory: [],
        malusPending: [0, 0, 0, 0],
        embargoTurns: [0, 0, 0, 0],
        vengeanceQueue: [],
        globalTurn: 0,
        currentPactType: 'peace',
        currentSanction: 'malus',
        pendingBreachPactId: null,
        diploSelectTarget: null,
        incomingProposal: null,
        selectedOpponent: 1,
        mustTradeCards: false,
      };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'SET_CURRENT_PLAYER':
      return { ...state, currentPlayer: action.idx };

    case 'SET_REINFORCEMENTS':
      return { ...state, reinforcements: action.value };

    case 'ADD_REINFORCEMENTS':
      return { ...state, reinforcements: state.reinforcements + action.value };

    case 'DEC_REINFORCEMENTS':
      return {
        ...state,
        reinforcements: Math.max(0, state.reinforcements - (action.value ?? 1)),
      };

    case 'SELECT_TERRITORY':
      return { ...state, selectedTerritory: action.name };

    case 'SET_ATTACK':
      return { ...state, attackFrom: action.from, attackTo: action.to };

    case 'SET_ATK_DICE':
      return { ...state, atkDice: action.value };

    case 'SET_DEF_DICE':
      return { ...state, defDice: action.value };

    case 'SET_MOVE':
      return { ...state, moveFrom: action.from, moveTo: action.to };

    case 'SET_MOVE_DONE':
      return { ...state, moveDone: action.value };

    case 'SET_JUST_CONQUERED':
      return { ...state, justConquered: action.value };

    case 'SET_HAS_CAPTURED':
      return { ...state, hasCapturedThisTurn: action.value };

    case 'SET_TERRITORY_OWNER':
      return {
        ...state,
        territories: {
          ...state.territories,
          [action.name]: {
            ...state.territories[action.name],
            owner: action.owner,
          },
        },
      };

    case 'ADD_ARMIES':
      return {
        ...state,
        territories: {
          ...state.territories,
          [action.name]: {
            ...state.territories[action.name],
            armies: state.territories[action.name].armies + action.count,
          },
        },
      };

    case 'REMOVE_ARMIES':
      return {
        ...state,
        territories: {
          ...state.territories,
          [action.name]: {
            ...state.territories[action.name],
            armies: Math.max(0, state.territories[action.name].armies - action.count),
          },
        },
      };

    case 'MOVE_ARMIES': {
      const fromTerr = state.territories[action.from];
      const toTerr = state.territories[action.to];
      return {
        ...state,
        territories: {
          ...state.territories,
          [action.from]: { ...fromTerr, armies: Math.max(0, fromTerr.armies - action.count) },
          [action.to]: { ...toTerr, armies: toTerr.armies + action.count },
        },
      };
    }

    case 'INCREMENT_GLOBAL_TURN':
      return { ...state, globalTurn: state.globalTurn + 1 };

    case 'SET_SELECTED_CARDS':
      return { ...state, selectedCards: action.cards };

    case 'TOGGLE_CARD': {
      const exists = state.selectedCards.indexOf(action.idx);
      if (exists !== -1) {
        return {
          ...state,
          selectedCards: state.selectedCards.filter((_, i) => i !== exists),
        };
      }
      return { ...state, selectedCards: [...state.selectedCards, action.idx] };
    }

    case 'TRADE_CARDS': {
      const p = state.currentPlayer;
      const sorted = [...action.tradedIndices].sort((a, b) => b - a);
      const newPlayers = state.players.map((pl, i) => {
        if (i !== p) return pl;
        const newCards = [...pl.cards];
        for (const ci of sorted) {
          newCards.splice(ci, 1);
        }
        return { ...pl, cards: newCards };
      });
      const newTerritories = { ...state.territories };
      for (const t of action.bonusTerrs) {
        if (newTerritories[t]) {
          newTerritories[t] = { ...newTerritories[t], armies: newTerritories[t].armies + 2 };
        }
      }
      return {
        ...state,
        players: newPlayers,
        territories: newTerritories,
        reinforcements: state.reinforcements + action.value,
        cardsTradedTotal: state.cardsTradedTotal + 1,
        territoryBonusUsed: state.territoryBonusUsed + action.bonusTerrs.length * 2,
        selectedCards: [],
      };
    }

    case 'DRAW_CARD': {
      const newDeck = state.cardDeck.slice(0, -1);
      return {
        ...state,
        cardDeck: newDeck,
        players: state.players.map((pl, i) =>
          i === action.playerIdx ? { ...pl, cards: [...pl.cards, action.card] } : pl
        ),
      };
    }

    case 'SET_MUST_TRADE':
      return { ...state, mustTradeCards: action.value };

    case 'RESET_TERRITORY_BONUS':
      return { ...state, territoryBonusUsed: 0 };

    case 'ADD_TERRITORY_BONUS':
      return { ...state, territoryBonusUsed: state.territoryBonusUsed + action.value };

    case 'ADD_PACT':
      return { ...state, pacts: [...state.pacts, action.pact] };

    case 'BREAK_PACT':
      return {
        ...state,
        pacts: state.pacts.map((pact) =>
          pact.id === action.pactId ? { ...pact, broken: true, brokenBy: action.breacherIdx } : pact
        ),
      };

    case 'SET_SELECTED_OPPONENT':
      return { ...state, selectedOpponent: action.idx };

    case 'SET_PACT_TYPE':
      return { ...state, currentPactType: action.pactType };

    case 'SET_SANCTION':
      return { ...state, currentSanction: action.sanction };

    case 'ADD_MALUS': {
      const newMalus = [...state.malusPending];
      newMalus[action.playerIdx] = (newMalus[action.playerIdx] || 0) + action.amount;
      return { ...state, malusPending: newMalus };
    }

    case 'ADD_EMBARGO': {
      const newEmbargo = [...state.embargoTurns];
      newEmbargo[action.playerIdx] = (newEmbargo[action.playerIdx] || 0) + action.turns;
      return { ...state, embargoTurns: newEmbargo };
    }

    case 'ADD_VENGEANCE':
      return { ...state, vengeanceQueue: [...state.vengeanceQueue, action.item] };

    case 'DECREMENT_EMBARGO':
      return {
        ...state,
        embargoTurns: state.embargoTurns.map((t) => (t > 0 ? t - 1 : 0)),
      };

    case 'ADD_DIPLO_HISTORY':
      return { ...state, diplomacyHistory: [...state.diplomacyHistory, action.msg] };

    case 'SET_INCOMING_PROPOSAL':
      return { ...state, incomingProposal: action.pact };

    case 'SET_DIPLO_SELECT_TARGET':
      return { ...state, diploSelectTarget: action.target };

    case 'SET_PENDING_BREACH':
      return { ...state, pendingBreachPactId: action.pactId };

    case 'SYNC_TERRITORIES':
      return { ...state, territories: action.territories };

    case 'SET_MULTI':
      return { ...state, multi: { ...state.multi, ...action.multi } };

    case 'RESET':
      return { ...initialState, players: initialPlayersDeepCopy() };

    default:
      return state;
  }
}

function initialPlayersDeepCopy(): Player[] {
  return initialState.players.map((p) => ({ ...p, cards: [] }));
}

interface GameContextValue {
  state: State;
  dispatch: Dispatch<GameAction>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
}
