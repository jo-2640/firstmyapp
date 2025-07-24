// js/temp.js
import {genderLists, regionLists} from './koreanWordLists.js';
// 필요한 유틸리티 함수들을 import 합니다.
// 'generateRandomEmail', 'generateRandomString', 'getRandomElement', 'getRandomBirthYear' 등
import { generateRandomEmail, generateRandomString, getRandomElement, getRandomBirthYear, detailedAgeGroups } from '../utils.js';
import { prettyKoreanMaleNames, prettyKoreanFemaleNames } from './koreanWordLists.js';

// 이 함수가 signup.js의 fillSignUpFieldsWithRandomData 역할을 대신합니다.
export function fillSignUpFieldsWithRandomDataTemp(
    authEmail, authPassword, signupNickname, signupGender, signupBirthYear, signupRegion,
    signupMinAge, signupMaxAge, signupBio, // ⭐ 추가/변경: 나이대 드롭다운 요소
    MIN_BIRTH_YEAR,
    serverCurrentYear
) {
    if (authEmail) authEmail.value = generateRandomEmail();
    // 비밀번호는 간단하게 설정 (테스트용)
    if (authPassword) {
        authPassword.value = 'password123';
        const signupPasswordConfirm = document.getElementById('signup-password-confirm');
        if (signupPasswordConfirm) {
            signupPasswordConfirm.value = 'password123'; // ⭐ 비밀번호 확인 필드도 채움
        }
    }

    if (signupNickname) signupNickname.value = generateRandomString(8);
    if (signupGender) signupGender.value = getRandomElement(['male', 'female']);
    if (signupBirthYear) {
        // 실제 나이대와 무관하게 랜덤 연도를 생성 (예: 1960년부터 현재 연도까지)
        const randomBirthYear = Math.floor(Math.random() * (serverCurrentYear - MIN_BIRTH_YEAR + 1)) + MIN_BIRTH_YEAR;
        signupBirthYear.value = randomBirthYear;
    }
    if (signupRegion) {
        const regions = ['seoul', 'gyeonggi', 'incheon', 'busan', 'daegu', 'gwangju', 'daejeon', 'ulsan', 'sejong', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju'];
        signupRegion.value = getRandomElement(regions);
    }
    if (signupBio) signupBio.value = "안녕하세요! 랜덤으로 생성된 자기소개입니다.";

    // ⭐ 선호 나이대 (minAge, maxAge)를 랜덤으로 설정
    if (signupMinAge && signupMaxAge && detailedAgeGroups.length > 0) {
        let randomIndexMin = Math.floor(Math.random() * detailedAgeGroups.length);
        let randomIndexMax = Math.floor(Math.random() * detailedAgeGroups.length);

        if (randomIndexMin > randomIndexMax) {
            [randomIndexMin, randomIndexMax] = [randomIndexMax, randomIndexMin];
        }
        signupMinAge.value = detailedAgeGroups[randomIndexMin].value;
        signupMaxAge.value = detailedAgeGroups[randomIndexMax].value;
    }
}