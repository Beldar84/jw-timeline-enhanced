import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc, onSnapshot } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { Card } from '../types';
import { statsService } from './statsService';
import { profileService } from './profileService';
import { callCloudFunction, firebaseAuth as auth, firestoreDb as db, googleProvider } from './firebaseClient';

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_PREFIX_LENGTH = 24;

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function buildSearchPrefixes(name: string): string[] {
  const prefixes = new Set<string>();
  const addTokenPrefixes = (value: string) => {
    const normalized = normalizeSearchText(value);
    if (!normalized) return;

    const maxLength = Math.min(normalized.length, MAX_SEARCH_PREFIX_LENGTH);
    for (let length = MIN_SEARCH_LENGTH; length <= maxLength; length++) {
      prefixes.add(normalized.slice(0, length));
    }
  };

  addTokenPrefixes(name);
  normalizeSearchText(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .forEach(addTokenPrefixes);

  return Array.from(prefixes);
}

// Set persistence to local (survives browser restarts - about 1 month)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Types
export interface OnlineUserProfile {
  id: string;
  name: string;
  nameLower?: string;
  searchPrefixes?: string[];
  email?: string;
  avatar?: string;
  friends: string[];
  friendRequests: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OnlineLeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  score: number;
  wins: number;
  gamesPlayed: number;
  winRate: number;
  bestStreak: number;
  updatedAt: Timestamp;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'allTime';

function getLeaderboardPeriodKey(period: LeaderboardPeriod, date: Date = new Date()): string {
  if (period === 'allTime') return 'all';
  if (period === 'monthly') return date.toISOString().slice(0, 7);
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = monday.getUTCDay() || 7;
  monday.setUTCDate(monday.getUTCDate() - day + 1);
  return monday.toISOString().slice(0, 10);
}

function createHiddenCards(count: number): Card[] {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    id: -(index + 1),
    name: 'Carta oculta',
    year: 0,
    imageUrl: '',
  }));
}

export interface OnlineStats {
  totalWins: number;
  totalGames: number;
  totalPlacements: number;
  correctPlacements: number;
  bestStreak: number;
  currentStreak: number;
}

export interface OnlineUserStats extends OnlineStats {
  id: string;
  name: string;
  avatar?: string;
  accuracy: number;
  winRate: number;
  updatedAt: Timestamp;
}

export interface FriendInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  online?: boolean;
}

export interface GameInvitation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  gameId: string;
  gameMode: 'realtime' | 'turnbased';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: any;
  expiresAt: any;
}

export interface GameHistoryPlayer {
  id: string;
  name: string;
}

export interface GameHistoryEntry {
  id: string;
  userId: string;
  playerIds: string[];
  players: GameHistoryPlayer[];
  mode: 'local' | 'ai' | 'realtime' | 'turnbased';
  result: 'win' | 'loss';
  winnerId: string | null;
  winnerName?: string | null;
  deckId?: string | null;
  durationSeconds?: number | null;
  cardsPlaced?: number;
  correctPlacements?: number;
  incorrectPlacements?: number;
  timelineLength?: number;
  moveCount?: number;
  createdAt: any;
  finishedAt: any;
}

export type GameHistoryInput = Omit<GameHistoryEntry, 'id' | 'userId' | 'createdAt' | 'finishedAt'> & {
  finishedAt?: any;
};

// Auth state
let currentUser: User | null = null;
let authStateListeners: ((user: User | null) => void)[] = [];

// Initialize auth listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log('[Firebase] Auth state changed:', user?.uid || 'signed out', user?.email || '');
  // Notify all listeners
  authStateListeners.forEach(listener => listener(user));
});

