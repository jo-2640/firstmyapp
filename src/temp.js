
// --- randomDataFiller.js (새로운 파일 생성 또는 기존 스크립트 파일에 추가) ---

// 필요한 데이터 목록과 AppUI 객체를 import 합니다.
import {
    prettyKoreanWords,
    prettyKoreanMaleNames,
    prettyKoreanFemaleNames,
    genderLists,
    regionLists
} from './koreanWordLists.js'; // koreanWordLists.js의 실제 경로에 맞게 조정


     
import { fetchCurrentYearFromServer, fetchBirthYearRangeFromServer, detailedAgeGroups,   getRandomElement} from './utils.js';
/**
 * 주어진 데이터 목록에서 무작위 값을 선택하여 반환하는 헬퍼 함수입니다.
 * @param {Array<string>} list - 값을 선택할 배열입니다.
 * @returns {string} 배열에서 무작위로 선택된 값입니다.
 */
function getRandomValueFromList(list) {
    if (!list || list.length === 0) {
        return ''; // 또는 적절한 기본값 처리
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    return list[randomIndex];
}

/**
 * 회원가입 필드를 무작위 데이터로 채우는 임시 함수입니다.
 * 이 함수는 데이터를 인수로 받으므로, 어떤 목록을 사용할지 유연하게 결정할 수 있습니다.
 * 또한, 필드에 접근하기 위해 AppUI 객체를 인수로 받습니다.
 * @param {Object} dataLists - 필드를 채울 때 사용할 데이터 목록을 포함하는 객체입니다.
 * @param {Array<string>} dataLists.words - 랜덤 단어 목록입니다. 닉네임, 자기소개 등에 사용됩니다.
 * @param {Array<string>} dataLists.maleNames - 랜덤 남자 이름 목록입니다.
 * @param {Array<string>} dataLists.femaleNames - 랜덤 여자 이름 목록입니다.
 * @param {Array<string>} dataLists.genders - 랜덤 성별 목록입니다.
 * @param {Array<string>} dataLists.regions - 랜덤 지역 목록입니다.
 * @param {Object} uiElements - DOM 요소에 접근하기 위한 AppUI 객체입니다.
 */

export async function fillSignUpFieldsWithRandomDataTemp(uiElements) {
    const dataLists = {
        words: prettyKoreanWords,
        maleNames: prettyKoreanMaleNames,   
        femaleNames: prettyKoreanFemaleNames,
        genders: genderLists,
        regions: regionLists
    }
    const { words, maleNames, femaleNames, genders, regions } = dataLists;

    // 경고: uiElements.initialize()가 먼저 호출되어 DOM 요소들이 로드되었는지 확인하세요.
    if (!uiElements || !uiElements.signupNicknameInput) {
        console.error("AppUI 객체가 전달되지 않았거나, AppUI.initialize()가 먼저 호출되지 않았습니다. 회원가입 필드 요소를 찾을 수 없습니다!");
        return;
    }

    // 1. 닉네임 (랜덤 남성 또는 여성 이름)
    const randomGender = getRandomValueFromList(genders);
    let randomName = '';
    if (randomGender === 'male') {
        randomName = getRandomValueFromList(maleNames);
    } else {
        randomName = getRandomValueFromList(femaleNames);
    }
    if (uiElements.signupNicknameInput) {
        uiElements.signupNicknameInput.value = randomName;
        console.log('닉네임:', randomName);
    }
    
    // 2. 이메일 (랜덤 단어 + 숫자 조합)
    const randomWordForEmail = getRandomValueFromList(words);
    const randomNumber = Math.floor(Math.random() * 10000); 
    const randomEmail = `${randomWordForEmail}${randomNumber}@example.com`;
    if (uiElements.authEmailInput) {
        uiElements.authEmailInput.value = randomEmail;
        console.log('이메일:', randomEmail);
    }

    // 3. 비밀번호 (간단한 예시)
    const password = '123456!'; 
    if (uiElements.authPasswordInput) {
        uiElements.authPasswordInput.value = password;
        console.log('비밀번호:', password);
    }
    if (uiElements.signupPasswordConfirmInput) {
        uiElements.signupPasswordConfirmInput.value = password; // 비밀번호 확인 필드도 채움
        console.log('비밀번호 확인:', password);
    }

    // 4. 성별
    if (uiElements.signupGenderSelect) {
        uiElements.signupGenderSelect.value = randomGender; 
        console.log('성별:', randomGender);
    }

    // 5. 지역
    const randomRegion = getRandomValueFromList(regions);
    if (uiElements.signupRegionSelect) {
        uiElements.signupRegionSelect.value = randomRegion;
        console.log('지역:', randomRegion);
    }

    // 6. 출생 연도 (현재 날짜 기준 유효한 연도 범위로 설정)
    const currentYear =  await fetchCurrentYearFromServer();
    const {minBirthYear , maxBirthYear} = await fetchBirthYearRangeFromServer();
  
    const randomBirthYear = Math.floor(Math.random() * (maxBirthYear - minBirthYear + 1)) + minBirthYear;
    if (uiElements.signupBirthYearSelect) {
        uiElements.signupBirthYearSelect.value = randomBirthYear;
        console.log('출생 연도:', randomBirthYear);
    }

    // 7. 자기소개 (랜덤 단어 조합)
    const randomBio = `${getRandomValueFromList(words)}와(과) ${getRandomValueFromList(words)}에 대해 이야기하는 것을 좋아합니다.`;
    if (uiElements.signupBioTextarea) {
        uiElements.signupBioTextarea.value = randomBio;
        console.log('자기소개:', randomBio);
    }

     // --- ⭐ 8. 선호 최소/최대 나이대 (나이 그룹 선택) 부분 수정 ---
        // detailedAgeGroups 배열에서 두 개의 나이 그룹을 무작위로 선택합니다.
        let randomMinAgeGroup = getRandomElement(detailedAgeGroups);
        let randomMaxAgeGroup = getRandomElement(detailedAgeGroups);

        // --- ⭐ 여기에 나이대 유효성 보정 로직 적용 ---
        // 선택된 최소 나이대의 인덱스와 최대 나이대의 인덱스를 가져옵니다.
        const minIndex = detailedAgeGroups.findIndex(g => g.value === randomMinAgeGroup.value);
        const maxIndex = detailedAgeGroups.findIndex(g => g.value === randomMaxAgeGroup.value);

        // 10대 미만이나 60대 이상이 선택되었을 때의 특별 처리
        if (randomMinAgeGroup.value === '10-under') {
            randomMaxAgeGroup = detailedAgeGroups.find(g => g.value === '10-under');
        } else if (randomMinAgeGroup.value === '60-plus') {
            randomMaxAgeGroup = detailedAgeGroups.find(g => g.value === '60-plus');
        } else if (randomMaxAgeGroup.value === '10-under') {
            randomMinAgeGroup = detailedAgeGroups.find(g => g.value === '10-under');
        } else if (randomMaxAgeGroup.value === '60-plus') {
            randomMinAgeGroup = detailedAgeGroups.find(g => g.value === '60-plus');
        } else {
            // 일반적인 나이대에서 최소가 최대보다 크면 조정
            if (minIndex > maxIndex) {
                // 최소가 최대보다 크다면, 최대를 최소와 동일하게 설정합니다.
                // 또는 최소와 최대를 서로 바꿔서 유효한 범위로 만들 수도 있습니다.
                // 여기서는 max를 min과 같게 만드는 방식을 따릅니다.
                randomMaxAgeGroup = randomMinAgeGroup;
            }
        }
        // 이 시점에서 randomMinAgeGroup과 randomMaxAgeGroup은 항상 유효한 범위가 됩니다.


        // UI 요소에 선택된 나이 그룹의 'value'를 설정합니다.
        if (uiElements.signupMinAgeSelect) {
            uiElements.signupMinAgeSelect.value = randomMinAgeGroup.value;
            console.log('선호 최소 나이대:', randomMinAgeGroup.label);
        } else {
            console.warn('UI 요소 signupMinAgeSelect를 찾을 수 없습니다.');
        }

        if (uiElements.signupMaxAgeSelect) {
            uiElements.signupMaxAgeSelect.value = randomMaxAgeGroup.value;
            console.log('선호 최대 나이대:', randomMaxAgeGroup.label);
        } else {
            console.warn('UI 요소 signupMaxAgeSelect를 찾을 수 없습니다.');
        }

        console.log('--- 회원가입 필드 채우기 완료 ---');
}




