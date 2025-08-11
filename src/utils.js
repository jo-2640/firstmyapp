// utils.js
// 이 파일은 여러 모듈에서 공통적으로 사용되는 유틸리티 함수들을 모아놓습니다.

import { SERVER_BASE_URL } from "./constants";


// ✅ 토스트 알림을 보여주는 함수
export function showToast(message, type = 'info') {
    // 1. 토스트 알림 HTML 요소 가져오기
    const toast = document.querySelector('.toast-notification');

    // 2. 메시지와 타입 설정
    toast.textContent = message;
    toast.className = 'toast-notification visible ' + type; // .visible 클래스를 추가

    // 3. 3초(3000ms) 후에 토스트 숨기기
    setTimeout(() => {
        toast.className = 'toast-notification'; // .visible 클래스 제거
    }, 3000);
}
export function getAgeGroupLabelFromBirthYear(birthYear) {
    // birthYear가 유효한지 먼저 확인합니다.
    if (typeof birthYear !== 'number' || isNaN(birthYear)) {
        return '나이 정보 없음';
    }

    // 현재 연도를 기준으로 나이를 계산합니다.
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear + 1;

    // 계산된 나이를 바탕으로 그룹을 찾습니다.
    const group = detailedAgeGroups.find(g => age >= g.min && age <= g.max);

    return group ? group.label : '나이 정보 없음';
}
// 출생 연도를 기반으로 사용자의 연령대 레이블을 반환합니다.
// 이 함수는 주로 프로필 표시 등에서 사용될 때, 저장된 'value'에 해당하는 상세 레이블을 반환합니다.
export function getAgeGroupLabel(ageGroupValue) {
    const group = detailedAgeGroups.find(g => g.value === ageGroupValue);
    // 'label' 속성에는 "20대 초반 (20-23세)"와 같이 상세 정보가 포함됩니다.
    return group ? group.label : '나이 정보 없음';
}
export function getAgeFromBirthYear(birthYear, currentYear) {
    if (typeof birthYear !== 'number' || isNaN(birthYear) || birthYear <= 1900) {
        return null;
    }
    return currentYear - birthYear + 1; // 한국식 나이 계산
}
// 성별 값을 한국어 레이블로 변환합니다.
export function getGenderLabel(gender) {
    if (gender === 'male') return '남성';
    if (gender === 'female') return '여성';
    return '선택 안함';
}

// 지역 값을 한국어 레이블로 변환합니다.
export function getRegionLabel(region) {
    switch (region) {
        case 'seoul': return '서울';
        case 'gyeonggi': return '경기';
        case 'incheon': return '인천';
        case 'busan': return '부산';
        case 'daegu': return '대구';
        case 'gwangju': return '광주';
        case 'daejeon': return '대전';
        case 'ulsan': return '울산';
        case 'sejong': return '세종';
        case 'gangwon': return '강원';
        case 'chungbuk': return '충북';
        case 'chungnam': return '충남';
        case 'jeonbuk': return '전북';
        case 'jeonnam': return '전남';
        case 'gyeongbuk': return '경북';
        case 'gyeongnam': return '경남';
        case 'jeju': return '제주';
        default: return '지역 정보 없음';
        
    }
}
export const regionMap = {
    '전체': 'all',
    '서울': 'seoul',
    '부산': 'busan',
    '대구': 'daegu',
    '인천': 'incheon',
    '광주': 'gwangju',
    '대전': 'daejeon',
    '울산': 'ulsan',
    '세종': 'sejong',
    '경기': 'gyeonggi',
    '강원': 'gangwon',
    '충북': 'chungbuk',
    '충남': 'chungnam',
    '전북': 'jeonbuk',
    '전남': 'jeonnam',
    '경북': 'gyeongbuk',
    '경남': 'gyeongnam',
    '제주': 'jeju'
};

export const genderMap = {
    '전체': 'all',
    '남성': 'male',
    '여성': 'female'
};


// 성별에 따른 기본 프로필 이미지 경로를 반환합니다.
export function getDefaultProfileImage(gender) {
    if (gender === 'male') {
        return 'img/default_profile_male.png';
    } else if (gender === 'female') {
        return 'img/default_profile_female.png';
    } else {
        return 'img/default_profile_guest.png';
    }
}

