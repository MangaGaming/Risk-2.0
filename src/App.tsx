import { useState } from 'react';
import { useGame } from '@/context/GameContext';
import IntroScreen from '@/components/IntroScreen';
import SetupScreen from '@/components/SetupScreen';
import GameBoard from '@/components/GameBoard';
import { POSITIONS } from '@/types/config';
import { generateInitialTerritories, initCardDeck } from '@/services/gameEngine';

type Screen = 'intro' | 'setup' | 'game';

export default function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const { dispatch } = useGame();

  const handleStartLocal = () => {
    setScreen('setup');
  };

  const handleStartOnline = () => {
    setScreen('setup');
  };

  const handleStartGame = (players: { name: string }[]) => {
    const allTerritories = Object.keys(POSITIONS);
    const territories = generateInitialTerritories(players.length);
    const cardDeck = initCardDeck(allTerritories);

    players.forEach((p, i) => {
      dispatch({ type: 'SET_PLAYER_NAME', idx: i, name: p.name });
    });

    dispatch({
      type: 'INIT_GAME',
      territories,
      cardDeck,
      cardsTradedTotal: 0,
    });

    setScreen('game');
  };

  if (screen === 'intro') {
    return <IntroScreen onStartLocal={handleStartLocal} onStartOnline={handleStartOnline} />;
  }

  if (screen === 'setup') {
    return <SetupScreen onStartGame={handleStartGame} />;
  }

  if (screen === 'game') {
    return <GameBoard />;
  }

  return null;
}
