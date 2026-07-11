import React, { useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { soundService } from '../services/soundService';

// ============================================================
// JW Timeline — AuthPanel premium
// Sustituye components/AuthPanel.tsx. Misma API y lógica
// (login / registro con email, Google Sign-In, validaciones).
// Estilo pergamino. Requiere public/premium.css.
// ============================================================

interface AuthPanelProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register';

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,.45)', color: '#2b2013',
  padding: '11px 13px', borderRadius: 3,
  border: '1px solid rgba(120,94,48,.4)', outline: 'none',
  fontFamily: "'EB Garamond', serif", fontSize: 17,
};

const labelClass = 'block font-display text-xs tracking-widest mb-1.5';
const labelStyle: React.CSSProperties = { color: '#a08a5c' };

const AuthPanel: React.FC<AuthPanelProps> = ({ onClose, onSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    soundService.playClick();

    try {
      if (mode === 'register') {
        // Validation
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        if (!displayName.trim()) {
          setError('El nombre es obligatorio');
          setLoading(false);
          return;
        }

        const result = await firebaseService.registerWithEmail(email, password, displayName.trim());
        if (result.success) {
          soundService.playCorrect();
          onSuccess();
        } else {
          setError(result.error || 'Error al registrar');
          soundService.playIncorrect();
        }
      } else {
        const result = await firebaseService.signInWithEmail(email, password);
        if (result.success) {
          soundService.playCorrect();
          onSuccess();
        } else {
          setError(result.error || 'Error al iniciar sesión');
          soundService.playIncorrect();
        }
      }
    } catch (err) {
      setError('Error inesperado');
      soundService.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    soundService.playClick();

    try {
      const result = await firebaseService.signInWithGoogle();
      if (result.success) {
        soundService.playCorrect();
        onSuccess();
      } else {
        setError(result.error || 'Error al iniciar sesión con Google');
        soundService.playIncorrect();
      }
    } catch (err) {
      setError('Error inesperado');
      soundService.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    soundService.playClick();
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
      style={{ background: 'rgba(20,14,6,.75)' }}
      onClick={() => { soundService.playClick(); onClose(); }}>
      <div className="parchment-panel w-full max-w-md px-9 md:px-10 py-8 my-4"
        onClick={(e) => e.stopPropagation()}>

        <h2 className="font-display font-bold text-2xl text-center tracking-wider m-0 mb-1" style={{ color: 'var(--ink)' }}>
          {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="font-body italic text-base text-center m-0 mb-6" style={{ color: 'var(--gold-dark)' }}>
          {mode === 'login' ? 'Continúa tu travesía' : 'Guarda tu progreso'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className={labelClass} style={labelStyle}>NOMBRE DE JUGADOR</label>
              <input id="auth-name" type="text" value={displayName} required disabled={loading}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Tu nombre" style={inputStyle} />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className={labelClass} style={labelStyle}>EMAIL</label>
            <input id="auth-email" type="email" value={email} required disabled={loading}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com" style={inputStyle} />
          </div>

          <div>
            <label htmlFor="auth-password" className={labelClass} style={labelStyle}>CONTRASEÑA</label>
            <input id="auth-password" type="password" value={password} required minLength={6} disabled={loading}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" style={inputStyle} />
          </div>

          {mode === 'register' && (
            <div>
              <label htmlFor="auth-confirm" className={labelClass} style={labelStyle}>CONFIRMAR CONTRASEÑA</label>
              <input id="auth-confirm" type="password" value={confirmPassword} required minLength={6} disabled={loading}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" style={inputStyle} />
            </div>
          )}

          {error && (
            <p className="font-body italic text-[13.5px] m-0 px-3.5 py-2.5"
              style={{ border: '1px solid rgba(138,59,42,.4)', background: 'rgba(138,59,42,.08)', color: '#8a3b2a' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="btn-gold w-full py-3 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'CARGANDO…' : (mode === 'login' ? 'INICIAR SESIÓN' : 'REGISTRARSE')}
          </button>
        </form>

        {/* Separador */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1" style={{ borderTop: '1px solid rgba(120,94,48,.3)' }}></div>
          <span className="font-body italic text-sm" style={{ color: '#a08a5c' }}>o</span>
          <div className="flex-1" style={{ borderTop: '1px solid rgba(120,94,48,.3)' }}></div>
        </div>

        {/* Google */}
        <button onClick={handleGoogleSignIn} disabled={loading}
          className="w-full py-3 font-display font-semibold text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[rgba(201,162,39,.08)]"
          style={{ background: 'rgba(255,255,255,.45)', border: '1px solid rgba(120,94,48,.4)', color: 'var(--ink)' }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          CONTINUAR CON GOOGLE
        </button>

        {/* Cambiar modo */}
        <button onClick={toggleMode} disabled={loading}
          className="block w-full text-center font-body italic text-[14.5px] mt-4 cursor-pointer transition-opacity hover:opacity-100"
          style={{ background: 'none', border: 'none', color: 'var(--gold-dark)', opacity: .85 }}>
          {mode === 'login'
            ? '¿No tienes cuenta? Regístrate'
            : '¿Ya tienes cuenta? Inicia sesión'}
        </button>

        {/* Beneficios */}
        <p className="font-body text-[13px] text-center m-0 mt-5 pt-4"
          style={{ borderTop: '1px solid rgba(120,94,48,.25)', color: '#7c6a48' }}>
          Al registrarte podrás sincronizar estadísticas, añadir amigos y jugar partidas por turnos.
        </p>

        {/* Cerrar */}
        <button onClick={() => { soundService.playClick(); onClose(); }}
          className="w-full py-3 font-display text-[13px] tracking-wider rounded-sm cursor-pointer transition-colors mt-4"
          style={{ background: 'none', border: '1px solid rgba(120,94,48,.3)', color: '#a08a5c' }}>
          CERRAR
        </button>
      </div>
    </div>
  );
};

export default AuthPanel;
