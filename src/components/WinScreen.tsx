interface WinScreenProps {
  winnerName: string;
  onReplay: () => void;
}

export default function WinScreen({ winnerName, onReplay }: WinScreenProps) {
  return (
    <div className="modal-overlay" style={{ zIndex: 100 }}>
      <div className="modal" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title" style={{ fontSize: '2rem' }}>
            Victoire !
          </h2>
        </div>

        <div className="modal-body">
          <div
            className="winner-crown"
            style={{ fontSize: '4rem', margin: '1rem 0' }}
          >
            👑
          </div>

          <p className="winner-message" style={{ color: '#d4a017', fontSize: '1.5rem', fontFamily: "'Cinzel', serif" }}>
            {winnerName}
          </p>

          <p style={{ color: '#c9a96e', marginBottom: '1.5rem' }}>
            a conquis tous les territoires et remporté la partie !
          </p>

          <div
            className="winner-stats"
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '1rem',
              borderRadius: '6px',
              color: '#c9a96e',
              fontSize: '0.9rem',
            }}
          >
            Félicitations pour cette victoire éclatante !
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="modal-btn primary" onClick={onReplay}>
            Rejouer
          </button>
        </div>
      </div>
    </div>
  );
}
