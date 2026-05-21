import type { Pact } from '@/types/game';

interface NegotiationModalProps {
  pact: Pact;
  onAccept: () => void;
  onReject: () => void;
}

export default function NegotiationModal({ pact, onAccept, onReject }: NegotiationModalProps) {
  return (
    <div className="modal-overlay" onClick={onReject}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Proposition diplomatique</h2>
        </div>

        <div className="modal-body">
          <p style={{ color: '#c9a96e', textAlign: 'center', marginBottom: '1.5rem' }}>
            Un joueur vous propose un traité
          </p>

          <div className="pact-detail" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '6px' }}>
            <div className="pact-detail-row">
              <span className="pact-detail-label">Type</span>
              <span className="pact-detail-value">{pact.type}</span>
            </div>
            <div className="pact-detail-row">
              <span className="pact-detail-label">Durée</span>
              <span className="pact-detail-value">{pact.toursLeft} tour(s)</span>
            </div>
            {pact.give && (
              <div className="pact-detail-row">
                <span className="pact-detail-label">Territoire donné</span>
                <span className="pact-detail-value">{pact.give}</span>
              </div>
            )}
            {pact.recv && (
              <div className="pact-detail-row">
                <span className="pact-detail-label">Territoire reçu</span>
                <span className="pact-detail-value">{pact.recv}</span>
              </div>
            )}
            {pact.note && (
              <div className="pact-detail-row">
                <span className="pact-detail-label">Message</span>
                <span className="pact-detail-value" style={{ fontStyle: 'italic' }}>
                  "{pact.note}"
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn primary" onClick={onAccept}>
            Accepter
          </button>
          <button className="modal-btn danger" onClick={onReject}>
            Refuser
          </button>
        </div>
      </div>
    </div>
  );
}
