import React, { useState, useEffect } from 'react';
import { firebaseService, FriendInfo } from '../services/firebaseService';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — FriendsPanel premium
// Sustituye components/FriendsPanel.tsx. Misma API y lógica
// (amigos, solicitudes, búsqueda + solicitud de amistad,
// invitar a partida). Estilo pergamino. Requiere public/premium.css.
// ============================================================

interface FriendsPanelProps {
  onClose: () => void;
  onInviteFriend?: (friendId: string, friendName: string) => void;
}

type Tab = 'friends' | 'requests' | 'add';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

const smallBtnBase: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
  fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '.06em',
  transition: 'background .15s, color .15s',
};

// Avatar circular con inicial, estilo sello dorado
const Avatar: React.FC<{ name: string }> = ({ name }) => (
  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-lg"
    style={{ border: '1.5px solid #a8853c', background: 'rgba(201,162,39,.14)', color: '#8a6a2a' }}>
    {name.charAt(0).toUpperCase()}
  </div>
);

const FriendsPanel: React.FC<FriendsPanelProps> = ({ onClose, onInviteFriend }) => {
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [requests, setRequests] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<FriendInfo[]>([]);
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
    if (!searchUsername.trim() || searchUsername.trim().length < 2) {
      setMessage({ type: 'error', text: 'Escribe al menos 2 caracteres' });
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setMessage(null);
    soundService.playClick();

    try {
      const results = await firebaseService.searchUserByUsername(searchUsername.trim());
      const filteredResults = results.filter(r => !friends.some(f => f.id === r.id));

      if (filteredResults.length > 0) {
        setSearchResults(filteredResults);
      } else if (results.length > 0) {
        setMessage({ type: 'error', text: 'Todos los resultados ya son tus amigos' });
      } else {
        setMessage({ type: 'error', text: 'No se encontró ningún usuario con ese nombre' });
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
        setSearchResults(prev => prev.filter(r => r.id !== friendId));
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

  const tabButton = (t: Tab, label: React.ReactNode) => {
    const selected = tab === t;
    return (
      <button onClick={() => { soundService.playClick(); setTab(t); }}
        className="relative flex-1 py-2.5 font-display text-[12px] tracking-widest cursor-pointer transition-colors"
        style={{
          background: 'none', border: 'none',
          borderBottom: selected ? '2px solid #a8853c' : '2px solid transparent',
          color: selected ? '#8a6a2a' : '#a08a5c',
          fontWeight: selected ? 700 : 500,
        }}>
        {label}
      </button>
    );
  };

  const emptyState = (text: string, sub?: string) => (
    <div className="text-center py-10">
      <p className="font-body italic text-base m-0" style={{ color: '#7c6a48' }}>{text}</p>
      {sub && <p className="font-body text-[13.5px] m-0 mt-1" style={{ color: '#a08a5c' }}>{sub}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(20,14,6,.75)' }} onClick={() => { soundService.playClick(); onClose(); }}>
      <div className="parchment-panel w-full max-w-md px-9 py-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Amigos</h2>
        <p className="font-body italic text-base text-center m-0 mb-4" style={{ color: 'var(--gold-dark)' }}>Juega con quien conoces</p>

        {/* Pestañas */}
        <div className="flex" style={{ borderBottom: '1px solid rgba(120,94,48,.25)' }}>
          {tabButton('friends', <>AMIGOS ({friends.length})</>)}
          {tabButton('requests', (
            <>
              SOLICITUDES
              {requests.length > 0 && (
                <span className="absolute top-1 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center font-body text-[11px] font-bold"
                  style={{ background: '#8a3b2a', color: '#f3e9d2' }}>
                  {requests.length}
                </span>
              )}
            </>
          ))}
          {tabButton('add', '+ AÑADIR')}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto py-4 pr-1" style={{ minHeight: 180 }}>
          {loading ? (
            <p className="font-body italic text-center py-10 m-0" style={{ color: '#a08a5c' }}>Cargando…</p>
          ) : (
            <>
              {tab === 'friends' && (
                friends.length === 0 ? emptyState('No tienes amigos todavía', 'Añade amigos para jugar juntos') : (
                  <div className="flex flex-col gap-2">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center gap-3 p-2.5 rounded-sm"
                        style={{ border: '1px solid rgba(120,94,48,.25)' }}>
                        <Avatar name={friend.name} />
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-[15px] m-0 truncate" style={{ color: 'var(--ink)' }}>{friend.name}</p>
                          {friend.email && (
                            <p className="font-body text-xs m-0 truncate" style={{ color: '#a08a5c' }}>{friend.email}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          {onInviteFriend && (
                            <button onClick={() => handleInvite(friend)} className="btn-gold"
                              style={{ ...smallBtnBase, border: 'none' }}>
                              INVITAR
                            </button>
                          )}
                          <button onClick={() => handleRemoveFriend(friend.id)} disabled={actionLoading === friend.id}
                            title="Eliminar amigo"
                            style={{ ...smallBtnBase, background: 'none', border: '1px solid rgba(138,59,42,.4)', color: '#8a3b2a' }}>
                            {actionLoading === friend.id ? '…' : '✕'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'requests' && (
                requests.length === 0 ? emptyState('No tienes solicitudes pendientes') : (
                  <div className="flex flex-col gap-2">
                    {requests.map((request) => (
                      <div key={request.id} className="flex items-center gap-3 p-2.5 rounded-sm"
                        style={{ border: '1px solid #a8853c', background: 'rgba(201,162,39,.1)' }}>
                        <Avatar name={request.name} />
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-semibold text-[15px] m-0 truncate" style={{ color: 'var(--ink)' }}>{request.name}</p>
                          <p className="font-body italic text-xs m-0" style={{ color: '#7c6a48' }}>Quiere ser tu amigo</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleAcceptRequest(request.id)} disabled={actionLoading === request.id}
                            className="btn-gold" style={{ ...smallBtnBase, border: 'none' }}>
                            {actionLoading === request.id ? '…' : '✓'}
                          </button>
                          <button onClick={() => handleRejectRequest(request.id)} disabled={actionLoading === request.id}
                            style={{ ...smallBtnBase, background: 'none', border: '1px solid rgba(138,59,42,.4)', color: '#8a3b2a' }}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'add' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <label htmlFor="friend-search" className="block font-display text-xs tracking-widest mb-1.5" style={{ color: '#a08a5c' }}>
                      BUSCAR POR NOMBRE DE USUARIO
                    </label>
                    <div className="flex gap-2">
                      <input id="friend-search" type="text" value={searchUsername} disabled={searching}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Nombre del jugador..."
                        style={{ ...inputStyle, width: 'auto' }} className="flex-1 min-w-0" />
                      <button onClick={handleSearch} disabled={searching || searchUsername.trim().length < 2}
                        className="btn-gold px-4 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
                        {searching ? '…' : 'BUSCAR'}
                      </button>
                    </div>
                  </div>

                  {message && (
                    <p className="font-body italic text-[13.5px] m-0 px-3.5 py-2.5"
                      style={{
                        border: `1px solid ${message.type === 'success' ? 'rgba(109,122,63,.5)' : 'rgba(138,59,42,.4)'}`,
                        background: message.type === 'success' ? 'rgba(109,122,63,.1)' : 'rgba(138,59,42,.08)',
                        color: message.type === 'success' ? '#5c6a33' : '#8a3b2a',
                      }}>
                      {message.text}
                    </p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="font-display text-xs tracking-widest m-0" style={{ color: '#a08a5c' }}>
                        {searchResults.length} RESULTADO(S)
                      </p>
                      {searchResults.map((user) => (
                        <div key={user.id} className="flex items-center gap-3 p-2.5 rounded-sm"
                          style={{ border: '1px solid rgba(120,94,48,.25)' }}>
                          <Avatar name={user.name} />
                          <p className="flex-1 min-w-0 font-display font-semibold text-[15px] m-0 truncate" style={{ color: 'var(--ink)' }}>{user.name}</p>
                          <button onClick={() => handleSendRequest(user.id)} disabled={actionLoading === user.id}
                            className="btn-gold" style={{ ...smallBtnBase, border: 'none' }}>
                            {actionLoading === user.id ? '…' : '+ AÑADIR'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="font-body italic text-[13.5px] m-0 px-3.5 py-2.5"
                    style={{ border: '1px solid rgba(120,94,48,.3)', background: 'rgba(201,162,39,.08)', color: '#7c6a48' }}>
                    Busca a tus amigos por su nombre de usuario en el juego.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cerrar */}
        <button onClick={() => { soundService.playClick(); onClose(); }}
          className="w-full py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors mt-2"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          CERRAR
        </button>
      </div>
    </div>
  );
};

export default FriendsPanel;
