import type { GameState, Card, Territory, CombatData } from '@/types/game';
import { ADJACENCY, CONTINENTS, POSITIONS, MARITIME_ROUTES } from '@/types/config';
import { shuffle, countTerritories } from './utils';

export function initCardDeck(allTerritories: string[]): Card[] {
  const types = ['infantry', 'cavalry', 'artillery'] as const;
  const deck: Card[] = allTerritories.map((t, i) => ({
    territory: t,
    type: types[i % 3],
  }));
  deck.push({ territory: null, type: 'wild' });
  deck.push({ territory: null, type: 'wild' });
  return shuffle(deck);
}

export function getReinforcements(state: GameState): number {
  const p = state.currentPlayer;
  const owned = countTerritories(state.territories, p);
  if (owned === 0) return 0;

  let reinf = Math.max(3, Math.floor(owned / 3));

  for (const data of Object.values(CONTINENTS)) {
    const ownsAll = data.territories.every(
      (t) => state.territories[t] && state.territories[t].owner === p
    );
    if (ownsAll) reinf += data.bonus;
  }

  if (state.malusPending[p] > 0) {
    reinf = Math.max(1, reinf - state.malusPending[p]);
  }

  return reinf;
}

export function canAttack(from: string, to: string, state: GameState): boolean {
  if (!state.territories[from] || !state.territories[to]) return false;
  if (state.territories[from].owner !== state.currentPlayer) return false;
  if (state.territories[from].owner === state.territories[to].owner) return false;
  if (state.territories[from].armies <= 1) return false;

  const adjacent = ADJACENCY[from];
  if (!adjacent) return false;
  if (adjacent.includes(to)) return true;

  const maritime = MARITIME_ROUTES.find(
    (r) => (r[0] === from && r[1] === to) || (r[0] === to && r[1] === from)
  );
  return !!maritime;
}

export function rollCombat(
  atkDice: number,
  defDice: number
): { atkResults: number[]; defResults: number[] } {
  const atkResults = Array.from({ length: atkDice }, () => Math.floor(Math.random() * 6) + 1).sort(
    (a, b) => b - a
  );
  const defResults = Array.from({ length: defDice }, () => Math.floor(Math.random() * 6) + 1).sort(
    (a, b) => b - a
  );
  return { atkResults, defResults };
}

export function resolveCombat(
  atkResults: number[],
  defResults: number[]
): { atkLost: number; defLost: number } {
  let atkLost = 0;
  let defLost = 0;
  const comparisons = Math.min(atkResults.length, defResults.length);

  for (let i = 0; i < comparisons; i++) {
    if (atkResults[i] > defResults[i]) defLost++;
    else atkLost++;
  }

  return { atkLost, defLost };
}

export function canMove(from: string, to: string, state: GameState): boolean {
  if (!state.territories[from] || !state.territories[to]) return false;
  if (state.territories[from].owner !== state.currentPlayer) return false;
  if (state.territories[to].owner !== state.currentPlayer) return false;
  if (from === to) return false;
  if (state.territories[from].armies <= 1) return false;

  const adjacent = ADJACENCY[from];
  if (!adjacent || !adjacent.includes(to)) return false;

  return true;
}

export function getCardSetValue(cardsTradedTotal: number): number {
  const n = cardsTradedTotal + 1;
  if (n <= 5) return 2 + n * 2;
  if (n === 6) return 15;
  return 15 + (n - 6) * 5;
}

export function isValidCardSet(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  const types = cards.map((c) => c.type);
  const wilds = types.filter((t) => t === 'wild').length;
  const nonWilds = types.filter((t) => t !== 'wild');

  if (wilds === 0) {
    return nonWilds.every((t) => t === nonWilds[0]) || new Set(nonWilds).size === 3;
  }

  return true;
}