// 모든 나이대 그룹 정보 (baseLabel, min, max, label 포함)
// 'label' 속성에는 "20대 초반 (20-23세)"와 같이 상세 정보가 포함됩니다.
export const detailedAgeGroups = [
    { value: "10-under", baseLabel: "10대", label: "10대 이하", min: 0, max: 19 },
    // 20대
    { value: "20-early", baseLabel: "20대", label: "20대 초반 (20-23세)", min: 20, max: 23 },
    { value: "20-mid", baseLabel: "20대", label: "20대 중반 (24-27세)", min: 24, max: 27 },
    { value: "20-late", baseLabel: "20대", label: "20대 후반 (28-29세)", min: 28, max: 29 },
    // 30대
    { value: "30-early", baseLabel: "30대", label: "30대 초반 (30-33세)", min: 30, max: 33 },
    { value: "30-mid", baseLabel: "30대", label: "30대 중반 (34-37세)", min: 34, max: 37 },
    { value: "30-late", baseLabel: "30대", label: "30대 후반 (38-39세)", min: 38, max: 39 },
    // 40대
    { value: "40-early", baseLabel: "40대", label: "40대 초반 (40-43세)", min: 40, max: 43 },
    { value: "40-mid", baseLabel: "40대", label: "40대 중반 (44-47세)", min: 44, max: 47 },
    { value: "40-late", baseLabel: "40대", label: "40대 후반 (48-49세)", min: 48, max: 49 },
    // 50대
    { value: "50-early", baseLabel: "50대", label: "50대 초반 (50-53세)", min: 50, max: 53 },
    { value: "50-mid", baseLabel: "50대", label: "50대 중반 (54-57세)", min: 54, max: 57 },
    { value: "50-late", baseLabel: "50대", label: "50대 후반 (58-59세)", min: 58, max: 59 },
    // 60대 이상
    { value: "60-plus", baseLabel: "60대", label: "60대 이상", min: 60, max: 150 }
];

// 드롭다운 옵션 텍스트 생성을 위한 헬퍼 함수
// 'min' 타입일 때는 '이상'을, 'max' 타입일 때는 '이하'를 붙입니다.
export function getAgeGroupOptionLabel(group, type) {
    // '10대 이하'와 '60대 이상'은 특별 케이스로 그대로 반환
    if (group.value === "10-under" || group.value === "60-plus") {
        return group.label;
    }

    // 그 외 연령대는 상세 레이블에 '이상' 또는 '이하'를 붙여 반환
    return `${group.label}${type === 'min' ? ' 이상' : ' 이하'}`;
}

/////////////////////////////////////////////////////////////////////////////////
// utils/imageProcessor.js

/**
 * 이미지를 지정된 최대 너비/높이로 리사이징하고 Blob 객체로 반환합니다.
 * 파일 크기 제한과 타입 검사는 이 함수를 호출하기 전에 수행하는 것이 좋습니다.
 *
 * @param {File} file - 원본 이미지 File 객체
 * @param {number} maxWidth - 리사이징될 이미지의 최대 너비
 * @param {number} maxHeight - 리사이징될 이미지의 최대 높이
 * @param {string} [type='image/jpeg'] - 반환할 이미지의 MIME 타입 (기본: 'image/jpeg')
 * @param {number} [quality=0.8] - JPEG 압축 품질 (0.0 - 1.0, 기본: 0.8)
 * @returns {Promise<{blob: Blob, name: string, type: string}>} 리사이징된 이미지의 Blob 객체와 원본 파일명/타입
 * @throws {Error} 이미지 로드 또는 변환 실패 시
 */

