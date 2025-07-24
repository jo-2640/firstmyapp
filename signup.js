// ./signup.js

import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc ,serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// 이제 './src/firebase-init.js'에서 auth, db를 가져옵니다.
import { auth, db } from './src/firebase-init.js';

// auth-service.js에서 updateAuthUIForMode를 가져옵니다.
import { updateAuthUIForMode } from './src/auth-service.js';

import { showToast, getDefaultProfileImage, resizeAndOptimizeImg, uploadProfileImageToAzure, detailedAgeGroups, getAgeGroupOptionLabel, fetchCurrentYearFromServer } from './utils.js';
import { fillSignUpFieldsWithRandomDataTemp } from './js/temp.js';

// --- 전역 변수 ---
let isSignUpMode = false;
let serverCurrentYear = new Date().getFullYear(); // 서버 연도 (초기값은 클라이언트 연도, 나중에 서버에서 받아옴)

// --- HTML 요소 (DOMContentLoaded 내부에서 할당될 것임) ---
let authEmail;
let authPassword;
let authConfirmPassword;
let authSubmitBtn;
let authSwitchBtn;
let authErrorMessage;

let signupFields;
let signupNickname;
let signupGender;
let signupBirthYear;
let signupRegion;
let signupBio;
let signupMinAge;
let signupMaxAge;

let profileImageInput;
let profileImagePreview;

// ⭐ MIN_BIRTH_YEAR는 상수로 정의 (전역 스코프에서 한 번만)
const MIN_BIRTH_YEAR = 1960;

// --- 함수 ---

/**
 * 현재 인증 모드가 회원가입 모드인지 반환합니다.
 * @returns {boolean} true면 회원가입 모드, false면 로그인 모드.
 */
export function getSignUpMode() {
    return isSignUpMode;
}

/**
 * 모든 인증/회원가입 관련 입력 필드와 오류 메시지, 프로필 미리보기를 초기화합니다.
 */
function clearAuthFields() {
    if (authEmail) authEmail.value = '';
    if (authPassword) authPassword.value = '';
    if (authConfirmPassword) authConfirmPassword.value = '';
    if (signupNickname) signupNickname.value = '';
    if (signupGender) signupGender.value = 'female';
    if (signupMinAge) signupMinAge.value = '';
    if (signupMaxAge) signupMaxAge.value = '';
    if (signupBirthYear) signupBirthYear.value = '';
    if (signupRegion) signupRegion.value = '';
    if (signupBio) signupBio.value = '';
    if (profileImagePreview) profileImagePreview.src = '';
    if (authErrorMessage) authErrorMessage.textContent = '';
    if (profileImagePreview) profileImagePreview.src = getDefaultProfileImage('female'); // 기본값: 여성 이미지 (로그인/회원가입 전환시)
    if (profileImagePreview) profileImagePreview.style.display = 'block'; // 보이도록 설정
    if (profileImageInput) profileImageInput.value = ''; // 파일 선택값 초기화
    if (authErrorMessage) authErrorMessage.textContent = '';
}

/**
 * 현재 인증 모드(로그인/회원가입)를 전환하고 UI를 업데이트합니다.
 */
export function toggleSignUpMode() {
    isSignUpMode = !isSignUpMode; // 모드 전환
    updateAuthUIForMode(isSignUpMode);
    // --- 모드에 따른 UI 업데이트 ---
    if (isSignUpMode) {
        // --- 회원가입 모드일 때의 동작 ---
        if (authSubmitBtn) authSubmitBtn.textContent = '회원가입';
        if (authSwitchBtn) authSwitchBtn.textContent = '로그인으로 전환';
        if (signupFields) signupFields.classList.remove('hidden'); // 회원가입 필드 보이기

        clearAuthFields(); // 필드 초기화 후 랜덤 데이터 채우기

        // ⭐ 개발/테스트용: 필드를 랜덤 데이터로 채웁니다. (나중에 삭제)
       fillSignUpFieldsWithRandomDataTemp(
                   authEmail, authPassword, signupNickname, signupGender, signupBirthYear, signupRegion,
                   signupMinAge, signupMaxAge,signupBio, // ⭐ 변경: 나이대 드롭다운 요소 직접 전달
                   MIN_BIRTH_YEAR,
                   serverCurrentYear
       );

        // 프로필 이미지가 아직 설정되지 않았을 때만 기본 이미지 설정 및 표시
        if (profileImagePreview && signupGender) {
            const currentGender = signupGender.value;
            profileImagePreview.src = getDefaultProfileImage(currentGender);
           profileImagePreview.style.display = 'block';
        }

    } else {
        // --- 로그인 모드일 때의 동작 ---
        if (authSubmitBtn) authSubmitBtn.textContent = '로그인';
        if (authSwitchBtn) authSwitchBtn.textContent = '계정이 없으신가요? 회원가입';
        if (signupFields) signupFields.classList.add('hidden'); // 회원가입 필드 숨기기

        clearAuthFields(); // 로그인 모드로 전환 시 모든 필드 초기화
    }
}

