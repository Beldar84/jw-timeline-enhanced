import React, { useState, useEffect } from 'react';
import { firebaseService, FriendInfo } from '../services/firebaseService';
import { soundService } from '../services/soundService';

interface FriendsPanelProps {
  onClose: () => void;
  onInviteFriend?: (friendId: string, friendName: string) => void;
}

type Tab = 'friends' | 'requests' | 'add';

const FriendsPanel: React.FC<FriendsPanelProps> = ({ onClose, onInviteFriend }) => {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [requests, setRequests] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<FriendInfo | null>(null);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [friendsList, requestsList] = await Promise.all([
        firebaseService.getFriends(),
        firebaseService.getFriendRequests()
      ]);
      setFriends(friendsList);
      setRequests(requestsList);
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    setSearchResult(null);
    setMessage(null);
    soundService.playClick();

    try {
      const result = await firebaseService.searchUserByEmail(searchEmail.trim().toLowerCase());
      if (result) {
        // Check if already a friend
        if (friends.some(f => f.id === result.id)) {
          setMessage({ type: 'error', text: 'Este usuario ya es tu amigo' });
        } else if (result.id === firebaseService.getCurrentUserId()) {
          setMessage({ type: 'error', text: 'No puedes añadirte a ti mismo' });
        } else {
          setSearchResult(result);
        }
      } else {
        setMessage({ type: 'error', text: 'No se encontró ningún usuario con ese email' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al buscar usuario' });
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    setActionLoading(friendId);
    soundService.playClick();

    try {
      const success = await firebaseService.sendFriendRequest(friendId);
      if (success) {
        setMessage({ type: 'success', text: 'Solicitud de amistad enviada' });
        setSearchResult(null);
        setSearchEmail('');
        soundService.playCorrect();
      } else {
        setMessage({ type: 'error', text: 'Error al enviar solicitud' });
        soundService.playIncorrect();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al enviar solicitud' });
      soundService.playIncorrect();
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    setActionLoading(friendId);
    soundService.playClick();

    try {
      const success = await firebaseService.acceptFriendRequest(friendId);
      if (success) {
        await loadData();
        soundService.playCorrect();
      } else {
        soundService.playIncorrect();
      }
    } catch (error) {
      soundService.playIncorrect();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    setActionLoading(friendId);
    soundService.playClick();

    try {
      const success = await firebaseService.rejectFriendRequest(friendId);
      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar a este amigo?')) return;

    setActionLoading(friendId);
    soundService.playClick();

    try {
      const success = await firebaseService.removeFriend(friendId);
      if (success) {
        await loadData();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvite = (friend: FriendInfo) => {
    soundService.playClick();
    if (onInviteFriend) {
      onInviteFriend(friend.id, friend.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            👥 Amigos
          </h2>
          <button
            onClick={() => { soundService.playClick(); onClose(); }}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => { soundService.playClick(); setTab('friends'); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === 'friends'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Amigos ({friends.length})
          </button>
          <button
            onClick={() => { soundService.playClick(); setTab('requests'); }}
            className={`flex-1 py-3 text-sm font-semibold transition relative ${
              tab === 'requests'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Solicitudes
            {requests.length > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { soundService.playClick(); setTab('add'); }}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === 'add'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            + Añadir
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin text-4xl">⏳</span>
            </div>
          ) : (
            <>
              {/* Friends Tab */}
              {tab === 'friends' && (
                friends.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">👥</p>
                    <p>No tienes amigos todavía</p>
                    <p className="text-sm mt-2">¡Añade amigos para jugar juntos!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{friend.name}</p>
                          {friend.email && (
                            <p className="text-xs text-gray-400 truncate">{friend.email}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {onInviteFriend && (
                            <button
                              onClick={() => handleInvite(friend)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                            >
                              Invitar
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveFriend(friend.id)}
                            disabled={actionLoading === friend.id}
                            className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-white text-sm rounded-lg transition"
                          >
                            {actionLoading === friend.id ? '...' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Requests Tab */}
              {tab === 'requests' && (
                requests.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-2">📬</p>
                    <p>No tienes solicitudes pendientes</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{request.name}</p>
                          <p className="text-xs text-gray-400">Quiere ser tu amigo</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                          >
                            {actionLoading === request.id ? '...' : '✓'}
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-white text-sm rounded-lg transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* Add Friend Tab */}
              {tab === 'add' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Buscar por email
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-blue-400 focus:outline-none"
                        placeholder="amigo@email.com"
                        disabled={searching}
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching || !searchEmail.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                      >
                        {searching ? '...' : '🔍'}
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-lg text-sm ${
                      message.type === 'success'
                        ? 'bg-green-500/20 border border-green-500/50 text-green-300'
                        : 'bg-red-500/20 border border-red-500/50 text-red-300'
                    }`}>
                      {message.type === 'success' ? '✓' : '⚠️'} {message.text}
                    </div>
                  )}

                  {searchResult && (
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {searchResult.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{searchResult.name}</p>
                        <p className="text-sm text-gray-400">{searchResult.email}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(searchResult.id)}
                        disabled={actionLoading === searchResult.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
                      >
                        {actionLoading === searchResult.id ? '...' : '+ Añadir'}
                      </button>
                    </div>
                  )}

                  <div className="bg-gray-700/30 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">
                      💡 <strong>Tip:</strong> Pide a tu amigo que te dé su email de registro para añadirlo.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Close Button */}
        <div className="p-4 bg-gray-900/50 border-t border-gray-700">
          <button
            onClick={() => { soundService.playClick(); onClose(); }}
            className="w-full py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FriendsPanel;
