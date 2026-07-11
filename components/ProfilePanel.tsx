import React, { useState, useEffect } from 'react';
import { profileService } from '../services/profileService';
import { statsService } from '../services/statsService';
import { soundService } from '../services/soundService';
import { firebaseService } from '../services/firebaseService';
import { PlayerLevel } from '../types';

// ============================================================
// JW Timeline — ProfilePanel premium
// Sustituye components/ProfilePanel.tsx. Misma API y lógica
// (crear perfil, editar nombre + sincronización con Firestore,
// progreso de nivel, niveles, estadísticas). Estilo pergamino.
// Requiere public/premium.css (.parchment-panel, .btn-gold, fuentes).
// ============================================================

interface ProfilePanelProps {
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

const labelStyle: React.CSSProperties = { color: '#a08a5c' };

const ProfilePanel: React.FC<ProfilePanelProps> = ({ onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [hasProfile, setHasProfile] = useState(profileService.hasProfile());
  const [isLoggedIn, setIsLoggedIn] = useState(firebaseService.isRegisteredUser());

  const summary = profileService.getProfileSummary();
  const stats = statsService.loadStats();
  const allLevels = profileService.getAllLevels();

  useEffect(() => {
    setEditName(summary.name);
  }, [summary.name]);

  useEffect(() => {
    const unsubscribe = firebaseService.onAuthStateChange((user) => {
      setIsLoggedIn(Boolean(user && !user.isAnonymous));
    });
    return unsubscribe;
  }, []);

  // El nombre debe guardarse también en la cuenta (Firestore): si solo se
  // cambia en localStorage, al entrar desde otro navegador vuelve "Jugador".
  const pushNameToCloud = (name: string) => {
    if (firebaseService.isRegisteredUser()) {
      void firebaseService.saveProfile(name);
      void firebaseService.pushPlayerDataToCloud();
    }
  };

  const handleCreateProfile = () => {
    const name = editName.trim();
    if (name) {
      profileService.createProfile(name);
      pushNameToCloud(name);
      setHasProfile(true);
      setIsEditing(false);
      soundService.playCorrect();
    }
  };

  const handleSaveName = () => {
    const name = editName.trim();
    if (name) {
      profileService.updateName(name);
      pushNameToCloud(name);
      setIsEditing(false);
      soundService.playClick();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (hasProfile) {
        handleSaveName();
      } else {
        handleCreateProfile();
      }
    }
  };

  const handleSignOut = async () => {
    soundService.playClick();
    await firebaseService.signOutUser();
    // El nombre local venía sincronizado de la cuenta; al cerrar sesión
    // se restaura el genérico para que la Home no muestre el perfil.
    profileService.updateName('Jugador');
    onClose();
  };

  const renderLevelBadge = (level: PlayerLevel & { unlocked: boolean }) => (
    <div
      key={level.level}
      className="flex items-center gap-2 p-2 rounded-sm"
      style={{
        border: level.unlocked ? '1px solid #a8853c' : '1px solid rgba(120,94,48,.25)',
        background: level.unlocked ? 'rgba(201,162,39,.12)' : 'none',
        opacity: level.unlocked ? 1 : 0.5,
      }}
    >
      <span className="text-xl">{level.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-[13px] m-0 truncate"
          style={{ color: level.unlocked ? '#8a6a2a' : '#9a8c6e' }}>
          {level.title}
        </p>
        <p className="font-body text-xs m-0" style={{ color: '#a08a5c' }}>Nivel {level.level}</p>
      </div>
      {level.unlocked && <span style={{ color: '#6d7a3f' }}>✓</span>}
    </div>
  );

  // ---------- Pantalla de creación de perfil ----------
  if (!hasProfile) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
        style={{ background: 'rgba(20,14,6,.75)' }} onClick={onClose}>
        <div className="parchment-panel w-full max-w-md px-9 py-8"
          onClick={(e) => e.stopPropagation()}>
          <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>Crear perfil</h2>
          <p className="font-body italic text-base text-center m-0 mb-6" style={{ color: 'var(--gold-dark)' }}>Introduce tu nombre para comenzar</p>

          <label htmlFor="profile-name" className="block font-display text-xs tracking-widest mb-1.5" style={labelStyle}>TU NOMBRE</label>
          <input id="profile-name" type="text" value={editName} maxLength={20} autoFocus
            onChange={(e) => setEditName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Escribe tu nombre..." style={inputStyle} className="mb-6" />

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors"
              style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
              CANCELAR
            </button>
            <button onClick={handleCreateProfile} disabled={!editName.trim()}
              className="btn-gold flex-[2] py-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
              CREAR PERFIL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Panel de perfil ----------
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
      style={{ background: 'rgba(20,14,6,.75)' }} onClick={onClose}>
      <div className="parchment-panel w-full max-w-lg px-9 md:px-10 py-8 my-4"
        onClick={(e) => e.stopPropagation()}>

        {/* Cabecera: nombre + nivel */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
            style={{ border: '2px solid #a8853c', background: 'rgba(201,162,39,.12)', boxShadow: '0 0 14px rgba(201,162,39,.18)' }}>
            {summary.level.icon}
          </div>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex gap-2">
                <input type="text" value={editName} maxLength={20} autoFocus
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  style={{ ...inputStyle, padding: '7px 11px', fontSize: 16 }} className="flex-1 min-w-0" />
                <button onClick={handleSaveName}
                  className="btn-gold px-3 text-[13px] cursor-pointer">✓</button>
                <button onClick={() => { setIsEditing(false); setEditName(summary.name); }}
                  className="px-3 font-display text-[13px] rounded-sm cursor-pointer"
                  style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-2xl tracking-wide m-0 truncate" style={{ color: 'var(--ink)' }}>{summary.name}</h2>
                <button onClick={() => setIsEditing(true)} title="Editar nombre"
                  className="cursor-pointer p-1 transition-opacity hover:opacity-100"
                  style={{ background: 'none', border: 'none', opacity: .55 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a6a2a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                </button>
              </div>
            )}
            <p className="font-body italic text-base m-0" style={{ color: 'var(--gold-dark)' }}>
              {summary.level.title} · Nivel {summary.level.level}
            </p>
          </div>
        </div>

        {/* Progreso de nivel */}
        {summary.progress ? (
          <div className="mt-5">
            <div className="flex justify-between font-display text-[11px] tracking-widest mb-1.5" style={labelStyle}>
              <span>PROGRESO AL SIGUIENTE NIVEL</span>
              <span>{summary.progress.current} / {summary.progress.next}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(120,94,48,.18)', border: '1px solid rgba(120,94,48,.3)' }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.progress.percentage}%`, background: 'linear-gradient(90deg, #c9a227, #a8853c)' }} />
            </div>
          </div>
        ) : (
          <p className="font-display font-semibold text-sm tracking-wider text-center mt-5 m-0" style={{ color: '#8a6a2a' }}>
            ★ NIVEL MÁXIMO ALCANZADO ★
          </p>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-2 mt-5 py-4"
          style={{ borderTop: '1px solid rgba(120,94,48,.25)', borderBottom: '1px solid rgba(120,94,48,.25)' }}>
          <div className="text-center">
            <p className="font-display font-bold text-2xl m-0" style={{ color: 'var(--ink)' }}>{stats.gamesWon}</p>
            <p className="font-display text-[11px] tracking-widest m-0" style={labelStyle}>VICTORIAS</p>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid rgba(120,94,48,.2)', borderRight: '1px solid rgba(120,94,48,.2)' }}>
            <p className="font-display font-bold text-2xl m-0" style={{ color: 'var(--ink)' }}>{stats.gamesPlayed}</p>
            <p className="font-display text-[11px] tracking-widest m-0" style={labelStyle}>PARTIDAS</p>
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-2xl m-0" style={{ color: 'var(--ink)' }}>{statsService.getAccuracy(stats).toFixed(0)}%</p>
            <p className="font-display text-[11px] tracking-widest m-0" style={labelStyle}>PRECISIÓN</p>
          </div>
        </div>

        {/* Niveles */}
        <p className="font-display text-xs tracking-widest mt-5 m-0 mb-2" style={labelStyle}>NIVELES</p>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
          {allLevels.map(renderLevelBadge)}
        </div>

        {/* Info de perfil */}
        <div className="font-body text-[13.5px] mt-5 pt-4" style={{ borderTop: '1px solid rgba(120,94,48,.25)', color: '#7c6a48' }}>
          <div className="flex justify-between">
            <span>Miembro desde</span>
            <span style={{ color: 'var(--ink)' }}>{summary.memberSince}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Última partida</span>
            <span style={{ color: 'var(--ink)' }}>{summary.lastPlayed}</span>
          </div>
        </div>

        {isLoggedIn && (
          <button onClick={handleSignOut}
            className="w-full py-3 text-[13px] mt-6 font-display tracking-wider rounded-sm cursor-pointer"
            style={{ background: 'none', border: '1px solid rgba(138,59,42,.45)', color: '#8a3b2a' }}>
            CERRAR SESIÓN
          </button>
        )}

        {/* Cerrar */}
        <button onClick={onClose} className={`btn-gold w-full py-3 text-[13px] ${isLoggedIn ? 'mt-3' : 'mt-6'}`}>
          CERRAR
        </button>
      </div>
    </div>
  );
};

export default ProfilePanel;
