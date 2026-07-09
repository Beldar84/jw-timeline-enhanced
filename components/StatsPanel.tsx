import React, { useState, useEffect } from 'react';
import { statsService, PlayerStats, DeckStats } from '../services/statsService';
import { deckService } from '../services/deckService';
import { soundService } from '../services/soundService';
import { firebaseService, GameHistoryEntry } from '../services/firebaseService';

// ============================================================
// JW Timeline — StatsPanel premium (diseño 2c) · handoff/StatsPanel.tsx
// Sustituye components/StatsPanel.tsx. Misma API y lógica
// (4 pestañas: General / Logros / Mazos / Historial, reset).
// Presentación "libro de registro" en pergamino.
// Requiere public/premium.css (.parchment-panel, variables).
// ============================================================

interface StatsPanelProps {
  onClose: () => void;
}

type StatsTab = 'overview' | 'achievements' | 'decks' | 'history';

const TABS: { id: StatsTab; label: (a: { unlocked: number; total: number }) => string }[] = [
  { id: 'overview',     label: () => 'GENERAL' },
  { id: 'achievements', label: p => `LOGROS ${p.unlocked}/${p.total}` },
  { id: 'decks',        label: () => 'MAZOS' },
  { id: 'history',      label: () => 'HISTORIAL' },
];

