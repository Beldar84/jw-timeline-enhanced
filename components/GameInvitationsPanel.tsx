import React, { useState, useEffect, useRef } from 'react';
import { firebaseService, GameInvitation } from '../services/firebaseService';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — GameInvitationsPanel premium
// Sustituye components/GameInvitationsPanel.tsx. Misma API y
// lógica (suscripción en tiempo real, aceptar/rechazar,
// tiempo restante). Estilo pergamino: sin gradiente morado,
// sin 🎮/⏳. Requiere public/premium.css.
// ============================================================

interface GameInvitationsPanelProps {
  onAcceptInvitation: (gameId: string, gameMode: 'realtime' | 'turnbased') => void;
  onClose: () => void;
}

const GameInvitationsPanel: React.FC<GameInvitationsPanelProps> = ({ onAcceptInvitation, onClose }) => {
  const [invitations, setInvitations] = useState<GameInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const previousInvitationIds = useRef(new Set<string>());

  useEffect(() => {
    // Subscribe to real-time invitations
    const unsubscribe = firebaseService.subscribeToGameInvitations((newInvitations) => {
      setInvitations(newInvitations);
      setLoading(false);

      const hasNewInvitation = newInvitations.some(invitation => !previousInvitationIds.current.has(invitation.id));
      previousInvitationIds.current = new Set(newInvitations.map(invitation => invitation.id));
      if (hasNewInvitation) {
        soundService.playClick();
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAccept = async (invitation: GameInvitation) => {
    setActionLoading(invitation.id);
    soundService.playClick();

    try {
      const result = await firebaseService.acceptGameInvitation(invitation.id);
      if (result.success && result.gameId) {
        soundService.playCorrect();
        onAcceptInvitation(result.gameId, result.gameMode || invitation.gameMode);
      } else {
        soundService.playIncorrect();
      }
    } catch (error) {
      soundService.playIncorrect();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setActionLoading(invitationId);
    soundService.playClick();

    try {
      await firebaseService.declineGameInvitation(invitationId);
    } catch (error) {
      console.error('Error declining invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatTimeRemaining = (expiresAt: any): string => {
    const expires = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diff = Math.max(0, Math.floor((expires.getTime() - now.getTime()) / 1000));

    if (diff < 60) return `${diff}s`;
    return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  };

  if (invitations.length === 0 && !loading) {
    return null; // No mostrar si no hay invitaciones
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-40 max-w-sm sm:w-96">
      {loading ? (
        <div className="parchment-panel px-5 py-4">
          <p className="font-body italic text-[14.5px] m-0 text-center" style={{ color: '#a08a5c' }}>Cargando invitaciones…</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="parchment-panel px-5 py-4"
              style={{ boxShadow: '0 8px 30px rgba(0,0,0,.5), 0 0 20px rgba(201,162,39,.25)' }}>

              {/* Cabecera */}
              <div className="flex items-center gap-3.5">
                {/* Medallón con inicial del anfitrión */}
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-lg"
                  style={{ border: '2px solid #a8853c', background: 'rgba(201,162,39,.14)', color: '#8a6a2a', boxShadow: '0 0 12px rgba(201,162,39,.25)' }}>
                  {invitation.fromUserName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[11px] tracking-widest m-0" style={{ color: '#a08a5c' }}>
                    ★ INVITACIÓN DE PARTIDA
                  </p>
                  <p className="font-display font-bold text-[16px] tracking-wide m-0 mt-0.5 truncate" style={{ color: 'var(--ink)' }}>
                    {invitation.fromUserName}
                  </p>
                  <p className="font-body italic text-[13.5px] m-0" style={{ color: '#7c6a48' }}>te invita a jugar</p>
                </div>
              </div>

              {/* Modo + tiempo restante */}
              <div className="flex items-center justify-between mt-3 mb-3 py-2 px-1"
                style={{ borderTop: '1px solid rgba(120,94,48,.2)', borderBottom: '1px solid rgba(120,94,48,.2)' }}>
                <span className="font-display text-[12px] tracking-wider" style={{ color: '#8a6a2a' }}>
                  {invitation.gameMode === 'realtime' ? 'TIEMPO REAL' : 'POR TURNOS'}
                </span>
                <span className="font-body text-[13px] px-2 py-0.5 rounded-sm"
                  style={{ border: '1px solid rgba(138,59,42,.4)', background: 'rgba(138,59,42,.08)', color: '#8a3b2a' }}>
                  Expira en {formatTimeRemaining(invitation.expiresAt)}
                </span>
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invitation)}
                  disabled={actionLoading === invitation.id}
                  className="btn-gold flex-[2] py-2.5 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === invitation.id ? '…' : 'UNIRSE'}
                </button>
                <button
                  onClick={() => handleDecline(invitation.id)}
                  disabled={actionLoading === invitation.id}
                  className="flex-1 py-2.5 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}
                >
                  RECHAZAR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GameInvitationsPanel;
