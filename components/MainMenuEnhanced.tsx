import React, { useState, useEffect } from 'react';
import RulesModal from './RulesModal';
import { soundService } from '../services/soundService';
import { profileService } from '../services/profileService';
import { firebaseService } from '../services/firebaseService';

// ============================================================
// JW Timeline — MainMenu premium (diseño 2a)
// Sustituye components/MainMenuEnhanced.tsx. Misma API de props
// y misma lógica (auth, partidas pendientes, notificaciones,
// silencio rápido); presentación en panel de pergamino con
// lista de modos e iconos de línea (sin emojis).
// Requiere public/premium.css.
// ============================================================

interface MainMenuEnhancedProps {
  onSelectMode: (mode: 'local' | 'ai' | 'online' | 'study') => void;
  onShowStats: () => void;
  onShowTutorial: () => void;
  onShowProfile: () => void;
  onShowLeaderboard: () => void;
  onShowSoundSettings: () => void;
  onShowAuth: () => void;
  onShowFriends: () => void;
  onShowTurnBasedGames?: () => void;
  onShowRules?: () => void;
}

/* ---------- Iconos de línea (stroke #8a6a2a) ---------- */
const stroke = '#8a6a2a';
const IconCards = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="11" height="15" rx="1.5" transform="rotate(-8 8 13)" />
    <rect x="10" y="4" width="11" height="15" rx="1.5" transform="rotate(7 16 11)" />
  </svg>
);
const IconRobot = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="8" width="14" height="11" rx="2" />
    <line x1="12" y1="4" x2="12" y2="8" />
    <circle cx="9.5" cy="13" r="1" /><circle cx="14.5" cy="13" r="1" />
  </svg>
);
const IconGlobe = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const IconBook = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5c-2-1.5-4.5-2-8-2v16c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V3c-3.5 0-6 .5-8 2z" /><line x1="12" y1="5" x2="12" y2="21" />
  </svg>
);
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
    <line x1="5" y1="20" x2="5" y2="12" /><line x1="12" y1="20" x2="12" y2="6" /><line x1="19" y1="20" x2="19" y2="15" />
  </svg>
);
const IconTrophy = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v1a3 3 0 0 0 3 3" /><path d="M17 6h3v1a3 3 0 0 1-3 3" />
    <line x1="12" y1="14" x2="12" y2="18" /><line x1="8" y1="20" x2="16" y2="20" />
  </svg>
);
const IconCap = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-5 9 5-9 5-9-5z" /><path d="M7 11.5V16c0 1.5 2.2 3 5 3s5-1.5 5-3v-4.5" />
  </svg>
);
const IconSound = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10v4h4l5 4V6l-5 4H4z" /><path d="M16.5 9.5a4 4 0 0 1 0 5" />
  </svg>
);
const IconUser = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
  </svg>
);
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8853c" strokeWidth="2" strokeLinecap="round">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/* Números romanos para el nivel (I–X) */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const MODES: { mode: 'local' | 'ai' | 'online' | 'study'; icon: React.ReactNode; title: string; subtitle: string }[] = [
  { mode: 'local',  icon: <IconCards />, title: 'Jugar en local',   subtitle: 'Con amigos en este dispositivo' },
  { mode: 'ai',     icon: <IconRobot />, title: 'Jugar contra IA',  subtitle: 'Tres niveles de dificultad' },
  { mode: 'online', icon: <IconGlobe />, title: 'Jugar online',     subtitle: 'Partidas en tiempo real o por turnos' },
  { mode: 'study',  icon: <IconBook />,  title: 'Modo estudio',     subtitle: 'Fechas visibles, sin presión' },
];

