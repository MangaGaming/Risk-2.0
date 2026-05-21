import { useGame } from '@/context/GameContext';
import { countTerritories } from '@/services/utils';
import { CONTINENTS } from '@/types/config';

interface MapViewProps {
  onTerritoryClick: (name: string) => void;
}

export default function MapView({ onTerritoryClick }: MapViewProps) {
  const { state } = useGame();
  const player = state.players[state.currentPlayer];
  const selTerr = state.selectedTerritory
    ? state.territories[state.selectedTerritory]
    : null;

  return (
    <div id="map-container" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid rgba(196,129,58,0.4)',
          borderRadius: '8px',
          padding: '1.5rem',
          minWidth: '280px',
          textAlign: 'center',
          pointerEvents: 'auto',
        }}
      >
        {selTerr && state.selectedTerritory ? (
          <>
            <h3 style={{ fontFamily: "'Cinzel', serif", color: '#d4a017', marginBottom: '0.5rem' }}>
              {state.selectedTerritory}
            </h3>
            <p style={{ color: '#c9a96e', fontSize: '0.85rem' }}>
              Armées: <strong style={{ color: '#f0deb4' }}>{selTerr.armies}</strong>
            </p>
            <p style={{ color: '#c9a96e', fontSize: '0.85rem' }}>
              Propriétaire: <strong style={{ color: player.lightColor }}>{player.name}</strong>
            </p>
          </>
        ) : (
          <p style={{ color: '#c9a96e', fontStyle: 'italic' }}>
            Cliquez sur un territoire
          </p>
        )}

        <div className="continent-legend" style={{ marginTop: '1rem' }}>
          {Object.entries(CONTINENTS).map(([name, data]) => (
            <div key={name} className="legend-item">
              <span className="legend-dot" style={{ background: data.color }} />
              <span>{name}</span>
              <span className="legend-bonus">+{data.bonus}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25rem',
          justifyContent: 'center',
          maxWidth: '90%',
          pointerEvents: 'auto',
        }}
      >
        {Object.keys(state.territories).map((name) => {
          const t = state.territories[name];
          const ownerColor = state.players[t.owner]?.color || '#666';
          return (
            <button
              key={name}
              onClick={() => onTerritoryClick(name)}
              style={{
                background: ownerColor,
                border: name === state.selectedTerritory ? '2px solid #f1c40f' : '1px solid rgba(255,255,255,0.2)',
                borderRadius: '3px',
                color: '#fff',
                fontSize: '0.5rem',
                padding: '0.15rem 0.3rem',
                cursor: 'pointer',
                opacity: t.owner === state.currentPlayer ? 1 : 0.7,
                fontFamily: "'Cinzel', serif",
              }}
              title={`${name} (${t.armies})`}
            >
              {name.substring(0, 4)} {t.armies}
            </button>
          );
        })}
      </div>
    </div>
  );
}
