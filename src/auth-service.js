// src/auth-service.js

// 필요한 모든 함수를 모듈에서 import
import { setDoc, doc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, db } from './firebase-init.js';
import { LOCAL_STORAGE_KEYS,SERVER_BASE_URL } from './constants.js';
import { showToast, getDefaultProfileImage } from './utils.js';
import AppUI from './AppUI.js';
import { setCurrentUser,currentUserNickname,currentUserUid,currentUserData } from './user-data.js';
import { clearUserList, filterDisplayUsers,updateAllUserItemButtons } from './allUserDiv.js';
import { fillSignUpFieldsWithRandomDataTemp } from './temp.js';
import { initializeFriendList,updateFriendList } from './friendListDiv.js';
import { initializeSocket, disconnectSocket} from './socketIO.js';
import { messagesDatabase} from './chat.js';

let authModeInitialized = false;
let hasLoadedInitialData = false;
// onSnapshot 리스너를 해제하기 위한 변수
let userDocUnsubscribe = null;

/**
 * 역할: 인증 UI 요소 초기화
 */

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
const initializeMainContent = (userData) => {
    AppUI.filterMinAgeGroupSelect.value = userData.minAgeGroup;
    AppUI.filterMaxAgeGroupSelect.value = userData.maxAgeGroup;
}
/**
 * 역할: 로그인 폼 <-> 회원가입 폼 전환
 */
export function updateAuthUIForMode(isSignUpMode) {
    const authTitle = AppUI.authTitle;
    const authSubmitBtn = AppUI.authSubmitBtn;
    const authSwitchBtn = AppUI.authSwitchBtn;
    const signupFieldsDiv = AppUI.signupFieldsDiv;
    const authEmailInput = AppUI.authEmailInput;
    const authPasswordInput = AppUI.authPasswordInput;
    const rememberMeGroup = AppUI.rememberMeGroup;

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
        signupFieldsDiv.classList.remove('hidden');
        rememberMeGroup.style.display = 'none';
        fillSignUpFieldsWithRandomDataTemp(AppUI);
        // (필요 시 테스트 코드는 이곳에 호출)
    } else {
        // 로그인창
        authTitle.textContent = '로그인';
        authSubmitBtn.textContent = '로그인';
        authSwitchBtn.textContent = '계정이 없으신가요? 회원가입';
        signupFieldsDiv.classList.add('hidden');
        rememberMeGroup.style.display = 'block';

        // ✅ 로그인 모드로 전환될 때 localStorage 값을 불러오는 로직
        const savedEmail = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_EMAIL);
        const savedPassword = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_PASSWORD);
        const rememberMeChecked = localStorage.getItem(LOCAL_STORAGE_KEYS.REMEMBER_ME_CHECKED) === 'true';

        if (rememberMeChecked) {
            if (authEmailInput && savedEmail) {
                authEmailInput.value = savedEmail;
            }
            if (authPasswordInput && savedPassword) {
                authPasswordInput.value = savedPassword;
            }
        } else {
            // 체크박스가 해제되었으면 필드를 비웁니다.
            if (authEmailInput) authEmailInput.value = '';
            if (authPasswordInput) authPasswordInput.value = '';
        }

        // ✅ 체크박스 상태도 항상 동기화합니다.
        if (AppUI.rememberMeCheckbox) {
            AppUI.rememberMeCheckbox.checked = rememberMeChecked;
        }
    }
    console.log(`[Auth Service] UI 모드 업데이트: ${isSignUpMode ? '회원가입' : '로그인'}`);
}

/**
 * 역할: 로그인 처리
 */
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

        const authToken = await user.getIdToken();
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('myUserId', user.id);
        localStorage.setItem('myUsername',user.displayName);

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

/**
 * 역할: 로그아웃 처리
 */
export async function handleLogout() {
    showToast("로그아웃 처리 중...", "info");
    try {
        if (auth.currentUser) {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, {
                isOnline: false,
                lastLogoutAt: serverTimestamp()
            }, { merge: true });
             localStorage.removeItem('myUserId');
            console.log("사용자 오프라인 상태로 업데이트 완료.");
        }
        ////////////////////
        const chatTabs = document.querySelector('.chat-tabs');
        const chatRoomsContainer = document.querySelector('.chat-rooms');
        Object.keys(messagesDatabase).forEach(key => {
          delete messagesDatabase[key];
        });
         chatTabs.innerHTML = '';
           chatRoomsContainer.innerHTML = '';
           /////////////////
        await signOut(auth); // 이 함수가 onAuthStateChanged 리스너를 트리거합니다.
        console.log("[Auth Service] 로그아웃 완료.");
        showToast("로그아웃되었습니다.", "success");
    } catch (error) {
        console.error("로그아웃 오류:", error);
        showToast(`로그아웃 중 오류 발생: ${error.message}`, "error");
    }
}

