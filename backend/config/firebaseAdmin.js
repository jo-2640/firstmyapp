// backend/config/firebaseAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./simplechat.json'); // 경로 조정 필요

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth(); // auth도 함께 내보내기

console.log("Firebase Admin SDK가 초기화되었습니다.");

module.exports = { admin, db, auth };