/**
 * 출생 연도 드롭다운 옵션을 생성하고 업데이트합니다.
 * @param {number} minYear 최소 출생 연도.
 * @param {number} maxYear 최대 출생 연도 (현재 연도).
 */
function updateBirthYearDropdownOptions(minYear, maxYear) {
    if (signupBirthYear) {
        signupBirthYear.innerHTML = '<option value="">선택</option>'; // 기존 옵션 지우기
        for (let year = maxYear; year >= minYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            signupBirthYear.appendChild(option);
        }
    }
}

/**
 * 최소/최대 나이대 드롭다운 옵션을 생성하고 업데이트합니다.
 * 이 함수는 utils.js의 detailedAgeGroups와 getAgeGroupOptionLabel을 활용합니다.
 * @param {HTMLElement} selectElement 옵션을 채울 select 요소.
 * @param {string} type 'min' 또는 'max' (옵션 텍스트 생성 시 사용).
 */
function updateAgeGroupDropdownOptions(selectElement, type) {
    if (selectElement) {
        selectElement.innerHTML = '<option value="">선택</option>'; // 기존 옵션 지우고 기본값 추가
        detailedAgeGroups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.value;
            option.textContent = getAgeGroupOptionLabel(group, type);
            selectElement.appendChild(option);
        });
    }
}

// * 회원가입 UI를 초기화하고 DOM 요소를 참조하며, 이벤트 리스너를 설정합니다.
// * 이 함수는 페이지 로드 시 한 번만 호출됩니다.
export function initializeSignupUI() {
    // 💡💡💡 DOM 요소들을 여기서 참조합니다.
    authEmail = document.getElementById('auth-email');
    authPassword = document.getElementById('auth-password');
    authConfirmPassword = document.getElementById('signup-password-confirm-group');
    signupFields = document.getElementById('signup-fields');
    authSubmitBtn = document.getElementById('auth-submit-btn');
    authSwitchBtn = document.getElementById('auth-switch-btn');
    authErrorMessage = document.getElementById('auth-error-message');
    signupNickname = document.getElementById('signup-nickname');
    signupGender = document.getElementById('signup-gender');
    signupBirthYear = document.getElementById('signup-birth-year');
    signupMinAge = document.getElementById('signup-min-age');
    signupMaxAge = document.getElementById('signup-max-age');
    signupRegion = document.getElementById('signup-region');
    signupBio = document.getElementById('signup-bio');
    profileImageInput = document.getElementById('signup-profile-image-upload-input');
    profileImagePreview = document.getElementById('signup-profile-img-preview');

     updateAuthUIForMode(isSignUpMode);
    // ⭐ 서버 연도를 비동기적으로 가져와 전역 변수에 저장하고 드롭다운 옵션을 생성합니다.
    fetchCurrentYearFromServer()
        .then(year => {
            serverCurrentYear = year;
            console.log(`[signup.js] 서버에서 ${serverCurrentYear}년도를 성공적으로 가져왔습니다.`);
            updateBirthYearDropdownOptions(MIN_BIRTH_YEAR, serverCurrentYear);
        })
        .catch(error => {
            console.error(`[signup.js] 연도 정보를 가져오는데 실패했습니다: ${error.message}`);
            showToast(`연도 정보를 가져올 수 없습니다: ${error.message}`, 'error');
            if (signupBirthYear) {
                signupBirthYear.disabled = true;
                signupBirthYear.innerHTML = '<option value="">연도 불러오기 실패</option>';
            }
        });

    updateAgeGroupDropdownOptions(signupMinAge, 'min'); // 'min' 타입으로 호출
    updateAgeGroupDropdownOptions(signupMaxAge, 'max'); // 'max' 타입으로 호출

    // ⭐ 성별 드롭다운 변경 이벤트 리스너 설정
    if (signupGender && profileImageInput && profileImagePreview) {
        signupGender.addEventListener('change', () => {
            const selectedGender = signupGender.value;
            // 사용자가 이미지를 직접 선택하지 않은 경우에만 기본 이미지로 업데이트
            if (profileImageInput.files.length === 0) {
                profileImagePreview.src = getDefaultProfileImage(selectedGender);
            }
        });
    }

    // --- ⭐ 나이대 드롭다운 동기화 로직   시작 ⭐ ---
    if (signupMinAge && signupMaxAge) {
        // 최소 나이대 변경 시
        signupMinAge.addEventListener('change', () => {
            const minSelectedValue = signupMinAge.value;
            const minIndex = detailedAgeGroups.findIndex(g => g.value === minSelectedValue);
            let maxSelectedValue = signupMaxAge.value;
            let currentMaxIndex = detailedAgeGroups.findIndex(g => g.value === maxSelectedValue);

            if (minSelectedValue === '10-under') {
                signupMaxAge.value = '10-under'; // 최대 나이대도 10대 이하로 고정
            } else if (minSelectedValue === '60-plus') {
                signupMaxAge.value = '60-plus'; // 최대 나이대도 60대 이상으로 고정
            } else {
                if (maxSelectedValue === '10-under' || maxSelectedValue === '60-plus' || (currentMaxIndex !== -1 && minIndex !== -1 && currentMaxIndex < minIndex)) {
                    signupMaxAge.value = minSelectedValue;
                }
            }
        });

        // 최대 나이대 변경 시
        signupMaxAge.addEventListener('change', () => {
            const maxSelectedValue = signupMaxAge.value;
            const maxIndex = detailedAgeGroups.findIndex(g => g.value === maxSelectedValue);
            let minSelectedValue = signupMinAge.value;
            let currentMinIndex = detailedAgeGroups.findIndex(g => g.value === minSelectedValue);

            if (maxSelectedValue === '10-under') {
                signupMinAge.value = '10-under'; // 최소 나이대도 10대 이하로 고정
            } else if (maxSelectedValue === '60-plus') {
                signupMinAge.value = '60-plus'; // 최소 나이대도 60대 이상으로 고정
            } else {
                if (minSelectedValue === '10-under' || minSelectedValue === '60-plus' || (currentMinIndex !== -1 && maxIndex !== -1 && currentMinIndex > maxIndex)) {
                    signupMinAge.value = maxSelectedValue;
                }
            }
        });
    }

    // ⭐ 최초 로드 시 로그인 모드로 설정 (UI 제어는 toggleSignUpMode에 위임)
    // isSignUpMode를 true로 임시 설정하여 toggleSignUpMode 호출 시 false(로그인 모드)가 되도록 합니다.
    isSignUpMode = true;
    toggleSignUpMode();
}
// D:/My Project Flutter/chat_app/assets/ChatHtml/signup.js

