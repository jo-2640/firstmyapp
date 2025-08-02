// src/firebase-init.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, browserSessionPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBhiNCaeMLOK5eRZE_O6WY23gHuIPnIV6s",
  authDomain: "simple-chat-d8861.firebaseapp.com",
  projectId: "simple-chat-d8861",
  storageBucket: "simple-chat-d8861.firebasestorage.app",
  messagingSenderId: "78474404253",
  appId: "1:78474404253:web:9d4543f5d66d67ad970f74",
  measurementId: "G-XWRB2C5QL1"
};

// --- Firebase 앱 초기화 ---
const firebaseAppInstance = initializeApp(firebaseConfig);

// --- Firebase 서비스 인스턴스 export ---
export const auth = getAuth(firebaseAppInstance);
export const db = getFirestore(firebaseAppInstance);
export const storage = getStorage(firebaseAppInstance);

console.log(`firebase auth:${auth}`);
// --- Firebase Auth Persistence 전역 설정 ---
setPersistence(auth, browserSessionPersistence)
    .then(() => {
        console.log("[Firebase Init] Firebase Auth persistence가 SESSION으로 전역 설정되었습니다.");
    })
    .catch((error) => {
        console.error("[Firebase Init] Firebase Auth persistence 전역 설정 오류:", error);
    });
