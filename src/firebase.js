import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBtSQBFkqeBnQ-4FY1RVfcQ6nMCWsabvCk",
  authDomain: "quiniela-faa8a.firebaseapp.com",
  projectId: "quiniela-faa8a",
  storageBucket: "quiniela-faa8a.firebasestorage.app",
  messagingSenderId: "142896980237",
  appId: "1:142896980237:web:f978aee537c5bf2edc9044"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);