export function tradeCards(
  state: GameState
): { newState: Partial<GameState>; bonusTerrs: string[]; baseValue: number } | null {
  const p = state.currentPlayer;
  const player = state.players[p];
  if (state.selectedCards.length !== 3) return null;

  const tradedCards = state.selectedCards.map((i) => player.cards[i]);
  if (!isValidCardSet(tradedCards)) return null;

  const baseValue = getCardSetValue(state.cardsTradedTotal);

  let bonusArmies = 0;
  const bonusTerrs: string[] = [];
  const newTerritories = { ...state.territories };
  let newTerritoryBonusUsed = state.territoryBonusUsed;

  for (const card of tradedCards) {
    if (card.territory && newTerritories[card.territory]?.owner === p) {
      const add = Math.min(2, 2 - newTerritoryBonusUsed - bonusArmies);
      if (add > 0) {
        newTerritories[card.territory] = {
          ...newTerritories[card.territory],
          armies: newTerritories[card.territory].armies + add,
        };
        newTerritoryBonusUsed += add;
        bonusArmies += add;
        bonusTerrs.push(card.territory);
      }
    }
  }

  const indices = [...state.selectedCards].sort((a, b) => b - a);
  const newPlayers = state.players.map((pl, i) => {
    if (i !== p) return pl;
    const newCards = [...pl.cards];
    for (const ci of indices) {
      newCards.splice(ci, 1);
    }
    return { ...pl, cards: newCards };
  });

  let newReinforcements = state.reinforcements + baseValue;
  let finalTerritories = newTerritories;

  if (state.phase !== 'reinf') {
    const myTerrs = Object.entries(finalTerritories).filter(([, t]) => t.owner === p);
    let remaining = newReinforcements;
    let idx = 0;
    while (remaining > 0 && myTerrs.length > 0) {
      const tName = myTerrs[idx % myTerrs.length][0];
      finalTerritories = {
        ...finalTerritories,
        [tName]: {
          ...finalTerritories[tName],
          armies: finalTerritories[tName].armies + 1,
        },
      };
      remaining--;
      idx++;
    }
    newReinforcements = 0;
  }

  return {
    newState: {
      players: newPlayers,
      territories: finalTerritories,
      cardsTradedTotal: state.cardsTradedTotal + 1,
      territoryBonusUsed: newTerritoryBonusUsed,
      selectedCards: [],
      reinforcements: newReinforcements,
    },
    bonusTerrs,
    baseValue,
  };
}

export function checkWin(
  state: GameState
): { winner: number | null; eliminated: number | null } {
  const total = Object.keys(state.territories).length;
  const owned = countTerritories(state.territories, state.currentPlayer);

  if (owned === total) {
    return { winner: state.currentPlayer, eliminated: null };
  }

  for (let i = 0; i < state.players.length; i++) {
    if (i === 3 || i === state.currentPlayer) continue;
    if (countTerritories(state.territories, i) === 0) {
      return { winner: null, eliminated: i };
    }
  }

  let activePlayers = 0;
  let winnerFinal = -1;
  for (let i = 0; i < state.players.length; i++) {
    if (i !== 3 && countTerritories(state.territories, i) > 0) {
      activePlayers++;
      winnerFinal = i;
    }
  }

  if (activePlayers === 1) {
    return { winner: winnerFinal, eliminated: null };
  }

  return { winner: null, eliminated: null };
}

export function generateInitialTerritories(playerCount: number): Record<string, Territory> {
  const allTerr = Object.keys(POSITIONS);
  const territories: Record<string, Territory> = {};

  for (const name of allTerr) {
    territories[name] = { owner: -1, armies: 0 };
  }

  const shuffled = shuffle(allTerr);

  shuffled.forEach((name, i) => {
    territories[name] = { owner: i % playerCount, armies: 1 };
  });

  const startingArmies =
    playerCount === 2
      ? 40
      : playerCount === 3
        ? 35
        : playerCount === 4
          ? 30
          : playerCount === 5
            ? 25
            : 20;

  for (let p = 0; p < playerCount; p++) {
    const myTerrs = Object.entries(territories).filter(([, t]) => t.owner === p);
    let remaining = startingArmies - myTerrs.length;
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * myTerrs.length);
      territories[myTerrs[idx][0]] = {
        ...territories[myTerrs[idx][0]],
        armies: territories[myTerrs[idx][0]].armies + 1,
      };
      remaining--;
    }
  }

  return territories;
}
