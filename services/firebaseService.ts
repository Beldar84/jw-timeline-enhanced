// @ts-ignore - Firebase types will be available after npm install in Vercel
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, where, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';

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

// Set persistence to local (survives browser restarts - about 1 month)
setPersistence(auth, browserLocalPersistence).catch(console.error);

// Types
export interface OnlineUserProfile {
  id: string;
  name: string;
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

      if (existing.exists()) {
        await setDoc(userRef, {
          name,
          avatar: avatar || null,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } else {
        await this.createUserProfile(userId, name, this.getCurrentUserEmail() || undefined);
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
        return snapshot.data() as OnlineUserProfile;
      }
      return null;
    } catch (error) {
      console.error('[Firebase] Get profile error:', error);
      return null;
    }
  },

  // ==================== FRIENDS METHODS ====================

  // Search users by username (case-insensitive partial match)
  async searchUserByUsername(username: string): Promise<FriendInfo[]> {
    try {
      const usersRef = collection(db, 'users');
      // Get all users and filter client-side for case-insensitive partial match
      const snapshot = await getDocs(usersRef);

      const searchTerm = username.toLowerCase().trim();
      const results: FriendInfo[] = [];
      const currentUserId = this.getCurrentUserId();

      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        const userName = (userData.name || '').toLowerCase();

        // Match if username contains the search term and is not the current user
        if (userName.includes(searchTerm) && userData.id !== currentUserId) {
          results.push({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatar: userData.avatar
          });
        }
      });

      // Return up to 10 results
      return results.slice(0, 10);
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

      await updateDoc(userRef, {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId)
      });

      await updateDoc(friendRef, {
        friends: arrayUnion(userId)
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
  async acceptGameInvitation(invitationId: string): Promise<{ success: boolean; gameId?: string }> {
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
      return { success: true, gameId: data.gameId };
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
    return await this.updateLeaderboard(localStats, name, avatar);
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

      const gameData: TurnBasedGame = {
        id: gameRef.id,
        players: [
          { id: userId, name: profile?.name || 'Jugador 1' },
          { id: opponentId, name: opponentData.name || 'Jugador 2' }
        ],
        currentTurnPlayerId: userId, // Creator goes first
        timeline: [],
        deck: [], // Will be populated when game starts
        playerHands: {},
        discardPile: [],
        status: 'waiting', // waiting, active, finished
        winnerId: null,
        lastMoveAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        turnTimeLimit: 24 * 60 * 60 * 1000 // 24 horas por turno
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
      const snapshot = await getDocs(gamesRef);

      const games: TurnBasedGame[] = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Check if user is a player in this game
        if (data.players?.some((p: any) => p.id === userId) && data.status !== 'finished') {
          games.push(data as TurnBasedGame);
        }
      });

      return games;
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

      // Verify it's this player's turn
      if (game.currentTurnPlayerId !== userId) return false;

      // TODO: Implement game logic here (validate placement, update timeline, etc.)
      // For now, just update the turn

      const otherPlayerId = game.players.find(p => p.id !== userId)?.id;

      await updateDoc(gameRef, {
        currentTurnPlayerId: otherPlayerId,
        lastMoveAt: serverTimestamp()
      });

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
  players: { id: string; name: string }[];
  currentTurnPlayerId: string;
  timeline: any[];
  deck: any[];
  playerHands: { [playerId: string]: any[] };
  discardPile: any[];
  status: 'waiting' | 'active' | 'finished';
  winnerId: string | null;
  lastMoveAt: any;
  createdAt: any;
  turnTimeLimit: number;
}

export default firebaseService;
