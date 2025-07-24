// utils.js
// 이 파일은 여러 모듈에서 공통적으로 사용되는 유틸리티 함수들을 모아놓습니다.
export function showToast(message, type = 'info') {
    const toast = document.querySelector('.toast-notification');
    if (!toast) {
        console.warn("토스트 알림 요소를 찾을 수 없습니다!");
        return;
    }
    toast.textContent = message;
    toast.className = `toast-notification show ${type}`;
    setTimeout(() => {
        toast.className = 'toast-notification';
    }, 3000);
}
// 출생 연도를 기반으로 사용자의 연령대 레이블을 반환합니다.
// 이 함수는 주로 프로필 표시 등에서 사용될 때, 저장된 'value'에 해당하는 상세 레이블을 반환합니다.
export function getAgeGroupLabel(ageGroupValue) {
    const group = detailedAgeGroups.find(g => g.value === ageGroupValue);
    // 'label' 속성에는 "20대 초반 (20-23세)"와 같이 상세 정보가 포함됩니다.
    return group ? group.label : '나이 정보 없음';
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
        case 'chungnam': '충남';
        case 'jeonbuk': return '전북';
        case 'jeonnam': return '전남';
        case 'gyeongbuk': return '경북';
        case 'gyeongnam': return '경남';
        case 'jeju': return '제주';
        default: return '지역 정보 없음';
    }
}

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
const NODE_SERVER_URL = 'http://localhost:3000';

export function resizeAndOptimizeImg(file, maxWidth, maxHeight, type = 'image/jpeg', quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('유효한 이미지 파일이 아닙니다.'));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file); // 파일을 Data URL로 읽기

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result; // Data URL을 이미지 src로 설정

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 이미지 비율을 유지하면서 최대 너비/높이에 맞게 조정
                if (width > maxWidth || height > maxHeight) {
                    const aspectRatio = width / height;
                    if (width > height) { // 가로가 더 길면 너비 기준으로
                        width = maxWidth;
                        height = maxWidth / aspectRatio;
                    } else { // 세로가 더 길거나 같으면 높이 기준으로
                        height = maxHeight;
                        width = maxHeight * aspectRatio;
                    }
                }

                // 원본 이미지가 이미 maxWidth, maxHeight보다 작다면 리사이징 없이 원본 크기 유지
                // 이 부분을 추가하여 작은 이미지가 너무 작게 리사이즈되는 것을 방지하거나,
                // 리사이징 로직이 원본 크기를 해치지 않도록 합니다.
                // 현재 코드는 이미 작다면 원본 크기를 유지합니다.
                // canvas.width = width;
                // canvas.height = height;

                // 이미지를 중앙에 배치하고 남는 공간이 있다면 투명하게 처리
                // 또는 이미지를 캔버스에 꽉 채우도록 설정 (현재 로직과 동일)
                canvas.width = Math.round(width); // 소수점 제거
                canvas.height = Math.round(height); // 소수점 제거


                const ctx = canvas.getContext('2d');
                // 리사이징 시 이미지가 흐릿해지는 것을 방지 (High-quality scaling)
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // 캔버스에 이미지 그리기

                // 리사이징된 이미지를 Blob으로 변환
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Blob과 함께 원본 파일명, 타입을 객체로 반환
                        resolve({ blob: blob, name: file.name, type: file.type });
                    } else {
                        reject(new Error('Canvas to Blob 변환 실패: 브라우저 지원 문제 또는 내부 오류.'));
                    }
                }, type, quality); // MIME 타입과 품질 설정
            };
            img.onerror = (error) => {
                reject(new Error('이미지 로드 실패: ' + error.message));
            };
        };
        reader.onerror = (error) => {
            reject(new Error('파일 읽기 실패: ' + error.message));
        };
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
export async function fetchCurrentYearFromServer() {
    try {
        // 1. 서버의 특정 API 엔드포인트로 요청을 보냅니다.
        //    'http://your-backend-api.com/api/current-year'는 실제 백엔드 주소와 경로로 대체해야 합니다.

        const response = await fetch('http://localhost:3000/api/current-year');
        // 2. 응답이 성공적인지 확인합니다 (HTTP 상태 코드 200번대).
        if (!response.ok) {
            // 응답이 실패하면 오류를 던집니다.
            throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
        }

        // 3. 서버 응답을 JSON 형태로 파싱합니다.
        //    서버가 { "year": 2025 }와 같은 JSON을 보낸다고 가정합니다.
        const data = await response.json();

        // 4. 파싱된 데이터에서 연도 값을 추출하여 반환합니다.
        if (data && typeof data.year === 'number') {
            return data.year;
        } else {
            throw new Error('서버 응답 형식이 올바르지 않습니다: "year" 필드가 없습니다.');
        }
    } catch (error) {
        console.error("서버에서 연도 정보를 가져오는 중 오류 발생:", error);
        // 오류 발생 시 클라이언트의 현재 연도를 폴백(fallback)으로 반환하거나,
        // 필요에 따라 오류를 다시 던져 상위 호출자에게 알릴 수 있습니다.
        // 여기서는 예시로 클라이언트 연도를 반환합니다.
        return new Date().getFullYear();
    }
}
///////////////////////랜덤관련함수-끝/////////////////////////////////////
