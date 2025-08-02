// src/auth-service.js

// 필요한 모든 함수를 모듈에서 import
import { setDoc, getDoc, doc, collection, FieldValue, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, db } from './firebase-init.js';
import { LOCAL_STORAGE_KEYS,SERVER_BASE_URL } from './constants.js';
import { showToast, getDefaultProfileImage } from '../utils.js';
import AppUI from './AppUI.js';
//import { clearMyProfileUI } from '../js/myProfileDiv.js';
import { fillSignUpFieldsWithRandomDataTemp } from '../js/temp.js';

let authModeInitialized = false;

// ✅ 역할: 인증 UI 요소 초기화
export function initializeAuthUIElements() {
    if (!authModeInitialized) {
        if (AppUI.authEmailInput) AppUI.authEmailInput.placeholder = "Email 입력해주세요";
        if (AppUI.authPasswordInput) AppUI.authPasswordInput.placeholder = "비밀번호 (6자 이상)";
        const savedEmail = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_EMAIL);
        const savedPassword = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_PASSWORD);
        const rememberMeChecked = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_CHECKED) === 'true';

        if (savedEmail && AppUI.authEmailInput) {
             AppUI.authEmailInput.value = savedEmail;
        }
        if (savedPassword && AppUI.authPasswordInput && rememberMeChecked) {
             AppUI.authPasswordInput.value = savedPassword;
        }
        if (AppUI.rememberMeCheckbox) {
             AppUI.rememberMeCheckbox.checked = rememberMeChecked;
        }
        authModeInitialized = true;
        console.log("[Auth Service] 인증 UI 요소 초기화 완료.");

    }
}

// ✅ 역할: 로그인 폼 <-> 회원가입 폼 전환
export function updateAuthUIForMode(isSignUpMode) {
    const authTitle = AppUI.authTitle;
    const authSubmitBtn = AppUI.authSubmitBtn;
    const authSwitchBtn = AppUI.authSwitchBtn;
    const signupFieldsDiv = AppUI.signupFieldsDiv;
    const authEmailInput = AppUI.authEmailInput;
    const authPasswordInput = AppUI.authPasswordInput;
    const rememberMeGroup = AppUI.rememberMeGroup;
    const appContent = AppUI.appContent;
    const myNicknameSpan = AppUI.myNicknameSpan;
    const userProfileImage = AppUI.myProfileImage;
    const appHeader = AppUI.appHeader;

    if (!authTitle || !authSubmitBtn || !authSwitchBtn || !signupFieldsDiv || !rememberMeGroup) {
        console.error("AppUI 객체에서 인증 UI 요소 중 일부를 찾을 수 없습니다.");
        return;
    }

    if (isSignUpMode) {
       // 회원가입창
       authEmailInput.value = '';
        authPasswordInput.value = '';
        authEmailInput.placeholder = "이메일 입력";
        authPasswordInput.placeholder = "비밀번호 입력";
        authTitle.textContent = '회원가입';
        authSubmitBtn.textContent = '가입하기';
        authSwitchBtn.textContent = '로그인 화면으로 돌아가기';
        signupFieldsDiv.style.display = 'block';
        rememberMeGroup.style.display = 'none';
        fillSignUpFieldsWithRandomDataTemp(AppUI);
    } else {
      //로그인창
        authTitle.textContent = '로그인';
        authSubmitBtn.textContent = '로그인';
        authSwitchBtn.textContent = '계정이 없으신가요? 회원가입';
        signupFieldsDiv.style.display = 'none';
        rememberMeGroup.style.display = 'block';
    }
    console.log(`[Auth Service] UI 모드 업데이트: ${isSignUpMode ? '회원가입' : '로그인'}`);
}

// ✅ 역할: 로그인 처리
export async function handleLogin() {
    const email = AppUI.authEmailInput ? AppUI.authEmailInput.value : '';
    const password = AppUI.authPasswordInput ? AppUI.authPasswordInput.value : '';
    const rememberMe = AppUI.rememberMeCheckbox ? AppUI.rememberMeCheckbox.checked : false;

    if (!email || !password) {
        showToast("이메일과 비밀번호를 입력해주세요.", "error");
        return;
    }

    showToast("로그인 처리 중...", "info");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("로그인 성공:", user);

        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            lastLoginAt: serverTimestamp(),
            isOnline: true
        }, { merge: true });

        if (rememberMe) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_EMAIL, email);
            localStorage.setItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_PASSWORD, password);
            localStorage.setItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_CHECKED, 'true');
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_EMAIL);
            localStorage.removeItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_PASSWORD);
            localStorage.setItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_CHECKED, 'false');
        }
        showToast("로그인 성공!", "success");

        if (AppUI.authEmailInput) AppUI.authEmailInput.value = '';
        if (AppUI.authPasswordInput) AppUI.authPasswordInput.value = '';


    } catch (error) {
        console.error("로그인 오류:", error);
        let errorMessage = "로그인 중 오류가 발생했습니다. 다시 시도해주세요.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "잘못된 이메일 또는 비밀번호입니다.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "유효하지 않은 이메일 주소입니다.";
        }
        showToast(errorMessage, "error");
    }
}

