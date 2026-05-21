import { useState } from 'react';
import type { MultiState } from '@/types/game';

interface MultiplayerModalProps {
  multi: MultiState;
  onHost: () => void;
  onJoin: (peerId: string) => void;
  onClose: () => void;
}

export default function MultiplayerModal({ multi, onHost, onJoin, onClose }: MultiplayerModalProps) {
  const [joinId, setJoinId] = useState('');

  const handleJoin = () => {
    if (joinId.trim()) {
      onJoin(joinId.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-glow" />
          <h2 className="modal-title">Partie en ligne</h2>
        </div>

        <div className="modal-body">
          <div className="multi-section">
            <h3 className="multi-section-title">Héberger</h3>
            <p style={{ color: '#c9a96e', marginBottom: '1rem' }}>
              Créez une partie et attendez qu'un adversaire se connecte.
            </p>
            {multi.peerId ? (
              <div className="peer-id-display">
                <div className="peer-id-label">Votre ID :</div>
                <div className="peer-id-value">{multi.peerId}</div>
                <div className="peer-id-status">
                  {!multi.connected ? (
                    <span style={{ color: '#f39c12' }}>En attente de connexion...</span>
                  ) : (
                    <span style={{ color: '#2ecc71' }}>Connecté !</span>
                  )}
                </div>
              </div>
            ) : (
              <button className="modal-btn primary" onClick={onHost}>
                Héberger une partie
              </button>
            )}
          </div>

          <div className="multi-divider">
            <span>OU</span>
          </div>

          <div className="multi-section">
            <h3 className="multi-section-title">Rejoindre</h3>
            <p style={{ color: '#c9a96e', marginBottom: '1rem' }}>
              Entrez l'ID de l'hôte pour rejoindre sa partie.
            </p>
            <div className="join-row">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="form-input"
                placeholder="Collez l'ID de l'hôte..."
                style={{ flex: 1 }}
              />
              <button
                className="modal-btn primary"
                disabled={!joinId.trim()}
                onClick={handleJoin}
              >
                Rejoindre
              </button>
            </div>
            {multi.connecting && (
              <p style={{ color: '#f39c12', textAlign: 'center', marginTop: '0.5rem' }}>
                Connexion en cours...
              </p>
            )}
            {multi.error && (
              <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '0.5rem' }}>
                Erreur : {multi.error}
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
