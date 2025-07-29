// src/auth-service.js

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {auth, db}  from './firebase-init.js'; //firebase 객체를 얻어온다
import { showToast, getDefaultProfileImage } from '../utils.js';
import { clearMyProfileUI, initializeMyProfileDivUI } from '../js/myProfileDiv.js';
import { filterDisplayUsers } from '../js/allUserDiv.js';
import { updateFriendRequestBadge } from '../friendRequest.js';
import { setCurrentUser, clearCurrentUser, currentUserUid, currentUserData, currentUserNickname } from './user-data.js'; // 사용자 정보 모듈 import
import { getSignUpMode, toggleSignUpMode } from '../signup.js'; // signup.js에서 가져옴

export { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword};
// Firestore 리스너 구독 해제를 위한 변수
let unsubscribeFromUserProfile = null;
let profileLoadTimeout = null;

// initialAuthStateCheckDone은 script.js에서 관리 (세션 시작 플래그)
let initialAuthStateCheckDone = sessionStorage.getItem('initialAuthStateCheckDone') === 'true';

// --- HTML 요소 (주요 UI 업데이트에 필요) ---
let authSection;
let appHeader;
let appContent;
let myNicknameSpan;
let myProfileImg;
let mainWelcomeMessage;

// DOM 요소를 한 번만 할당하기 위한 초기화 함수
export function initializeAuthUIElements() {
    authSection = document.getElementById('auth-section');
    appHeader = document.querySelector('.app-header');
    appContent = document.querySelector('.app-content');
    myNicknameSpan = document.getElementById('my-nickname');
    myProfileImg = document.getElementById('my-profile-img');
    mainWelcomeMessage = document.getElementById('main-welcome-message');
}

export async function handleLogin() {
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authErrorMessage = document.getElementById('auth-error-message');

    const email = authEmail ? authEmail.value : '';
    const password = authPassword ? authPassword.value : '';

    if (!email || !password) {
        if (authErrorMessage) authErrorMessage.textContent = '이메일과 비밀번호를 입력해주세요.';
        showToast('이메일과 비밀번호를 입력해주세요.', 'error');
        throw new Error('이메일과 비밀번호를 입력해주세요.');
    }

    if (authErrorMessage) authErrorMessage.textContent = '';
    showToast('로그인 중...', 'info');

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('로그인 성공!', 'success');
        // onAuthStateChanged 리스너가 UI를 업데이트할 것임.
    } catch (error) {
        console.error("로그인 오류:", error);
        let errorMessage = '로그인 중 오류가 발생했습니다.';
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = '잘못된 이메일 또는 비밀번호입니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 주소입니다.';
                break;
            case 'auth/user-disabled':
                errorMessage = '비활성화된 계정입니다.';
                break;
            default:
                errorMessage = error.message;
        }
        if (authErrorMessage) authErrorMessage.textContent = errorMessage;
        showToast(errorMessage, 'error');
        throw error;
    }
}

export async function handleLogout() {
    try {
        if (auth) {
            await signOut(auth);
            showToast('로그아웃 되었습니다.', 'info');
            sessionStorage.removeItem('initialAuthStateCheckDone');

            clearCurrentUser(); // 사용자 정보 초기화

            if (unsubscribeFromUserProfile) {
                unsubscribeFromUserProfile();
                unsubscribeFromUserProfile = null;
                console.log("Firestore user profile listener unsubscribed on logout.");
            }

            clearMyProfileUI();
        } else {
            console.warn("Auth 인스턴스가 초기화되지 않아 로그아웃을 건너갑니다.");
        }
    } catch (error) {
        console.error("로그아웃 오류:", error);
        showToast("로그아웃 실패: " + error.message, "error");
    }
}

