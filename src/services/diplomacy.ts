import type { GameState, Pact, VengeanceItem, Territory } from '@/types/game';

export function createPact(
  state: GameState,
  type: string,
  player0: number,
  player1: number,
  note: string,
  toursLeft: number,
  give?: string,
  recv?: string
): Pact {
  return {
    id: state.pactCounter,
    type,
    player0,
    player1,
    note,
    toursLeft,
    createdTurn: state.globalTurn,
    broken: false,
    brokenBy: null,
    give: give ?? null,
    recv: recv ?? null,
  };
}

export function breakPact(
  state: GameState,
  pactId: number,
  sanction: string
): Partial<GameState> {
  const pact = state.pacts.find((p) => p.id === pactId);
  if (!pact) return {};

  const traitorIdx = state.currentPlayer;
  const victimIdx = pact.player0 === traitorIdx ? pact.player1 : pact.player0;

  const newPacts = state.pacts.map((p) =>
    p.id === pactId ? { ...p, broken: true, brokenBy: traitorIdx } : p
  );

  const newMalusPending = [...state.malusPending];
  const newEmbargoTurns = [...state.embargoTurns];
  const newVengeanceQueue: VengeanceItem[] = [...state.vengeanceQueue];
  const newDiplomacyHistory = [...state.diplomacyHistory];

  if (sanction === 'malus') {
    newMalusPending[traitorIdx] = (newMalusPending[traitorIdx] || 0) + 3;
  } else if (sanction === 'embargo') {
    newEmbargoTurns[traitorIdx] = (newEmbargoTurns[traitorIdx] || 0) + 3;
  } else if (sanction === 'vengeance') {
    newVengeanceQueue.push({ victim: victimIdx, amount: 2 });
  }

  newDiplomacyHistory.push(
    `[Tour ${state.globalTurn}] Pacte rompu par ${state.players[traitorIdx].name}.`
  );

  return {
    pacts: newPacts,
    malusPending: newMalusPending,
    embargoTurns: newEmbargoTurns,
    vengeanceQueue: newVengeanceQueue,
    diplomacyHistory: newDiplomacyHistory,
    pendingBreachPactId: null,
  };
}

export function getMalus(playerIdx: number, state: GameState): number {
  return state.malusPending[playerIdx] || 0;
}

export function hasNonAggression(playerIdx: number, state: GameState): boolean {
  return state.pacts.some(
    (p) =>
      !p.broken &&
      p.toursLeft > 0 &&
      p.type === 'peace' &&
      (p.player0 === playerIdx || p.player1 === playerIdx)
  );
}

export function hasAlliance(playerIdx: number, state: GameState): boolean {
  return state.pacts.some(
    (p) =>
      !p.broken &&
      p.toursLeft > 0 &&
      p.type === 'alliance' &&
      (p.player0 === playerIdx || p.player1 === playerIdx)
  );
}

export function getPlayerPacts(playerIdx: number, state: GameState): Pact[] {
  return state.pacts.filter(
    (p) => p.player0 === playerIdx || p.player1 === playerIdx
  );
}

export function executeExchange(
  give: string,
  recv: string,
  state: GameState
): Record<string, Territory> | null {
  const tGive = state.territories[give];
  const tRecv = state.territories[recv];
  if (!tGive || !tRecv) return null;

  return {
    [give]: { ...tGive, owner: tRecv.owner },
    [recv]: { ...tRecv, owner: tGive.owner },
  };
}

export function applyVengeance(
  state: GameState,
  playerIdx: number
): { territories: Record<string, Territory>; vengeanceQueue: VengeanceItem[] } {
  const newTerritories = { ...state.territories };
  const newQueue: VengeanceItem[] = [];

  for (const v of state.vengeanceQueue) {
    if (v.victim === playerIdx) {
      const myTerrs = Object.entries(newTerritories).filter(
        ([, t]) => t.owner === playerIdx
      );
      if (myTerrs.length > 0) {
        const rand = myTerrs[Math.floor(Math.random() * myTerrs.length)][0];
        newTerritories[rand] = {
          ...newTerritories[rand],
          armies: newTerritories[rand].armies + v.amount,
        };
      }
    } else {
      newQueue.push(v);
    }
  }

  return { territories: newTerritories, vengeanceQueue: newQueue };
}

export function decrementEmbargo(state: GameState): number[] {
  return state.embargoTurns.map((t) => (t > 0 ? t - 1 : 0));
}
