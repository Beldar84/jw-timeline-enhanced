
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { GamePhase, Card as CardType, Player, GameState, OnlineGamePhase } from './types';
import { deckService } from './services/deckService';
import { statsService, PlayerStats, Achievement } from './services/statsService';
import { LOGO_URL, CARD_BACK_URL } from './data/cards';
import GameSetup from './components/GameSetup';
import GameBoard from './components/GameBoard';
import GameOver from './components/GameOver';
import MainMenuEnhanced from './components/MainMenuEnhanced';
import TurnTransition from './components/TurnTransition';
import FeedbackMessage from './components/FeedbackMessage';
import AISetup from './components/AISetup';
import OnlineSetup from './components/OnlineSetup';
import OnlineLobby from './components/OnlineLobby';
import DeckSelector from './components/DeckSelector';
import StatsPanel from './components/StatsPanel';
import Tutorial, { shouldShowTutorial } from './components/Tutorial';
import AchievementNotification from './components/AchievementNotification';
import { gameService } from './services/gameService';
import { soundService } from './services/soundService';
import AnimationLayerEnhanced, { AnimationInfo } from './components/AnimationLayerEnhanced';

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

interface PlayerStatusProps {
  players: Player[];
  currentPlayerId: string;
  discardPileCount: number;
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ players, currentPlayerId, discardPileCount }) => {
  return (
    <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-black/50 p-2 md:p-3 rounded-lg z-10">
      <h3 className="text-base md:text-lg font-bold text-yellow-200 mb-2">Jugadores</h3>
      <ul className="space-y-1">
        {players.map(player => (
          <li key={player.id} className={`text-sm md:text-base transition-colors ${player.id === currentPlayerId ? 'text-yellow-300 font-bold' : 'text-white'}`}>
            {player.name}: {player.hand.length} {player.hand.length === 1 ? 'carta' : 'cartas'}
          </li>
        ))}
      </ul>
      <div className="mt-2 pt-2 border-t border-gray-600">
        <p className={`text-sm md:text-base text-white`}>
          Descartes: {discardPileCount} {discardPileCount === 1 ? 'carta' : 'cartas'}
        </p>
      </div>
    </div>
  );
};