// ✅ 역할: 로그아웃 처리
export async function handleLogout() {
    showToast("로그아웃 처리 중...", "info");
    try {
        if (auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, {
                isOnline: false,
                lastLogoutAt: serverTimestamp()
            }, { merge: true });
            console.log("사용자 오프라인 상태로 업데이트 완료.");
        }
        await signOut(auth);
        console.log("[Auth Service] 로그아웃 완료.");
        showToast("로그아웃되었습니다.", "success");
    } catch (error) {
        console.error("로그아웃 오류:", error);
        showToast(`로그아웃 중 오류 발생: ${error.message}`, "error");
    }
}

// ✅ 역할: 앱 전체 UI 상태 전환 (인증 화면 <-> 메인 화면)
export function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        const authSection = AppUI.authSection;
        const btnLogout = AppUI.btnLogout;
        const appContent = AppUI.appContent;
        const myNicknameSpan = AppUI.myNicknameSpan;
        const userProfileImage = AppUI.myProfileImage;
        const appHeader = AppUI.appHeader;

        if (!authSection || !appContent || !myNicknameSpan || !userProfileImage || !btnLogout) {
            console.error("AppUI 객체에서 인증 상태 리스너에 필요한 DOM 요소 중 일부를 찾을 수 없습니다.");
            return;
        }

        if (user) {
            console.log("[Auth Service] 사용자 로그인이 되어있는상태.");
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                authSection.classList.add ('hidden');
                appHeader.classList.remove('hidden');
                appContent.classList.remove('hidden');
                const userData = userDoc.data();
                myNicknameSpan.textContent = userData.nickname || user.email;


                try{         //내가 원하는건 서버로부터 이미지를 가져오는것 혼자 도전해봤지만..역시나 절반정도 성공.ㅋ
                        const resProfileImgUrl = await fetch(`${SERVER_BASE_URL}/api/getProfileImgUrlWithSas`,{
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json'},
                                        body: JSON.stringify({uid: user.uid , profileImgUrl: userData.profileImgUrl})
                        });

                       if(!resProfileImgUrl.ok){
                            const errorResult = await res.json();
                            throw new Error(errorResult || "토큰생성에 실패했습니다");
                       }
                       const profileImgUrlResult = await resProfileImgUrl.json();

                       if(profileImgUrlResult.blobUrl && profileImgUrlResult.readSasToken)
                       {
                            const finalImgSrc =`${profileImgUrlResult.blobUrl}?${profileImgUrlResult.readSasToken}`;
                            userProfileImage.src = finalImgSrc;
                            console.log(profileImgUrlResult.message);
                       }
                      //  filterDisplayUsers(currentFilter,true);
                } catch (error){
                    console.error("프로필 이미지 로드 오류:", error);
                    showToast(`프로필 이미지 로드 실패: ${error.message}`,"error");
                    userProfileImage.src = getDefaultProfileImage(userData.gender);
                }       ///////////////////////////////////////일단 한번해봤음..좀 이상하긴 한데
            } else {
                myNicknameSpan.textContent = user.email; //문서는 존재하지않으나 유저가 있고 그값에 기본적인게 있으니 출력
               userProfileImage.src = getDefaultProfileImage('unknown');
            }

        } else {
            // ✅ 로그아웃 상태: 인증 화면 표시
            authSection.classList.remove ('hidden');
            appHeader.classList.add('hidden');
            appContent.classList.add('hidden');
            myNicknameSpan.textContent = '';
            userProfileImage.src = '';
            console.log("[Auth Service] 사용자 로그아웃 상태.");

            // ✅ 로그아웃 시 무조건 로그인 모드로 UI를 초기화
            updateAuthUIForMode(false);

            // ✅ 회원가입 폼의 필드도 초기화
            if (AppUI.signupFieldsDiv) {
                const signupNickname = AppUI.signupFieldsDiv.querySelector('#signup-nickname');
                if (signupNickname) signupNickname.value = '';
                // TODO: 다른 회원가입 필드들도 초기화하는 로직을 추가
            }

         //   clearMyProfileUI();
        }
    });
}