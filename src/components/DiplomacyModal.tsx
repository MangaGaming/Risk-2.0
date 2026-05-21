import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import type { GameState, Dispatch, Pact } from '@/types/game';

interface DiplomacyModalProps {
  state: GameState;
  dispatch: Dispatch;
  onPropose: (type: string, opponent: number, note: string, tours: number, give?: string, recv?: string) => void;
  onMapPick: (callback: (name: string) => void) => void;
  onClose: () => void;
  onBreak: (pactId: number) => void;
}

const PACT_TYPES = [
  { value: 'non-agression', label: 'Non-agression', desc: 'Vous ne pouvez pas vous attaquer mutuellement.' },
  { value: 'alliance', label: 'Alliance', desc: 'Vous pouvez traverser, pas d\'attaque possible.' },
  { value: 'echange', label: 'Échange de territoire', desc: 'Cédez un territoire en échange d\'un autre.' },
  { value: 'cession', label: 'Cession de territoire', desc: 'Offrez un territoire sans contrepartie.' },
];

type Diptab = 'new' | 'active' | 'history';

export default function DiplomacyModal({
  state,
  dispatch,
  onPropose,
  onMapPick,
  onClose,
  onBreak,
}: DiplomacyModalProps) {
  const [tab, setTab] = useState<Diptab>('new');
  const [pactType, setPactType] = useState('non-agression');
  const [opponent, setOpponent] = useState<number>(-1);
  const [tours, setTours] = useState(1);
  const [note, setNote] = useState('');
  const [giveTerr, setGiveTerr] = useState('');
  const [recvTerr, setRecvTerr] = useState('');

  const others = state.players.filter((_, i) => i !== state.currentPlayer && i < state.playerCount);
  const myTerrs = Object.entries(state.territories)
    .filter(([, t]) => t.owner === state.currentPlayer)
    .map(([n]) => n);

  const handlePickGive = () => {
    onMapPick((name) => setGiveTerr(name));
  };

  const handlePickRecv = () => {
    onMapPick((name) => setRecvTerr(name));
  };

  const handlePropose = () => {
    if (opponent < 0) return;
    if ((pactType === 'echange' || pactType === 'cession') && !giveTerr) return;
    if (pactType === 'echange' && !recvTerr) return;
    onPropose(pactType, opponent, note, tours, giveTerr || undefined, recvTerr || undefined);
  };

  const activePacts = state.pacts.filter((p) => !p.broken && p.toursLeft > 0);
  const histPacts = state.pacts.filter((p) => p.broken || p.toursLeft <= 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal diplo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Diplomatie</h2>
        </div>

        <div className="diplo-tabs">
          <button
            className={`diplo-tab${tab === 'new' ? ' active' : ''}`}
            onClick={() => setTab('new')}
          >
            Nouveau traité
          </button>
          <button
            className={`diplo-tab${tab === 'active' ? ' active' : ''}`}
            onClick={() => setTab('active')}
          >
            Traités actifs ({activePacts.length})
          </button>
          <button
            className={`diplo-tab${tab === 'history' ? ' active' : ''}`}
            onClick={() => setTab('history')}
          >
            Historique
          </button>
        </div>

        <div className="modal-body">
          {tab === 'new' && (
            <div className="diplo-form">
              <div className="form-group">
                <label>Type de pacte</label>
                <div className="pact-type-grid">
                  {PACT_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      className={`pact-type-card${pactType === pt.value ? ' selected' : ''}`}
                      onClick={() => setPactType(pt.value)}
                    >
                      <div className="pact-type-name">{pt.label}</div>
                      <div className="pact-type-desc">{pt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Joueur adverse</label>
                <div className="opponent-grid">
                  {others.map((p, i) => (
                    <button
                      key={i}
                      className={`opponent-card${opponent === i ? ' selected' : ''}`}
                      style={{
                        '--p-color': p.lightColor,
                        borderColor: opponent === i ? p.lightColor : 'rgba(196,129,58,0.3)',
                      } as React.CSSProperties}
                      onClick={() => setOpponent(i)}
                    >
                      <div className="opponent-dot" style={{ background: p.color }} />
                      <div className="opponent-name">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Durée (tours)</label>
                <div className="tour-select">
                  {[1, 2, 3, 4, 5].map((t) => (
                    <button
                      key={t}
                      className={`tour-btn${tours === t ? ' active' : ''}`}
                      onClick={() => setTours(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {(pactType === 'echange' || pactType === 'cession') && (
                <div className="form-group">
                  <label>Territoire à donner</label>
                  <div className="terr-pick-row">
                    <input
                      type="text"
                      readOnly
                      value={giveTerr}
                      placeholder="Cliquez sur la carte"
                      className="form-input"
                    />
                    <button className="modal-btn" onClick={handlePickGive}>
                      Choisir
                    </button>
                  </div>
                </div>
              )}

              {pactType === 'echange' && (
                <div className="form-group">
                  <label>Territoire à recevoir</label>
                  <div className="terr-pick-row">
                    <input
                      type="text"
                      readOnly
                      value={recvTerr}
                      placeholder="Cliquez sur la carte"
                      className="form-input"
                    />
                    <button className="modal-btn" onClick={handlePickRecv}>
                      Choisir
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Note (optionnelle)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="form-input form-textarea"
                  rows={2}
                  placeholder="Message diplomatique..."
                />
              </div>

              {note.trim() && (
                <div className="diplo-preview">
                  <div className="preview-line">
                    <span className="preview-label">Message</span>
                    <span className="preview-note">{note}</span>
                  </div>
                  <div className="preview-line">
                    <span className="preview-label">Type</span>
                    <span>{PACT_TYPES.find((p) => p.value === pactType)?.label}</span>
                  </div>
                  <div className="preview-line">
                    <span className="preview-label">Vers</span>
                    <span>{opponent >= 0 ? state.players[opponent].name : '-'}</span>
                  </div>
                  <div className="preview-line">
                    <span className="preview-label">Durée</span>
                    <span>{tours} tour(s)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'active' && (
            <div className="diplo-list">
              {activePacts.length === 0 ? (
                <p style={{ color: '#7a6a4e', fontStyle: 'italic', textAlign: 'center' }}>
                  Aucun traité actif
                </p>
              ) : (
                activePacts.map((pact) => (
                  <div key={pact.id} className="pact-row active">
                    <div className="pact-row-info">
                      <div className="pact-row-type">{pact.type}</div>
                      <div className="pact-row-parties">
                        {state.players[pact.player0]?.name} & {state.players[pact.player1]?.name}
                      </div>
                      <div className="pact-row-tours">{pact.toursLeft} tour(s) restant(s)</div>
                      {pact.give && (
                        <div className="pact-row-note">
                          Cession: {pact.give}{pact.recv ? ` → ${pact.recv}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="pact-row-actions">
                      {pact.player0 === state.currentPlayer || pact.player1 === state.currentPlayer ? (
                        <button
                          className="modal-btn danger"
                          onClick={() => onBreak(pact.id)}
                        >
                          Rompre
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="diplo-list">
              {histPacts.length === 0 && state.diploHistory.length === 0 ? (
                <p style={{ color: '#7a6a4e', fontStyle: 'italic', textAlign: 'center' }}>
                  Aucun historique
                </p>
              ) : (
                <>
                  {histPacts.map((pact) => (
                    <div key={pact.id} className="pact-row history">
                      <div className="pact-row-info">
                        <div className="pact-row-type">{pact.type}</div>
                        <div className="pact-row-parties">
                          {state.players[pact.player0]?.name} & {state.players[pact.player1]?.name}
                        </div>
                        <div className="pact-row-status">{pact.broken ? 'Rompu' : 'Expiré'}</div>
                      </div>
                    </div>
                  ))}
                  {state.diploHistory.map((msg, i) => (
                    <div key={`dh-${i}`} className="diplo-msg">
                      {msg}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {tab === 'new' && (
            <button className="modal-btn primary" onClick={handlePropose}>
              Proposer
            </button>
          )}
          <button className="modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
