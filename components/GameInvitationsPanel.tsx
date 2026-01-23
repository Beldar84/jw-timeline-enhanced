import React, { useState, useEffect } from 'react';
import { firebaseService, GameInvitation } from '../services/firebaseService';
import { soundService } from '../services/soundService';

interface GameInvitationsPanelProps {
  onAcceptInvitation: (gameId: string) => void;
  onClose: () => void;
}

const GameInvitationsPanel: React.FC<GameInvitationsPanelProps> = ({ onAcceptInvitation, onClose }) => {
  const [invitations, setInvitations] = useState<GameInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time invitations
    const unsubscribe = firebaseService.subscribeToGameInvitations((newInvitations) => {
      setInvitations(newInvitations);
      setLoading(false);

      // Play sound if new invitation arrives
      if (newInvitations.length > invitations.length) {
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
        onAcceptInvitation(result.gameId);
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
    <div className="fixed bottom-4 right-4 z-40 max-w-sm">
      {loading ? (
        <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-gray-700">
          <span className="animate-spin text-2xl">⏳</span>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-sm rounded-lg p-4 shadow-xl border border-purple-400/50 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                  🎮
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">¡Invitación de partida!</p>
                  <p className="text-sm text-purple-200">
                    {invitation.fromUserName} te invita a jugar
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-purple-200 mb-3">
                <span>
                  {invitation.gameMode === 'realtime' ? '⚡ Tiempo real' : '🕐 Por turnos'}
                </span>
                <span className="bg-red-500/50 px-2 py-0.5 rounded">
                  ⏱️ {formatTimeRemaining(invitation.expiresAt)}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invitation)}
                  disabled={actionLoading === invitation.id}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                >
                  {actionLoading === invitation.id ? '...' : '✓ Unirse'}
                </button>
                <button
                  onClick={() => handleDecline(invitation.id)}
                  disabled={actionLoading === invitation.id}
                  className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                >
                  ✕ Rechazar
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
