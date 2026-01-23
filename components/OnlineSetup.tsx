import React, { useState } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { firebaseService } from '../services/firebaseService';

export type OnlineGameMode = 'realtime' | 'turnbased';

interface OnlineSetupProps {
  onJoinLobby: (playerName: string, gameId?: string) => Promise<void>;
  onStartTurnBased?: (opponentId: string) => Promise<void>;
  onBack: () => void;
}

const OnlineSetup: React.FC<OnlineSetupProps> = ({ onJoinLobby, onStartTurnBased, onBack }) => {
  // Cargar el nombre del perfil guardado
  const savedProfile = profileService.getProfile();
  const [playerName, setPlayerName] = useState(savedProfile?.name || '');
  const [gameIdSuffix, setGameIdSuffix] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<OnlineGameMode | null>(null);

  const isLoggedIn = firebaseService.isRegisteredUser();

  const handleSelectMode = (mode: OnlineGameMode) => {
    soundService.playClick();
    setGameMode(mode);
    setError(null);
  };

  const handleStart = async () => {
    soundService.playClick();
    setError(null);
    const trimmedPlayerName = playerName.trim();
    const trimmedGameIdSuffix = gameIdSuffix.trim();

    if (trimmedPlayerName) {
      setIsLoading(true);
      try {
        // Si el sufijo está vacío, crear sala nueva; si tiene valor, unirse a JW-{sufijo}
        const gameIdToUse = trimmedGameIdSuffix ? `JW-${trimmedGameIdSuffix}` : undefined;
        await onJoinLobby(trimmedPlayerName, gameIdToUse);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "No se pudo conectar. Verifica tu conexión o el ID de la partida.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    soundService.playClick();
    if (gameMode) {
      setGameMode(null);
    } else {
      onBack();
    }
  };

  // Si el sufijo tiene contenido, es unirse a una sala
  const isJoiningGame = gameIdSuffix.trim().length > 0;
  const buttonText = isLoading
    ? 'Conectando...'
    : (isJoiningGame ? 'Unirse a la Sala' : 'Crear Sala');

  // Pantalla de selección de modo
  if (!gameMode) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto w-full max-w-md">
        <h2 className="text-xl md:text-3xl font-bold text-yellow-300 mb-4 md:mb-6 text-center">Jugar Online</h2>
        <p className="text-gray-300 text-center mb-6">¿Cómo quieres jugar?</p>

        <div className="w-full space-y-4 mb-6">
          {/* Tiempo Real */}
          <button
            onClick={() => handleSelectMode('realtime')}
            className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl transition transform hover:scale-105 text-left"
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">⚡</span>
              <div>
                <h3 className="text-xl font-bold text-white">Tiempo Real</h3>
                <p className="text-sm text-purple-200">Juega en vivo con otro jugador</p>
                <p className="text-xs text-gray-300 mt-1">Conexión P2P directa</p>
              </div>
            </div>
          </button>

          {/* Por Turnos */}
          <button
            onClick={() => handleSelectMode('turnbased')}
            disabled={!isLoggedIn}
            className={`w-full p-4 rounded-xl transition transform text-left ${
              isLoggedIn
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 hover:scale-105'
                : 'bg-gray-600 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-4xl">🕐</span>
              <div>
                <h3 className="text-xl font-bold text-white">Por Turnos</h3>
                <p className="text-sm text-orange-200">Juega a tu ritmo, sin prisa</p>
                <p className="text-xs text-gray-300 mt-1">
                  {isLoggedIn ? '24 horas por turno' : '🔐 Requiere iniciar sesión'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {!isLoggedIn && (
          <p className="text-xs text-gray-400 text-center mb-4">
            Inicia sesión para jugar partidas por turnos y desafiar a tus amigos
          </p>
        )}

        <button
          onClick={handleBack}
          className="w-full px-6 py-3 bg-gray-600 text-lg font-bold rounded-lg hover:bg-gray-700 transition"
        >
          Volver
        </button>
      </div>
    );
  }

  // Si eligió Por Turnos y está logueado
  if (gameMode === 'turnbased') {
    return (
      <TurnBasedSetup
        playerName={playerName}
        onBack={handleBack}
        onStartTurnBased={onStartTurnBased}
      />
    );
  }

  // Pantalla de Tiempo Real (configuración existente)
  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto w-full max-w-md">
      <h2 className="text-xl md:text-3xl font-bold text-yellow-300 mb-2 text-center">⚡ Tiempo Real</h2>
      <p className="text-gray-400 text-sm mb-4">Conexión P2P directa</p>

      {error && (
        <div className="bg-red-500/80 text-white p-2 md:p-3 rounded mb-3 md:mb-4 text-xs md:text-sm w-full text-center">
          {error}
        </div>
      )}

      <div className="w-full space-y-3 md:space-y-4 mb-4 md:mb-6">
        <div>
          <label htmlFor="player-name" className="block text-xs md:text-sm font-medium text-yellow-100 mb-1">Tu nombre</label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full bg-gray-700 text-white p-2.5 md:p-3 rounded-lg border-2 border-gray-600 focus:border-yellow-400 focus:outline-none transition text-sm md:text-base"
            placeholder="Tu nombre"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="game-id" className="block text-xs md:text-sm font-medium text-yellow-100 mb-1">ID de Partida (opcional)</label>
          <div className="flex">
            <span className="inline-flex items-center px-3 bg-gray-600 text-yellow-300 font-bold border-2 border-r-0 border-gray-600 rounded-l-lg text-sm md:text-base">
              JW-
            </span>
            <input
              id="game-id"
              type="text"
              value={gameIdSuffix}
              onChange={(e) => setGameIdSuffix(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-700 text-white p-2.5 md:p-3 rounded-r-lg border-2 border-l-0 border-gray-600 focus:border-yellow-400 focus:outline-none transition text-sm md:text-base"
              placeholder="1234"
              disabled={isLoading}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Si dejas vacío se creará un código nuevo.</p>
        </div>
      </div>

      <div className="flex gap-3 w-full space-y-0 pb-2">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 md:px-6 md:py-3 bg-gray-600 text-base md:text-lg font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Volver
        </button>
        <button
          onClick={handleStart}
          disabled={!playerName.trim() || isLoading}
          className="flex-1 px-4 py-2.5 md:px-8 md:py-4 bg-purple-600 text-base md:text-xl font-bold rounded-lg hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition transform hover:scale-105 flex justify-center items-center"
        >
          {isLoading && (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {buttonText}
        </button>
      </div>
    </div>
  );
};

// Componente para configurar partida por turnos
interface TurnBasedSetupProps {
  playerName: string;
  onBack: () => void;
  onStartTurnBased?: (opponentId: string) => Promise<void>;
}

const TurnBasedSetup: React.FC<TurnBasedSetupProps> = ({ playerName, onBack, onStartTurnBased }) => {
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsList = await firebaseService.getFriends();
      setFriends(friendsList);
    } catch (err) {
      setError('Error al cargar amigos');
    } finally {
      setLoading(false);
    }
  };

  const handleChallengeFriend = async (friendId: string, friendName: string) => {
    soundService.playClick();
    setCreating(friendId);
    setError(null);

    try {
      const result = await firebaseService.createTurnBasedGame(friendId);
      if (result.success) {
        soundService.playCorrect();
        // Mostrar mensaje de éxito
        setError(null);
        alert(`¡Partida creada! ${friendName} recibirá una notificación.`);
        onBack();
      } else {
        setError('Error al crear la partida');
        soundService.playIncorrect();
      }
    } catch (err) {
      setError('Error al crear la partida');
      soundService.playIncorrect();
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-gray-800/50 p-4 md:p-8 rounded-xl shadow-2xl backdrop-blur-sm max-h-[90vh] overflow-y-auto w-full max-w-md">
      <h2 className="text-xl md:text-3xl font-bold text-yellow-300 mb-2 text-center">🕐 Por Turnos</h2>
      <p className="text-gray-400 text-sm mb-4">Elige un amigo para desafiar</p>

      {error && (
        <div className="bg-red-500/80 text-white p-2 md:p-3 rounded mb-3 md:mb-4 text-xs md:text-sm w-full text-center">
          {error}
        </div>
      )}

      <div className="w-full mb-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="animate-spin text-4xl">⏳</span>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <p className="text-4xl mb-2">👥</p>
            <p>No tienes amigos todavía</p>
            <p className="text-sm mt-2">Añade amigos desde el menú principal</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
              >
                <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{friend.name}</p>
                </div>
                <button
                  onClick={() => handleChallengeFriend(friend.id, friend.name)}
                  disabled={creating === friend.id}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                >
                  {creating === friend.id ? '...' : '⚔️ Desafiar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full px-6 py-3 bg-gray-600 text-lg font-bold rounded-lg hover:bg-gray-700 transition"
      >
        Volver
      </button>
    </div>
  );
};

export default OnlineSetup;
