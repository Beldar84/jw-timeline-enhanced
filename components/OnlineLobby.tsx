import React, { useState } from 'react';
import { GameState } from '../types';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — OnlineLobby premium (diseño 2e) · handoff/OnlineLobby.tsx
// Sustituye components/OnlineLobby.tsx. Misma API de props.
// Panel de pergamino, código en grande estilo letterpress,
// lista de jugadores con divisores, botones dorados.
// Requiere public/premium.css (.parchment-panel, .btn-gold…).
// ============================================================

interface OnlineLobbyProps {
  gameState: GameState;
  localPlayerId: string;
  onStartGame: (gameId: string) => void;
  onAddBot: (gameId: string) => void;
  onBack: () => void;
}

const OnlineLobby: React.FC<OnlineLobbyProps> = ({ gameState, localPlayerId, onStartGame, onAddBot, onBack }) => {
  const [copied, setCopied] = useState(false);
  const isHost = gameState.hostId === localPlayerId;
  const canStart = gameState.players.length >= 2;

  const handleCopy = () => {
    soundService.playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gameState.id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      alert('No se pudo copiar el ID. Por favor, cópielo manualmente.');
    }
  };

  const handleAddBotClick = () => { soundService.playClick(); onAddBot(gameState.id); };
  const handleStartGameClick = () => { soundService.playClick(); onStartGame(gameState.id); };
  const handleBack = () => { soundService.playClick(); onBack(); };

  return (
    <div className="parchment-panel w-full max-w-lg px-8 md:px-11 py-9 text-center max-h-[85vh] overflow-y-auto">
      <h2 className="font-display font-bold text-2xl md:text-[26px] tracking-wider mb-2" style={{ color: 'var(--ink)' }}>
        Sala de espera
      </h2>
      <p className="font-body italic text-base mb-7" style={{ color: 'var(--gold-dark)' }}>
        Comparte el código para que otros se unan. El anfitrión inicia la partida.
      </p>

      <p className="font-display text-xs tracking-[.14em] mb-1.5" style={{ color: '#a08a5c' }}>CÓDIGO DE PARTIDA</p>
      <div className="flex items-center justify-center gap-3 mb-7">
        <p className="font-display font-bold text-3xl md:text-4xl select-all"
          style={{ color: 'var(--ink)', letterSpacing: '.28em', textIndent: '.28em' }}>
          {gameState.id}
        </p>
        <button onClick={handleCopy} title={copied ? '¡Copiado!' : 'Copiar código'}
          className="w-10 h-10 flex items-center justify-center rounded-sm cursor-pointer flex-shrink-0"
          style={{ background: copied ? 'rgba(201,162,39,.2)' : 'none', border: '1px solid rgba(120,94,48,.35)' }}>
          {copied ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8a6a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4 10-10" /></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8a6a2a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(120,94,48,.25)' }}></div>
        <span className="font-display text-xs tracking-[.14em]" style={{ color: '#a08a5c' }}>
          JUGADORES · {gameState.players.length} DE 6
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(120,94,48,.25)' }}></div>
      </div>
      <ul className="flex flex-col mb-7 min-h-[100px] list-none m-0 p-0">
        {gameState.players.map((player, i) => (
          <li key={player.id} className="flex items-center justify-between py-2.5 px-1.5"
            style={{ borderBottom: i < gameState.players.length - 1 ? '1px solid rgba(120,94,48,.18)' : 'none' }}>
            <span className="font-body text-lg" style={{ color: 'var(--ink)', fontWeight: player.id === gameState.hostId ? 600 : 400 }}>
              {player.name}
            </span>
            <span className="flex gap-2">
              {player.isAI && (
                <span className="font-display text-[11px] tracking-[.12em] px-2.5 py-0.5 rounded-sm"
                  style={{ color: '#5c4a28', border: '1px solid rgba(120,94,48,.4)' }}>IA</span>
              )}
              {player.id === gameState.hostId && (
                <span className="font-display text-[11px] tracking-[.12em] px-2.5 py-0.5 rounded-sm"
                  style={{ color: '#8a6a2a', border: '1px solid #a8853c', background: 'rgba(201,162,39,.12)' }}>ANFITRIÓN</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isHost ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleStartGameClick}
            disabled={!canStart}
            title={!canStart ? 'Se necesitan al menos 2 jugadores para empezar' : ''}
            className="btn-gold w-full py-4 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            EMPEZAR PARTIDA
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleAddBotClick}
              disabled={gameState.players.length >= 6}
              className="flex-1 py-3 text-[13px] font-display tracking-wider rounded-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'none', color: '#5c4a28', border: '1px solid rgba(120,94,48,.35)' }}
            >
              AÑADIR JUGADOR IA
            </button>
            <button
              onClick={handleBack}
              className="flex-1 py-3 text-[13px] font-display tracking-wider rounded-sm cursor-pointer"
              style={{ background: 'none', color: '#a08a5c', border: '1px solid rgba(120,94,48,.25)' }}
            >
              VOLVER AL MENÚ
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-body italic text-base" style={{ color: 'var(--gold-dark)' }}>
            Esperando a que el anfitrión inicie la partida…
          </p>
          <button
            onClick={handleBack}
            className="w-full py-3 text-[13px] font-display tracking-wider rounded-sm cursor-pointer"
            style={{ background: 'none', color: '#a08a5c', border: '1px solid rgba(120,94,48,.25)' }}
          >
            VOLVER AL MENÚ
          </button>
        </div>
      )}
    </div>
  );
};

export default OnlineLobby;