async function loadUserProfileImage(uid, profileImgUrl, userProfileImageElement, userGender) {
    try {
        const response = await fetch(`${SERVER_BASE_URL}/api/getProfileImgUrlWithSasVer2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: uid, profileImgUrl: profileImgUrl })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || "토큰 생성에 실패했습니다.");
        }

        const profileImgResult = await response.json();

        if (profileImgResult.blobUrl && profileImgResult.readSasToken) {
            const finalImgSrc = `${profileImgResult.blobUrl}?${profileImgResult.readSasToken}`;
            userProfileImageElement.src = finalImgSrc;
            console.log(profileImgResult.message);
        } else {
            throw new Error("서버 응답에 유효한 이미지 URL이 없습니다.");
        }
    } catch (error) {
        console.error("프로필 이미지 로드 오류:", error);
        showToast(`프로필 이미지 로드 실패: ${error.message}`, "error");
        userProfileImageElement.src = getDefaultProfileImage(userGender);
    }
}

/**
 * 역할: 앱 전체 UI 상태 전환 (인증 화면 <-> 메인 화면)
 */
export function setupAuthListener() {
    onAuthStateChanged(auth, async (user) => {
        const authSection = AppUI.authSection;
        const appContent = AppUI.appContent;
        const myNicknameSpan = AppUI.myNicknameSpan;
        const myProfileImage = AppUI.myProfileImage;
        const appHeader = AppUI.appHeader;
        const welcomeMessage = AppUI.welcomeMessage;

        if (!authSection || !appContent || !myNicknameSpan || !myProfileImage) {
            console.error("AppUI 객체에서 인증 상태 리스너에 필요한 DOM 요소 중 일부를 찾을 수 없습니다.");
            return;
        }
        if (userDocUnsubscribe) {
            console.log("[Auth Service] 기존 onSnapshot 리스너 해제 중...");
            userDocUnsubscribe();
            userDocUnsubscribe = null;
        }


        if (user) {
            // ✅ 사용자 로그인 상태: user.uid를 이용해 사용자 문서에 대한 onSnapshot 리스너 설정
            const userDocRef = doc(db, 'users', user.uid);
            userDocUnsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
                if (!docSnapshot.exists()) {
                      console.log("[Auth Service] 사용자 문서가 아직 존재하지 않습니다. 기다리는 중...");
                      return;
                }
                const userData = docSnapshot.data();
                setCurrentUser(user.uid, userData, userData.nickname);
console.log("--- onSnapshot 리스너가 호출되었습니다. ---");
                if (!hasLoadedInitialData) {
                     await initializeMainContent(userData); //순번이 이게 1번임 firebase에있는 유저별 선택사항 넣어줘야함
                     initializeFriendList();
                     const initialFilter = {
                         gender:  'all',
                         minAgeGroupValue: AppUI.filterMinAgeGroupSelect.value || '20-early',
                         maxAgeGroupValue: AppUI.filterMaxAgeGroupSelect.value || '50-late',
                         region:  'all'
                     };

                    console.log("[Auth Service] 사용자 문서 데이터 실시간 로드 완료. UI 업데이트 시작.");
                    await loadUserProfileImage(user.uid, userData.profileImgUrl, myProfileImage, userData.gender);

                    await filterDisplayUsers( initialFilter,false);
                    hasLoadedInitialData = true;
                    authSection.style.display = "none";
                    appHeader.classList.remove('hidden');
                    appContent.classList.remove('hidden');
                    welcomeMessage.classList.remove('hidden');
                    welcomeMessage.textContent = `환영합니다 ${userData.nickname || '익명'} 님`;
                    myNicknameSpan.textContent = userData.nickname || user.email;
                    const authToken = localStorage.getItem('authToken');
                    if (authToken) {
                          localStorage.setItem('authToken', authToken);
                          localStorage.setItem('myUserId', currentUserUid);
                          localStorage.setItem('myUsername', currentUserNickname);
                          console.log(`${currentUserUid}+${currentUserNickname}`);
                    } else {
                           console.log('인증 토큰이 없습니다. 소켓 연결을 건너뜁니다.');
                           // 토큰이 없으므로 로그인 페이지로 이동시킬 수도 있습니다.
                           // window.location.href = '/login.html';
                   }
                    initializeSocket();

                }else{
                    const newlyAddedFriendUids = await updateAllUserItemButtons();
                    updateFriendList(newlyAddedFriendUids);
 console.log("--- 데이터 변경 감지, 업데이트 블록이 실행됩니다. (hasLoadedInitialData: true) ---");
                }


            }, (error) => {
                console.error("[Auth Service] onSnapshot 리스너 오류:", error);
                showToast("사용자 정보를 가져오는 중 오류가 발생했습니다. 다시 로그인해주세요.", "error");
                signOut(auth);
            });

        } else {
            // ✅ 로그아웃 상태: 인증 화면 표시
            // 리스너가 존재하면 해제
            if (userDocUnsubscribe) {
                userDocUnsubscribe();
                userDocUnsubscribe = null;
            }

            hasLoadedInitialData = false; // 로그아웃 시 초기화
            authSection.style.display = "block";
            appHeader.classList.add('hidden');
            appContent.classList.add('hidden');
            welcomeMessage.textContent = "환영합니다! 로그인 해주세요.";
            myNicknameSpan.textContent = '';
            myProfileImage.src = '';
            console.log("[Auth Service] 사용자 로그아웃 상태.");

            // ✅ 로그아웃 시 무조건 로그인 모드로 UI를 초기화
            disconnectSocket();
            clearUserList();
            updateAuthUIForMode(false);
            console.log("[Auth Listener] UI가 로그인 화면으로 전환되었습니다.");


        }
    });
}