// Firebase Service
export const firebaseService = {
  // ==================== AUTH METHODS ====================

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    authStateListeners.push(callback);
    // Call immediately with current state
    callback(currentUser || auth.currentUser);
    // Return unsubscribe function
    return () => {
      authStateListeners = authStateListeners.filter(l => l !== callback);
    };
  },

  // Register with email and password
  async registerWithEmail(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      currentUser = result.user;

      // Create user profile in Firestore
      await this.createUserProfile(result.user.uid, displayName, email);

      console.log('[Firebase] Registered with email:', email);
      return { success: true };
    } catch (error: any) {
      console.error('[Firebase] Registration error:', error);
      let errorMessage = 'Error al registrar';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      }
      return { success: false, error: errorMessage };
    }
  },

  // Sign in with email and password
  async signInWithEmail(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      currentUser = result.user;
      console.log('[Firebase] Signed in with email:', email);
      return { success: true };
    } catch (error: any) {
      console.error('[Firebase] Sign in error:', error);
      let errorMessage = 'Error al iniciar sesión';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Email o contraseña incorrectos';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intenta más tarde';
      }
      return { success: false, error: errorMessage };
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      currentUser = result.user;

      // Check if user profile exists, if not create it
      const profile = await this.getProfile();
      if (!profile) {
        await this.createUserProfile(
          result.user.uid,
          result.user.displayName || 'Jugador',
          result.user.email || undefined
        );
      }

      console.log('[Firebase] Signed in with Google:', result.user.email);
      return { success: true };
    } catch (error: any) {
      console.error('[Firebase] Google sign in error:', error);

      // Muchos navegadores móviles bloquean los popups: usar redirect como fallback.
      // getRedirectResult() (al inicializar el módulo) completa el flujo al volver.
      const popupBlockedCodes = [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
      ];
      if (popupBlockedCodes.includes(error.code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return { success: true }; // La página navegará al flujo de Google
        } catch (redirectError) {
          console.error('[Firebase] Google redirect sign in error:', redirectError);
        }
      }

      let errorMessage = 'Error al iniciar sesión con Google';
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = 'Inicio de sesión cancelado';
      } else if (error.code === 'auth/unauthorized-domain') {
        // El dominio desde el que se sirve la app no está autorizado en Firebase.
        // Consola Firebase → Authentication → Settings → Authorized domains.
        errorMessage = `Este dominio (${window.location.hostname}) no está autorizado en Firebase Authentication`;
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'El proveedor Google no está habilitado en Firebase Authentication';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Fallo de red al conectar con Google. Revisa tu conexión';
      } else if (error.code) {
        // Mostrar el código real para poder diagnosticar problemas en dispositivos
        errorMessage = `Error al iniciar sesión con Google (${error.code})`;
      }
      return { success: false, error: errorMessage };
    }
  },

  // Sign in anonymously (for guests)
  async signInAnonymous(): Promise<string | null> {
    try {
      const existingUser = currentUser || auth.currentUser;
      if (existingUser) return existingUser.uid;
      const result = await signInAnonymously(auth);
      currentUser = result.user;
      console.log('[Firebase] Signed in anonymously:', result.user.uid);
      return result.user.uid;
    } catch (error) {
      console.error('[Firebase] Anonymous sign in error:', error);
      return null;
    }
  },

  // Sign out
  async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
      currentUser = null;
      console.log('[Firebase] Signed out');
    } catch (error) {
      console.error('[Firebase] Sign out error:', error);
    }
  },

  getCurrentUserId(): string | null {
    return (currentUser || auth.currentUser)?.uid || null;
  },

  getCurrentUserEmail(): string | null {
    return (currentUser || auth.currentUser)?.email || null;
  },

  isSignedIn(): boolean {
    return Boolean(currentUser || auth.currentUser);
  },

  isRegisteredUser(): boolean {
    const user = currentUser || auth.currentUser;
    return Boolean(user && !user.isAnonymous);
  },

  // ==================== PROFILE METHODS ====================

  async createUserProfile(userId: string, name: string, email?: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        id: userId,
        name,
        nameLower: normalizeSearchText(name),
        searchPrefixes: buildSearchPrefixes(name),
        email: email || null,
        avatar: null,
        friends: [],
        friendRequests: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[Firebase] User profile created');
      return true;
    } catch (error) {
      console.error('[Firebase] Create profile error:', error);
      return false;
    }
  },

  async saveProfile(name: string, avatar?: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('[Firebase] No user signed in');
      return false;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const existing = await getDoc(userRef);
      const email = this.getCurrentUserEmail();

      if (existing.exists()) {
        await setDoc(userRef, {
          name,
          nameLower: normalizeSearchText(name),
          searchPrefixes: buildSearchPrefixes(name),
          avatar: avatar || null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await this.createUserProfile(userId, name, email || undefined);
      }

      console.log('[Firebase] Profile saved');
      return true;
    } catch (error) {
      console.error('[Firebase] Save profile error:', error);
      return false;
    }
  },

  async getProfile(): Promise<OnlineUserProfile | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const userRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userRef);

      if (snapshot.exists()) {
        const profile = snapshot.data() as OnlineUserProfile;
        if (!Array.isArray(profile.searchPrefixes)) {
          await setDoc(userRef, {
            nameLower: normalizeSearchText(profile.name || 'Jugador'),
            searchPrefixes: buildSearchPrefixes(profile.name || 'Jugador')
          }, { merge: true });
        }
        return profile;
      }
      return null;
    } catch (error) {
      console.error('[Firebase] Get profile error:', error);
      return null;
    }
  },

  async refreshPublicProfile(): Promise<boolean> {
    if (!this.isRegisteredUser()) return false;
    try {
      const result = await callCloudFunction<Record<string, never>, { success: boolean }>('refreshPublicProfile', {});
      return result.success;
    } catch (error) {
      console.error('[Firebase] Refresh public profile error:', error);
      return false;
    }
  },

  // ==================== FRIENDS METHODS ====================

  // Search the public projection by display-name prefix. Email addresses and
  // friend lists remain in the private users collection.
  async searchUserByUsername(username: string): Promise<FriendInfo[]> {
    try {
      const searchTerm = normalizeSearchText(username);
      if (searchTerm.length < MIN_SEARCH_LENGTH) return [];

      const usersRef = collection(db, 'publicProfiles');
      const usersQuery = query(
        usersRef,
        where('searchPrefixes', 'array-contains', searchTerm.slice(0, MAX_SEARCH_PREFIX_LENGTH)),
        limit(10)
      );
      const snapshot = await getDocs(usersQuery);

      const results: FriendInfo[] = [];
      const currentUserId = this.getCurrentUserId();

      snapshot.docs.forEach(doc => {
        const userData = doc.data();

        if (userData.id !== currentUserId) {
          results.push({
            id: userData.id,
            name: userData.name,
            avatar: userData.avatar
          });
        }
      });

      return results;
    } catch (error) {
      console.error('[Firebase] Search user error:', error);
      return [];
    }
  },

  // Send friend request
  async sendFriendRequest(friendId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId || userId === friendId) return false;

    try {
      const result = await callCloudFunction<{ friendId: string }, { success: boolean }>(
        'sendFriendRequest',
        { friendId }
      );
      return result.success;
    } catch (error) {
      console.error('[Firebase] Send friend request error:', error);
      return false;
    }
  },

  // Accept friend request
  async acceptFriendRequest(friendId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const result = await callCloudFunction<
        { friendId: string; accept: boolean },
        { success: boolean }
      >('respondFriendRequest', { friendId, accept: true });
      return result.success;
    } catch (error) {
      console.error('[Firebase] Accept friend request error:', error);
      return false;
    }
  },

  // Reject friend request
  async rejectFriendRequest(friendId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const result = await callCloudFunction<
        { friendId: string; accept: boolean },
        { success: boolean }
      >('respondFriendRequest', { friendId, accept: false });
      return result.success;
    } catch (error) {
      console.error('[Firebase] Reject friend request error:', error);
      return false;
    }
  },

  // Remove friend
  async removeFriend(friendId: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const result = await callCloudFunction<{ friendId: string }, { success: boolean }>(
        'removeFriend',
        { friendId }
      );
      return result.success;
    } catch (error) {
      console.error('[Firebase] Remove friend error:', error);
      return false;
    }
  },

  // Get friends list
  async getFriends(): Promise<FriendInfo[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const profile = await this.getProfile();
      if (!profile || !profile.friends || profile.friends.length === 0) return [];

      const friends: FriendInfo[] = [];
      for (const friendId of profile.friends) {
        const friendRef = doc(db, 'publicProfiles', friendId);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const data = friendSnap.data();
          friends.push({
            id: data.id,
            name: data.name,
            avatar: data.avatar
          });
        }
      }

      return friends;
    } catch (error) {
      console.error('[Firebase] Get friends error:', error);
      return [];
    }
  },

  // Get pending friend requests
  async getFriendRequests(): Promise<FriendInfo[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const profile = await this.getProfile();
      if (!profile || !profile.friendRequests || profile.friendRequests.length === 0) return [];

      const requests: FriendInfo[] = [];
      for (const requesterId of profile.friendRequests) {
        const requesterRef = doc(db, 'publicProfiles', requesterId);
        const requesterSnap = await getDoc(requesterRef);
        if (requesterSnap.exists()) {
          const data = requesterSnap.data();
          requests.push({
            id: data.id,
            name: data.name,
            avatar: data.avatar
          });
        }
      }

      return requests;
    } catch (error) {
      console.error('[Firebase] Get friend requests error:', error);
      return [];
    }
  },

  // ==================== GAME INVITATIONS ====================

  // Send game invitation to a friend
  async sendGameInvitation(friendId: string, gameId: string, gameMode: 'realtime' | 'turnbased' = 'realtime'): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const result = await callCloudFunction<
        { friendId: string; gameId: string; gameMode: 'realtime' | 'turnbased' },
        { success: boolean }
      >('sendGameInvitation', { friendId, gameId, gameMode });
      return result.success;
    } catch (error) {
      console.error('[Firebase] Send game invitation error:', error);
      return false;
    }
  },

  // Get pending game invitations for current user
  async getGameInvitations(): Promise<GameInvitation[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const invitesRef = collection(db, 'gameInvitations');
      const q = query(
        invitesRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      const invitations: GameInvitation[] = [];
      const now = new Date();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

        // Solo incluir invitaciones no expiradas
        if (expiresAt > now) {
          invitations.push({
            id: data.id,
            fromUserId: data.fromUserId,
            fromUserName: data.fromUserName,
            toUserId: data.toUserId,
            gameId: data.gameId,
            gameMode: data.gameMode,
            status: data.status,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt
          });
        }
      });

      return invitations;
    } catch (error) {
      console.error('[Firebase] Get game invitations error:', error);
      return [];
    }
  },

  // Subscribe to game invitations in real-time
  subscribeToGameInvitations(callback: (invitations: GameInvitation[]) => void): () => void {
    const userId = this.getCurrentUserId();
    if (!userId) return () => {};

    const invitesRef = collection(db, 'gameInvitations');
    const q = query(
      invitesRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invitations: GameInvitation[] = [];
      const now = new Date();

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);

        if (expiresAt > now) {
          invitations.push({
            id: data.id,
            fromUserId: data.fromUserId,
            fromUserName: data.fromUserName,
            toUserId: data.toUserId,
            gameId: data.gameId,
            gameMode: data.gameMode,
            status: data.status,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt
          });
        }
      });

      callback(invitations);
    });

    return unsubscribe;
  },

  // Accept game invitation
  async acceptGameInvitation(invitationId: string): Promise<{ success: boolean; gameId?: string; gameMode?: 'realtime' | 'turnbased' }> {
    try {
      const result = await callCloudFunction<
        { invitationId: string; response: 'accepted' },
        { success: boolean; gameId?: string; gameMode?: 'realtime' | 'turnbased' }
      >('respondGameInvitation', { invitationId, response: 'accepted' });
      return result;
    } catch (error) {
      console.error('[Firebase] Accept game invitation error:', error);
      return { success: false };
    }
  },

  // Decline game invitation
  async declineGameInvitation(invitationId: string): Promise<boolean> {
    try {
      const result = await callCloudFunction<
        { invitationId: string; response: 'declined' },
        { success: boolean }
      >('respondGameInvitation', { invitationId, response: 'declined' });
      return result.success;
    } catch (error) {
      console.error('[Firebase] Decline game invitation error:', error);
      return false;
    }
  },

  // ==================== LEADERBOARD METHODS ====================

  async updateUserStats(stats: OnlineStats, name: string, avatar?: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('[Firebase] No user signed in');
      return false;
    }

    try {
      const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;
      const accuracy = stats.totalPlacements > 0 ? (stats.correctPlacements / stats.totalPlacements) * 100 : 0;

      const statsRef = doc(db, 'userStats', userId);
      // merge:true — el documento también guarda fullStats/perfil (sincronización
      // entre dispositivos) y un setDoc completo los borraría.
      await setDoc(statsRef, {
        id: userId,
        name,
        avatar: avatar || null,
        ...stats,
        accuracy: Math.round(accuracy * 10) / 10,
        winRate: Math.round(winRate * 10) / 10,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log('[Firebase] User stats updated');
      return true;
    } catch (error) {
      console.error('[Firebase] Update user stats error:', error);
      return false;
    }
  },

  async getLeaderboard(maxResults: number = 50, period: LeaderboardPeriod = 'allTime'): Promise<OnlineLeaderboardEntry[]> {
    try {
      const leaderboardRef = collection(db, 'leaderboard');
      const periodKey = getLeaderboardPeriodKey(period);
      const q = period === 'allTime'
        ? query(leaderboardRef, orderBy(`${period}.score`, 'desc'), limit(maxResults))
        : query(
            leaderboardRef,
            where(`${period}.periodKey`, '==', periodKey),
            orderBy(`${period}.score`, 'desc'),
            limit(maxResults)
          );
      const snapshot = await getDocs(q);

      const entries = snapshot.docs.map(snapshot => {
        const data = snapshot.data();
        const bucket = data[period] || {};
        return {
          id: data.id || snapshot.id,
          name: data.name || 'Jugador',
          avatar: data.avatar,
          score: bucket.score || 0,
          wins: bucket.wins || 0,
          gamesPlayed: bucket.gamesPlayed || 0,
          winRate: bucket.winRate || 0,
          bestStreak: bucket.bestStreak || 0,
          updatedAt: data.updatedAt,
        } as OnlineLeaderboardEntry;
      });

      console.log('[Firebase] Leaderboard loaded:', entries.length, 'entries');
      return entries;
    } catch (error) {
      console.error('[Firebase] Get leaderboard error:', error);
      throw error;
    }
  },

  async getMyRank(period: LeaderboardPeriod = 'allTime'): Promise<number | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const userRef = doc(db, 'leaderboard', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;
      const periodKey = getLeaderboardPeriodKey(period);
      if (userSnap.data()?.[period]?.periodKey !== periodKey) return null;

      const leaderboardRef = collection(db, 'leaderboard');
      const q = period === 'allTime'
        ? query(leaderboardRef, orderBy(`${period}.score`, 'desc'))
        : query(
            leaderboardRef,
            where(`${period}.periodKey`, '==', periodKey),
            orderBy(`${period}.score`, 'desc')
          );
      const snapshot = await getDocs(q);

      let rank = 1;
      for (const doc of snapshot.docs) {
        if (doc.id === userId) break;
        rank++;
      }

      return rank;
    } catch (error) {
      console.error('[Firebase] Get rank error:', error);
      return null;
    }
  },

  // Sync local stats to Firebase
  async syncStats(localStats: OnlineStats, name: string, avatar?: string): Promise<boolean> {
    if (!this.isSignedIn()) {
      const userId = await this.signInAnonymous();
      if (!userId) return false;
    }

    await this.saveProfile(name, avatar);
    const statsSynced = await this.updateUserStats(localStats, name, avatar);
    // Guardar también la copia completa (logros, mazos, récords...) para que
    // las estadísticas acompañen a la cuenta en cualquier dispositivo.
    await this.pushPlayerDataToCloud();
    return statsSynced;
  },

  // ==================== SINCRONIZACIÓN PERFIL + ESTADÍSTICAS ====================
  // Antes, perfil y estadísticas vivían SOLO en localStorage: al entrar desde
  // otro navegador/dispositivo la cuenta aparecía vacía (nombre "Jugador",
  // 0 partidas, "miembro desde hoy"), aunque amigos e historial sí estaban en
  // Firestore. Estos dos métodos hacen que viajen con la cuenta.

  // Sube a userStats/{uid} la copia completa de estadísticas y perfil local.
  async pushPlayerDataToCloud(): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId || !this.isRegisteredUser()) return false;

    try {
      const existingCloud = await getDoc(doc(db, 'userStats', userId));
      const cloudStats = existingCloud.exists() ? existingCloud.data()?.fullStats : null;
      const { stats } = cloudStats
        ? statsService.mergeWithCloudStats(cloudStats)
        : { stats: statsService.loadStats() };
      const profile = profileService.getProfile();
      await setDoc(doc(db, 'userStats', userId), {
        id: userId,
        fullStats: JSON.parse(JSON.stringify(stats)),
        profileName: profile?.name || null,
        profileCreatedAt: profile?.createdAt || null,
        profileLastPlayedAt: profile?.lastPlayedAt || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (error) {
      console.error('[Firebase] Push player data error:', error);
      return false;
    }
  },

  // Descarga las estadísticas/perfil de la nube, los combina con los locales
  // y sube el resultado. Llamar al iniciar sesión con una cuenta registrada.
  // Devuelve true si algo cambió en local (para refrescar la interfaz).
  async syncPlayerDataFromCloud(): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId || !this.isRegisteredUser()) return false;

    try {
      const [statsSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'userStats', userId)),
        getDoc(doc(db, 'users', userId))
      ]);

      const cloudData = statsSnap.exists() ? statsSnap.data() : null;
      const userData = userSnap.exists() ? userSnap.data() : null;

      const { localChanged: statsChanged } = statsService.mergeWithCloudStats(cloudData?.fullStats);

      // "Miembro desde": preferir la fecha guardada con el perfil; si no existe,
      // usar la fecha de creación de la cuenta en Firestore.
      const remoteCreatedAt = typeof cloudData?.profileCreatedAt === 'number'
        ? cloudData.profileCreatedAt
        : (typeof userData?.createdAt?.toMillis === 'function' ? userData.createdAt.toMillis() : null);

      const { localChanged: profileChanged, shouldPushName } = profileService.mergeRemoteProfile({
        name: cloudData?.profileName || userData?.name || null,
        createdAt: remoteCreatedAt,
        lastPlayedAt: typeof cloudData?.profileLastPlayedAt === 'number' ? cloudData.profileLastPlayedAt : null
      });

      // Dejar la nube al día con el resultado combinado
      await this.pushPlayerDataToCloud();
      if (shouldPushName) {
        await this.saveProfile(profileService.getName(), userData?.avatar || undefined);
      }
      await this.refreshPublicProfile();

      console.log('[Firebase] Player data synced from cloud');
      return statsChanged || profileChanged;
    } catch (error) {
      console.error('[Firebase] Sync player data from cloud error:', error);
      return false;
    }
  },

  // ==================== GAME HISTORY ====================

  async recordGameHistory(entry: GameHistoryInput): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const historyRef = doc(collection(db, 'gameHistory'));
      await setDoc(historyRef, {
        ...entry,
        id: historyRef.id,
        userId,
        playerIds: Array.from(new Set([userId, ...entry.playerIds])),
        finishedAt: entry.finishedAt || serverTimestamp(),
        createdAt: serverTimestamp()
      });

      console.log('[Firebase] Game history recorded');
      return true;
    } catch (error) {
      console.error('[Firebase] Record game history error:', error);
      return false;
    }
  },

  async getGameHistory(maxResults: number = 20): Promise<GameHistoryEntry[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const historyRef = collection(db, 'gameHistory');
      const historyQuery = query(
        historyRef,
        where('userId', '==', userId),
        orderBy('finishedAt', 'desc'),
        limit(maxResults)
      );
      const snapshot = await getDocs(historyQuery);

      return snapshot.docs.map(doc => doc.data() as GameHistoryEntry);
    } catch (error) {
      console.error('[Firebase] Get game history error:', error);
      return [];
    }
  },

  // ==================== TURN-BASED GAMES ====================

  // Create a turn-based game
  async createTurnBasedGame(opponentId: string): Promise<{ success: boolean; gameId?: string }> {
    try {
      return await callCloudFunction<{ opponentId: string }, { success: boolean; gameId?: string }>(
        'createTurnBasedGame',
        { opponentId }
      );
    } catch (error) {
      console.error('[Firebase] Create turn-based game error:', error);
      return { success: false };
    }
  },

  // Get active turn-based games for current user
  async getTurnBasedGames(): Promise<TurnBasedGame[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const gamesRef = collection(db, 'turnBasedGames');
      const gamesQuery = query(
        gamesRef,
        where('playerIds', 'array-contains', userId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(gamesQuery);

      return snapshot.docs.map(doc => doc.data() as TurnBasedGame);
    } catch (error) {
      console.error('[Firebase] Get turn-based games error:', error);
      return [];
    }
  },

  // Subscribe to a turn-based game
  subscribeToTurnBasedGame(gameId: string, callback: (game: TurnBasedGame | null) => void): () => void {
    const gameRef = doc(db, 'turnBasedGames', gameId);
    const userId = this.getCurrentUserId();
    let latestGame: TurnBasedGame | null = null;
    let ownHand: Card[] = [];
    const emit = () => {
      if (!latestGame) {
        callback(null);
        return;
      }
      const game = latestGame;
      callback({
        ...game,
        playerHands: Object.fromEntries(
          game.players.map(player => [
            player.id,
            player.id === userId
              ? ownHand
              : createHiddenCards(game.handCounts?.[player.id] || 0),
          ])
        ),
        deck: createHiddenCards(game.deckCount ?? game.deck?.length ?? 0),
      });
    };

    const unsubscribeGame = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        latestGame = snapshot.data() as TurnBasedGame;
      } else {
        latestGame = null;
      }
      emit();
    });
    const unsubscribeHand = userId
      ? onSnapshot(doc(db, 'turnBasedGames', gameId, 'hands', userId), snapshot => {
          ownHand = snapshot.exists() ? (snapshot.data().cards || []) as Card[] : [];
          emit();
        })
      : () => {};

    return () => {
      unsubscribeGame();
      unsubscribeHand();
    };
  },

  // Make a move in turn-based game
  async makeTurnBasedMove(gameId: string, cardId: number, timelineIndex: number): Promise<boolean> {
    try {
      const result = await callCloudFunction<
        { gameId: string; cardId: number; timelineIndex: number },
        { success: boolean; expired?: boolean }
      >('makeTurnBasedMove', { gameId, cardId, timelineIndex });
      return result.success;
    } catch (error) {
      console.error('[Firebase] Make turn-based move error:', error);
      return false;
    }
  },

  async claimTurnBasedTimeout(gameId: string): Promise<boolean> {
    try {
      const result = await callCloudFunction<{ gameId: string }, { success: boolean }>(
        'claimTurnBasedTimeout',
        { gameId }
      );
      return result.success;
    } catch (error) {
      console.error('[Firebase] Claim timeout error:', error);
      return false;
    }
  },

  // ==================== PUSH NOTIFICATIONS ====================

  // Request notification permission and get token
  async requestNotificationPermission(): Promise<string | null> {
    try {
      if (!('Notification' in window)) {
        console.log('[Firebase] This browser does not support notifications');
        return null;
      }

      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('[Firebase] Notification permission granted');
        // Note: FCM token would be obtained here with Firebase Cloud Messaging
        // For now, we'll use local notifications
        return 'local-notifications-enabled';
      }

      return null;
    } catch (error) {
      console.error('[Firebase] Notification permission error:', error);
      return null;
    }
  },

  // Save notification token to user profile
  async saveNotificationToken(token: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationToken: token,
        notificationsEnabled: true
      });

      console.log('[Firebase] Notification token saved');
      return true;
    } catch (error) {
      console.error('[Firebase] Save notification token error:', error);
      return false;
    }
  },

  // Send local notification
  showLocalNotification(title: string, body: string, data?: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        tag: 'jw-timeline',
        data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }
};

