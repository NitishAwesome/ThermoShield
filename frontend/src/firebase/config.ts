// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBkw7wPOJ2b0oX285NCSWCO6ETlubSq8xw",
  authDomain: "thermoshield-cf3a0.firebaseapp.com",
  projectId: "thermoshield-cf3a0",
  storageBucket: "thermoshield-cf3a0.firebasestorage.app",
  messagingSenderId: "83345471257",
  appId: "1:83345471257:web:873fdab303e985274cb788",
  measurementId: "G-D2Y4PKX259"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export default app;