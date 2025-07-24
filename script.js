// ./script.js
console.log("★★★★ JavaScript 파일이 성공적으로 로드되었습니다! (최상단)");

// --- Firebase SDK 및 서비스 인스턴스 import ---
import { auth, db, storage } from './src/firebase-init.js'; // Firebase 초기화 모듈에서 import

// --- 사용자 정보 관련 import ---
import { currentUserUid, currentUserData, currentUserNickname } from './src/user-data.js'; // 사용자 정보 모듈에서 import

// --- 인증 서비스 관련 import ---
import {
    handleLogin,
    handleLogout,
    updateAuthUIForMode,
    setupAuthListener,
    initializeAuthUIElements // Auth UI 요소 초기화 함수 import
} from './src/auth-service.js'; // 인증 서비스 모듈에서 import


import { filterDisplayUsers } from './js/allUserDiv.js';
import { updateFriendRequestBadge } from './friendRequest.js';
import { initializeSignupUI, getSignUpMode, handleSignup, toggleSignUpMode } from './signup.js';
import { getDefaultProfileImage, showToast, resizeAndOptimizeImg } from './utils.js';
import { initializeMyProfileDivUI, clearMyProfileUI } from './js/myProfileDiv.js';




// 💡💡💡 스크립트 중복 실행 방지 플래그
if (window.__APP_SCRIPT_INITIALIZED__) {
    console.warn("script.js가 이미 초기화되었습니다. 추가 초기화를 건너갑니다.");
} else {
    window.__APP_SCRIPT_INITIALIZED__ = true;
    console.log("script.js가 초기화됩니다.");

    // --- Firebase 앱 초기화 및 persistence 설정은 이제 src/firebase-init.js에서 처리 ---

    // ⭐⭐⭐ 중요: Auth UI 관련 요소 초기화를 먼저 수행합니다. ⭐⭐⭐
    // auth-service.js의 setupAuthListener에서 이 요소들을 사용하기 때문입니다.
    initializeAuthUIElements();

    // ⭐ Firebase 인증 상태 변경 리스너를 설정합니다. (auth-service.js에서 가져옴)
    setupAuthListener();


    // 💡💡💡 DOMContentLoaded 이벤트 리스너
    document.addEventListener('DOMContentLoaded', () => {
        initializeSignupUI(); // signup.js에서 가져온 함수

        const deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
        const btnLogout = document.getElementById('btnLogout');
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        const authSwitchBtn = document.getElementById('auth-switch-btn');
        const profileImageInput = document.getElementById('signup-profile-image-upload-input');
        const profileImagePreview = document.getElementById('signup-profile-img-preview');

        // deleteAllDataBtn 이벤트 리스너
        if (deleteAllDataBtn) {
            deleteAllDataBtn.addEventListener('click', async () => {
                if (!confirm('경고: 정말로 모든 사용자 계정과 Firestore 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!')) return;
                if (!confirm('최종 확인: 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) return;

                showToast('모든 데이터 삭제 요청 중...', 'info');

                try {
                    const response = await fetch('http://localhost:3000/delete-all-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();

                    if (response.ok && data.success) {
                        showToast(data.message, 'success');
                        console.log('데이터 삭제 성공:', data.message);
                        window.location.reload();
                    } else {
                        const errorMessage = data.message || '데이터 삭제 실패';
                        showToast(errorMessage, 'error');
                        console.error('데이터 삭제 실패:', errorMessage);
                    }
                } catch (error) {
                    console.error("클라이언트에서 데이터 삭제 API 호출 오류:", error);
                    showToast(`데이터 삭제 중 네트워크 오류 발생: ${error.message}`, 'error');
                }
            });
        } else {
            console.error("오류: ID 'deleteAllDataBtn'을 가진 요소를 찾을 수 없습니다.");
        }

        // btnLogout 이벤트 리스너
        if (btnLogout) {
            btnLogout.addEventListener('click', handleLogout); // auth-service.js에서 가져온 함수
        } else {
            console.error("btnLogout을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        // authSubmitBtn 이벤트 리스너
        if (authSubmitBtn) {
            authSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentModeIsSignUp = getSignUpMode(); // signup.js에서 가져온 함수

                console.log(`authSubmitBtn 클릭됨. 현재 모드: ${currentModeIsSignUp ? '회원가입' : '로그인'}`);

                // 버튼 비활성화 및 로딩 상태 설정
                authSubmitBtn.disabled = true;
                const originalText = authSubmitBtn.textContent;
                authSubmitBtn.textContent = currentModeIsSignUp ? '가입 중...' : '로그인 중...';

                try {
                    if (currentModeIsSignUp) {
                        await handleSignup(e); // signup.js에서 가져온 함수
                    } else {
                        await handleLogin(); // auth-service.js에서 가져온 함수
                    }
                } catch (error) {
                    console.error("인증 처리 중 오류 발생:", error);
                } finally {
                    // 버튼 재활성화 및 원래 텍스트 복원
                    authSubmitBtn.disabled = false;
                    authSubmitBtn.textContent = originalText;
                }
            });
        } else {
            console.error("authSubmitBtn을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        // authSwitchBtn 이벤트 리스너
        if (authSwitchBtn) {
            authSwitchBtn.addEventListener('click', () => {
                toggleSignUpMode(); // signup.js에서 가져온 함수
            });
        } else {
            console.error("authSwitchBtn을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        // 프로필 이미지 미리보기 이벤트 리스너 (기존과 동일)
        if (profileImageInput && profileImagePreview) {
            profileImageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];

                if (file) {
                    console.log("Change 이벤트 발생. 선택된 파일:", file.name, "타입:", file.type, "크기:", file.size);

                    if (!file.type.startsWith('image/')) {
                        showToast("이미지 파일만 선택해주세요.", "error");
                        profileImagePreview.src = '';
                        profileImagePreview.style.display = 'none';
                        return;
                    }

                    showToast("이미지 미리보기 생성 중...", "info");

                    try {
                        const result = await resizeAndOptimizeImg(file, 200, 200, 'image/jpeg', 0.8);

                        if (result && result.blob) {
                            const resizedBlob = result.blob;
                            console.log("resizeAndOptimizeImg 반환된 Blob:", "타입:", resizedBlob.type, "크기:", resizedBlob.size);

                            const objectURL = URL.createObjectURL(resizedBlob);

                            profileImagePreview.style.display = 'block';
                            profileImagePreview.src = '';

                            profileImagePreview.onload = () => {
                                console.log("미리보기 이미지 로드 완료 및 Object URL 해제됨.");
                                URL.revokeObjectURL(objectURL);
                            };
                            profileImagePreview.onerror = (err) => {
                                console.error("미리보기 이미지 로드 실패!", err);
                                showToast("미리보기 이미지를 로드할 수 없습니다. 파일을 다시 선택해주세요.", "error");
                                profileImagePreview.src = '';
                                profileImagePreview.style.display = 'none';
                                URL.revokeObjectURL(objectURL);
                            };

                            profileImagePreview.src = objectURL;
                            console.log("미리보기 Object URL 생성됨:", objectURL);
                            showToast("이미지 미리보기 준비 완료!", "success");

                        } else {
                            console.error("resizeAndOptimizeImg가 유효한 Blob을 반환하지 못했습니다.");
                            showToast("이미지 리사이징에 실패했습니다. 유효한 이미지를 선택해주세요.", "error");
                            profileImagePreview.src = '';
                            profileImagePreview.style.display = 'none';
                        }
                    } catch (error) {
                        console.error("미리보기 이미지 처리 오류 (catch 블록):", error);
                        showToast(`이미지 미리보기 처리 중 오류 발생: ${error.message}`, "error");
                        profileImagePreview.src = '';
                        profileImagePreview.style.display = 'none';
                    }
                } else {
                    profileImagePreview.src = '';
                    profileImagePreview.style.display = 'none';
                    showToast("선택된 파일이 없습니다.", "info");
                }
            });
        } else {
            console.error("signup.js:", "프로필 이미지 input 또는 미리보기 요소를 DOM에서 찾을 수 없습니다. HTML ID를 다시 확인하세요!");
        }
        // ⭐⭐ 비밀번호 표시/숨기기 기능 추가 ⭐⭐
        document.querySelectorAll('.toggle-password').forEach(toggle => {
                    toggle.addEventListener('click', () => {
                        const targetId = toggle.dataset.target;
                        const passwordInput = document.getElementById(targetId);
                        if (passwordInput) {
                            if (passwordInput.type === 'password') {
                                passwordInput.type = 'text';
                                toggle.textContent = '🔒'; // 또는 '🙈'
                            } else {
                                passwordInput.type = 'password';
                                toggle.textContent = '👁️';
                            }
                        }
                    });
        });
    }); // DOMContentLoaded 이벤트 리스너 끝

} // window.__APP_SCRIPT_INITIALIZED__ 블록 끝