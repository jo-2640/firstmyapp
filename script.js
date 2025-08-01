// ./script.js
console.log("★★★★ JavaScript 파일이 성공적으로 로드되었습니다! (최상단)");

// --- Firebase SDK 및 서비스 인스턴스 import ---
import { auth, db, storage } from './src/firebase-init.js';
// ✅ 최신 모듈 방식에 맞게 Firebase 함수들을 직접 import
import { createUserWithEmailAndPassword, signOut ,updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { currentUserUid, currentUserData, currentUserNickname } from './src/user-data.js';
import { handleLogin, handleLogout, updateAuthUIForMode, setupAuthListener, initializeAuthUIElements } from './src/auth-service.js';
import { LOCAL_STORAGE_KEYS,SERVER_BASE_URL } from './src/constants.js';
import AppUI from './src/AppUI.js';
import { filterDisplayUsers } from './js/allUserDiv.js';
import { updateFriendRequestBadge } from './friendRequest.js';
import { getDefaultProfileImage, showToast, resizeAndOptimizeImg, fetchCurrentYearFromServer, detailedAgeGroups, fetchBirthYearRangeFromServer} from './utils.js';
import { initializeMyProfileDivUI, clearMyProfileUI } from './js/myProfileDiv.js';
import { fillSignUpFieldsWithRandomDataTemp } from './js/temp.js';

let minBirthYear = 1980; //임시 변수이나 지우면 안됨~서버값
let serverCurrentYear = new Date().getFullYear(); //임시변수이나 지우면안됨~ 서버값

// --- 회원가입 모드 관련 변수 및 함수 (signup.js에서 이동) ---
let isSignUpMode = false;

export function getSignUpMode() {
    return isSignUpMode;
}

export function toggleSignUpMode() {
    isSignUpMode = !isSignUpMode;
    updateAuthUIForMode(isSignUpMode);
}

function updateBirthYearDropdownOptions(minBirthYear, currentYear) {
    const birthYearSelect = AppUI.signupBirthYearSelect;
    if (!birthYearSelect) {
        console.error("signup-birth-year 요소를 찾을 수 없습니다 (AppUI).");
        return;
    }
    birthYearSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "출생연도를 선택하세요";
    defaultOption.disabled = true;
    defaultOption.selected = true;
    birthYearSelect.appendChild(defaultOption);
    for (let year = currentYear; year >= minBirthYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        birthYearSelect.appendChild(option);
    }
}

function findDetailedAgeGroupByValue(age) {
    return detailedAgeGroups.find(group => age >= group.min && age <= group.max);
}

function updateAgeGroupDropdownOptions(dropdownElement, type) {
    if (!dropdownElement) {
        console.error(`"${type}" 나이 그룹 드롭다운 요소를 찾을 수 없습니다.`);
        return;
    }
    dropdownElement.innerHTML = '';
    const defaultOption = document.createElement('option');
    if (type === 'min') {
         defaultOption.textContent = '관심있는 최소 나이대를 선택하세요';
    } else if (type === 'max') {
        defaultOption.textContent = '관심있는 최대 나이대를 선택하세요';
    }
    defaultOption.selected = true;
    defaultOption.disabled = true;
    dropdownElement.appendChild(defaultOption);
    if (type === 'min') {
        const optionUnder10 = document.createElement('option');
        optionUnder10.value = '10-under';
        optionUnder10.textContent = '10대 미만';
        dropdownElement.appendChild(optionUnder10);
    }

    detailedAgeGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.value;
        option.textContent = group.label;
        dropdownElement.appendChild(option);
    });

    if (type === 'max') {
        const optionPlus60 = document.createElement('option');
        optionPlus60.value = '60-plus';
        optionPlus60.textContent = '60대 이상';
        dropdownElement.appendChild(optionPlus60);
    }
}

