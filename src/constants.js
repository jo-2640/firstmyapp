import {fetchBirthYearRangeFromServer} from './utils.js';


export const LOCAL_STORAGE_KEYS = {
    REMEMBER_ME_EMAIL: 'rememberMeEmail',
    REMEMBER_ME_PASSWORD: 'rememberMePassword', // 보안 경고: 실제 서비스에서는 비밀번호 저장을 권장하지 않습니다.
    REMEMBER_ME_CHECKED: 'rememberMeChecked',
};
export const SERVER_BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;



export let BIRTH_YEAR_RANGE = null; // ✅ null로 초기화

// ✅ 데이터를 로드하는 비동기 함수를 추가
export async function initializeConstants() {
    try {
        BIRTH_YEAR_RANGE = await fetchBirthYearRangeFromServer();
        console.log("✅ 생년월일 범위 데이터 로드 완료:", BIRTH_YEAR_RANGE);
    } catch (error) {
        console.error("❌ 초기 데이터 로드 실패:", error);
        // 실패 시 기본값 설정 또는 오류 처리
        BIRTH_YEAR_RANGE = { minBirthYear: 1950, maxBirthYear: new Date().getFullYear() };
    }
}