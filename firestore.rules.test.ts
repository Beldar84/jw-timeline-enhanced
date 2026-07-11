import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';

const PROJECT_ID = 'jw-timeline-test';
let testEnvironment: RulesTestEnvironment;

async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe('Firestore security rules', () => {
  beforeAll(async () => {
    testEnvironment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(resolve('firestore.rules'), 'utf8'),
      },
    });
  });

  afterEach(async () => {
    await testEnvironment.clearFirestore();
  });

  afterAll(async () => {
    await testEnvironment.cleanup();
  });

  it('keeps account documents private while owners maintain a public projection', async () => {
    await seed('users/alice', { id: 'alice', name: 'Alice', email: 'alice@example.com' });
    await seed('publicProfiles/alice', { id: 'alice', name: 'Alice', nameLower: 'alice', searchPrefixes: ['al'] });
    const alice = testEnvironment.authenticatedContext('alice').firestore();
    const bob = testEnvironment.authenticatedContext('bob').firestore();

    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
    await assertFails(getDoc(doc(bob, 'users/alice')));
    await assertSucceeds(getDoc(doc(bob, 'publicProfiles/alice')));
    await assertSucceeds(setDoc(doc(alice, 'publicProfiles/alice'), {
      id: 'alice',
      name: 'Alicia',
      nameLower: 'alicia',
      searchPrefixes: ['al', 'ali'],
      avatar: null,
      updatedAt: 1,
    }));
    await assertFails(setDoc(doc(bob, 'publicProfiles/alice'), { name: 'Manipulado' }, { merge: true }));
  });

  it('prevents clients from forging competitive scores', async () => {
    await seed('leaderboard/alice', { allTime: { score: 100 } });
    const anonymous = testEnvironment.unauthenticatedContext().firestore();
    const alice = testEnvironment.authenticatedContext('alice').firestore();

    await assertSucceeds(getDoc(doc(anonymous, 'leaderboard/alice')));
    await assertFails(setDoc(doc(alice, 'leaderboard/alice'), { allTime: { score: 999999 } }));
    await assertFails(setDoc(doc(alice, 'competitiveStats/alice'), { wins: 999 }));
  });

  it('allows realtime participants to synchronize a game without exposing it to outsiders', async () => {
    await seed('realtimeGames/JW-ABC123', {
      participantAuthIds: ['alice', 'bob'],
      phase: 'PLAYING',
      deck: [],
      updatedAt: 1,
      lastSeenAt: { alice: 1, bob: 1 },
    });
    await seed('realtimeGames/JW-ABC123/hands/alice', { cards: [{ id: 1 }] });
    await seed('realtimeGames/JW-ABC123/hands/bob', { cards: [{ id: 2 }] });
    await seed('realtimeGames/JW-ABC123/private/state', { deck: [{ id: 3 }] });
    const alice = testEnvironment.authenticatedContext('alice').firestore();
    const charlie = testEnvironment.authenticatedContext('charlie').firestore();
    const gameForAlice = doc(alice, 'realtimeGames/JW-ABC123');

    await assertSucceeds(getDoc(gameForAlice));
    await assertFails(getDoc(doc(charlie, 'realtimeGames/JW-ABC123')));
    await assertFails(getDoc(doc(alice, 'realtimeGames/JW-ABC123/hands/alice')));
    await assertFails(getDoc(doc(alice, 'realtimeGames/JW-ABC123/hands/bob')));
    await assertFails(getDoc(doc(alice, 'realtimeGames/JW-ABC123/private/state')));
    await assertSucceeds(updateDoc(gameForAlice, { 'lastSeenAt.alice': 2, updatedAt: 2 }));
    await assertSucceeds(updateDoc(gameForAlice, { phase: 'GAME_OVER' }));
    await assertFails(updateDoc(doc(charlie, 'realtimeGames/JW-ABC123'), { phase: 'GAME_OVER' }));
  });

  it('allows authenticated players to check a free code and join a lobby', async () => {
    await seed('realtimeGames/JW-LOBBY', {
      id: 'JW-LOBBY',
      participantAuthIds: ['alice'],
      createdBy: 'alice',
      hostId: 'alice',
      phase: 'LOBBY',
      players: [{ id: 'alice', name: 'Alice', hand: [], isAI: false }],
      message: 'Esperando a jugadores...',
      updatedAt: 1,
    });
    const bob = testEnvironment.authenticatedContext('bob').firestore();

    await assertSucceeds(getDoc(doc(bob, 'realtimeGames/JW-FREE')));
    await assertSucceeds(getDoc(doc(bob, 'realtimeGames/JW-LOBBY')));
    await assertSucceeds(updateDoc(doc(bob, 'realtimeGames/JW-LOBBY'), {
      participantAuthIds: ['alice', 'bob'],
      players: [
        { id: 'alice', name: 'Alice', hand: [], isAI: false },
        { id: 'bob', name: 'Bob', hand: [], isAI: false },
      ],
      message: 'Esperando a jugadores...',
      updatedAt: 2,
    }));
  });

  it('validates direct friend requests, acceptance and invitations on Spark', async () => {
    await seed('users/alice', { id: 'alice', friends: [], friendRequests: [] });
    await seed('users/bob', { id: 'bob', friends: [], friendRequests: [] });
    await seed('users/charlie', { id: 'charlie', friends: [], friendRequests: [] });
    const alice = testEnvironment.authenticatedContext('alice').firestore();
    const bob = testEnvironment.authenticatedContext('bob').firestore();
    const charlie = testEnvironment.authenticatedContext('charlie').firestore();

    await assertSucceeds(updateDoc(doc(alice, 'users/bob'), { friendRequests: ['alice'] }));
    await assertFails(updateDoc(doc(charlie, 'users/bob'), { friends: ['charlie'] }));
    await assertSucceeds(updateDoc(doc(bob, 'users/alice'), { friends: ['bob'] }));
    await assertSucceeds(updateDoc(doc(bob, 'users/bob'), { friends: ['alice'], friendRequests: [] }));
    await assertSucceeds(getDoc(doc(alice, 'users/bob')));
    await assertFails(getDoc(doc(charlie, 'users/alice')));

    await assertSucceeds(setDoc(doc(alice, 'gameInvitations/invite-1'), {
      id: 'invite-1',
      fromUserId: 'alice',
      toUserId: 'bob',
      fromUserName: 'Alice',
      gameId: 'JW-1234',
      gameMode: 'realtime',
      status: 'pending',
      createdAt: 1,
      expiresAt: 2,
    }));
    await assertFails(setDoc(doc(charlie, 'gameInvitations/invite-2'), {
      fromUserId: 'charlie',
      toUserId: 'alice',
      gameMode: 'realtime',
      status: 'pending',
    }));
    await assertSucceeds(updateDoc(doc(bob, 'gameInvitations/invite-1'), { status: 'accepted' }));
    await assertFails(updateDoc(doc(alice, 'gameInvitations/invite-1'), { status: 'declined' }));
  });

  it('allows local history but reserves online history and turn state for the server', async () => {
    await seed('turnBasedGames/game-1', {
      playerIds: ['alice', 'bob'],
      status: 'active',
      deck: [],
      playerHands: {},
    });
    await seed('turnBasedGames/game-1/hands/alice', { cards: [{ id: 1 }] });
    await seed('turnBasedGames/game-1/hands/bob', { cards: [{ id: 2 }] });
    await seed('turnBasedGames/game-1/private/state', { deck: [{ id: 3 }] });
    const alice = testEnvironment.authenticatedContext('alice').firestore();
    const charlie = testEnvironment.authenticatedContext('charlie').firestore();

    await assertSucceeds(getDoc(doc(alice, 'turnBasedGames/game-1')));
    await assertFails(getDoc(doc(charlie, 'turnBasedGames/game-1')));
    await assertSucceeds(getDoc(doc(alice, 'turnBasedGames/game-1/hands/alice')));
    await assertFails(getDoc(doc(alice, 'turnBasedGames/game-1/hands/bob')));
    await assertFails(getDoc(doc(alice, 'turnBasedGames/game-1/private/state')));
    await assertFails(updateDoc(doc(alice, 'turnBasedGames/game-1'), { status: 'completed' }));
    await assertSucceeds(setDoc(doc(alice, 'gameHistory/local-1'), { userId: 'alice', mode: 'local' }));
    await assertFails(setDoc(doc(alice, 'gameHistory/online-1'), { userId: 'alice', mode: 'realtime' }));
  });
});
