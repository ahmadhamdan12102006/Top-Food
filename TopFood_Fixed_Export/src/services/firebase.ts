import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDxSHTO0SED7PHkYV4pOdtzJgL5aMYYnwE",
  authDomain: "topfood-1e28d.firebaseapp.com",
  projectId: "topfood-1e28d",
  storageBucket: "topfood-1e28d.firebasestorage.app",
  messagingSenderId: "206303166271",
  appId: "1:206303166271:web:d3d99c2896797da4b6dd8a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
