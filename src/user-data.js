// src/user-data.js

// 현재 로그인한 사용자 정보 (초기에는 null)
export let currentUserUid = null;
export let currentUserData = null;
export let currentUserNickname = null;

// 사용자 정보 업데이트 함수
export function setCurrentUser(uid, data, nickname) {
    currentUserUid = uid;
    currentUserData = data;
    currentUserNickname = nickname;
}

// 사용자 정보 초기화 함수 (로그아웃 시 사용)
export function clearCurrentUser() {
    currentUserUid = null;
    currentUserData = null;
    currentUserNickname = null;
}