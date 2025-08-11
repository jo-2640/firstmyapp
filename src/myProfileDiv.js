// ./js/myProfileDiv.js

let userDisplayName = null; // 초기화 함수에서 할당될 변수
let myProfileImg = null;   // 초기화 함수에서 할당될 변수 (필요하다면)

export function initializeMyProfileDivUI() {
    console.log("myProfileDiv.js: initializeMyProfileDivUI 호출됨.");
    // DOMContentLoaded 시점에 my-nickname 요소를 가져와 변수에 할당
    userDisplayName = document.getElementById('my-nickname');
    myProfileImg = document.getElementById('my-profile-img'); // myProfileImg도 여기서 가져올 수 있습니다.

    if (!userDisplayName) {
        console.error("myProfileDiv.js: ID 'my-nickname'을 가진 요소를 찾을 수 없습니다.");
    }
    if (!myProfileImg) {
        console.error("myProfileDiv.js: ID 'my-profile-img'를 가진 요소를 찾을 수 없습니다.");
    }
}

export function clearMyProfileUI() {
    console.log("myProfileDiv.js: clearMyProfileUI 호출됨.");
    // UI 초기화 로직
    if (userDisplayName) {
        userDisplayName.textContent = "로그인 필요";
    }
    if (myProfileImg) {
        // 투명 1x1 GIF로 설정하여 캐시 문제 방지
        myProfileImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        myProfileImg.alt = "로그인 필요";
    }
    // myProfileDiv에서 관리하는 다른 요소들도 필요하다면 여기서 초기화
}

