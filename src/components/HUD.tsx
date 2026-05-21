import type { GameState, Phase } from '@/types/game';
import { countTerritories } from '@/services/utils';

interface HUDProps {
  state: GameState;
  onOpenDiplo: () => void;
  onEndDiplo: () => void;
  onEndReinf: () => void;
  onEndAttack: () => void;
  onEndMove: () => void;
  onShowCards: () => void;
}

const PHASE_LABELS: Record<Phase, string> = {
  diplo: 'Phase de Diplomatie',
  reinf: 'Placement des renforts',
  attack: "Phase d'attaque",
  move: "Déplacement d'armées",
};

const PHASE_DESCS: Record<Phase, string> = {
  diplo: 'Phase diplomatique : négociez des pactes, échangez des territoires, formez des alliances.',
  reinf: 'Placez vos armées sur vos territoires.',
  attack: 'Cliquez sur un de vos territoires (≥2 armées) puis sur un territoire ennemi adjacent.',
  move: 'Déplacez des armées vers un territoire voisin (facultatif).',
};

const PHASE_ORDER: Phase[] = ['diplo', 'reinf', 'attack', 'move'];

export default function HUD({
  state,
  onOpenDiplo,
  onEndDiplo,
  onEndReinf,
  onEndAttack,
  onEndMove,
  onShowCards,
}: HUDProps) {
  const player = state.players[state.currentPlayer];
  const curPhaseIdx = PHASE_ORDER.indexOf(state.phase);

  const pactsActive = state.pacts.filter(
    (p) => !p.broken && p.toursLeft > 0
  );

  return (
    <>
      <div id="hud-top">
        <div className="hud-left">
          <div className="turn-banner">
            <span
              className="turn-player-dot"
              style={{ background: player.lightColor, boxShadow: `0 0 8px ${player.lightColor}` }}
            />
            <span className="turn-player" style={{ color: player.lightColor }}>
              {player.name}
            </span>
            <span className="turn-phase">
              {PHASE_LABELS[state.phase]}
            </span>
          </div>

          <div className="hud-stats" style={{ marginTop: '2px' }}>
            {state.players.slice(0, state.playerCount).map((p, i) => {
              const isActive = i === state.currentPlayer;
              const tCount = countTerritories(state.territories, i);
              return (
                <div
                  key={i}
                  className={`stat-card p${i + 1}`}
                  style={
                    isActive
                      ? { boxShadow: `0 0 0 2px ${p.lightColor}, 0 4px 16px rgba(0,0,0,0.3)` }
                      : undefined
                  }
                >
                  <div className="stat-card-name">{p.name}</div>
                  <div className="stat-card-val">{tCount}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="hud-right">
          <button className="action-btn" onClick={onShowCards}>
            Cartes ({state.players[state.currentPlayer]?.cards.length || 0})
          </button>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hud-bottom-left">
          <div className="phase-steps">
            {PHASE_ORDER.map((ph, i) => (
              <div
                key={ph}
                id={`ps-${ph}`}
                className={`phase-step${i === curPhaseIdx ? ' active' : ''}${i < curPhaseIdx ? ' done' : ''}`}
                style={
                  i < curPhaseIdx
                    ? { background: player.color }
                    : i === curPhaseIdx
                      ? { background: '#d4a017' }
                      : {}
                }
              />
            ))}
          </div>

          <div id="phase-desc">
            {state.phase === 'reinf' ? (
              <>
                Vous avez <strong>{state.reinforcements}</strong> armée(s) à placer. Cliquez sur un de vos territoires.
              </>
            ) : (
              PHASE_DESCS[state.phase]
            )}
          </div>

          {state.malusPending[state.currentPlayer] > 0 && (
            <div className="malus-indicator">
              Malus : -{state.malusPending[state.currentPlayer]} renforts
            </div>
          )}

          {state.embargoTurns[state.currentPlayer] > 0 && (
            <div className="embargo-badge">
              SOUS EMBARGO ({state.embargoTurns[state.currentPlayer]} tr)
            </div>
          )}

          {state.phase === 'diplo' && (
            <div id="section-diplo">
              <button
                className="action-btn"
                onClick={onOpenDiplo}
                disabled={state.embargoTurns[state.currentPlayer] > 0}
              >
                Négocier
              </button>
              <button className="action-btn" onClick={onEndDiplo}>
                Passer
              </button>
            </div>
          )}

          {state.phase === 'reinf' && (
            <div id="section-reinf">
              <div className="reinf-badge">
                <div className={`reinf-token p${state.currentPlayer + 1}`}>
                  {state.reinforcements}
                </div>
              </div>
              <button
                className="action-btn primary"
                disabled={state.reinforcements > 0}
                onClick={onEndReinf}
              >
                Valider
              </button>
            </div>
          )}

          {state.phase === 'attack' && (
            <div id="section-attack">
              <button className="action-btn" onClick={onEndAttack}>
                Terminer
              </button>
            </div>
          )}

          {state.phase === 'move' && (
            <div id="section-move">
              <button className="action-btn primary" onClick={onEndMove}>
                Fin du tour
              </button>
            </div>
          )}
        </div>

        <div className="hud-bottom-right">
          <div className="hud-section-title">Traités</div>
          {pactsActive.length === 0 ? (
            <div className="no-pacts">Aucun pacte actif</div>
          ) : (
            <div className="pact-list">
              {pactsActive.map((pact) => (
                <div key={pact.id} className="pact-card">
                  <div className="pact-type">{pact.type}</div>
                  <div className="pact-body">
                    {state.players[pact.player0].name} & {state.players[pact.player1].name}
                  </div>
                  <div className="pact-turns">{pact.toursLeft} tr restantes</div>
                </div>
              ))}
            </div>
          )}

          <div id="sanctions-display">
            {state.players.map((p, i) => (
              <span key={i}>
                {state.malusPending[i] > 0 && (
                  <span className="sanction-badge malus">
                    {p.name}: -{state.malusPending[i]}
                  </span>
                )}
                {state.embargoTurns[i] > 0 && (
                  <span className="sanction-badge embargo">
                    {p.name}: {state.embargoTurns[i]}tr
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