const MainMenuEnhanced: React.FC<MainMenuEnhancedProps> = ({
  onSelectMode, onShowStats, onShowTutorial, onShowProfile, onShowLeaderboard,
  onShowSoundSettings, onShowAuth, onShowFriends, onShowTurnBasedGames,
}) => {
  const [showRules, setShowRules] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingTurnGames, setPendingTurnGames] = useState(0);

  const profile = profileService.getProfileSummary();

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange(async (user) => {
      setIsLoggedIn(user !== null && !user.isAnonymous);
      if (user && !user.isAnonymous) {
        const games = await firebaseService.getTurnBasedGames();
        setPendingTurnGames(games.filter(g => g.currentTurnPlayerId === user.uid).length);
      } else {
        setPendingTurnGames(0);
      }
    });
    return () => unsubscribe();
  }, []);

  const click = (fn?: () => void) => () => { soundService.playClick(); fn && fn(); };

  const secondary = [
    { icon: <IconChart />,  label: 'Estadísticas',  fn: onShowStats },
    { icon: <IconTrophy />, label: 'Clasificación', fn: onShowLeaderboard },
    { icon: <IconCap />,    label: 'Tutorial',      fn: onShowTutorial },
    { icon: <IconSound />,  label: 'Sonido',        fn: onShowSoundSettings },
  ];

  return (
    <>
      <div className="flex flex-col items-center relative w-full max-w-md px-1 sm:px-0">
        <p className="font-body italic text-lg mb-8 tracking-wide" style={{ color: '#c9b891' }}>
          Cronología bíblica · un juego de cartas
        </p>

        <div className="parchment-panel w-full max-w-full px-6 sm:px-10 pt-9 pb-8 flex flex-col">

          {/* Jugador / sesión */}
          <div className="flex items-center gap-3.5 pb-5 cursor-pointer" style={{ borderBottom: '1px solid rgba(120,94,48,.3)' }}
            onClick={click(onShowProfile)}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ border: '1.5px solid #a8853c', background: 'rgba(201,162,39,.12)' }}>
              <IconUser />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-semibold text-[17px] tracking-wide m-0 truncate" style={{ color: 'var(--ink)' }}>
                {profile.name}
              </p>
              <p className="font-body text-sm m-0" style={{ color: 'var(--gold-dark)' }}>
                {profile.level.title} · Nivel {ROMAN[profile.level.level - 1] || profile.level.level}
              </p>
            </div>
            {isLoggedIn ? (
              <button type="button"
                className="font-body italic text-sm truncate max-w-[100px] sm:max-w-[130px] cursor-pointer"
                style={{ color: '#a08a5c', background: 'none', border: 'none', padding: 0 }}
                onClick={(e) => { e.stopPropagation(); click(onShowFriends)(); }}>
                Amigos
              </button>
            ) : (
              <button type="button" className="font-body italic text-sm cursor-pointer"
                style={{ color: '#a08a5c', background: 'none', border: 'none', padding: 0 }}
                onClick={(e) => { e.stopPropagation(); click(onShowAuth)(); }}>
                iniciar sesión
              </button>
            )}
          </div>

          {/* Partidas por turnos pendientes */}
          {isLoggedIn && onShowTurnBasedGames && pendingTurnGames > 0 && (
            <button onClick={click(onShowTurnBasedGames)}
              className="flex items-center justify-center gap-2 mt-4 py-2.5 rounded-sm cursor-pointer font-display text-[13px] tracking-wider"
              style={{ background: 'rgba(201,162,39,.14)', border: '1px solid #a8853c', color: '#5c4a28' }}>
              ES TU TURNO EN {pendingTurnGames} {pendingTurnGames === 1 ? 'PARTIDA' : 'PARTIDAS'}
            </button>
          )}

          {/* Modos de juego */}
          <div className="flex flex-col">
            {MODES.map((m, i) => (
              <button key={m.mode} onClick={click(() => onSelectMode(m.mode))}
                className="flex items-center gap-4 py-[18px] px-1 text-left cursor-pointer transition-colors hover:bg-[rgba(201,162,39,.1)]"
                style={{ background: 'none', border: 'none', borderBottom: i < MODES.length - 1 ? '1px solid rgba(120,94,48,.2)' : 'none' }}>
                {m.icon}
                <span className="flex-1">
                  <span className="block font-display font-semibold text-lg tracking-wide" style={{ color: 'var(--ink)' }}>{m.title}</span>
                  <span className="block font-body text-[14.5px]" style={{ color: '#7c6a48' }}>{m.subtitle}</span>
                </span>
                <IconChevron />
              </button>
            ))}
          </div>

          {/* Filete dorado */}
          <div className="flex items-center gap-3 my-3.5" aria-hidden="true">
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, transparent, #a8853c)' }}></div>
            <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: '#a8853c' }}></div>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, transparent, #a8853c)' }}></div>
          </div>

          {/* Secundarios */}
          <div className="grid grid-cols-4 gap-2">
            {secondary.map(s => (
              <button key={s.label} onClick={click(s.fn)}
                className="min-w-0 flex flex-col items-center gap-1.5 py-2.5 px-0.5 rounded-sm cursor-pointer transition-colors hover:bg-[rgba(201,162,39,.12)]"
                style={{ background: 'none', border: '1px solid rgba(120,94,48,.25)' }}>
                {s.icon}
                <span className="font-body text-[11.5px] sm:text-[13px] leading-tight text-center break-words max-w-full" style={{ color: '#5c4a28' }}>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Reglas */}
          <p className="text-center mt-5 mb-0">
            <span onClick={click(() => setShowRules(true))}
              className="font-body italic text-[15px] cursor-pointer pb-px"
              style={{ color: 'var(--gold-dark)', borderBottom: '1px solid rgba(138,106,42,.4)' }}>
              Leer las reglas del juego
            </span>
          </p>
        </div>

      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </>
  );
};

export default MainMenuEnhanced;
