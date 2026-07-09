import React, { useState, useEffect } from 'react';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { AI_DIFFICULTIES, AIDifficulty } from '../types';

// ============================================================
// JW Timeline — AISetup premium
// Sustituye components/AISetup.tsx. Misma API y lógica que la
// versión original (nombre + dificultad + modo estudio →
// onStartGame([jugador, botBíblico], dificultad, estudio)).
// Estilo pergamino. Requiere public/premium.css.
// ============================================================

// Nombres bíblicos para los bots de IA
const BIBLICAL_NAMES = [
  'David', 'Abigail', 'Ruth', 'Pablo', 'Sara', 'Abraham', 'Moisés', 'María',
  'José', 'Rebeca', 'Isaac', 'Raquel', 'Jacob', 'Lea', 'Samuel', 'Ana',
  'Daniel', 'Ester', 'Elías', 'Eliseo', 'Noé', 'Jonás', 'Pedro', 'Juan'
];

function getRandomBiblicalName(): string {
  return BIBLICAL_NAMES[Math.floor(Math.random() * BIBLICAL_NAMES.length)];
}

interface AISetupProps {
  onStartGame: (playerNames: string[], difficulty: AIDifficulty, isStudyMode: boolean) => void;
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

// Nivel de dificultad → estrellas (sustituye los emojis del diseño antiguo)
const DIFFICULTY_STARS: Record<AIDifficulty, string> = {
  easy: '★', normal: '★★', hard: '★★★', expert: '★★★★',
};

const AISetup: React.FC<AISetupProps> = ({ onStartGame, onBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('normal');
  const [isStudyMode, setIsStudyMode] = useState(false);

  useEffect(() => {
    const savedName = profileService.getName();
    if (savedName && savedName !== 'Jugador') {
      setPlayerName(savedName);
    } else {
      setPlayerName('Humano');
    }
  }, []);

  const handleStart = () => {
    soundService.playClick();
    const trimmedPlayerName = playerName.trim();
    if (trimmedPlayerName) {
      if (profileService.hasProfile()) {
        profileService.updateName(trimmedPlayerName);
      } else {
        profileService.createProfile(trimmedPlayerName);
      }
      profileService.updateLastPlayed();
      const aiName = getRandomBiblicalName();
      onStartGame([trimmedPlayerName, aiName], difficulty, isStudyMode);
    }
  };

  const handleDifficultySelect = (d: AIDifficulty) => {
    soundService.playClick();
    setDifficulty(d);
  };

  const handleStudyModeToggle = () => {
    soundService.playClick();
    setIsStudyMode(!isStudyMode);
  };

  const handleBack = () => {
    soundService.playClick();
    onBack();
  };

  return (
    <div className="parchment-panel w-full max-w-md px-9 md:px-10 py-8">
      <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Jugar contra IA</h2>
      <p className="font-body italic text-base text-center m-0 mb-5" style={{ color: 'var(--gold-dark)' }}>Elige tu rival</p>

      {/* Nombre del jugador */}
      <label htmlFor="ai-player-name" className="block font-display text-xs tracking-widest mb-1.5" style={{ color: '#a08a5c' }}>TU NOMBRE</label>
      <input id="ai-player-name" type="text" value={playerName} maxLength={20}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Tu nombre" style={inputStyle} className="mb-5" />

      {/* Dificultad */}
      <p className="font-display text-xs tracking-widest m-0 mb-2" style={{ color: '#a08a5c' }}>DIFICULTAD DE LA IA</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {AI_DIFFICULTIES.map((d) => {
          const selected = difficulty === d.id;
          return (
            <button key={d.id} onClick={() => handleDifficultySelect(d.id)}
              className="p-3 text-left cursor-pointer rounded-sm transition-colors"
              style={{
                border: selected ? '2px solid #a8853c' : '1px solid rgba(120,94,48,.3)',
                padding: selected ? '11px' : '12px',
                background: selected ? 'rgba(201,162,39,.12)' : 'none',
                boxShadow: selected ? '0 0 14px rgba(201,162,39,.18)' : 'none',
              }}>
              <span className="block font-display text-[11px] tracking-widest mb-0.5" style={{ color: '#8a6a2a' }}>{DIFFICULTY_STARS[d.id]}</span>
              <span className="block font-display font-semibold text-[15px]" style={{ color: 'var(--ink)' }}>{d.name}</span>
              <span className="block font-body text-[13px] leading-snug" style={{ color: '#7c6a48' }}>{d.description}</span>
            </button>
          );
        })}
      </div>

      {/* Modo estudio */}
      <button onClick={handleStudyModeToggle}
        className="flex items-center gap-3.5 w-full py-3.5 px-1 text-left cursor-pointer transition-colors hover:bg-[rgba(201,162,39,.08)]"
        style={{ background: 'none', border: 'none', borderTop: '1px solid rgba(120,94,48,.2)', borderBottom: '1px solid rgba(120,94,48,.2)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8a6a2a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c-2-1.5-4.5-2-8-2v16c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V3c-3.5 0-6 .5-8 2z" /><path d="M12 5v16" /></svg>
        <span className="flex-1">
          <span className="block font-display font-semibold text-[15px] tracking-wide" style={{ color: 'var(--ink)' }}>Modo estudio</span>
          <span className="block font-body text-[13.5px]" style={{ color: '#7c6a48' }}>Fechas visibles antes de colocar · sin penalización</span>
        </span>
        <span className="relative inline-block flex-shrink-0 rounded-full transition-colors"
          style={{
            width: 46, height: 25,
            background: isStudyMode ? 'rgba(201,162,39,.35)' : 'rgba(120,94,48,.15)',
            border: `1px solid ${isStudyMode ? '#a8853c' : 'rgba(120,94,48,.4)'}`,
          }}>
          <span className="absolute rounded-full transition-all"
            style={{
              top: 2, left: isStudyMode ? 22 : 2, width: 19, height: 19,
              background: isStudyMode ? 'linear-gradient(180deg, #d4af37, #b08d1e)' : '#c9bda0',
              boxShadow: '0 1px 3px rgba(0,0,0,.3)',
            }} />
        </span>
      </button>
      {isStudyMode && (
        <p className="font-body italic text-[13.5px] m-0 mt-2.5 px-3.5 py-2.5"
          style={{ border: '1px solid rgba(120,94,48,.3)', background: 'rgba(201,162,39,.08)', color: '#7c6a48' }}>
          Verás la fecha de tu carta antes de colocarla y no perderás puntos por errores. Ideal para aprender la cronología bíblica.
        </p>
      )}

      {/* Botones */}
      <div className="flex gap-3 mt-6">
        <button onClick={handleBack}
          className="flex-1 py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          VOLVER
        </button>
        <button onClick={handleStart} disabled={!playerName.trim()}
          className="btn-gold flex-[2] py-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
          EMPEZAR
        </button>
      </div>
    </div>
  );
};

export default AISetup;
