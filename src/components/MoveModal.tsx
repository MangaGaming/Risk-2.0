import { useState } from 'react';
import type { GameState, Dispatch } from '@/types/game';

interface MoveModalProps {
  state: GameState;
  dispatch: Dispatch;
  onConfirm: (count: number) => void;
  onCancel: () => void;
}

export default function MoveModal({ state, dispatch, onConfirm, onCancel }: MoveModalProps) {
  const fromT = state.moveFrom ? state.territories[state.moveFrom] : null;
  const maxMove = fromT ? fromT.armies - 1 : 0;
  const [count, setCount] = useState(Math.min(3, maxMove));

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal move-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Déplacer des armées</h2>
        </div>

        <div className="modal-body">
          <p style={{ color: '#c9a96e', textAlign: 'center', marginBottom: '1rem' }}>
            De <strong style={{ color: '#f0deb4' }}>{state.moveFrom}</strong> vers{' '}
            <strong style={{ color: '#f0deb4' }}>{state.moveTo}</strong>
          </p>

          <div className="move-slider-container">
            <label style={{ color: '#c9a96e', marginBottom: '0.5rem', display: 'block' }}>
              Armées à déplacer : <strong style={{ color: '#f0deb4' }}>{count}</strong>
            </label>
            <input
              type="range"
              min="1"
              max={maxMove}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="dice-slider"
              style={{ width: '100%' }}
            />
            <div className="move-range" style={{ display: 'flex', justifyContent: 'space-between', color: '#7a6a4e', fontSize: '0.75rem' }}>
              <span>1</span>
              <span>Max: {maxMove}</span>
            </div>
          </div>

          <div className="move-info" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div style={{ color: '#7a6a4e', fontSize: '0.75rem' }}>Départ</div>
              <div style={{ color: '#f0deb4', fontSize: '1.2rem' }}>
                {(fromT?.armies || 0) - count}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div style={{ color: '#7a6a4e', fontSize: '0.75rem' }}>Arrivée</div>
              <div style={{ color: '#f0deb4', fontSize: '1.2rem' }}>
                {(state.moveTo ? state.territories[state.moveTo]?.armies || 0 : 0) + count}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn primary" onClick={() => onConfirm(count)}>
            Confirmer
          </button>
          <button className="modal-btn" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