export function updateAuthUIForMode(isSignUpMode) {
    const authPageTitle = document.getElementById('auth-title');
    const signupFields = document.querySelectorAll('.signup-field');
    const authFormTitle = document.getElementById('auth-form-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSwitchBtn = document.getElementById('auth-switch-btn');
    const signupPasswordConfirmGroup = document.getElementById('signup-password-confirm-group');

    if (isSignUpMode) {
        if (authPageTitle) authPageTitle.textContent = '회원가입';
        if (authFormTitle) authFormTitle.textContent = '회원가입';
        if (authSubmitBtn) authSubmitBtn.textContent = '회원가입';
        if (authSwitchBtn) authSwitchBtn.textContent = '이미 계정이 있으신가요? 로그인';
        signupFields.forEach(field => field.classList.remove('hidden'));
        if (signupPasswordConfirmGroup) signupPasswordConfirmGroup.classList.remove('hidden');
    } else {
        if (authPageTitle) authPageTitle.textContent = '로그인';
        if (authFormTitle) authFormTitle.textContent = '로그인';
        if (authSubmitBtn) authSubmitBtn.textContent = '로그인';
        if (authSwitchBtn) authSwitchBtn.textContent = '계정이 없으신가요? 회원가입';
        signupFields.forEach(field => field.classList.add('hidden'));
        if (signupPasswordConfirmGroup) signupPasswordConfirmGroup.classList.add('hidden');
    }
}

// --- Firebase 인증 상태 변경 리스너 (주요 앱 로딩 로직) ---
export const setupAuthListener = () => {
    onAuthStateChanged(auth, async (user) => {
        console.log("[Auth Service] onAuthStateChanged 호출됨. user:", user ? user.uid : "null", "initialAuthStateCheckDone:", initialAuthStateCheckDone);

        // 이전 Firestore user profile listener가 있다면 해제
        if (unsubscribeFromUserProfile) {
            unsubscribeFromUserProfile();
            unsubscribeFromUserProfile = null;
            console.log("[Auth Service] Firestore user profile listener unsubscribed.");
        }

        // 로딩 스피너/화면 제어를 위한 요소 가져오기 (script.js에서 초기화했다고 가정)
        const appLoadingSpinner = document.getElementById('app-loading-spinner');
        if (appLoadingSpinner) appLoadingSpinner.style.display = 'flex'; // 앱 로딩 스피너 표시

        if (user) { // 사용자가 로그인됨
            setCurrentUser(user.uid, null, null); // 초기 UID만 설정, 데이터는 Firestore에서 로드
            console.log("[Auth Service] 사용자 로그인됨:", user.uid);

            const userDocRef = doc(db, "users", user.uid);
            const PROFILE_LOAD_TIMEOUT_MS = 5000;

            if (profileLoadTimeout) clearTimeout(profileLoadTimeout);

            profileLoadTimeout = setTimeout(() => {
                console.error(`[Auth Service] 사용자 문서(${user.uid}) 로드 실패: ${PROFILE_LOAD_TIMEOUT_MS / 1000}초 내에 문서를 찾을 수 없습니다.`);
                showToast("회원 정보 로드에 실패했거나 계정에 문제가 있습니다. 다시 로그인하거나 고객 지원팀에 문의해주세요.", "error");
                // UI를 인증 화면으로 전환
                if (authSection) authSection.classList.remove('hidden');
                if (appHeader) appHeader.classList.add('hidden');
                if (appContent) appContent.classList.add('hidden');
                if (mainWelcomeMessage) mainWelcomeMessage.classList.remove('hidden');
                if (appLoadingSpinner) appLoadingSpinner.style.display = 'none'; // 스피너 숨김
            }, PROFILE_LOAD_TIMEOUT_MS);

            // ⭐ Firestore onSnapshot 리스너
            unsubscribeFromUserProfile = onSnapshot(userDocRef, async (docSnap) => {
                console.log("[Auth Service] Firestore 사용자 프로필 스냅샷 받음:", docSnap.exists() ? "문서 존재" : "문서 없음", docSnap.data());

                if (docSnap.exists()) {
                    if (profileLoadTimeout) {
                        clearTimeout(profileLoadTimeout);
                        profileLoadTimeout = null;
                    }

                    const userData = { uid: docSnap.id, ...docSnap.data() };
                    setCurrentUser(userData.uid, userData, userData.nickname); // 전역 변수 업데이트
                    console.log("[Auth Service] Firestore 사용자 데이터 업데이트:", currentUserData);

                    const storedProfileImgUrl = currentUserData.profileImgUrl;
                    let finalProfileImgSrc;

                    if (myProfileImg) {
                        myProfileImg.onload = null; myProfileImg.onerror = null;
                        myProfileImg.onload = () => { myProfileImg.style.opacity = 1; };
                        myProfileImg.onerror = (e) => {
                            console.error("[Auth Service] 프로필 이미지 로드 실패:", e);
                            showToast("프로필 이미지 로드에 실패했습니다. 기본 이미지를 사용합니다.", "error");
                            myProfileImg.src = getDefaultProfileImage(currentUserData.gender);
                            myProfileImg.alt = "기본 프로필 이미지";
                            myProfileImg.style.opacity = 1;
                        };
                    }

                    if (storedProfileImgUrl && storedProfileImgUrl.includes('blob.core.windows.net')) {
                        try {
                            const response = await fetch('http://localhost:3000/api/getProfileImageUrl', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: currentUserUid, requestorUid: currentUserUid })
                            });
                            const data = await response.json();
                            if (response.ok && data.success && data.imageUrl) {
                                const separator = data.imageUrl.includes('?') ? '&' : '?';
                                finalProfileImgSrc = `${data.imageUrl}${separator}cb=${Date.now()}`;
                            } else {
                                console.error("[Auth Service] 서버에서 이미지 URL 가져오기 실패:", data);
                                finalProfileImgSrc = getDefaultProfileImage(currentUserData.gender);
                            }
                        } catch (error) {
                            console.error("[Auth Service] 프로필 이미지 URL 요청 네트워크 오류:", error);
                            finalProfileImgSrc = getDefaultProfileImage(currentUserData.gender);
                        }
                    } else {
                        finalProfileImgSrc = storedProfileImgUrl || getDefaultProfileImage(currentUserData.gender);
                    }

                    if (myProfileImg) {
                        myProfileImg.src = finalProfileImgSrc;
                        myProfileImg.alt = `${currentUserNickname || '익명'}의 프로필 이미지`;
                    }
                    if (myNicknameSpan) myNicknameSpan.textContent = currentUserNickname;

                    // UI 요소 표시/숨기기
                    if (authSection) authSection.classList.add('hidden');
                    if (appHeader) appHeader.classList.remove('hidden');
                    if (appContent) appContent.classList.remove('hidden');
                    if (mainWelcomeMessage) mainWelcomeMessage.classList.add('hidden');
                    if (appLoadingSpinner) appLoadingSpinner.style.display = 'none'; // 스피너 숨김

                    showToast('프로필 정보가 로드되었습니다.', 'success');

                    initialAuthStateCheckDone = true;
                    sessionStorage.setItem('initialAuthStateCheckDone', 'true');

                    filterDisplayUsers();
                    updateFriendRequestBadge();
                } else {
                    console.warn(`[Auth Service] 사용자 문서(${user.uid})가 아직 존재하지 않습니다. 생성을 기다립니다.`);
                    if (authSection) authSection.classList.remove('hidden');
                    if (appHeader) appHeader.classList.add('hidden');
                    if (appContent) appContent.classList.add('hidden');
                    if (mainWelcomeMessage) mainWelcomeMessage.classList.remove('hidden');
                    if (appLoadingSpinner) appLoadingSpinner.style.display = 'none'; // 스피너 숨김

                    if (myProfileImg) { myProfileImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; myProfileImg.alt = "프로필 이미지 로드 중..."; }
                    if (myNicknameSpan) myNicknameSpan.textContent = "회원 정보 로드 중...";
                    showToast("회원 정보 로드 중입니다...", "info");

                    initialAuthStateCheckDone = true;
                    sessionStorage.setItem('initialAuthStateCheckDone', 'true');

                    filterDisplayUsers();
                    updateFriendRequestBadge();
                }
            }, (error) => { // onSnapshot 오류 핸들링
                if (profileLoadTimeout) { clearTimeout(profileLoadTimeout); profileLoadTimeout = null; }
                console.error("[Auth Service] Error listening to user profile changes:", error);
                if (error.code === 'permission-denied') {
                    console.error("권한 문제로 사용자 문서 로드 불가. 강제 로그아웃 처리.");
                    handleLogout();
                } else {
                    showToast("프로필 정보를 불러오는 데 실패했습니다.", "error");
                    if (authSection) authSection.classList.remove('hidden');
                    if (appHeader) appHeader.classList.add('hidden');
                    if (appContent) appContent.classList.add('hidden');
                    if (mainWelcomeMessage) mainWelcomeMessage.classList.remove('hidden');
                }
                if (appLoadingSpinner) appLoadingSpinner.style.display = 'none'; // 스피너 숨김
                initialAuthStateCheckDone = true;
                sessionStorage.setItem('initialAuthStateCheckDone', 'true');
            });

        } else { // 사용자가 로그아웃된 상태
            if (profileLoadTimeout) { clearTimeout(profileLoadTimeout); profileLoadTimeout = null; }
            clearCurrentUser(); // 사용자 정보 초기화
            console.log("[Auth Service] 사용자 로그아웃됨.");

            // UI를 로그아웃 상태로 업데이트
            if (authSection) authSection.classList.remove('hidden');
            if (appHeader) appHeader.classList.add('hidden');
            if (appContent) appContent.classList.add('hidden');
            if (mainWelcomeMessage) mainWelcomeMessage.classList.remove('hidden');
            if (appLoadingSpinner) appLoadingSpinner.style.display = 'none'; // 스피너 숨김

            if (myProfileImg) { myProfileImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; myProfileImg.alt = "로그인 필요"; }
            if (myNicknameSpan) myNicknameSpan.textContent = "로그인 필요";
            if(getSignUpMode()) toggleSignUpMode();

            if (!initialAuthStateCheckDone) {
                console.log("[Auth Service] 초기 인증 상태 확인: 로그인 UI 표시 및 모드 설정.");
                initialAuthStateCheckDone = true;
                sessionStorage.setItem('initialAuthStateCheckDone', 'true');
            } else {
                console.log("[Auth Service] 초기 인증 상태 확인 완료. 추가적인 로그인 모드 전환 없음.");
            }
        }
    });
};

// 필요한 Firebase Auth 관련 함수들을 여기서 export 합니다.
