import { useState } from 'react';

interface SetupScreenProps {
  onStartGame: (players: { name: string }[]) => void;
}

const DEFAULT_NAMES = ['Rouge', 'Bleu', 'Vert'];

export default function SetupScreen({ onStartGame }: SetupScreenProps) {
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState([...DEFAULT_NAMES]);

  const updateName = (idx: number, val: string) => {
    const next = [...names];
    next[idx] = val;
    setNames(next);
  };

  const handleStart = () => {
    onStartGame(names.slice(0, playerCount).map((n) => ({ name: n })));
  };

  return (
    <div id="setup" className="screen active">
      <h2 className="setup-title">Nouvelle Partie</h2>
      <p className="setup-subtitle">Choisissez vos commandants</p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          className={`count-btn${playerCount === 2 ? ' active' : ''}`}
          onClick={() => setPlayerCount(2)}
        >
          2 Joueurs
        </button>
        <button
          className={`count-btn${playerCount === 3 ? ' active' : ''}`}
          onClick={() => setPlayerCount(3)}
        >
          3 Joueurs
        </button>
      </div>

      <div className="player-setup">
        {[0, 1, 2].map((i) =>
          i < playerCount ? (
            <div key={i} className={`player-card p${i + 1}`}>
              <div className="player-crest">
                {['⚔', '🛡', '🏹'][i]}
              </div>
              <h3>Joueur {i + 1}</h3>
              <input
                value={names[i]}
                onChange={(e) => updateName(i, e.target.value)}
                placeholder={DEFAULT_NAMES[i]}
              />
            </div>
          ) : null
        )}
      </div>

      <button className="start-btn" onClick={handleStart}>
        Commencer la Bataille
      </button>
    </div>
  );
}