async function handleSignup(e) {
    e.preventDefault();

    // ✅ 오류 방지를 위한 필수 DOM 요소 존재 여부 사전 확인
    const requiredElements = [
        AppUI.authEmailInput,
        AppUI.authPasswordInput,
        AppUI.signupPasswordConfirmInput,
        AppUI.signupNicknameInput,
        AppUI.signupBirthYearSelect,
        AppUI.signupGenderSelect,
        AppUI.signupRegionSelect,
        AppUI.signupMinAgeSelect,
        AppUI.signupMaxAgeSelect
    ];

    if (requiredElements.some(el => el === null)) {
        console.error("오류: 필수 회원가입 폼 요소가 DOM에 존재하지 않습니다. HTML ID를 확인하세요.");
        showToast("회원가입 폼을 불러오는 중 오류가 발생했습니다. 페이지를 새로고침 해주세요.", "error");
        return;
    }

    // --- 데이터 추출 ---
    const email = AppUI.authEmailInput.value;
    const password = AppUI.authPasswordInput.value;
    const passwordConfirm = AppUI.signupPasswordConfirmInput.value;
    const nickname = AppUI.signupNicknameInput.value;
    const birthYear = parseInt(AppUI.signupBirthYearSelect.value);
    const gender = AppUI.signupGenderSelect.value;
    const region = AppUI.signupRegionSelect.value;
    const bio = AppUI.signupBioTextarea ? AppUI.signupBioTextarea.value : '';
    const minAgeGroup = AppUI.signupMinAgeSelect.value;
    const maxAgeGroup = AppUI.signupMaxAgeSelect.value;
    const profileImageFile = AppUI.profileImageInput && AppUI.profileImageInput.files.length > 0 ? AppUI.profileImageInput.files[0] : null;

    // --- 클라이언트 측 유효성 검사 ---
    if (!email || !password || !passwordConfirm || !nickname || isNaN(birthYear) || !gender || !region || !minAgeGroup || !maxAgeGroup) {
        showToast("모든 필수 입력란을 채워주세요!", "error");
        return;
    }
    if (password !== passwordConfirm) {
        showToast("비밀번호가 일치하지 않습니다!", "error");
        return;
    }
    if (password.length < 6) {
        showToast("비밀번호는 6자 이상이어야 합니다.", "error");
        return;
    }
    if (nickname.length < 2 || nickname.length > 10) {
        showToast("닉네임은 2자 이상 10자 이하여야 합니다.", "error");
        return;
    }

    const minAgeGroupObj = detailedAgeGroups.find(g => g.value === minAgeGroup);
    const maxAgeGroupObj = detailedAgeGroups.find(g => g.value === maxAgeGroup);
    let minAge = 0;
    let maxAge = 100;
    if (minAgeGroup === '10-under') { minAge = 0; }
    else if (minAgeGroup === '60-plus') { minAge = 60; }
    else if (minAgeGroupObj) { minAge = minAgeGroupObj.min; }
    if (maxAgeGroup === '10-under') { maxAge = 10; }
    else if (maxAgeGroup === '60-plus') { maxAge = 100; }
    else if (maxAgeGroupObj) { maxAge = maxAgeGroupObj.max; }

    if (minAge > maxAge) {
        showToast("최소 나이 그룹은 최대 나이 그룹보다 클 수 없습니다.", "error");
        return;
    }
    const currentYear = serverCurrentYear;
    if (birthYear < minBirthYear || birthYear > currentYear) {
        return showToast("유효하지 않은 출생 연도입니다.", "error");
    }

    showToast("회원가입 처리 중...", "info");

    try {
        let uid;
        let profileImgUrl = '';

        // ✅ 1단계: Firebase 사용자 계정 생성 (서버 API 호출)
        showToast("사용자 계정 생성 중...", "info");
        const userCreationResponse = await fetch(`${SERVER_BASE_URL}/api/signup/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, gender, nickname })
        });

        const userCreationResult = await userCreationResponse.json();
        if (!userCreationResponse.ok) {
            throw new Error(userCreationResult.message || "계정 생성에 실패했습니다.");
        }
        uid = userCreationResult.uid;
        showToast("계정 생성 성공! 이미지 업로드 준비 중.", "success");

        // ✅ 2단계: 프로필 이미지 업로드 (서버 API 호출 및 Azure 업로드)
        if (profileImageFile) {
            showToast("프로필 이미지 최적화 및 업로드 준비 중...", "info");
            const optimizedResult = await resizeAndOptimizeImg(profileImageFile, 100, 100, profileImageFile.type, 0.8);
            if (!optimizedResult || !optimizedResult.blob) {
                 throw new Error("이미지 최적화 실패.");
            }

            const fileExtension = optimizedResult.blob.type.split('/').pop() || 'jpeg';
            const uniqueFileName = `profile_${uid}_${Date.now()}.${fileExtension}`;
            const blobPath = `users/${uid}/${uniqueFileName}`; // Azure에 저장될 최종 경로

            const sasResponse = await fetch(`${SERVER_BASE_URL}/api/signup/get-profile-sas-token`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                        uid,
                        blobPath: blobPath, // ⭐ 수정: 서버에 blobPath를 전달하여 토큰 생성 요청
                        contentType: optimizedResult.blob.type
                  })
            });

            const sasData = await sasResponse.json();
            if (!sasResponse.ok || !sasData.sasToken || !sasData.blobUrl) {
                throw new Error("SAS 토큰을 받지 못했습니다.");
            }
            console.log(`${sasData.blobUrl}?${sasData.sasToken} 입니다`);
            const isUploadSuccess = await uploadFileToAzureWithSasToken(`${sasData.blobUrl}?${sasData.sasToken}`, optimizedResult.blob, optimizedResult.blob.type);
            if (!isUploadSuccess) {
                throw new Error("이미지 업로드 실패.");
            }
            profileImgUrl = sasData.blobUrl;
            showToast("이미지 업로드 성공!", "success");
        } else {
            profileImgUrl = getDefaultProfileImage(gender);
            showToast("기본 프로필 이미지를 사용합니다.", "info");
        }

        // ✅ 3단계: Firestore에 최종 정보 저장 (서버 API 호출)
        showToast("최종 프로필 정보 저장 중...", "info");
        const finalizeResponse = await fetch(`${SERVER_BASE_URL}/api/signup/finalize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid,
                nickname,
                birthYear,
                region,
                gender,
                minAgeGroup,
                maxAgeGroup,
                bio,
                profileImgUrl
            })
        });

        const finalizeResult = await finalizeResponse.json();
        if (!finalizeResponse.ok) {
            throw new Error(finalizeResult.message || "최종 프로필 저장에 실패했습니다.");
        }

        showToast("회원가입이 완료되었습니다!", "success");

        // 성공 시 폼 초기화 및 로그인
        await handleLogin(email, password);
        if (AppUI.authEmailInput) AppUI.authEmailInput.value = '';
        // ... (나머지 폼 초기화 로직) ...
        toggleSignUpMode();

    } catch (error) {
        console.error("회원가입 오류:", error);
        let errorMessage = "회원가입 중 오류가 발생했습니다. 다시 시도해주세요.";
        if (error.message.includes('email-already-in-use')) {
            errorMessage = "이미 사용 중인 이메일 주소입니다.";
        } else if (error.message.includes('invalid-email')) {
            errorMessage = "유효하지 않은 이메일 주소입니다.";
        } else if (error.message.includes('weak-password')) {
            errorMessage = "비밀번호는 6자 이상이어야 합니다.";
        } else {
             errorMessage = error.message;
        }
        showToast(errorMessage, "error");
    }
}

