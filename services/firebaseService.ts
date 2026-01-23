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
  }
};

export default firebaseService;
