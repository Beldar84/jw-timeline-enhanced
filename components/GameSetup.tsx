import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';

// ============================================================
// JW Timeline — GameSetup premium
// Pantalla «Configurar partida» con estética pergamino/dorado
// (Cinzel + EB Garamond). Misma API de props que el original.
// ============================================================

interface GameSetupProps {
  onStartGame: (playerNames: string[]) => void;
  onBack: () => void;
}

const GoldRule: React.FC = () => (
  <div className="flex items-center justify-center gap-3.5 my-3" aria-hidden="true">
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to right, transparent, #c9a227)' }}></div>
    <div style={{ width: 7, height: 7, transform: 'rotate(45deg)', background: '#c9a227' }}></div>
    <div style={{ width: 70, height: 1, background: 'linear-gradient(to left, transparent, #c9a227)' }}></div>
  </div>
);

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, onBack }) => {
  const [players, setPlayers] = useState(['Jugador 1', 'Jugador 2']);

  // Cargar el nombre del perfil para el jugador 1
  useEffect(() => {
    const savedName = profileService.getName();
    if (savedName && savedName !== 'Jugador') {
      setPlayers(prev => [savedName, ...prev.slice(1)]);
    }
  }, []);

  const handleAddPlayer = () => {
    soundService.playClick();
    if (players.length < 6) {
      setPlayers([...players, `Jugador ${players.length + 1}`]);
    }
  };

  const handleRemovePlayer = (index: number) => {
    soundService.playClick();
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newPlayers = [...players];
    newPlayers[index] = name;
    setPlayers(newPlayers);
  };

  const handleStart = () => {
    soundService.playClick();
    const validPlayers = players.filter(p => p.trim() !== '');
    if (validPlayers.length >= 2) {
      onStartGame(validPlayers);
    }
  };

  const canStart = players.filter(p => p.trim() !== '').length >= 2;

  return (
    <div className="parchment-panel w-full max-w-md px-6 md:px-10 py-8">
      <h2 className="font-display font-bold text-2xl md:text-[26px] text-center tracking-wider m-0" style={{ color: 'var(--ink)' }}>
        Configurar partida
      </h2>
      <GoldRule />
      <p className="font-body italic text-base text-center m-0 mb-6" style={{ color: 'var(--gold-dark)' }}>
        De 2 a 6 jugadores en este dispositivo
      </p>

      <label className="block font-display text-xs tracking-widest mb-2" style={{ color: '#a08a5c' }}>
        JUGADORES
      </label>
      <div className="space-y-3 mb-4">
        {players.map((player, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={player}
              onChange={(e) => handlePlayerNameChange(index, e.target.value)}
              placeholder={`Jugador ${index + 1}`}
              style={inputStyle}
            />
            <button
              onClick={() => handleRemovePlayer(index)}
              disabled={players.length <= 2}
              aria-label={`Quitar a ${player || `Jugador ${index + 1}`}`}
              className="flex-shrink-0 w-[44px] h-[44px] rounded-sm font-display text-xl leading-none transition disabled:opacity-35 disabled:cursor-not-allowed"
              style={{ border: '1px solid rgba(120,94,48,.4)', color: '#5c4a28', background: 'rgba(201,162,39,.08)' }}
            >
              &ndash;
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddPlayer}
        disabled={players.length >= 6}
        className="w-full py-2.5 mb-7 rounded-sm font-display text-xs tracking-widest transition disabled:opacity-35 disabled:cursor-not-allowed"
        style={{ border: '1px dashed rgba(120,94,48,.5)', color: '#5c4a28', background: 'none' }}
      >
        + AÑADIR JUGADOR
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => { soundService.playClick(); onBack(); }}
          className="btn-outline-gold flex-1 py-3 text-sm"
          style={{ borderColor: 'rgba(120,94,48,.5)', color: '#5c4a28' }}
        >
          VOLVER
        </button>
        <button
          onClick={handleStart}
          disabled={!canStart}
          className="btn-gold flex-[2] py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          EMPEZAR PARTIDA
        </button>
      </div>
    </div>
  );
};

export default GameSetup;