/// utils/imageProcessor.js
 // ... (기존 코드) ...

 /**
  * 이미지를 지정된 최대 너비/높이로 리사이징하고 Blob 객체로 반환합니다.
  * @param {File} file 원본 이미지 파일 객체
  * @param {number} maxWidth 최대 너비
  * @param {number} maxHeight 최대 높이
  * @param {string} type 변환할 이미지의 MIME 타입 (예: 'image/jpeg', 'image/png')
  * @param {number} quality 압축 품질 (0~1)
  * @returns {Promise<{blob: Blob, name: string, type: string}>} 리사이징된 이미지의 Blob 객체와 원본 파일명/타입
  */
 export async function resizeAndOptimizeImg(file, maxWidth, maxHeight, type, quality) {
     return new Promise(async (resolve) => {
         try {
             const imageBitmap = await createImageBitmap(file);

             let width = imageBitmap.width;
             let height = imageBitmap.height;

             if (width > height) {
                 if (width > maxWidth) {
                     height *= maxWidth / width;
                     width = maxWidth;
                 }
             } else {
                 if (height > maxHeight) {
                     width *= maxHeight / height;
                     height = maxHeight;
                 }
             }

             const offscreenCanvas = new OffscreenCanvas(Math.round(width), Math.round(height));
             const ctx = offscreenCanvas.getContext('2d');

             if (ctx === null) {
                 throw new Error("OffscreenCanvas 2D 컨텍스트를 얻지 못했습니다.");
             }

             ctx.drawImage(imageBitmap, 0, 0, Math.round(width), Math.round(height));

             // Blob으로 변환할 때, 인자로 받은 'type'과 'quality'를 사용하도록 수정
             const blob = await offscreenCanvas.convertToBlob({
                 type: type, // ★ 인자로 받은 타입을 사용 ★
                 quality: quality
             });
             // 반환 시에도 변환된 Blob의 실제 타입과 원본 파일명을 함께 반환
             resolve({ blob, name: file.name, type: blob.type });
         } catch (error) {
             console.error("이미지 리사이징 및 최적화 오류:", error);
             resolve(null);
         }
     });
 }
export async function uploadProfileImageToAzure(file, userId) {
    if (!userId) {
        showToast("사용자 ID가 없어 프로필 이미지를 업로드할 수 없습니다.", "error");
        return null;
    }
    if (!file) {
        showToast("업로드할 이미지가 선택되지 않았습니다.", "info");
        return null;
    }

    // 파일 타입 검사 (이미지 파일만 허용)
    if (!file.type.startsWith('image/')) {
        showToast("이미지 파일만 업로드할 수 있습니다.", "error");
        return null;
    }

    // 원본 파일 크기 제한 (10MB)
    const MAX_ORIGINAL_FILE_SIZE_MB = 10;
    if (file.size > MAX_ORIGINAL_FILE_SIZE_MB * 1024 * 1024) {
        showToast(`원본 이미지 파일은 ${MAX_ORIGINAL_FILE_SIZE_MB}MB를 초과할 수 없습니다.`, "error");
        return null;
    }

    showToast("프로필 이미지 최적화 중...", "info");

    let processedFileBlob = null; // 리사이징된 Blob을 저장할 변수
    let originalFileName = file.name; // 원본 파일명 저장 (초기값 설정)
    let originalFileType = file.type; // 원본 파일 타입 저장 (초기값 설정)

    try {
        // resizeAndOptimizeImg 함수 호출 및 결과 구조 분해 할당
        const result = await resizeAndOptimizeImg(file, 200, 200, 'image/jpeg', 0.8);

        if (!result || !result.blob) {
            throw new Error("이미지 리사이징 및 최적화 후 유효한 Blob을 얻지 못했습니다.");
        }

        processedFileBlob = result.blob;
        originalFileName = result.name; // 리사이징 함수에서 반환된 원본 파일명 사용
        originalFileType = result.type; // 리사이징 함수에서 반환된 원본 파일 타입 사용

        // 리사이징 후 파일 크기 재검사
        const MAX_PROCESSED_FILE_SIZE_MB = 1; // 예를 들어, 1MB
        if (processedFileBlob.size > MAX_PROCESSED_FILE_SIZE_MB * 1024 * 1024) { // ★ processedFile -> processedFileBlob으로 수정 ★
            showToast(`최적화된 이미지 파일 크기가 너무 큽니다 (${(processedFileBlob.size / (1024 * 1024)).toFixed(2)}MB).`, "error");
            return null;
        }

        showToast("프로필 이미지 최적화 완료!", "info");
    } catch (error) {
        console.error("이미지 최적화 실패:", error);
        showToast(`이미지 최적화에 실패했습니다: ${error.message}`, "error");
        return null;
    }

    try {
        // Blob 이름 생성: 'users/UID/profile_image.확장자' 형식
        const fileExtension = originalFileName.split('.').pop() || processedFileBlob.type.split('/').pop() || 'jpeg';
        const uniqueFileName = `${userId}_${Date.now()}.${fileExtension}`;
        const blobPath = `users/${userId}/${uniqueFileName}`;

        // 1. Node.js 서버에 SAS 토큰 요청
        const response = await fetch(`${NODE_SERVER_URL}/api/getBlobSasToken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: blobPath,
                contentType: processedFileBlob.type
            })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'SAS 토큰을 가져오지 못했습니다. 서버 오류를 확인하세요.');
        }

        const { sasToken, blobUrl } = data;
        const uploadSasUrl = `${blobUrl}?${sasToken}`;

        showToast("Azure Storage에 업로드 중...", "info");

        // 2. 받은 SAS 토큰으로 Azure Blob Storage에 직접 PUT 요청
        const uploadResponse = await fetch(uploadSasUrl, {
            method: 'PUT',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type': processedFileBlob.type
            },
            body: processedFileBlob
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Azure Storage 업로드 실패: ${uploadResponse.status} - ${errorText}`);
        }

        showToast("프로필 이미지 업로드 완료!", "success");
        console.log("Azure Blob Storage에 업로드된 최종 URL:", blobUrl);
        return blobUrl;

    } catch (error) {
        console.error("프로필 이미지 업로드 중 오류 발생:", error);
        showToast(`프로필 이미지 업로드 실패: ${error.message}`, "error");
        return null;
    }
}

