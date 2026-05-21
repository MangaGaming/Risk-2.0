interface IntroScreenProps {
  onStartLocal: () => void;
  onStartOnline: () => void;
}

export default function IntroScreen({ onStartLocal, onStartOnline }: IntroScreenProps) {
  return (
    <div id="intro" className="screen active">
      <div className="intro-ornament tr">✦</div>
      <div className="intro-ornament bl">✦</div>
      <div className="intro-ornament br">✦</div>

      <div className="intro-emblem">
        <span className="intro-emblem-icon">👑</span>
      </div>

      <h1 className="intro-title">RISK</h1>
      <p className="intro-subtitle">Conquête du Monde</p>

      <div className="intro-divider">
        <span className="intro-divider-line" />
        <span className="intro-divider-gem">◆</span>
        <span className="intro-divider-line" />
      </div>

      <button className="intro-btn" onClick={onStartLocal}>
        Partie Locale
      </button>
      <button className="intro-btn" onClick={onStartOnline}>
        Partie en Ligne (P2P)
      </button>
    </div>
  );
}
