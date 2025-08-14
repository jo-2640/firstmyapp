// src/AppUI.js

const AppUI = {

    // HTML에 있는 ID에 맞게 변경
    myNicknameSpan: null,
    myProfileImage: null,
    welcomeMessage: null,
    // 인증 관련 UI 요소 (로그인/회원가입 폼)
    authEmailInput: null,
    authPasswordInput: null,
    rememberMeCheckbox: null,
    authSubmitBtn: null,
    authSwitchBtn: null,

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



    // 공통 UI 요소
    userListUl : null,
    deleteAllDataBtn: null,
    btnLogout: null,
    filterGenderSelect: null,
    filterMinAgeGroupSelect: null,
    filterMaxAgeGroupSelect: null,
    filterRegionSelect: null,
    applyFilterBtn: null,

    //친구리스트
    friendListUl: null,

    //친구들과 메세지

    // 초기화 메서드: DOM 요소들을 실제 값으로 채웁니다.
    initialize: function() {
        console.log("[AppUI.js] AppUI.initialize() 호출됨. DOM 요소 로딩 중...");

        // 공통 UI 요소
        this.deleteAllDataBtn = document.getElementById('deleteAllDataBtn');
        this.btnLogout = document.getElementById('btnLogout');
        this.welcomeMessage =document.getElementById('main-welcome-message');
        this.myNicknameSpan = document.getElementById('my-nickname');
        this.myProfileImage = document.getElementById('my-profile-img');
        this.userListUl = document.getElementById('user-list');

        this.filterGenderSelect = document.getElementById('filter-gender');
        this.filterMinAgeGroupSelect = document.getElementById('filter-min-age-group');
        this.filterMaxAgeGroupSelect = document.getElementById('filter-max-age-group');
        this.filterRegionSelect = document.getElementById('filter-region');
        this.applyFilterBtn = document.getElementById('apply-filter-btn');
        // 인증 관련 UI 요소
        this.authEmailInput = document.getElementById('auth-email');
        this.authPasswordInput = document.getElementById('auth-password');
        this.rememberMeCheckbox = document.getElementById('remember-me-checkbox');
        this.rememberMeGroup = document.getElementById('remember-me-group');
        this.authSubmitBtn = document.getElementById('auth-submit-btn');
        this.authSwitchBtn = document.getElementById('auth-switch-btn');

        this.authTitle = document.getElementById('auth-title');
        this.authSection = document.getElementById('auth-section');

        // sidebar 옆 섹션의 클래스입니다. 전체를 제어하려면 app-content를 사용하는 것이 맞습니다.

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
        this.appContent = document.querySelector('.app-content');
        this.appHeader = document.querySelector('.app-header');                                                             // 만약 메인 콘텐츠를 감싸는 상위 div에 ID를 부여할 수 있다면 더 좋습니다.
        //친구리스트
        this.friendListUl = document.getElementById('friend-list');
        //친구들과 메세지 ui

        // 각 요소가 제대로 로드되었는지 확인하는 간단한 로깅 (선택 사항)
        if (!this.authTitle) console.warn("AppUI: 'auth-title' (인증 폼 제목) 요소를 찾을 수 없습니다!");
        if (!this.appContent) console.warn("AppUI: '.app-content' (메인 콘텐츠 div) 요소를 찾을 수 없습니다!");
        if (!this.myNicknameSpan) console.warn("AppUI: 'my-nickname' (사용자 닉네임) 요소를 찾을 수 없습니다!");
        if (!this.myProfileImage) console.warn("AppUI: 'my-profile-img' (사용자 프로필 이미지) 요소를 찾을 수 없습니다!");
        if (!this.rememberMeGroup) console.warn("AppUI: 'remember-me-group' (로그인 '기억하기' 그룹) 요소를 찾을 수 없습니다!");
        if (!this.appHeader) console.warn("AppUI: 'appHeader' (메인 컨테츠 프로필 (appHeader) 요소를 찾을 수없습니다!");
        if (!this.authEmailInput) console.warn("AppUI: 'auth-email' (이메일 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.authPasswordInput) console.warn("AppUI: 'auth-password' ( 비밀번호 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.authSubmitBtn) console.warn("AppUI: 'auth-submit-btn' (인증 제출 버튼) 요소를 찾을 수 없습니다!");
        if (!this.authSwitchBtn) console.warn("AppUI: 'auth-switch-btn' (인증 전환 버튼) 요소를 찾을 수 없습니다!");            
        if (!this.authSection) console.warn("AppUI: 'auth-section' (인증 섹션) 요소를 찾을 수 없습니다!");

        if (!this.signupPasswordConfirmInput) console.warn("AppUI: 'signup-password-confirm' (회원가입 비밀번호 확인 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupNicknameInput) console.warn("AppUI: 'signup-nickname'       (회원가입 닉네임 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupBirthYearSelect) console.warn("AppUI: 'signup-birth-year' (회원가입 생년월일 선택 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupGenderSelect) console.warn("AppUI: 'signup-gender' (회원가입 성별 선택 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupRegionSelect) console.warn("AppUI: 'signup-region' (회원가입 지역 선택 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupBioTextarea) console.warn("AppUI: 'signup-bio' (회원가입 자기소개 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupMinAgeSelect) console.warn("AppUI: 'signup-min-age' (회원가입 최소 연령 선택 필드) 요소를 찾을 수 없습니다!");
        if (!this.signupMaxAgeSelect) console.warn("AppUI: 'signup-max-age  ' (회원가입 최대 연령 선택 필드) 요소를 찾을 수 없습니다!");
        if (!this.profileImageInput) console.warn("AppUI: 'signup-profile-image-upload-input' (프로필 이미지 업로드 입력 필드) 요소를 찾을 수 없습니다!");
        if (!this.profileImagePreview) console.warn("AppUI: 'signup-profile-img-preview' (프로필 이미지 미리보기 요소를 찾을 수 없습니다!");
        if (!this.signupFieldsDiv) console.warn("AppUI: 'signup-fields' (회원가입 필드 컨테이너) 요소를 찾을 수 없습니다!");
        if (!this.deleteAllDataBtn) console.warn("AppUI: 'deleteAllDataBtn' (모든 데이터 삭제 버튼) 요소를 찾을 수 없습니다!");
        if (!this.btnLogout) console.warn("AppUI: 'btnLogout' (로그아웃 버튼) 요소를 찾을 수 없습니다!");
        if (!this.welcomeMessage) console.warn("AppUI: 'main-welcome-message' (메인 환영 메시지 요소를 찾을 수 없습니다!)");
        if (!this.filterGenderSelect) console.warn("AppUI: 'filter-gender' (성별 필터 선택 요소를 찾을 수 없습니다!)");
        if (!this.filterMinAgeGroupSelect) console.warn("AppUI: 'filter-min-age-group' (최소 연령 필터 선택 요소를 찾을 수 없습니다!)");
        if (!this.filterMaxAgeGroupSelect) console.warn("AppUI: 'filter-max-age-group' (최대 연령 필터 선택 요소를 찾을 수 없습니다!)");
        if (!this.filterRegionSelect) console.warn("AppUI: 'filter-region' (지역 필터 선택 요소를 찾을 수 없습니다!)");
        if (!this.applyFilterBtn) console.warn("AppUI: 'apply-filter-btn' (필터 적용 버튼 요소를 찾을 수 없습니다!)");
        if (!this.friendListUl) console.warn("AppUI: 'friend-list' (친구 목록 요소를 찾을 수 없습니다!)");
        if (!this.userListUl) console.warn("AppUI: 'userListUl' (사용자목록 요소를 찾을수 없습니다!)");
    }
};

export default AppUI;