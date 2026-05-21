import type { GameState } from '@/types/game';

interface SanctionModalProps {
  pactId: number;
  onApply: (sanction: string) => void;
  onDismiss: () => void;
}

const SANCTIONS = [
  { value: 'malus', label: 'Malus de renforts', desc: 'Inflige un malus de -3 renforts au prochain tour.' },
  { value: 'embargo', label: 'Embargo diplomatique', desc: 'Empêche les négociations avec ce joueur (3 tours).' },
  { value: 'vengeance', label: 'Vengeance territoriale', desc: 'Recevez un message de vengeance pour reprendre ce qui vous revient.' },
];

export default function SanctionModal({ pactId, onApply, onDismiss }: SanctionModalProps) {
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Sanction</h2>
        </div>

        <div className="modal-body">
          <p style={{ color: '#e74c3c', textAlign: 'center', marginBottom: '1.5rem' }}>
            Un pacte a été rompu ! Choisissez une sanction :
          </p>

          <div className="sanction-grid">
            {SANCTIONS.map((s) => (
              <button
                key={s.value}
                className="sanction-card"
                onClick={() => onApply(s.value)}
              >
                <div className="sanction-name">{s.label}</div>
                <div className="sanction-desc">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn" onClick={onDismiss}>
            Ignorer
          </button>
        </div>
      </div>
    </div>
  );
}