// ... (나머지 코드) ...

// Azure에 파일을 직접 업로드하는 함수 (기존 코드)
async function uploadFileToAzureWithSasToken(uploadUrl, file, fileType) {
    try {
        console.log("Azure에 파일 직접 업로드 시작:", file.name);
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': fileType
            }
        });
        if (!response.ok) {
            console.error("Azure 업로드 실패:", response.statusText);
            return false;
        }
        console.log("Azure 업로드 성공.");
        return true;
    } catch (error) {
        console.error("Azure 업로드 중 오류 발생:", error);
        return false;
    }
}
// Azure에 파일을 업로드하는 클라이언트 측 함수


/////////////////////////////////메인함수부분


    console.log("script.js가 초기화됩니다.");

    AppUI.initialize();
    console.log("AppUI 객체 초기화 완료:", AppUI);

    initializeAuthUIElements();
    setupAuthListener();
//////////////////////////////////////////////
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const birthYearRange = await fetchBirthYearRangeFromServer();
            updateBirthYearDropdownOptions(birthYearRange.minBirthYear, birthYearRange.maxBirthYear);
        } catch (error) {
            console.error(`[script.js] 연도 정보를 가져오는데 실패했습니다: ${error.message}`);
            showToast(`연도 정보를 가져올 수 없습니다: ${error.message}`, 'error');
            if (AppUI.signupBirthYearSelect) {
                AppUI.signupBirthYearSelect.disabled = true;
                AppUI.signupBirthYearSelect.innerHTML = '<option value="">연도 불러오기 실패</option>';
            }
        }

        updateAgeGroupDropdownOptions(AppUI.signupMinAgeSelect, 'min');
        updateAgeGroupDropdownOptions(AppUI.signupMaxAgeSelect, 'max');

        if (AppUI.deleteAllDataBtn) {
            AppUI.deleteAllDataBtn.addEventListener('click', async () => {
                if (!confirm('경고: 정말로 모든 사용자 계정과 Firestore 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!')) return;
                if (!confirm('최종 확인: 모든 데이터가 영구적으로 삭제됩니다. 계속하시겠습니까?')) return;
                showToast('모든 데이터 삭제 요청 중...', 'info');
                try {
                    const response = await fetch('http://localhost:3000/api/delete-all-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        showToast(data.message, 'success');
                        console.log('데이터 삭제 성공:', data.message);
                        if (auth.currentUser) {
                            // ✅ 최신 모듈 방식으로 로그아웃 함수 호출
                            await signOut(auth);
                            console.log("[Auth Service] 모든 데이터 삭제 후 Firebase 세션 로그아웃 완료.");
                        }
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

        if (AppUI.btnLogout) {
            AppUI.btnLogout.addEventListener('click', handleLogout);
        } else {
            console.error("btnLogout을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        if (AppUI.authSubmitBtn) {
            AppUI.authSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const currentModeIsSignUp = getSignUpMode();
                console.log(`authSubmitBtn 클릭됨. 현재 모드: ${currentModeIsSignUp ? '회원가입' : '로그인'}`);
                AppUI.authSubmitBtn.disabled = true;
                const originalText = AppUI.authSubmitBtn.textContent;
                AppUI.authSubmitBtn.textContent = currentModeIsSignUp ? '가입 중...' : '로그인 중...';
                try {
                    if (currentModeIsSignUp) {
                        await handleSignup(e);
                    } else {
                        await handleLogin();
                    }
                } catch (error) {
                    console.error("인증 처리 중 오류 발생:", error);
                } finally {
                    AppUI.authSubmitBtn.disabled = false;
                    AppUI.authSubmitBtn.textContent = originalText;
                }
            });
        } else {
            console.error("authSubmitBtn을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        if (AppUI.authSwitchBtn) {
            AppUI.authSwitchBtn.addEventListener('click', () => {
                toggleSignUpMode();
            });
        } else {
            console.error("authSwitchBtn을 찾을 수 없습니다! HTML ID를 확인하세요.");
        }

        if (AppUI.signupGenderSelect && AppUI.profileImageInput && AppUI.profileImagePreview) {
            AppUI.signupGenderSelect.addEventListener('change', () => {
                const selectedGender = AppUI.signupGenderSelect.value;
                if (AppUI.profileImageInput.files.length === 0) {
                    AppUI.profileImagePreview.src = getDefaultProfileImage(selectedGender);
                }
            });
        }

        if (AppUI.signupMinAgeSelect && AppUI.signupMaxAgeSelect) {
            AppUI.signupMinAgeSelect.addEventListener('change', () => {
                const minSelectedValue = AppUI.signupMinAgeSelect.value;
                const minIndex = detailedAgeGroups.findIndex(g => g.value === minSelectedValue);
                let maxSelectedValue = AppUI.signupMaxAgeSelect.value;
                let currentMaxIndex = detailedAgeGroups.findIndex(g => g.value === maxSelectedValue);
                if (minSelectedValue === '10-under') {
                    AppUI.signupMaxAgeSelect.value = '10-under';
                } else if (minSelectedValue === '60-plus') {
                    AppUI.signupMaxAgeSelect.value = '60-plus';
                } else {
                    if (maxSelectedValue === '10-under' || maxSelectedValue === '60-plus' || (currentMaxIndex !== -1 && minIndex !== -1 && currentMaxIndex < minIndex)) {
                        AppUI.signupMaxAgeSelect.value = minSelectedValue;
                    }
                }
            });

            AppUI.signupMaxAgeSelect.addEventListener('change', () => {
                const maxSelectedValue = AppUI.signupMaxAgeSelect.value;
                const maxIndex = detailedAgeGroups.findIndex(g => g.value === maxSelectedValue);
                let minSelectedValue = AppUI.signupMinAgeSelect.value;
                let currentMinIndex = detailedAgeGroups.findIndex(g => g.value === minSelectedValue);

                if (maxSelectedValue === '10-under') {
                    AppUI.signupMinAgeSelect.value = '10-under';
                } else if (maxSelectedValue === '60-plus') {
                    AppUI.signupMinAgeSelect.value = '60-plus';
                } else {
                    if (minSelectedValue === '10-under' || minSelectedValue === '60-plus' || (currentMinIndex !== -1 && maxIndex !== -1 && currentMinIndex > maxIndex)) {
                        AppUI.signupMinAgeSelect.value = maxSelectedValue;
                    }
                }
            });
        }

        if (AppUI.profileImageInput && AppUI.profileImagePreview) {
            AppUI.profileImageInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];

                // 이전 미리보기 URL이 있다면 메모리에서 해제하고, 이벤트 리스너를 정리합니다.
                const existingObjectURL = AppUI.profileImagePreview.src;
                if (existingObjectURL && existingObjectURL.startsWith('blob:')) {
                    URL.revokeObjectURL(existingObjectURL);
                    AppUI.profileImagePreview.removeAttribute('src'); // 무한 루프 방지를 위해 src 제거
                    console.log("기존 Object URL 해제 및 src 제거 완료.");
                    
                }
                AppUI.profileImagePreview.onload = null;
                AppUI.profileImagePreview.onerror = null;

                if (file) {
                    console.log("Change event occurred. Selected file:", file.name, "Type:", file.type, "Size:", file.size);
                    if (!file.type.startsWith('image/')) {
                        showToast("Please select an image file.", "error");
                        AppUI.profileImagePreview.removeAttribute('src');
                        AppUI.profileImagePreview.style.display = 'none';
                        return;
                    }

                    showToast("Generating image preview...", "info");

                    const objectURL = URL.createObjectURL(file);
                    AppUI.profileImagePreview.style.display = 'block';

                    const onloadHandler = () => {
                        console.log("Preview image loaded and Object URL revoked.");

                    };

                    const onerrorHandler = (err) => {
                        console.error("프리뷰 이미지를 로드할수없습니다. 다시 선택하세요", err);
                        showToast("Could not load preview image. Please select the file again.", "error");
                        AppUI.profileImagePreview.removeAttribute('src'); // 무한 루프 방지를 위해 src 제거
                        AppUI.profileImagePreview.style.display = 'none';
                        URL.revokeObjectURL(objectURL);
                    };

                    AppUI.profileImagePreview.onload = onloadHandler;
                    AppUI.profileImagePreview.onerror = onerrorHandler;

                    AppUI.profileImagePreview.src = objectURL;
                    console.log("Preview Object URL created:", objectURL);
                    showToast("Image preview ready!", "success");

                } else {
                    AppUI.profileImagePreview.removeAttribute('src');
                    AppUI.profileImagePreview.style.display = 'block';
                    showToast("No file selected.", "info");
                }
            });
        } else {
            console.error("script.js:", "Profile image input or preview element not found in DOM. Check HTML IDs!");
        }




        document.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const targetId = toggle.dataset.target;
                const passwordInput = document.getElementById(targetId);
                if (passwordInput) {
                    if (passwordInput.type === 'password') {
                        passwordInput.type = 'text';
                        toggle.textContent = '🔒';
                    } else {
                        passwordInput.type = 'password';
                        toggle.textContent = '👁️';
                    }
                }
            });
        });
    });