// ... (기존 import 및 다른 함수들) ...

// D:/My Project Flutter/chat_app/assets/ChatHtml/signup.js

// ... (기존 import 및 다른 함수들) ...

export async function handleSignup(event) {
    event.preventDefault();

    // HTML 요소 가져오기
    const signupNickname = document.getElementById('signup-nickname');
    const signupEmail = document.getElementById('signup-email');
    const signupPassword = document.getElementById('auth-password'); // ⭐ ID가 'auth-password'로 변경되었을 수 있으므로 확인
    const signupPasswordConfirm = document.getElementById('signup-password-confirm'); // ⭐ 추가된 비밀번호 확인 필드
    const signupGenderMale = document.getElementById('signup-gender-male');
    const signupGenderFemale = document.getElementById('signup-gender-female');
    const signupMinAgeGroup = document.getElementById('signup-min-age-group');
    const signupMaxAgeGroup = document.getElementById('signup-max-age-group');
    const signupProfileImageInput = document.getElementById('signup-profile-image-upload-input');
    const signupBio = document.getElementById('signup-bio');

    const authErrorMessage = document.getElementById('auth-error-message');

    const nickname = signupNickname.value.trim();
    const email = authEmail.value.trim();
    const password = authPassword.value;
    const passwordConfirm = signupPasswordConfirm.value;
    const gender = signupGender.value; // ⭐ <select> 요소의 value를 가져옴
    const minAgeGroup = signupMinAge.value; // ⭐ 올바른 ID 사용
    const maxAgeGroup = signupMaxAge.value; // ⭐ 올바른 ID 사용
    const selectedBirthYear = signupBirthYear.value; // 탄생 연도 값 가져오기
    const region = signupRegion.value;
    const bio = signupBio.value.trim();
    const profileImageFile = profileImageInput.files[0];

    console.log("--- 회원가입 필드 값 확인 ---");
    console.log("Nickname:", nickname);
    console.log("Email:", email);
    console.log("Password (length):", password.length > 0 ? '입력됨' : '비어있음');
    console.log("Password Confirm (length):", passwordConfirm.length > 0 ? '입력됨' : '비어있음'); // ⭐ 로그 추가
    console.log("Gender:", gender);
    console.log("Min Age Group:", minAgeGroup);
    console.log("Max Age Group:", maxAgeGroup);
    console.log("----------------------------");

    // 1. 필수 필드 유효성 검사 (프로필 이미지, 자기소개 제외)
    // ⭐ passwordConfirm도 필수 검사에 포함
   if (!nickname || !email || !password || !passwordConfirm || !gender ||
           !selectedBirthYear || !region ||
           minAgeGroup === '' || maxAgeGroup === '')
   {
           const message = '닉네임, 이메일, 비밀번호, 비밀번호 확인, 성별, 탄생 연도, 지역, 최소/최대 나이대는 필수 입력 항목입니다.';
           if (authErrorMessage) authErrorMessage.textContent = message;
           showToast(message, 'error');
           console.warn("필수 입력 필드 경고:", message);
           return;
   }

    if (password.length < 6) {
        const message = '비밀번호는 6자 이상이어야 합니다.';
        if (authErrorMessage) authErrorMessage.textContent = message;
        showToast(message, 'error');
        console.warn("비밀번호 길이 경고:", message);
        return;
    }

    // ⭐⭐ 비밀번호와 비밀번호 확인 일치 여부 검사 추가 ⭐⭐
    if (password !== passwordConfirm) {
        const message = '비밀번호와 비밀번호 확인이 일치하지 않습니다.';
        if (authErrorMessage) authErrorMessage.textContent = message;
        showToast(message, 'error');
        console.warn("비밀번호 불일치 경고:", message);
        return;
    }

   // 나이대 유효성 검사: minAgeGroup이 maxAgeGroup보다 크면 안 됨
    if (minAgeGroup && maxAgeGroup) {
        const minVal = parseInt(minAgeGroup.split('-')[0]);
        const maxVal = parseInt(maxAgeGroup.split('-')[0]);
        if (minVal > maxVal) {
            const message = '최소 나이대는 최대 나이대보다 클 수 없습니다.';
            if (authErrorMessage) authErrorMessage.textContent = message;
            showToast(message, 'error');
             console.warn("관심 나이대 설정 경고:",message);
                    return;
        }
    }

    if (authErrorMessage) authErrorMessage.textContent = ''; // 에러 메시지 초기화
    showToast('회원가입 중...', 'info');

    try {
        // Firebase Auth를 이용한 사용자 생성
       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
       const user = userCredential.user;
       const uid = user.uid;

       let profileImgUrl = '';
       if (profileImageFile) {
           profileImgUrl = await uploadProfileImageToAzure(profileImageFile, uid);
           if (!profileImgUrl) {
                   console.warn("프로필 이미지 업로드 실패, 기본 이미지 사용.");
                   profileImgUrl = getDefaultProfileImage(gender);
               }
           } else {
                   profileImgUrl = getDefaultProfileImage(gender); // 파일 선택 안 하면 기본 이미지 사용
       }
        // Firestore에 사용자 데이터 저장
        await setDoc(doc(db, "users", uid), {
            nickname: nickname,
            email: email,
            gender: gender,
            minAgeGroup: minAgeGroup, // 추가
            maxAgeGroup: maxAgeGroup, // 추가
            profileImgUrl: profileImgUrl,
            bio: bio,
            createdAt: serverTimestamp(),
            friendIds: [],
            friendRequestsSent: [],
            friendRequestsReceived: []
        });

        // 사용자 프로필 업데이트 (Firebase Auth) - 닉네임만 업데이트
        await updateProfile(user, {
            displayName: nickname,
            photoURL: profileImgUrl // Firebase Auth의 photoURL에도 프로필 이미지 URL 저장
        });

        showToast('회원가입 성공! 로그인 중...', 'success');
        // 성공 시 페이지 리디렉션


    } catch (error) {
        console.error("회원가입 오류:", error);
        let errorMessage = '회원가입 중 오류가 발생했습니다.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = '이미 사용 중인 이메일 주소입니다.';
                break;
            case 'auth/invalid-email':
                errorMessage = '유효하지 않은 이메일 주소입니다.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = '이메일/비밀번호 인증이 활성화되지 않았습니다.';
                break;
            case 'auth/weak-password':
                errorMessage = '비밀번호가 너무 약합니다 (최소 6자).';
                break;
            default:
                errorMessage = error.message;
        }
        if (authErrorMessage) authErrorMessage.textContent = errorMessage;
        showToast(errorMessage, 'error');
        throw error; // 오류를 던져서 호출자가 catch 블록에서 처리하도록
    }
}