// Completa el login con Google por redirect (fallback móvil cuando el popup está bloqueado)
getRedirectResult(auth)
  .then(async (result: any) => {
    if (result?.user) {
      currentUser = result.user;
      const profile = await firebaseService.getProfile();
      if (!profile) {
        await firebaseService.createUserProfile(
          result.user.uid,
          result.user.displayName || 'Jugador',
          result.user.email || undefined
        );
      }
      console.log('[Firebase] Signed in with Google (redirect):', result.user.email);
    }
  })
  .catch((error: any) => {
    // No hay redirect pendiente en la mayoría de cargas: ignorar silenciosamente
    if (error?.code && error.code !== 'auth/no-auth-event') {
      console.error('[Firebase] Redirect result error:', error);
    }
  });

// Turn-based game type
export interface TurnBasedGame {
  id: string;
  playerIds: string[];
  players: { id: string; name: string }[];
  currentTurnPlayerId: string;
  timeline: Card[];
  deck: Card[];
  deckCount?: number;
  playerHands: { [playerId: string]: Card[] };
  handCounts?: { [playerId: string]: number };
  discardPile: Card[];
  status: 'pending' | 'active' | 'finished' | 'declined';
  winnerId: string | null;
  lastMoveAt: any;
  expiresAt: any;
  createdAt: any;
  turnTimeLimit: number;
  moveCount: number;
  moveStats?: { [playerId: string]: { placed: number; correct: number; incorrect: number } };
  resultsRecorded?: boolean;
  finishedReason?: 'cards' | 'timeout';
}

export default firebaseService;
