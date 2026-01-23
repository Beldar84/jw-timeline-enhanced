
import React, { useState } from 'react';
import { firebaseService } from '../services/firebaseService';
import { soundService } from '../services/soundService';

interface AuthPanelProps {
  onClose: () => void;
  onSuccess: () => void;
}

type AuthMode = 'login' | 'register';

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {mode === 'login' ? '🔐 Iniciar Sesión' : '📝 Registrarse'}
          </h2>
          <button
            onClick={() => { soundService.playClick(); onClose(); }}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nombre de jugador
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-blue-400 focus:outline-none"
                placeholder="Tu nombre"
                required
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-blue-400 focus:outline-none"
              placeholder="tu@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-blue-400 focus:outline-none"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-lg border-2 border-gray-600 focus:border-blue-400 focus:outline-none"
                placeholder="••••••••"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold rounded-lg transition"
          >
            {loading ? '⏳ Cargando...' : (mode === 'login' ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        {/* Divider */}
        <div className="px-6 flex items-center gap-3">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="text-gray-400 text-sm">o</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Google Sign In */}
        <div className="p-6 pt-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-800 font-bold rounded-lg transition flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="px-6 pb-6 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {mode === 'login'
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>

        {/* Benefits */}
        <div className="bg-gray-900/50 p-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 text-center">
            ✨ Al registrarte podrás: sincronizar estadísticas, añadir amigos, y jugar partidas por turnos
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;
