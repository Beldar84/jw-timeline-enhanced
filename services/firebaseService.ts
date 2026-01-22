// @ts-ignore - Firebase types will be available after npm install in Vercel
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
// @ts-ignore
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

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

// Types
export interface OnlineUserProfile {
  id: string;
  name: string;
  avatar?: string;
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

// Auth state
let currentUser: User | null = null;

// Initialize auth listener
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  console.log('[Firebase] Auth state changed:', user?.uid || 'signed out');
});

// Firebase Service
export const firebaseService = {
  // Auth methods
  async signInAnonymous(): Promise<string | null> {
    try {
      const result = await signInAnonymously(auth);
      currentUser = result.user;
      console.log('[Firebase] Signed in anonymously:', result.user.uid);
      return result.user.uid;
    } catch (error) {
      console.error('[Firebase] Sign in error:', error);
      return null;
    }
  },

  getCurrentUserId(): string | null {
    return currentUser?.uid || null;
  },

  isSignedIn(): boolean {
    return currentUser !== null;
  },

  // Profile methods
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
        await setDoc(userRef, {
          id: userId,
          name,
          avatar: avatar || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
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

  // Leaderboard methods
  async updateLeaderboard(stats: OnlineStats, name: string, avatar?: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('[Firebase] No user signed in');
      return false;
    }

    try {
      // Calculate score based on wins and accuracy
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
      // Get user's score first
      const userRef = doc(db, 'leaderboard', userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;

      const userScore = userSnap.data().score;

      // Count how many have higher score
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

    // Save profile
    await this.saveProfile(name, avatar);

    // Update leaderboard
    return await this.updateLeaderboard(localStats, name, avatar);
  }
};

export default firebaseService;
