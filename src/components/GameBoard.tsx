import { useState, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import HUD from './HUD';
import Map3D from './Map3D';
import MapView from './MapView';
import CombatModal from './CombatModal';
import MoveModal from './MoveModal';
import DiplomacyModal from './DiplomacyModal';
import CardsModal from './CardsModal';
import NegotiationModal from './NegotiationModal';
import SanctionModal from './SanctionModal';
import MultiplayerModal from './MultiplayerModal';
import WinScreen from './WinScreen';
import {
  getReinforcements,
  canAttack,
  rollCombat,
  resolveCombat,
  canMove,
  tradeCards,
  checkWin,
} from '@/services/gameEngine';
import { createPact, breakPact, applyVengeance, decrementEmbargo } from '@/services/diplomacy';
import { countTerritories } from '@/services/utils';
import type { CombatData } from '@/types/game';

export default function GameBoard() {
  const { state, dispatch } = useGame();

  const [showCombat, setShowCombat] = useState(false);
  const [combatData, setCombatData] = useState<CombatData | null>(null);
  const [showMove, setShowMove] = useState(false);
  const [showDiplo, setShowDiplo] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showMulti, setShowMulti] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [mapSelectCallback, setMapSelectCallback] = useState<((name: string) => void) | null>(null);

  const handleTerritoryClick = useCallback((name: string) => {
    if (mapSelectCallback) {
      mapSelectCallback(name);
      setMapSelectCallback(null);
      return;
    }

    const t = state.territories[name];
    if (!t) return;
    const isMine = t.owner === state.currentPlayer;

    if (state.phase === 'reinf') {
      if (isMine && state.reinforcements > 0) {
        dispatch({ type: 'ADD_ARMIES', name, count: 1 });
        dispatch({ type: 'DEC_REINFORCEMENTS' });
      }
    } else if (state.phase === 'attack') {
      if (!state.attackFrom) {
        if (isMine && t.armies >= 2) {
          dispatch({ type: 'SET_ATTACK', from: name, to: null });
        }
      } else if (state.attackFrom && !state.attackTo) {
        if (canAttack(state.attackFrom, name, state)) {
          dispatch({ type: 'SET_ATTACK', from: state.attackFrom, to: name });
          setShowCombat(true);
        } else {
          dispatch({ type: 'SET_ATTACK', from: isMine && t.armies >= 2 ? name : null, to: null });
        }
      }
    } else if (state.phase === 'move') {
      if (!state.moveFrom) {
        if (isMine && t.armies >= 2) {
          dispatch({ type: 'SET_MOVE', from: name, to: null });
        }
      } else if (state.moveFrom && !state.moveTo) {
        if (canMove(state.moveFrom, name, state)) {
          dispatch({ type: 'SET_MOVE', from: state.moveFrom, to: name });
          setShowMove(true);
        }
      }
    }
  }, [state, dispatch, mapSelectCallback]);

  const handleOpenDiplo = () => setShowDiplo(true);
  const handleEndDiplo = () => dispatch({ type: 'SET_PHASE', phase: 'reinf' });

  const handleEndReinf = () => {
    const result = checkWin(state);
    if (result.winner !== null) {
      setWinner(state.players[result.winner].name);
      return;
    }
    dispatch({ type: 'SET_PHASE', phase: 'attack' });
  };

  const handleEndAttack = () => {
    dispatch({ type: 'SET_PHASE', phase: 'move' });
  };

  const handleEndMove = () => {
    const playerIdx = state.currentPlayer;
    const nextPlayer = (playerIdx + 1) % state.playerCount;
    dispatch({ type: 'SET_CURRENT_PLAYER', idx: nextPlayer });
    dispatch({ type: 'SET_ATTACK', from: null, to: null });
    dispatch({ type: 'SET_MOVE', from: null, to: null });
    dispatch({ type: 'SET_HAS_CAPTURED', value: false });

    if (state.embargoTurns[nextPlayer] > 0) {
      dispatch({ type: 'DECREMENT_EMBARGO' });
    }

    const vengeanceResult = applyVengeance(state, nextPlayer);
    if (vengeanceResult.territories) {
      dispatch({ type: 'SYNC_TERRITORIES', territories: vengeanceResult.territories });
    }
    if (vengeanceResult.vengeanceQueue) {
      vengeanceResult.vengeanceQueue.forEach((item) => {
        dispatch({ type: 'ADD_VENGEANCE', item });
      });
    }

    const reinf = getReinforcements({ ...state, currentPlayer: nextPlayer });
    dispatch({ type: 'SET_REINFORCEMENTS', value: reinf });
    dispatch({ type: 'SET_PHASE', phase: 'diplo' });
  };

  const handleShowCards = () => setShowCards(true);

  const handleCombatRoll = () => {
    if (!state.attackFrom || !state.attackTo) return;
    const results = rollCombat(state.atkDice, state.defDice);
    const { atkLost, defLost } = resolveCombat(results.atkResults, results.defResults);

    dispatch({ type: 'REMOVE_ARMIES', name: state.attackFrom, count: atkLost });
    dispatch({ type: 'REMOVE_ARMIES', name: state.attackTo, count: defLost });

    setCombatData({
      atkResults: results.atkResults,
      defResults: results.defResults,
      atkLost,
      defLost,
      atkTerr: state.attackFrom,
      defTerr: state.attackTo,
    });
  };

  const handleCombatContinue = () => {
    setCombatData(null);
    const defT = state.territories[state.attackTo!];
    if (defT && defT.armies <= 0) {
      dispatch({ type: 'SET_TERRITORY_OWNER', name: state.attackTo!, owner: state.currentPlayer });
      dispatch({ type: 'ADD_ARMIES', name: state.attackTo!, count: state.atkDice });
      dispatch({ type: 'REMOVE_ARMIES', name: state.attackFrom!, count: state.atkDice });
      dispatch({ type: 'SET_JUST_CONQUERED', value: true });
      dispatch({ type: 'SET_HAS_CAPTURED', value: true });
      setShowCombat(false);
      dispatch({ type: 'SET_ATTACK', from: null, to: null });

      const result = checkWin(state);
      if (result.winner !== null) {
        setWinner(state.players[result.winner].name);
      }
    }
  };

  const handleCombatStop = () => {
    setShowCombat(false);
    setCombatData(null);
    dispatch({ type: 'SET_ATTACK', from: null, to: null });
  };

  const handleCombatClose = () => {
    setShowCombat(false);
    setCombatData(null);
  };

  const handleMoveConfirm = (count: number) => {
    if (!state.moveFrom || !state.moveTo) return;
    dispatch({ type: 'MOVE_ARMIES', from: state.moveFrom, to: state.moveTo, count });
    dispatch({ type: 'SET_MOVE_DONE', value: true });
    setShowMove(false);
    dispatch({ type: 'SET_MOVE', from: null, to: null });
  };

  const handleMoveCancel = () => {
    setShowMove(false);
    dispatch({ type: 'SET_MOVE', from: null, to: null });
  };

  const handleDiploPropose = (type: string, opponent: number, note: string, tours: number, give?: string, recv?: string) => {
    const pact = createPact(state, type, state.currentPlayer, opponent, note, tours, give, recv);
    dispatch({ type: 'SET_PACT_TYPE', pactType: type });
    const pactWithId = { ...pact, id: state.pactCounter };
    dispatch({ type: 'ADD_PACT', pact: pactWithId });
    dispatch({ type: 'ADD_DIPLO_HISTORY', msg: `[Tour ${state.globalTurn}] Pacte ${type} proposé à ${state.players[opponent].name}.` });
  };

  const handleDiploBreak = (pactId: number) => {
    dispatch({ type: 'SET_PENDING_BREACH', pactId });
  };

  const handleDiploSanction = (sanction: string) => {
    if (state.pendingBreachPactId === null) return;
    const result = breakPact(state, state.pendingBreachPactId, sanction);
    if (result.pacts) {
      dispatch({ type: 'BREAK_PACT', pactId: state.pendingBreachPactId, breacherIdx: state.currentPlayer });
    }
    if (result.malusPending) {
      result.malusPending.forEach((amount, i) => {
        if (amount > (state.malusPending[i] || 0)) {
          dispatch({ type: 'ADD_MALUS', playerIdx: i, amount: amount - (state.malusPending[i] || 0) });
        }
      });
    }
    if (result.embargoTurns) {
      result.embargoTurns.forEach((turns, i) => {
        if (turns > (state.embargoTurns[i] || 0)) {
          dispatch({ type: 'ADD_EMBARGO', playerIdx: i, turns: turns - (state.embargoTurns[i] || 0) });
        }
      });
    }
    if (result.vengeanceQueue) {
      result.vengeanceQueue.forEach((item) => dispatch({ type: 'ADD_VENGEANCE', item }));
    }
    dispatch({ type: 'SET_PENDING_BREACH', pactId: null });
  };

  const handleDiploSelectTarget = (callback: (name: string) => void) => {
    setMapSelectCallback(() => callback);
  };

  const handleTradeCards = () => {
    const result = tradeCards(state);
    if (result) {
      dispatch({
        type: 'TRADE_CARDS',
        tradedIndices: state.selectedCards,
        value: result.baseValue,
        bonusTerrs: result.bonusTerrs,
      });
    }
  };

  const handleShowMultiplayer = () => setShowMulti(true);

  const handleReplay = () => window.location.reload();

  return (
    <div id="game" className="screen active">
      <Map3D onTerritoryClick={handleTerritoryClick} />
      <MapView onTerritoryClick={handleTerritoryClick} />

      <HUD
        state={state}
        onOpenDiplo={handleOpenDiplo}
        onEndDiplo={handleEndDiplo}
        onEndReinf={handleEndReinf}
        onEndAttack={handleEndAttack}
        onEndMove={handleEndMove}
        onShowCards={handleShowCards}
      />

      {showCombat && (
        <CombatModal
          state={state}
          dispatch={dispatch}
          combatData={combatData}
          onRoll={handleCombatRoll}
          onContinue={handleCombatContinue}
          onStop={handleCombatStop}
          onClose={handleCombatClose}
        />
      )}

      {showMove && (
        <MoveModal
          state={state}
          dispatch={dispatch}
          onConfirm={handleMoveConfirm}
          onCancel={handleMoveCancel}
        />
      )}

      {showDiplo && (
        <DiplomacyModal
          state={state}
          dispatch={dispatch}
          onPropose={handleDiploPropose}
          onMapPick={handleDiploSelectTarget}
          onClose={() => setShowDiplo(false)}
          onBreak={handleDiploBreak}
        />
      )}

      {showCards && (
        <CardsModal
          state={state}
          dispatch={dispatch}
          onTrade={handleTradeCards}
          onPass={() => setShowCards(false)}
          onClose={() => setShowCards(false)}
        />
      )}

      {state.incomingProposal && (
        <NegotiationModal
          pact={state.incomingProposal}
          onAccept={() => {
            if (state.incomingProposal) {
              dispatch({ type: 'ADD_PACT', pact: state.incomingProposal });
              dispatch({ type: 'SET_INCOMING_PROPOSAL', pact: null });
            }
          }}
          onReject={() => dispatch({ type: 'SET_INCOMING_PROPOSAL', pact: null })}
        />
      )}

      {state.pendingBreachPactId !== null && (
        <SanctionModal
          pactId={state.pendingBreachPactId}
          onApply={handleDiploSanction}
          onDismiss={() => dispatch({ type: 'SET_PENDING_BREACH', pactId: null })}
        />
      )}

      {showMulti && (
        <MultiplayerModal
          multi={state.multi}
          onHost={() => {}}
          onJoin={(id: string) => {}}
          onClose={() => setShowMulti(false)}
        />
      )}

      {winner && (
        <WinScreen winnerName={winner} onReplay={handleReplay} />
      )}
    </div>
  );
}