const AppEnhanced: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.MENU);
  const [gameMode, setGameMode] = useState<'local' | 'ai' | 'online' | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('complete');

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [timeline, setTimeline] = useState<CardType[]>([]);
  const [deck, setDeck] = useState<CardType[]>([]);
  const [discardPile, setDiscardPile] = useState<CardType[]>([]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [revealedAICard, setRevealedAICard] = useState<CardType | null>(null);
  const [isAITurnMessageVisible, setIsAITurnMessageVisible] = useState(false);

  const [animation, setAnimation] = useState<AnimationInfo | null>(null);
  const [hidingCardId, setHidingCardId] = useState<number | null>(null);
  const [aiMove, setAiMove] = useState<{ card: CardType; timelineIndex: number } | null>(null);

  const [onlineGameState, setOnlineGameState] = useState<GameState | null>(null);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const localPlayer = useMemo(() => onlineGameState?.players.find(p => p.id === localPlayerId) || null, [onlineGameState, localPlayerId]);

  // New state for enhanced features
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [stats, setStats] = useState<PlayerStats>(statsService.loadStats());

  // Show tutorial on first launch
  useEffect(() => {
    if (shouldShowTutorial() && gamePhase === GamePhase.MENU) {
      setShowTutorial(true);
    }
  }, []);

  const currentPlayer = useMemo(() => {
    if (gameMode === 'online' && onlineGameState) {
      return onlineGameState.players[onlineGameState.currentPlayerIndex];
    }
    return players[currentPlayerIndex];
  }, [players, currentPlayerIndex, gameMode, onlineGameState]);

  const handleNextTurn = useCallback(() => {
    setIsAITurnMessageVisible(false);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];

    setCurrentPlayerIndex(nextPlayerIndex);
    setMessage(`Es el turno de ${nextPlayer.name}.`);

    if (gameMode === 'local' && !nextPlayer.isAI) {
      setTimeout(() => {
        setGamePhase(GamePhase.TRANSITION);
      }, 1500);
    }
  }, [currentPlayerIndex, players, gameMode]);

  const handlePlacementResult = (player: Player, card: CardType, isCorrect: boolean, timelineIndex: number) => {
    // Record placement in stats
    statsService.recordPlacement(isCorrect);

    const newHand = player.hand.filter(c => c.id !== card.id);

    if (isCorrect) {
        soundService.playCorrect();
        const newTimeline = [...timeline];
        newTimeline.splice(timelineIndex, 0, card);
        setTimeline(newTimeline);
        setPlayers(players.map(p => p.id === player.id ? { ...p, hand: newHand } : p));

        if (newHand.length === 0) {
            setWinner(player);
            setGamePhase(GamePhase.GAME_OVER);
            soundService.playWin();

            // End session and check for achievements
            const playerWon = player.id === players[0].id; // Assume first player is human
            const updatedStats = statsService.endSession(playerWon);
            setStats(updatedStats);

            // Check for newly unlocked achievements
            const newlyUnlocked = updatedStats.achievements.find(
              a => a.unlockedAt && (!stats.achievements.find(sa => sa.id === a.id)?.unlockedAt)
            );
            if (newlyUnlocked) {
              setNewAchievement(newlyUnlocked);
            }
        } else {
            handleNextTurn();
        }
    } else {
        soundService.playIncorrect();
        const newDiscard = [card, ...discardPile];
        setDiscardPile(newDiscard);

        if (deck.length > 0) {
            const [drawnCard, ...remainingDeck] = deck;
            setDeck(remainingDeck);
            const handWithDrawnCard = [...newHand, drawnCard];
            setPlayers(players.map(p => p.id === player.id ? { ...p, hand: handWithDrawnCard } : p));

            const deckEl = document.getElementById('deck-container');
            const handEl = document.getElementById(player.isAI ? 'ai-hand-container' : 'player-hand-container');
            if (deckEl && handEl) {
                const fromRect = deckEl.getBoundingClientRect();
                const toRect = handEl.getBoundingClientRect();
                setAnimation({
                    key: Date.now() + 1,
                    card: { ...drawnCard, imageUrl: CARD_BACK_URL },
                    fromRect,
                    toRect: new DOMRect(
                        toRect.right - fromRect.width - 16,
                        toRect.top,
                        fromRect.width,
                        fromRect.height
                    ),
                    type: 'draw',
                    onComplete: () => {
                        setAnimation(null);
                        handleNextTurn();
                    },
                });
            } else {
                handleNextTurn();
            }
        } else {
            setPlayers(players.map(p => p.id === player.id ? { ...p, hand: newHand } : p));
            handleNextTurn();
        }
    }
  };

  const handleAttemptPlaceCard = (
    card: CardType,
    timelineIndex: number,
    cardEl: HTMLElement,
    slotEl: HTMLElement,
    discardEl: HTMLElement
  ) => {
    if (animation) return;

    let isCorrect = false;
    const prevCard = timeline[timelineIndex - 1];
    const nextCard = timeline[timelineIndex];

    if (!prevCard && nextCard) isCorrect = card.year < nextCard.year;
    else if (prevCard && !nextCard) isCorrect = card.year > prevCard.year;
    else if (prevCard && nextCard) isCorrect = card.year > prevCard.year && card.year < nextCard.year;

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setTimeout(() => setFeedback(null), 1500);

    const fromRect = cardEl.getBoundingClientRect();
    const toRect = isCorrect ? slotEl.getBoundingClientRect() : discardEl.getBoundingClientRect();

    setHidingCardId(card.id);

    const onPlacementComplete = () => {
      setHidingCardId(null);
      handlePlacementResult(currentPlayer, card, isCorrect, timelineIndex);
    };

    setAnimation({
      key: Date.now(),
      card: card,
      fromRect: fromRect,
      toRect: toRect,
      type: isCorrect ? 'placement' : 'discard',
      onComplete: () => {
        setAnimation(null);
        onPlacementComplete();
      }
    });
  };

  const decideAIMove = (): { card: CardType; timelineIndex: number } | null => {
    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.hand.length === 0) return null;

    const aiPlayer = currentPlayer;
    const correctMoves: { card: CardType, timelineIndex: number }[] = [];

    for (const card of aiPlayer.hand) {
        for (let i = 0; i <= timeline.length; i++) {
            const prevCard = timeline[i - 1];
            const nextCard = timeline[i];
            let isCorrectPlacement = false;

            if (!prevCard && nextCard) isCorrectPlacement = card.year < nextCard.year;
            else if (prevCard && !nextCard) isCorrectPlacement = card.year > prevCard.year;
            else if (prevCard && nextCard) isCorrectPlacement = card.year > prevCard.year && card.year < nextCard.year;

            if (isCorrectPlacement) {
                correctMoves.push({ card, timelineIndex: i });
            }
        }
    }

    const MISTAKE_CHANCE = 0.3;
    const shouldMakeMistake = Math.random() < MISTAKE_CHANCE;

    if (correctMoves.length > 0 && !shouldMakeMistake) {
        return correctMoves[Math.floor(Math.random() * correctMoves.length)];
    } else {
        const randomCard = aiPlayer.hand[Math.floor(Math.random() * aiPlayer.hand.length)];
        const randomTimelineIndex = Math.floor(Math.random() * (timeline.length + 1));
        return { card: randomCard, timelineIndex: randomTimelineIndex };
    }
  };

  const handleAITurn = () => {
    setMessage(`Turno de ${currentPlayer.name}...`);
    setIsAITurnMessageVisible(true);

    setTimeout(() => {
      const move = decideAIMove();
      if (!move) return;

      setRevealedAICard(move.card);
      soundService.playClick();

      setTimeout(() => {
          setRevealedAICard(null);
          setAiMove(move);
      }, 1500);
    }, 1000);
  };

  useEffect(() => {
    if (gamePhase === GamePhase.PLAYING && currentPlayer?.isAI && !winner && !animation && !aiMove && !revealedAICard) {
      handleAITurn();
    }
  }, [gamePhase, currentPlayer, winner, animation, aiMove, revealedAICard]);

  useEffect(() => {
    if (!aiMove || animation) return;

    const { card, timelineIndex } = aiMove;
    const aiHandEl = document.getElementById('ai-hand-container');
    const deckEl = document.getElementById('deck-container');

    if (!aiHandEl || !deckEl) {
        setAiMove(null);
        return;
    }

    const handRect = aiHandEl.getBoundingClientRect();
    const cardRect = deckEl.getBoundingClientRect();

    const fromRect = new DOMRect(
      handRect.left + (handRect.width / 2) - (cardRect.width / 2),
      handRect.top,
      cardRect.width,
      cardRect.height
    );

    let isCorrect = false;
    const prevCard = timeline[timelineIndex - 1];
    const nextCard = timeline[timelineIndex];
    if (!prevCard && nextCard) isCorrect = card.year < nextCard.year;
    else if (prevCard && !nextCard) isCorrect = card.year > prevCard.year;
    else if (prevCard && nextCard) isCorrect = card.year > prevCard.year && card.year < nextCard.year;

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setTimeout(() => setFeedback(null), 1500);

    const targetElId = isCorrect ? `timeline-slot-${timelineIndex}` : 'discard-pile-container';
    const targetEl = document.getElementById(targetElId);

    if (!targetEl) {
        setAiMove(null);
        return;
    }
    const toRect = targetEl.getBoundingClientRect();

    setAnimation({
        key: Date.now(),
        card,
        fromRect,
        toRect,
        type: isCorrect ? 'placement' : 'discard',
        onComplete: () => {
            setAnimation(null);
            handlePlacementResult(currentPlayer, card, isCorrect, timelineIndex);
        }
    });
    setAiMove(null);
  }, [aiMove, animation, timeline, currentPlayer]);

  const startGame = (playerNames: string[], withAI: boolean) => {
    const selectedDeck = deckService.getDeckById(selectedDeckId);
    if (!selectedDeck) return;

    const shuffledDeck = shuffleArray(selectedDeck.cards);
    const initialTimelineCard = shuffledDeck.pop();
    if (!initialTimelineCard) return;

    const newPlayers: Player[] = playerNames.map((name, index) => ({
      id: `player-${index}-${Date.now()}`,
      name,
      hand: [],
      isAI: withAI && index > 0,
    }));

    for (let i = 0; i < 4; i++) {
      for (const player of newPlayers) {
        const card = shuffledDeck.pop();
        if (card) player.hand.push(card);
      }
    }

    setPlayers(newPlayers);
    setDeck(shuffledDeck);
    setTimeline([initialTimelineCard]);
    setDiscardPile([]);
    setCurrentPlayerIndex(0);
    setWinner(null);
    setMessage(`Es el turno de ${newPlayers[0].name}.`);
    setGamePhase(GamePhase.PLAYING);

    // Start stats session
    statsService.startSession(selectedDeckId);
  };

  const handleSelectMode = (mode: 'local' | 'ai' | 'online') => {
    setGameMode(mode);
    if (mode === 'online') {
      setGamePhase(GamePhase.SETUP);
    } else {
      setShowDeckSelector(true);
    }
  };

  const handleDeckSelected = (deckId: string) => {
    setSelectedDeckId(deckId);
    setShowDeckSelector(false);
    setGamePhase(GamePhase.SETUP);
  };

  const handleStartLocalGame = (playerNames: string[]) => {
    startGame(playerNames, false);
  };

  const handleStartAIGame = (playerNames: string[]) => {
    startGame(playerNames, true);
  };

  const handleRestart = () => {
    setGamePhase(GamePhase.MENU);
    setGameMode(null);
    setOnlineGameState(null);
    setLocalPlayerId(null);
    gameService.disconnect();
    setStats(statsService.loadStats());
  };

  const handleJoinLobby = async (playerName: string, gameId?: string) => {
    setLocalPlayerId(null);
    if (gameId) {
        const result = await gameService.joinGame(gameId, playerName);
        if (result.success && result.playerId) {
            setLocalPlayerId(result.playerId);
            gameService.subscribeToGame(gameId, setOnlineGameState);
            setGamePhase(GamePhase.LOBBY);
        } else {
            throw new Error(result.error || "Failed to join");
        }
    } else {
        const result = await gameService.createGame(playerName);
        setLocalPlayerId(result.playerId);
        gameId = result.gameId;
        gameService.subscribeToGame(gameId, setOnlineGameState);
        setGamePhase(GamePhase.LOBBY);
    }
  };

  const handleStartOnlineGame = (gameId: string) => {
    if (localPlayerId) gameService.startGame(gameId, localPlayerId);
  }

  const handleAddBotOnline = (gameId: string) => {
    if (localPlayerId) gameService.addBot(gameId, localPlayerId);
  }

  const handlePlaceCardOnline = (card: CardType, timelineIndex: number) => {
    if (onlineGameState && localPlayerId) {
      gameService.placeCard(onlineGameState.id, localPlayerId, card.id, timelineIndex);
    }
  }

  useEffect(() => {
    if(onlineGameState?.phase === OnlineGamePhase.PLAYING) setGamePhase(GamePhase.PLAYING);
    if(onlineGameState?.phase === OnlineGamePhase.GAME_OVER) setGamePhase(GamePhase.GAME_OVER);
  }, [onlineGameState?.phase])

  const renderContent = () => {
    if (showDeckSelector) {
      return (
        <DeckSelector
          onSelectDeck={handleDeckSelected}
          onBack={() => {
            setShowDeckSelector(false);
            setGameMode(null);
          }}
        />
      );
    }

    switch (gamePhase) {
      case GamePhase.MENU:
        return (
          <MainMenuEnhanced
            onSelectMode={handleSelectMode}
            onShowStats={() => setShowStats(true)}
            onShowTutorial={() => setShowTutorial(true)}
          />
        );
      case GamePhase.SETUP:
        if (gameMode === 'local') return <GameSetup onStartGame={handleStartLocalGame} />;
        if (gameMode === 'ai') return <AISetup onStartGame={handleStartAIGame} />;
        if (gameMode === 'online') return <OnlineSetup onJoinLobby={handleJoinLobby} />;
        return null;
      case GamePhase.LOBBY:
        return onlineGameState && localPlayerId ? (
          <OnlineLobby
            gameState={onlineGameState}
            localPlayerId={localPlayerId}
            onStartGame={handleStartOnlineGame}
            onAddBot={handleAddBotOnline}
          />
        ) : <div>Cargando...</div>
      case GamePhase.PLAYING:
        if (gameMode === 'online') {
            return onlineGameState && localPlayer ? (
              <GameBoard
                players={onlineGameState.players}
                currentPlayer={onlineGameState.players[onlineGameState.currentPlayerIndex]}
                timeline={onlineGameState.timeline}
                deckSize={onlineGameState.deck.length}
                topOfDeck={onlineGameState.deck[onlineGameState.deck.length -1] || null}
                discardPile={onlineGameState.discardPile}
                message={onlineGameState.message}
                onAttemptPlaceCard={() => {}}
                onPlaceCardOnline={handlePlaceCardOnline}
                gameMode={gameMode}
                localPlayer={localPlayer}
                isAnimating={!!animation}
                revealedAICard={null}
              />
            ) : <div>Sincronizando partida online...</div>
        }
        return currentPlayer ? (
          <GameBoard
            players={players}
            currentPlayer={currentPlayer}
            timeline={timeline}
            onAttemptPlaceCard={handleAttemptPlaceCard}
            deckSize={deck.length}
            topOfDeck={deck[deck.length - 1] || null}
            discardPile={discardPile}
            message={message}
            revealedAICard={revealedAICard}
            gameMode={gameMode}
            hidingCardId={hidingCardId}
            isAnimating={!!animation}
          />
        ) : <div>Cargando...</div>;
      case GamePhase.TRANSITION:
        return <TurnTransition playerName={currentPlayer.name} onContinue={() => setGamePhase(GamePhase.PLAYING)} />;
      case GamePhase.GAME_OVER:
        const finalWinner = gameMode === 'online' ? onlineGameState?.winner : winner;
        return finalWinner ? <GameOver winner={finalWinner} onRestart={handleRestart} /> : <div>Cargando...</div>;
      default:
        return <div>Error: Unknown game phase.</div>;
    }
  };

  const showPlayerStatus = gamePhase === GamePhase.PLAYING && (gameMode === 'local' || gameMode === 'ai');
  const showLogo = [GamePhase.MENU, GamePhase.SETUP, GamePhase.LOBBY].includes(gamePhase) && !showDeckSelector;

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center p-2 md:p-4 text-white font-sans overflow-hidden">
      {showPlayerStatus && currentPlayer && (
        <PlayerStatus players={players} currentPlayerId={currentPlayer.id} discardPileCount={discardPile.length} />
      )}

      {showLogo && (
        <img
          src={LOGO_URL}
          alt="JW Timeline Logo"
          className="w-56 md:w-72 mb-4 md:mb-8"
        />
      )}

      {renderContent()}

      {feedback && <FeedbackMessage type={feedback} />}
      {isAITurnMessageVisible && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="p-6 md:p-8 rounded-xl shadow-2xl text-white text-center bg-indigo-700/90 animate-pulse"
            role="status"
            aria-live="polite"
          >
            <p className="text-4xl md:text-5xl font-bold" style={{fontFamily: "'Trajan Pro', serif"}}>Turno de la IA</p>
          </div>
        </div>
      )}

      <AnimationLayerEnhanced animation={animation} />

      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
      {showTutorial && (
        <Tutorial
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}
      {newAchievement && (
        <AchievementNotification
          achievement={newAchievement}
          onClose={() => setNewAchievement(null)}
        />
      )}
    </div>
  );
};

export default AppEnhanced;