const pct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`;

const BigFigure: React.FC<{ value: React.ReactNode; label: string; last?: boolean }> = ({ value, label, last }) => (
  <div className="text-center px-2 py-1.5" style={{ borderRight: last ? 'none' : '1px solid rgba(120,94,48,.25)' }}>
    <div className="font-display font-bold text-3xl md:text-4xl leading-none" style={{ color: 'var(--ink)' }}>{value}</div>
    <div className="font-body text-sm mt-1.5" style={{ color: 'var(--gold-dark)' }}>{label}</div>
  </div>
);

const Bar: React.FC<{ label: string; value: number; caption: string }> = ({ label, value, caption }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <span className="font-display text-sm tracking-wider" style={{ color: '#5c4a28' }}>{label}</span>
      <span className="font-display font-bold text-xl" style={{ color: 'var(--ink)' }}>{pct(value)}</span>
    </div>
    <div style={{ height: 6, background: 'rgba(120,94,48,.2)' }}>
      <div style={{ height: 6, width: `${Math.min(100, Math.max(0, value))}%`, background: '#8a6a2a' }}></div>
    </div>
    <p className="font-body italic text-sm mt-1.5 m-0" style={{ color: '#a08a5c' }}>{caption}</p>
  </div>
);

const SectionRule: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-3 mb-3.5">
    <span className="font-display text-sm tracking-wider" style={{ color: '#5c4a28' }}>{title}</span>
    <div className="flex-1 h-px" style={{ background: 'rgba(120,94,48,.25)' }}></div>
  </div>
);

const StatsPanel: React.FC<StatsPanelProps> = ({ onClose }) => {
  const [stats, setStats] = useState<PlayerStats>(statsService.loadStats());
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const accuracy = statsService.getAccuracy(stats);
  const winRate = statsService.getWinRate(stats);
  const achievementProgress = statsService.getAchievementProgress(stats);

  useEffect(() => {
    if (activeTab !== 'history') return;
    if (!firebaseService.isSignedIn()) { setHistory([]); return; }
    let isMounted = true;
    setHistoryLoading(true);
    firebaseService.getGameHistory(30)
      .then(entries => { if (isMounted) setHistory(entries); })
      .finally(() => { if (isMounted) setHistoryLoading(false); });
    return () => { isMounted = false; };
  }, [activeTab]);

  const handleTabChange = (tab: StatsTab) => { soundService.playClick(); setActiveTab(tab); };
  const handleClose = () => { soundService.playClick(); onClose(); };
  const handleResetStats = () => {
    if (showResetConfirm) {
      statsService.resetStats();
      setStats(statsService.loadStats());
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
    }
    soundService.playClick();
  };

  const formatHistoryDate = (dateValue: any): string => {
    const date = dateValue?.toDate ? dateValue.toDate() : dateValue ? new Date(dateValue) : null;
    return date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '--';
  };

  const getModeLabel = (mode: GameHistoryEntry['mode']): string => {
    if (mode === 'ai') return 'Contra IA';
    if (mode === 'local') return 'Local';
    if (mode === 'turnbased') return 'Por turnos';
    return 'Online';
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(10,7,3,.9)' }}>
      <div className="parchment-panel w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Cabecera */}
        <div className="px-7 md:px-9 pt-7 flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl md:text-[28px] tracking-wide m-0" style={{ color: 'var(--ink)' }}>Estadísticas</h2>
            <p className="font-body italic text-base mt-1 m-0" style={{ color: 'var(--gold-dark)' }}>Registro del jugador</p>
          </div>
          <button onClick={handleClose}
            className="w-[34px] h-[34px] rounded-full cursor-pointer text-lg leading-none transition-colors hover:bg-[rgba(201,162,39,.15)]"
            style={{ background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#5c4a28' }}>×</button>
        </div>

        {/* Pestañas */}
        <div className="flex gap-5 md:gap-7 px-7 md:px-9 pt-4" style={{ borderBottom: '1px solid rgba(120,94,48,.3)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)}
              className="pb-2.5 px-0.5 cursor-pointer font-display text-[13px] md:text-[14.5px] tracking-wider transition-colors"
              style={{
                background: 'none', border: 'none',
                borderBottom: activeTab === t.id ? '2px solid #8a6a2a' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--ink)' : '#a08a5c',
                fontWeight: activeTab === t.id ? 600 : 400,
              }}>
              {t.label(achievementProgress)}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-7 md:px-9 py-7 flex flex-col gap-7">

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-4">
                <BigFigure value={stats.gamesPlayed} label="partidas jugadas" />
                <BigFigure value={stats.gamesWon} label="victorias" />
                <BigFigure value={stats.gamesLost} label="derrotas" />
                <BigFigure value={stats.currentWinStreak} label="racha actual" last />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Bar label="TASA DE VICTORIA" value={winRate} caption={`${stats.gamesWon} de ${stats.gamesPlayed} partidas`} />
                <Bar label="PRECISIÓN" value={accuracy} caption={`${stats.correctPlacements} de ${stats.totalCardsPlaced} cartas colocadas`} />
              </div>
              <div className="flex flex-wrap gap-x-10 gap-y-2">
                <p className="font-body text-base m-0" style={{ color: '#5c4a28' }}>
                  Victoria más rápida <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>
                    {stats.fastestWin ? statsService.formatTime(stats.fastestWin) : '--'}</span>
                </p>
                <p className="font-body text-base m-0" style={{ color: '#5c4a28' }}>
                  Tiempo promedio <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>
                    {statsService.formatTime(stats.averageGameDuration)}</span>
                </p>
                <p className="font-body text-base m-0" style={{ color: '#5c4a28' }}>
                  Mayor racha <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>{stats.longestWinStreak}</span>
                </p>
              </div>
              <div>
                <SectionRule title="CARTAS" />
                <div className="grid grid-cols-3">
                  <BigFigure value={stats.totalCardsPlaced} label="total jugadas" />
                  <BigFigure value={stats.correctPlacements} label="correctas" />
                  <BigFigure value={stats.incorrectPlacements} label="incorrectas" last />
                </div>
              </div>
            </>
          )}

          {activeTab === 'achievements' && (
            <>
              <div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-display text-sm tracking-wider" style={{ color: '#5c4a28' }}>PROGRESO</span>
                  <span className="font-body italic text-sm" style={{ color: '#a08a5c' }}>
                    {achievementProgress.unlocked} de {achievementProgress.total} logros desbloqueados
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(120,94,48,.2)' }}>
                  <div style={{ height: 6, width: `${(achievementProgress.unlocked / achievementProgress.total) * 100}%`, background: '#8a6a2a' }}></div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.achievements.map(a => (
                  <div key={a.id} className="flex items-start gap-3 px-3.5 py-3 rounded-sm"
                    style={a.unlockedAt
                      ? { border: '1px solid #a8853c', background: 'rgba(201,162,39,.1)' }
                      : { border: '1px dashed rgba(120,94,48,.4)', opacity: .55 }}>
                    <span className="text-2xl" style={a.unlockedAt ? {} : { filter: 'grayscale(1)' }}>{a.icon}</span>
                    <div className="flex-1">
                      <p className="font-display font-semibold text-sm m-0" style={{ color: 'var(--ink)' }}>{a.name}</p>
                      <p className="font-body text-[13px] m-0 mt-0.5" style={{ color: 'var(--gold-dark)' }}>{a.description}</p>
                      {a.unlockedAt && (
                        <p className="font-body italic text-xs m-0 mt-1" style={{ color: '#a08a5c' }}>
                          Desbloqueado {new Date(a.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'decks' && (
            Object.keys(stats.deckStats).length === 0 ? (
              <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>
                Aún no has jugado con ningún mazo. ¡Comienza a jugar para ver tus estadísticas por mazo!
              </p>
            ) : (
              Object.entries(stats.deckStats).map(([deckId, deckStatsData]) => {
                const d = deckStatsData as DeckStats;
                const deck = deckService.getDeckById(deckId);
                if (!deck) return null;
                const deckWinRate = d.gamesPlayed > 0 ? (d.gamesWon / d.gamesPlayed) * 100 : 0;
                const deckAccuracy = d.cardsPlaced > 0 ? (d.correctPlacements / d.cardsPlaced) * 100 : 0;
                return (
                  <div key={deckId} className="pb-5" style={{ borderBottom: '1px solid rgba(120,94,48,.2)' }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="font-display font-semibold text-base m-0" style={{ color: 'var(--ink)' }}>{deck.name}</h3>
                      <span className="font-body italic text-sm" style={{ color: '#a08a5c' }}>{d.gamesPlayed} partidas</span>
                    </div>
                    <div className="grid grid-cols-4">
                      <BigFigure value={d.gamesWon} label="victorias" />
                      <BigFigure value={pct(deckWinRate)} label="tasa victoria" />
                      <BigFigure value={d.cardsPlaced} label="cartas jugadas" />
                      <BigFigure value={pct(deckAccuracy)} label="precisión" last />
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === 'history' && (
            !firebaseService.isSignedIn() ? (
              <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>
                Inicia sesión para guardar y consultar tu historial en la nube.
              </p>
            ) : historyLoading ? (
              <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>Cargando historial…</p>
            ) : history.length === 0 ? (
              <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>
                Aún no hay partidas guardadas en tu historial.
              </p>
            ) : (
              history.map(entry => {
                const acc = entry.cardsPlaced ? ((entry.correctPlacements || 0) / entry.cardsPlaced) * 100 : 0;
                return (
                  <div key={entry.id} className="pb-4" style={{ borderBottom: '1px solid rgba(120,94,48,.2)' }}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-display text-[11px] tracking-[.12em] px-2 py-0.5 rounded-sm"
                          style={entry.result === 'win'
                            ? { color: '#8a6a2a', border: '1px solid #a8853c', background: 'rgba(201,162,39,.12)' }
                            : { color: '#8a4a3a', border: '1px solid rgba(160,80,60,.5)' }}>
                          {entry.result === 'win' ? 'VICTORIA' : 'DERROTA'}
                        </span>
                        <span className="font-body text-sm" style={{ color: '#5c4a28' }}>{getModeLabel(entry.mode)}</span>
                      </div>
                      <span className="font-body italic text-sm" style={{ color: '#a08a5c' }}>
                        {formatHistoryDate(entry.finishedAt)} · {entry.durationSeconds ? statsService.formatTime(entry.durationSeconds) : '--'}
                      </span>
                    </div>
                    <p className="font-display font-semibold text-[15px] m-0" style={{ color: 'var(--ink)' }}>
                      Ganador: {entry.winnerName || 'Sin ganador'}
                    </p>
                    <p className="font-body italic text-sm m-0 mb-2" style={{ color: '#a08a5c' }}>
                      {entry.players.map(p => p.name).join(' vs ')}
                    </p>
                    <p className="font-body text-sm m-0" style={{ color: '#5c4a28' }}>
                      {entry.cardsPlaced || 0} movimientos · {entry.correctPlacements || 0} correctas ·{' '}
                      {entry.incorrectPlacements || 0} incorrectas · {pct(acc)} precisión
                    </p>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Pie */}
        <div className="px-7 md:px-9 py-4 flex justify-between items-center" style={{ borderTop: '1px solid rgba(120,94,48,.3)' }}>
          <button onClick={handleResetStats}
            className="font-display text-[13px] tracking-wider px-4 py-2 rounded-sm cursor-pointer"
            style={showResetConfirm
              ? { background: 'rgba(160,80,60,.15)', border: '1px solid rgba(160,80,60,.6)', color: '#8a4a3a' }
              : { background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#5c4a28' }}>
            {showResetConfirm ? '¿CONFIRMAR REINICIO?' : 'REINICIAR ESTADÍSTICAS'}
          </button>
          {showResetConfirm && (
            <button onClick={() => setShowResetConfirm(false)}
              className="font-display text-[13px] tracking-wider px-4 py-2 rounded-sm cursor-pointer"
              style={{ background: 'none', border: '1px solid rgba(120,94,48,.25)', color: '#a08a5c' }}>
              CANCELAR
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsPanel;