export function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
///////////////////////랜덤관련함수/////////////////////////////////////
export  function generateRandomEmail() {
  const usernameLength = Math.floor(Math.random() * 8) + 5; // 5~12자리 사용자명
  const username = generateRandomString(usernameLength);
  const domains = ['example.com', 'test.org', 'mail.net', 'demo.co.kr'];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];

  return `${username}@${randomDomain}`;
}

export function getRandomElement(arr){
    if(!Array.isArray(arr) || arr.length === 0) {
        return undefined;
    }
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
}

export function getRandomBirthYear(oldestBirthYear, youngestBirthYear) {
    if (oldestBirthYear > youngestBirthYear) {
        throw new Error('가장 나이 많은 사람의 연도(최소 연도 값)는 가장 어린 사람의 연도(최대 연도 값)보다 작거나 같아야 합니다.');
    }
    // 공식: Math.floor(Math.random() * (총 범위 크기)) + 범위의 시작 값
    return Math.floor(Math.random() * (youngestBirthYear - oldestBirthYear + 1)) + oldestBirthYear;
}

//서버로부터 현재 연도를 가져오는 함수
export async function fetchCurrentYearFromServer() {
    try {
     

        const response = await fetch(`${SERVER_BASE_URL}/api/current-year`);
        // 2. 응답이 성공적인지 확인합니다 (HTTP 상태 코드 200번대).
        if (!response.ok) {
            // 응답이 실패하면 오류를 던집니다.
             throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        // 3. 서버 응답을 JSON 형태로 파싱합니다.
        //    서버가 { "year": 2025 }와 같은 JSON을 보낸다고 가정합니다.
        const data = await response.json();

        // 4. 파싱된 데이터에서 연도 값을 추출하여 반환합니다.
        if (data && typeof data.currentYear === 'number') {
            return data.currentYear;
        } else {
            throw new Error('서버 응답 형식이 올바르지 않습니다: "currentYear" 필드가 없습니다.');
        }
    } catch (error) {
        console.error("서버에서 연도 정보를 가져오는 중 오류 발생:", error);
        // 오류 발생 시 클라이언트의 현재 연도를 폴백(fallback)으로 반환하거나,
        // 필요에 따라 오류를 다시 던져 상위 호출자에게 알릴 수 있습니다.
        // 여기서는 예시로 클라이언트 연도를 반환합니다.
        return new Date().getFullYear();
    }
}

export async function fetchBirthYearRangeFromServer() {
    try {
        const response = await fetch(`${SERVER_BASE_URL}/api/getBirthYearRange`);
        if (!response.ok) {
            throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (data && data.minBirthYear && data.maxBirthYear) {
            return { minBirthYear: data.minBirthYear, maxBirthYear: data.maxBirthYear };
        } else {
            throw new Error('서버 응답 형식이 올바르지 않습니다: "minBirthYear" 또는 "maxBirthYear" 필드가 없습니다.');
        }
    } catch (error) {
        console.error("서버에서 출생 연도 범위를 가져오는 중 오류 발생:", error);
        throw error; // 오류를 다시 던져 상위 호출자에게 알림
    }
}

