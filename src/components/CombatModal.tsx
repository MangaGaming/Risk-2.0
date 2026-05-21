import type { GameState, CombatData as CombatDataType, Dispatch } from '@/types/game';

interface CombatModalProps {
  state: GameState;
  dispatch: Dispatch;
  combatData: CombatDataType | null;
  onRoll: () => void;
  onContinue: () => void;
  onStop: () => void;
  onClose: () => void;
}

export default function CombatModal({
  state,
  dispatch,
  combatData,
  onRoll,
  onContinue,
  onStop,
  onClose,
}: CombatModalProps) {
  const atkT = state.attackFrom ? state.territories[state.attackFrom] : null;
  const defT = state.attackTo ? state.territories[state.attackTo] : null;
  const attacker = state.players[state.currentPlayer];
  const defender = defT ? state.players[defT.owner] : null;

  const atkMax = Math.min(atkT ? atkT.armies - 1 : 0, 3);
  const defMax = Math.min(defT ? defT.armies : 0, 2);
  const canFight = atkT && defT && atkT.armies >= 2 && defT.armies > 0;
  const atkRolled = combatData && combatData.atkResults.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal combat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">⚔️ Combat</h2>
        </div>

        <div className="combat-vs">
          <div className="combatant atk">
            <div className="combatant-dot" style={{ background: attacker.color }} />
            <div className="combatant-name">{attacker.name}</div>
            <div className="combatant-armies">{atkT?.armies ?? '-'}</div>
          </div>
          <div className="vs-divider">VS</div>
          <div className="combatant def" style={{ opacity: defender ? 1 : 0.3 }}>
            <div className="combatant-dot" style={{ background: defender?.color || '#666' }} />
            <div className="combatant-name">{defender?.name ?? '???'}</div>
            <div className="combatant-armies">{defT?.armies ?? '-'}</div>
          </div>
        </div>

        <div className="modal-section">
          <div className="dice-selector">
            <label>
              Dés attaque ({state.atkDice} / {atkMax})
              <input
                type="range"
                min="1"
                max={atkMax}
                value={state.atkDice}
                disabled={atkRolled}
                className="dice-slider"
                onChange={(e) => dispatch({ type: 'SET_ATK_DICE', value: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="dice-selector">
            <label>
              Dés défense ({state.defDice} / {defMax})
              <input
                type="range"
                min="1"
                max={defMax}
                value={state.defDice}
                disabled={atkRolled}
                className="dice-slider"
                onChange={(e) => dispatch({ type: 'SET_DEF_DICE', value: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>

        {combatData && (
          <div className="combat-results">
            <div className="result-row atk">
              <span className="result-label">Attaque</span>
              <div className="dice-display">
                {combatData.atkResults.map((v, i) => (
                  <span key={i} className={`dice ${v}`}>
                    {v}
                  </span>
                ))}
              </div>
              <span className="result-loss">-{combatData.atkLost}</span>
            </div>
            <div className="result-row def">
              <span className="result-label">Défense</span>
              <div className="dice-display">
                {combatData.defResults.map((v, i) => (
                  <span key={i} className={`dice ${v}`}>
                    {v}
                  </span>
                ))}
              </div>
              <span className="result-loss">-{combatData.defLost}</span>
            </div>
          </div>
        )}

        <div className="modal-footer">
          {!atkRolled ? (
            <button className="modal-btn primary" disabled={!canFight} onClick={onRoll}>
              Lancer les dés
            </button>
          ) : (
            <>
              <button className="modal-btn primary" onClick={onContinue}>
                Continuer
              </button>
              <button className="modal-btn danger" onClick={onStop}>
                Arrêter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
