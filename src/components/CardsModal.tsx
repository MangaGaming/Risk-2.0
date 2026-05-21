import { useState } from 'react';
import type { GameState, Dispatch, Card } from '@/types/game';

interface CardsModalProps {
  state: GameState;
  dispatch: Dispatch;
  onTrade: () => void;
  onPass: () => void;
  onClose: () => void;
}

export default function CardsModal({ state, dispatch, onTrade, onPass, onClose }: CardsModalProps) {
  const playerCards = state.players[state.currentPlayer]?.cards || [];
  const [selected, setSelected] = useState<number[]>([]);

  const toggleCard = (idx: number) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const canTrade =
    selected.length === 3 &&
    (selected.every((i) => playerCards[i]?.type === 'infantry') ||
      selected.every((i) => playerCards[i]?.type === 'cavalry') ||
      selected.every((i) => playerCards[i]?.type === 'artillery') ||
      (playerCards.filter((_, i) => selected.includes(i)).map((c) => c.type).includes('infantry') &&
        playerCards.filter((_, i) => selected.includes(i)).map((c) => c.type).includes('cavalry') &&
        playerCards.filter((_, i) => selected.includes(i)).map((c) => c.type).includes('artillery')));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal cards-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Cartes</h2>
        </div>

        <div className="modal-body">
          <p style={{ color: '#c9a96e', marginBottom: '1rem', textAlign: 'center' }}>
            Vous avez {playerCards.length} carte{playerCards.length !== 1 ? 's' : ''}
          </p>

          {playerCards.length === 0 ? (
            <p style={{ color: '#7a6a4e', fontStyle: 'italic', textAlign: 'center' }}>
              Vous n'avez aucune carte. Conquérez des territoires pour en gagner !
            </p>
          ) : (
            <div className="cards-grid">
              {playerCards.map((card, idx) => {
                const isSel = selected.includes(idx);
                const typeKey = card.type === 'infantry' ? 'I' : card.type === 'cavalry' ? 'C' : card.type === 'artillery' ? 'A' : '?';
                const typeColor =
                  card.type === 'infantry'
                    ? '#e74c3c'
                    : card.type === 'cavalry'
                      ? '#3498db'
                      : card.type === 'artillery'
                        ? '#2ecc71'
                        : '#7a6a4e';
                return (
                  <button
                    key={idx}
                    className={`card-item${isSel ? ' selected' : ''}`}
                    onClick={() => toggleCard(idx)}
                    style={isSel ? { borderColor: typeColor, boxShadow: `0 0 12px ${typeColor}` } : {}}
                  >
                    <div className="card-type" style={{ color: typeColor }}>
                      {typeKey}
                    </div>
                    <div className="card-territory">{card.territory}</div>
                    <div className="card-icon" style={{ color: typeColor }}>
                      {card.type === 'infantry' ? '⚔️' : card.type === 'cavalry' ? '🐎' : '🛡️'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selected.length > 0 && (
            <div className="selected-info" style={{ color: '#c9a96e', textAlign: 'center', marginTop: '1rem' }}>
              {selected.length}/3 cartes sélectionnées
              {selected.length === 3 && !canTrade && (
                <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Les cartes doivent être de types identiques ou tous différents
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="modal-btn primary"
            disabled={!canTrade}
            onClick={() => {
              dispatch({ type: 'SET_SELECTED_CARDS', cards: selected });
              onTrade();
              setSelected([]);
            }}
          >
            Échanger
          </button>
          <button className="modal-btn" onClick={onPass}>
            Passer
          </button>
        </div>
      </div>
    </div>
  );
}
