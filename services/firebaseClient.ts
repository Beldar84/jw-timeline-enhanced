import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCTSSEhZV4LSEiNb4R7E9bRYhchZBs9974',
  authDomain: 'jwtimeline-d2eb1.firebaseapp.com',
  projectId: 'jwtimeline-d2eb1',
  storageBucket: 'jwtimeline-d2eb1.firebasestorage.app',
  messagingSenderId: '102921617939',
  appId: '1:102921617939:web:a5e6af3924fd2d0b71b5e6',
  measurementId: 'G-Y3R4EB51PN',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firestoreDb = initializeFirestore(firebaseApp, {
  experimentalAutoDetectLongPolling: true,
});
export const firebaseAuth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

const cloudFunctions = getFunctions(firebaseApp, 'europe-west1');

export async function callCloudFunction<Request, Response>(name: string, data: Request): Promise<Response> {
  const callable = httpsCallable<Request, Response>(cloudFunctions, name);
  const result = await callable(data);
  return result.data;
}
