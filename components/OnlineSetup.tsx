import React, { useState } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { firebaseService } from '../services/firebaseService';

export type OnlineGameMode = 'realtime' | 'turnbased';

// ============================================================
// JW Timeline — OnlineSetup premium (diseño 4b)
// Sustituye components/OnlineSetup.tsx. Misma API y lógica
// (selección de modo → tiempo real con nombre + código JW-,
// o por turnos con lista de amigos). Estilo pergamino.
// Requiere public/premium.css.
// ============================================================

interface OnlineSetupProps {
  onJoinLobby: (playerName: string, gameId?: string) => Promise<void>;
  onStartTurnBased?: (opponentId: string) => Promise<void>;
  onBack: () => void;
}

const normalizeGameCodeSuffix = (value: string): string =>
  value.trim().toUpperCase().replace(/\s+/g, '').replace(/^JW-?/, '').replace(/[^A-Z0-9]/g, '').slice(0, 6);

const stroke = '#8a6a2a';
const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8853c" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
);

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

const OnlineSetup: React.FC<OnlineSetupProps> = ({ onJoinLobby, onStartTurnBased, onBack }) => {
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
    if (!trimmedPlayerName) return;
    setIsLoading(true);
    try {
      const normalizedSuffix = normalizeGameCodeSuffix(gameIdSuffix.trim());
      const gameIdToUse = normalizedSuffix ? `JW-${normalizedSuffix}` : undefined;
      await onJoinLobby(trimmedPlayerName, gameIdToUse);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'No se pudo conectar. Verifica tu conexión o el ID de la partida.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    soundService.playClick();
    if (gameMode) setGameMode(null);
    else onBack();
  };

  const isJoiningGame = normalizeGameCodeSuffix(gameIdSuffix).length > 0;
  const buttonText = isLoading ? 'CONECTANDO…' : (isJoiningGame ? 'UNIRSE A LA SALA' : 'CREAR SALA');

  const ErrorBox = error ? (
    <p className="font-body italic text-sm text-center m-0 mb-4 px-4 py-2.5"
      style={{ border: '1px solid rgba(160,80,60,.5)', background: 'rgba(160,80,60,.1)', color: '#8a4a3a' }}>
      {error}
    </p>
  ) : null;

  // ── Selección de modo ──
  if (!gameMode) {
    return (
      <div className="parchment-panel w-full max-w-md px-9 md:px-10 py-8">
        <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Jugar online</h2>
        <p className="font-body italic text-base text-center m-0 mb-5" style={{ color: 'var(--gold-dark)' }}>¿Cómo quieres jugar?</p>

        <button onClick={() => handleSelectMode('realtime')}
          className="flex items-center gap-4 w-full py-[18px] px-1 text-left cursor-pointer transition-colors hover:bg-[rgba(201,162,39,.1)]"
          style={{ background: 'none', border: 'none', borderBottom: '1px solid rgba(120,94,48,.2)' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z" /></svg>
          <span className="flex-1">
            <span className="block font-display font-semibold text-lg tracking-wide" style={{ color: 'var(--ink)' }}>Tiempo real</span>
            <span className="block font-body text-[14.5px]" style={{ color: '#7c6a48' }}>Juega en vivo con otro jugador</span>
          </span>
          <Chevron />
        </button>
        <button onClick={() => handleSelectMode('turnbased')} disabled={!isLoggedIn}
          className="flex items-center gap-4 w-full py-[18px] px-1 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors hover:bg-[rgba(201,162,39,.1)]"
          style={{ background: 'none', border: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h10M7 21h10M8 3c0 4 3 5.5 4 6.5 1-1 4-2.5 4-6.5M8 21c0-4 3-5.5 4-6.5 1 1 4 2.5 4 6.5" /></svg>
          <span className="flex-1">
            <span className="block font-display font-semibold text-lg tracking-wide" style={{ color: 'var(--ink)' }}>Por turnos</span>
            <span className="block font-body text-[14.5px]" style={{ color: '#7c6a48' }}>
              {isLoggedIn ? 'A tu ritmo · 24 horas por turno' : 'Requiere iniciar sesión'}
            </span>
          </span>
          <Chevron />
        </button>

        {!isLoggedIn && (
          <p className="font-body italic text-[13.5px] text-center m-0 mt-3.5 mb-1" style={{ color: '#a08a5c' }}>
            Inicia sesión para jugar por turnos y desafiar a tus amigos
          </p>
        )}

        <button onClick={handleBack}
          className="w-full mt-4 py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          VOLVER
        </button>
      </div>
    );
  }

  // ── Por turnos ──
  if (gameMode === 'turnbased') {
    return <TurnBasedSetup onBack={handleBack} onStartTurnBased={onStartTurnBased} />;
  }

  // ── Tiempo real ──
  return (
    <div className="parchment-panel w-full max-w-md px-9 md:px-10 py-8">
      <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Tiempo real</h2>
      <p className="font-body italic text-[15px] text-center m-0 mb-5" style={{ color: '#a08a5c' }}>Sala sincronizada en la nube</p>

      {ErrorBox}

      <label htmlFor="player-name" className="block font-display text-xs tracking-widest mb-1.5" style={{ color: '#a08a5c' }}>TU NOMBRE</label>
      <input id="player-name" type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Tu nombre" disabled={isLoading} style={inputStyle} className="mb-4" />

      <label htmlFor="game-id" className="block font-display text-xs tracking-widest mb-1.5" style={{ color: '#a08a5c' }}>ID DE PARTIDA (OPCIONAL)</label>
      <div className="flex mb-1">
        <span className="inline-flex items-center px-3 font-display font-bold text-[15px]"
          style={{ background: 'rgba(201,162,39,.14)', color: '#5c4a28', border: '1px solid rgba(120,94,48,.4)', borderRight: 'none', borderRadius: '3px 0 0 3px' }}>
          JW-
        </span>
        <input id="game-id" type="text" value={gameIdSuffix}
          onChange={(e) => setGameIdSuffix(normalizeGameCodeSuffix(e.target.value))}
          placeholder="A7K9Q2" disabled={isLoading} maxLength={6}
          style={{ ...inputStyle, borderRadius: '0 3px 3px 0', letterSpacing: '.15em' }} />
      </div>
      <p className="font-body italic text-[13px] m-0 mb-6" style={{ color: '#a08a5c' }}>Si lo dejas vacío se creará un código nuevo.</p>

      <div className="flex gap-3">
        <button onClick={handleBack} disabled={isLoading}
          className="flex-1 py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer disabled:opacity-50 transition-colors"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          VOLVER
        </button>
        <button onClick={handleStart} disabled={!playerName.trim() || isLoading}
          className="btn-gold flex-1 py-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
          {buttonText}
        </button>
      </div>
    </div>
  );
};

// ── Configuración de partida por turnos ──
interface TurnBasedSetupProps {
  onBack: () => void;
  onStartTurnBased?: (opponentId: string) => Promise<void>;
}

const TurnBasedSetup: React.FC<TurnBasedSetupProps> = ({ onBack }) => {
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
    } catch {
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
        alert(`¡Partida creada! ${friendName} recibirá una notificación.`);
        onBack();
      } else {
        setError('Error al crear la partida');
        soundService.playIncorrect();
      }
    } catch {
      setError('Error al crear la partida');
      soundService.playIncorrect();
    } finally {
      setCreating(null);
    }
  };

  return (
    <div className="parchment-panel w-full max-w-md px-9 md:px-10 py-8">
      <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Por turnos</h2>
      <p className="font-body italic text-[15px] text-center m-0 mb-5" style={{ color: '#a08a5c' }}>Elige un amigo para desafiar</p>

      {error && (
        <p className="font-body italic text-sm text-center m-0 mb-4 px-4 py-2.5"
          style={{ border: '1px solid rgba(160,80,60,.5)', background: 'rgba(160,80,60,.1)', color: '#8a4a3a' }}>
          {error}
        </p>
      )}

      <div className="mb-6">
        {loading ? (
          <p className="font-body italic text-center text-base py-8 m-0" style={{ color: '#a08a5c' }}>Cargando amigos…</p>
        ) : friends.length === 0 ? (
          <p className="font-body italic text-center text-base py-6 m-0" style={{ color: '#a08a5c' }}>
            No tienes amigos todavía.<br />Añade amigos desde el menú principal.
          </p>
        ) : (
          <div className="flex flex-col max-h-60 overflow-y-auto">
            {friends.map((friend, i) => (
              <div key={friend.id} className="flex items-center gap-3 py-3 px-1"
                style={{ borderBottom: i < friends.length - 1 ? '1px solid rgba(120,94,48,.18)' : 'none' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm flex-shrink-0"
                  style={{ border: '1.5px solid #a8853c', background: 'rgba(201,162,39,.12)', color: '#5c4a28' }}>
                  {friend.name.charAt(0).toUpperCase()}
                </div>
                <p className="flex-1 min-w-0 font-body font-semibold text-[17px] truncate m-0" style={{ color: 'var(--ink)' }}>
                  {friend.name}
                </p>
                <button onClick={() => handleChallengeFriend(friend.id, friend.name)} disabled={creating === friend.id}
                  className="font-display text-[11px] font-semibold tracking-wider px-3.5 py-2 rounded-sm cursor-pointer disabled:opacity-50"
                  style={{ background: 'rgba(201,162,39,.14)', border: '1px solid #a8853c', color: '#5c4a28' }}>
                  {creating === friend.id ? '…' : 'DESAFIAR'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={onBack}
        className="w-full py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors"
        style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
        VOLVER
      </button>
    </div>
  );
};

export default OnlineSetup;
