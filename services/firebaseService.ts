// @ts-ignore - Firebase types will be available after npm install in Vercel
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { Card } from '../types';
import { CARD_DATA } from '../data/cards';
import { shuffleArray } from '../utils/shuffle';
import { canPlaceCard } from '../utils/timelineRules';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTSSEhZV4LSEiNb4R7E9bRYhchZBs9974",
  authDomain: "jwtimeline-d2eb1.firebaseapp.com",
  projectId: "jwtimeline-d2eb1",
  storageBucket: "jwtimeline-d2eb1.firebasestorage.app",
  messagingSenderId: "102921617939",
  appId: "1:102921617939:web:a5e6af3924fd2d0b71b5e6",
  measurementId: "G-Y3R4EB51PN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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

function buildSearchPrefixes(name: string, email?: string | null): string[] {
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

  if (email) {
    const normalizedEmail = normalizeSearchText(email);
    addTokenPrefixes(normalizedEmail);
    addTokenPrefixes(normalizedEmail.split('@')[0] || '');
  }

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
    callback(currentUser);
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
      let errorMessage = 'Error al iniciar sesión con Google';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Inicio de sesión cancelado';
      }
      return { success: false, error: errorMessage };
    }
  },

  // Sign in anonymously (for guests)
  async signInAnonymous(): Promise<string | null> {
    try {
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
    return currentUser?.uid || null;
  },

  getCurrentUserEmail(): string | null {
    return currentUser?.email || null;
  },

  isSignedIn(): boolean {
    return currentUser !== null;
  },

  isRegisteredUser(): boolean {
    return currentUser !== null && !currentUser.isAnonymous;
  },

  // ==================== PROFILE METHODS ====================

  async createUserProfile(userId: string, name: string, email?: string): Promise<boolean> {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        id: userId,
        name,
        nameLower: normalizeSearchText(name),
        searchPrefixes: buildSearchPrefixes(name, email),
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
          searchPrefixes: buildSearchPrefixes(name, email),
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
            searchPrefixes: buildSearchPrefixes(profile.name || 'Jugador', profile.email)
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

  // ==================== FRIENDS METHODS ====================

  // Search users by username or email prefix using Firestore indexes.
  async searchUserByUsername(username: string): Promise<FriendInfo[]> {
    try {
      const searchTerm = normalizeSearchText(username);
      if (searchTerm.length < MIN_SEARCH_LENGTH) return [];

      const usersRef = collection(db, 'users');
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
            email: userData.email,
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
      const friendRef = doc(db, 'users', friendId);
      await updateDoc(friendRef, {
        friendRequests: arrayUnion(userId)
      });
      console.log('[Firebase] Friend request sent');
      return true;
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
      // Add each other as friends
      const userRef = doc(db, 'users', userId);
      const friendRef = doc(db, 'users', friendId);

      await updateDoc(friendRef, {
        friends: arrayUnion(userId)
      });

      await updateDoc(userRef, {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId)
      });

      console.log('[Firebase] Friend request accepted');
      return true;
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
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        friendRequests: arrayRemove(friendId)
      });
      console.log('[Firebase] Friend request rejected');
      return true;
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
      const userRef = doc(db, 'users', userId);
      const friendRef = doc(db, 'users', friendId);

      await updateDoc(userRef, {
        friends: arrayRemove(friendId)
      });

      await updateDoc(friendRef, {
        friends: arrayRemove(userId)
      });

      console.log('[Firebase] Friend removed');
      return true;
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
        const friendRef = doc(db, 'users', friendId);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const data = friendSnap.data();
          friends.push({
            id: data.id,
            name: data.name,
            email: data.email,
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
        const requesterRef = doc(db, 'users', requesterId);
        const requesterSnap = await getDoc(requesterRef);
        if (requesterSnap.exists()) {
          const data = requesterSnap.data();
          requests.push({
            id: data.id,
            name: data.name,
            email: data.email,
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
      const profile = await this.getProfile();
      const inviteRef = doc(collection(db, 'gameInvitations'));

      await setDoc(inviteRef, {
        id: inviteRef.id,
        fromUserId: userId,
        fromUserName: profile?.name || 'Jugador',
        toUserId: friendId,
        gameId: gameId,
        gameMode: gameMode,
        status: 'pending', // pending, accepted, declined, expired
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos para tiempo real
      });

      console.log('[Firebase] Game invitation sent');
      return true;
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
      const inviteRef = doc(db, 'gameInvitations', invitationId);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        return { success: false };
      }

      const data = inviteSnap.data();

      await updateDoc(inviteRef, {
        status: 'accepted'
      });

      console.log('[Firebase] Game invitation accepted');
      return { success: true, gameId: data.gameId, gameMode: data.gameMode };
    } catch (error) {
      console.error('[Firebase] Accept game invitation error:', error);
      return { success: false };
    }
  },

  // Decline game invitation
  async declineGameInvitation(invitationId: string): Promise<boolean> {
    try {
      const inviteRef = doc(db, 'gameInvitations', invitationId);
      await updateDoc(inviteRef, {
        status: 'declined'
      });

      console.log('[Firebase] Game invitation declined');
      return true;
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
      await setDoc(statsRef, {
        id: userId,
        name,
        avatar: avatar || null,
        ...stats,
        accuracy: Math.round(accuracy * 10) / 10,
        winRate: Math.round(winRate * 10) / 10,
        updatedAt: serverTimestamp()
      });

      console.log('[Firebase] User stats updated');
      return true;
    } catch (error) {
      console.error('[Firebase] Update user stats error:', error);
      return false;
    }
  },

  async updateLeaderboard(stats: OnlineStats, name: string, avatar?: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('[Firebase] No user signed in');
      return false;
    }

    try {
      const winRate = stats.totalGames > 0 ? (stats.totalWins / stats.totalGames) * 100 : 0;
      const accuracy = stats.totalPlacements > 0 ? (stats.correctPlacements / stats.totalPlacements) * 100 : 0;
      const score = Math.round((stats.totalWins * 100) + (accuracy * 10) + (stats.bestStreak * 50));

      const leaderboardRef = doc(db, 'leaderboard', userId);
      await setDoc(leaderboardRef, {
        id: userId,
        name,
        avatar: avatar || null,
        score,
        wins: stats.totalWins,
        gamesPlayed: stats.totalGames,
        winRate: Math.round(winRate * 10) / 10,
        bestStreak: stats.bestStreak,
        updatedAt: serverTimestamp()
      });

      console.log('[Firebase] Leaderboard updated, score:', score);
      return true;
    } catch (error) {
      console.error('[Firebase] Update leaderboard error:', error);
      return false;
    }
  },

  async getLeaderboard(maxResults: number = 50): Promise<OnlineLeaderboardEntry[]> {
    try {
      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(leaderboardRef, orderBy('score', 'desc'), limit(maxResults));
      const snapshot = await getDocs(q);

      const entries: OnlineLeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push(doc.data() as OnlineLeaderboardEntry);
      });

      console.log('[Firebase] Leaderboard loaded:', entries.length, 'entries');
      return entries;
    } catch (error) {
      console.error('[Firebase] Get leaderboard error:', error);
      return [];
    }
  },

  async getMyRank(): Promise<number | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const userRef = doc(db, 'leaderboard', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;

      const leaderboardRef = collection(db, 'leaderboard');
      const q = query(leaderboardRef, orderBy('score', 'desc'));
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
    const [statsSynced, leaderboardSynced] = await Promise.all([
      this.updateUserStats(localStats, name, avatar),
      this.updateLeaderboard(localStats, name, avatar)
    ]);
    return statsSynced && leaderboardSynced;
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

  async recordGameHistoryForPlayers(entry: Omit<GameHistoryInput, 'result'>): Promise<boolean> {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId || !entry.playerIds.includes(currentUserId)) return false;

    try {
      await Promise.all(entry.playerIds.map(async (playerId) => {
        const historyRef = doc(collection(db, 'gameHistory'));
        await setDoc(historyRef, {
          ...entry,
          id: historyRef.id,
          userId: playerId,
          result: entry.winnerId === playerId ? 'win' : 'loss',
          finishedAt: entry.finishedAt || serverTimestamp(),
          createdAt: serverTimestamp()
        });
      }));

      console.log('[Firebase] Game history recorded for players');
      return true;
    } catch (error) {
      console.error('[Firebase] Record players history error:', error);
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
    const userId = this.getCurrentUserId();
    if (!userId) return { success: false };

    try {
      const profile = await this.getProfile();
      const opponentRef = doc(db, 'users', opponentId);
      const opponentSnap = await getDoc(opponentRef);

      if (!opponentSnap.exists()) return { success: false };

      const opponentData = opponentSnap.data();
      const gameRef = doc(collection(db, 'turnBasedGames'));
      const shuffledDeck = shuffleArray(CARD_DATA);
      const initialTimelineCard = shuffledDeck.pop();
      if (!initialTimelineCard) return { success: false };

      const playerHands: { [playerId: string]: Card[] } = {
        [userId]: [],
        [opponentId]: [],
      };

      for (let i = 0; i < 4; i++) {
        const userCard = shuffledDeck.pop();
        const opponentCard = shuffledDeck.pop();
        if (userCard) playerHands[userId].push(userCard);
        if (opponentCard) playerHands[opponentId].push(opponentCard);
      }

      const gameData: TurnBasedGame = {
        id: gameRef.id,
        playerIds: [userId, opponentId],
        players: [
          { id: userId, name: profile?.name || 'Jugador 1' },
          { id: opponentId, name: opponentData.name || 'Jugador 2' }
        ],
        currentTurnPlayerId: userId, // Creator goes first
        timeline: [initialTimelineCard],
        deck: shuffledDeck,
        playerHands,
        discardPile: [],
        status: 'active',
        winnerId: null,
        lastMoveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        turnTimeLimit: 24 * 60 * 60 * 1000, // 24 horas por turno
        moveCount: 0
      };

      await setDoc(gameRef, gameData);

      // Send notification to opponent
      await this.sendGameInvitation(opponentId, gameRef.id, 'turnbased');

      console.log('[Firebase] Turn-based game created');
      return { success: true, gameId: gameRef.id };
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

    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as TurnBasedGame);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  },

  // Make a move in turn-based game
  async makeTurnBasedMove(gameId: string, cardId: number, timelineIndex: number): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const gameRef = doc(db, 'turnBasedGames', gameId);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) return false;

      const game = gameSnap.data() as TurnBasedGame;

      if (game.status !== 'active' || game.currentTurnPlayerId !== userId) return false;
      if (!Number.isInteger(timelineIndex) || timelineIndex < 0 || timelineIndex > game.timeline.length) return false;

      const currentHand = [...(game.playerHands[userId] || [])];
      const cardToPlace = currentHand.find(card => card.id === cardId);
      if (!cardToPlace) return false;

      const isCorrect = canPlaceCard(cardToPlace, game.timeline, timelineIndex);
      const nextHand = currentHand.filter(card => card.id !== cardId);
      const nextTimeline = [...game.timeline];
      const nextDeck = [...game.deck];
      const nextDiscardPile = [...game.discardPile];
      let winnerId: string | null = null;
      let nextStatus: TurnBasedGame['status'] = 'active';

      if (isCorrect) {
        nextTimeline.splice(timelineIndex, 0, cardToPlace);
      } else {
        nextDiscardPile.unshift(cardToPlace);
        const drawnCard = nextDeck.pop();
        if (drawnCard) {
          nextHand.push(drawnCard);
        }
      }

      if (nextHand.length === 0) {
        winnerId = userId;
        nextStatus = 'finished';
      }

      const otherPlayerId = game.players.find(p => p.id !== userId)?.id || userId;
      const nextPlayerHands = {
        ...game.playerHands,
        [userId]: nextHand,
      };
      const nextMoveCount = (game.moveCount || 0) + 1;

      await updateDoc(gameRef, {
        currentTurnPlayerId: nextStatus === 'finished' ? userId : otherPlayerId,
        timeline: nextTimeline,
        deck: nextDeck,
        playerHands: nextPlayerHands,
        discardPile: nextDiscardPile,
        status: nextStatus,
        winnerId,
        lastMoveAt: serverTimestamp(),
        moveCount: nextMoveCount
      });

      if (nextStatus === 'finished') {
        await this.recordGameHistoryForPlayers({
          playerIds: game.playerIds || game.players.map(player => player.id),
          players: game.players,
          mode: 'turnbased',
          winnerId,
          winnerName: game.players.find(player => player.id === winnerId)?.name || null,
          deckId: 'complete',
          durationSeconds: null,
          cardsPlaced: nextMoveCount,
          correctPlacements: Math.max(0, nextTimeline.length - 1),
          incorrectPlacements: nextDiscardPile.length,
          timelineLength: nextTimeline.length,
          moveCount: nextMoveCount
        });
      }

      console.log('[Firebase] Turn-based move made');
      return true;
    } catch (error) {
      console.error('[Firebase] Make turn-based move error:', error);
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

// Turn-based game type
export interface TurnBasedGame {
  id: string;
  playerIds: string[];
  players: { id: string; name: string }[];
  currentTurnPlayerId: string;
  timeline: Card[];
  deck: Card[];
  playerHands: { [playerId: string]: Card[] };
  discardPile: Card[];
  status: 'active' | 'finished';
  winnerId: string | null;
  lastMoveAt: any;
  createdAt: any;
  turnTimeLimit: number;
  moveCount: number;
}

export default firebaseService;
