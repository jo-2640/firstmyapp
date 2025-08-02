// src/AppUI.js

const AppUI = {
    // 공통 UI 요소
    deleteAllDataBtn: null,
    btnLogout: null,
    // HTML에 있는 ID에 맞게 변경
    myNicknameSpan: null,
    myProfileImage: null,

    // 인증 관련 UI 요소 (로그인/회원가입 폼)
    authEmailInput: null,
    authPasswordInput: null,
    rememberMeCheckbox: null,
    authSubmitBtn: null,
    authSwitchBtn: null,
    authFormTitle: null,
    myProfileDiv: null,
    authSection: null,          // HTML ID: auth-section
    appContent: null,
    rememberMeGroup: null,

    // 회원가입 관련 UI 요소 (회원가입 폼에만 특화된 필드)
    signupPasswordConfirmInput: null,
    signupNicknameInput: null,
    signupBirthYearSelect: null,
    signupGenderSelect: null,
    signupRegionSelect: null,
    signupBioTextarea: null,
    signupMinAgeSelect: null,
    signupMaxAgeSelect: null,
    profileImageInput: null,
    profileImagePreview: null,
    signupFieldsDiv: null,      // HTML ID: signup-fields

    // 초기화 메서드: DOM 요소들을 실제 값으로 채웁니다.
    initialize: function() {
        console.log("[AppUI.js] AppUI.initialize() 호출됨. DOM 요소 로딩 중...");

        // 공통 UI 요소
        this.deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
        this.btnLogout = document.getElementById('btnLogout');

        this.myNicknameSpan = document.getElementById('my-nickname');
        this.myProfileImage = document.getElementById('my-profile-img');

        // 인증 관련 UI 요소
        this.authEmailInput = document.getElementById('auth-email');
        this.authPasswordInput = document.getElementById('auth-password');
        this.rememberMeCheckbox = document.getElementById('remember-me-checkbox');
        this.rememberMeGroup = document.getElementById('remember-me-group');
        this.authSubmitBtn = document.getElementById('auth-submit-btn');
        this.authSwitchBtn = document.getElementById('auth-switch-btn');

        this.authTitle = document.getElementById('auth-title');
        this.authSection = document.getElementById('auth-section');

        // 메인 콘텐츠 영역은 <div class="app-content hidden"> 이므로, 이 ID를 사용합니다.
        // main-content는 sidebar 옆 섹션의 클래스입니다. 전체를 제어하려면 app-content를 사용하는 것이 맞습니다.
        this.appContent = document.querySelector('.app-content'); // 또는 document.getElementById('main-app-content-wrapper') 등 의미있는 ID를 HTML에 추가 후 사용
                                 // 현재 HTML에는 ID가 없으므로 class로 선택합니다.
        this.appHeader = document.querySelector('.app-header');                                                             // 만약 메인 콘텐츠를 감싸는 상위 div에 ID를 부여할 수 있다면 더 좋습니다.

        // 회원가입 관련 UI 요소
        this.signupPasswordConfirmInput = document.getElementById('signup-password-confirm');
        this.signupNicknameInput = document.getElementById('signup-nickname');
        this.signupBirthYearSelect = document.getElementById('signup-birth-year');
        this.signupGenderSelect = document.getElementById('signup-gender');
        this.signupRegionSelect = document.getElementById('signup-region');
        this.signupBioTextarea = document.getElementById('signup-bio');
        this.signupMinAgeSelect = document.getElementById('signup-min-age');
        this.signupMaxAgeSelect = document.getElementById('signup-max-age');
        this.profileImageInput = document.getElementById('signup-profile-image-upload-input');
        this.profileImagePreview = document.getElementById('signup-profile-img-preview');
        this.signupFieldsDiv = document.getElementById('signup-fields');

        // 각 요소가 제대로 로드되었는지 확인하는 간단한 로깅 (선택 사항)
        if (!this.authTitle) console.warn("AppUI: 'auth-title' (인증 폼 제목) 요소를 찾을 수 없습니다!");
        if (!this.appContent) console.warn("AppUI: '.app-content' (메인 콘텐츠 div) 요소를 찾을 수 없습니다!");
        if (!this.myNicknameSpan) console.warn("AppUI: 'my-nickname' (사용자 닉네임) 요소를 찾을 수 없습니다!");
        if (!this.myProfileImage) console.warn("AppUI: 'my-profile-img' (사용자 프로필 이미지) 요소를 찾을 수 없습니다!");
        if (!this.rememberMeGroup) console.warn("AppUI: 'remember-me-group' (로그인 '기억하기' 그룹) 요소를 찾을 수 없습니다!");
        if (!this.appHeader) console.warn("AppUI: 'appHeader' (메인 컨테츠 프로필 (appHeader) 요소를 찾을 수없습니다!");
    }
};

export default AppUI;