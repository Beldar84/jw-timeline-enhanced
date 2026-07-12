import React, { useCallback, useState, useEffect } from 'react';
import { leaderboardService } from '../services/leaderboardService';
import { firebaseService, OnlineLeaderboardEntry } from '../services/firebaseService';
import { profileService } from '../services/profileService';
import { soundService } from '../services/soundService';
import { LeaderboardEntry } from '../types';

// ============================================================
// JW Timeline — LeaderboardPanel premium (diseño 4c)
// Sustituye components/LeaderboardPanel.tsx. Misma API y lógica
// (Local/Global, periodos, sincronización). Estilo libro de
// registro en pergamino. Requiere public/premium.css.
// ============================================================

interface LeaderboardPanelProps {
  onClose: () => void;
}

type Tab = 'local' | 'global';
type Period = 'weekly' | 'monthly' | 'allTime';

const PERIOD_LABELS: Record<Period, string> = {
  weekly: 'SEMANAL',
  monthly: 'MENSUAL',
  allTime: 'HISTÓRICO',
};

const RankRow: React.FC<{
  rank: number; name: string; isMe: boolean; detail: string; score: number;
}> = ({ rank, name, isMe, detail, score }) => (
  <div className="flex items-center gap-3.5 py-3 px-1.5"
    style={{
      borderBottom: '1px solid rgba(120,94,48,.18)',
      ...(isMe ? { background: 'rgba(201,162,39,.1)', borderLeft: '2px solid #a8853c' } : {}),
    }}>
    <span className="w-8 text-center font-display font-bold"
      style={{ fontSize: rank <= 3 ? 18 : 16, color: rank === 1 ? '#8a6a2a' : '#a08a5c' }}>
      {rank}
    </span>
    <div className="flex-1 min-w-0">
      <p className="font-body text-[17px] truncate m-0" style={{ color: 'var(--ink)', fontWeight: isMe ? 600 : 400 }}>
        {name} {isMe && <span className="italic text-[13px]" style={{ color: 'var(--gold-dark)' }}>(Tú)</span>}
      </p>
      <p className="font-body text-[13px] m-0" style={{ color: '#a08a5c' }}>{detail}</p>
    </div>
    <div className="text-right">
      <p className="font-display font-bold text-[17px] m-0" style={{ color: 'var(--ink)' }}>{score.toLocaleString('de-DE')}</p>
      <p className="font-body italic text-xs m-0" style={{ color: '#a08a5c' }}>puntos</p>
    </div>
  </div>
);

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('global');
  const [period, setPeriod] = useState<Period>('allTime');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  const [globalEntries, setGlobalEntries] = useState<OnlineLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const playerName = profileService.getName();

  const loadGlobalLeaderboard = useCallback(async (): Promise<boolean> => {
    setGlobalLoading(true);
    setGlobalError(null);
    try {
      const list = await firebaseService.getLeaderboard(50, period);
      setGlobalEntries(list);
      if (firebaseService.isSignedIn()) {
        setMyRank(await firebaseService.getMyRank(period));
      }
      return true;
    } catch (err) {
      setGlobalError('Error al cargar la clasificación global');
      console.error(err);
      return false;
    } finally {
      setGlobalLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (tab === 'local') {
      leaderboardService.updateLeaderboard();
      setEntries(leaderboardService.getTopPlayers(period, 20));
    } else {
      void loadGlobalLeaderboard();
    }
  }, [tab, period, loadGlobalLeaderboard]);

  const handleRefresh = async () => {
    setSyncing(true);
    setGlobalError(null);
    soundService.playClick();
    const refreshed = await loadGlobalLeaderboard();
    if (refreshed) soundService.playCorrect();
    else soundService.playIncorrect();
    setSyncing(false);
  };

  const handleTabChange = (newTab: Tab) => { soundService.playClick(); setTab(newTab); };
  const handlePeriodChange = (p: Period) => { soundService.playClick(); setPeriod(p); };

  const playerRank = leaderboardService.getPlayerRank(period);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
      style={{ background: 'rgba(10,7,3,.9)' }} onClick={onClose}>
      <div className="parchment-panel w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-4"
        onClick={(e) => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="px-8 pt-6 flex items-start justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-wide m-0" style={{ color: 'var(--ink)' }}>Clasificación</h2>
            <p className="font-body italic text-[15px] m-0 mt-0.5" style={{ color: 'var(--gold-dark)' }}>
              Victorias ×100 · Precisión ×10 · Racha ×50
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar clasificación"
            className="w-8 h-8 rounded-full cursor-pointer text-[17px] leading-none transition-colors hover:bg-[rgba(201,162,39,.15)]"
            style={{ background: 'none', border: '1px solid rgba(120,94,48,.35)', color: '#5c4a28' }}>×</button>
        </div>

        {/* Pestañas Global/Local */}
        <div className="flex gap-6 px-8 pt-4" style={{ borderBottom: '1px solid rgba(120,94,48,.3)' }}>
          {(['global', 'local'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)}
              className="pb-2.5 px-0.5 cursor-pointer font-display text-[13.5px] tracking-wider"
              style={{
                background: 'none', border: 'none',
                borderBottom: tab === t ? '2px solid #8a6a2a' : '2px solid transparent',
                color: tab === t ? 'var(--ink)' : '#a08a5c',
                fontWeight: tab === t ? 600 : 400,
              }}>
              {t === 'local' ? 'LOCAL' : 'GLOBAL'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 px-8 pt-3.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} onClick={() => handlePeriodChange(p)}
              className="px-3.5 py-1.5 rounded-sm cursor-pointer font-display text-[11px] tracking-widest"
              style={period === p
                ? { background: 'rgba(201,162,39,.14)', border: '1px solid #a8853c', color: '#5c4a28', fontWeight: 600 }
                : { background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Reinicio de periodo */}
        {tab === 'local' && period !== 'allTime' && (
          <p className="font-body italic text-[13px] text-center m-0 mt-2 px-8" style={{ color: '#a08a5c' }}>
            Se reinicia en {leaderboardService.getTimeUntilReset(period)}
          </p>
        )}

        {/* La clasificación global solo contiene resultados validados por servidor. */}
        {tab === 'global' && (
          <div className="px-8 pt-3.5">
            <button onClick={handleRefresh} disabled={syncing}
              className="w-full py-2.5 font-display text-[12px] font-semibold tracking-wider rounded-sm cursor-pointer disabled:opacity-50"
              style={{ background: 'rgba(201,162,39,.14)', border: '1px solid #a8853c', color: '#5c4a28' }}>
              {syncing ? 'ACTUALIZANDO…' : 'ACTUALIZAR CLASIFICACIÓN'}
            </button>
            <p className="font-body italic text-xs text-center m-0 mt-2" style={{ color: '#a08a5c' }}>
              Solo cuentan partidas online verificadas por el servidor
            </p>
            {myRank && (
              <p className="font-body italic text-sm text-center m-0 mt-2" style={{ color: 'var(--gold-dark)' }}>
                Tu posición global: #{myRank}
              </p>
            )}
            {globalError && (
              <p className="font-body italic text-sm text-center m-0 mt-2" style={{ color: '#8a4a3a' }}>{globalError}</p>
            )}
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          {tab === 'local' ? (
            entries.length === 0 ? (
              <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>
                No hay datos todavía. ¡Juega partidas para aparecer en la clasificación!
              </p>
            ) : (
              entries.map(entry => (
                <RankRow key={`${entry.rank}-${entry.name}`}
                  rank={entry.rank}
                  name={entry.name}
                  isMe={entry.name === playerName}
                  detail={`${entry.gamesPlayed} partidas · ${entry.winRate.toFixed(0)}% victorias`}
                  score={entry.score} />
              ))
            )
          ) : globalLoading ? (
            <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>Cargando…</p>
          ) : globalEntries.length === 0 ? (
            <p className="font-body italic text-center text-base py-10 m-0" style={{ color: '#a08a5c' }}>
              No hay datos todavía. Juega una partida online para estrenar la clasificación.
            </p>
          ) : (
            globalEntries.map((entry, index) => (
              <RankRow key={entry.id}
                rank={index + 1}
                name={entry.name}
                isMe={entry.id === firebaseService.getCurrentUserId()}
                detail={`${entry.wins} victorias · ${entry.winRate}% victorias`}
                score={entry.score} />
            ))
          )}
        </div>

        {/* Tu posición (local, fuera del top) */}
        {tab === 'local' && playerRank && playerRank > 10 && (
          <p className="font-body italic text-sm text-center m-0 px-8 pb-1" style={{ color: '#a08a5c' }}>
            Tu posición: <span className="font-display font-bold" style={{ color: 'var(--ink)' }}>#{playerRank}</span>
          </p>
        )}

        {/* Cerrar */}
        <div className="px-8 pb-6 pt-2">
          <button onClick={onClose} className="btn-gold w-full py-3 text-sm">CERRAR</button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPanel;
