import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot, query, where, getDocs, limit, orderBy, documentId, startAfter, endBefore, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-init.js';
import { currentUserUid, currentUserData } from './user-data.js'; //
import { SERVER_BASE_URL } from './constants.js'
import AppUI from './AppUI.js';
import { updateAuthUIForMode } from './auth-service.js';
import { getDefaultProfileImage, getAgeGroupLabel, getGenderLabel, getRegionLabel, detailedAgeGroups, regionMap, genderMap, showToast, getAgeGroupLabelFromBirthYear } from './utils.js';
import { openFriendRequestModal, cancelFriendRequest, openReceivedRequestDetailsModal } from './friendRequest.js';
import {fetchNewSasToken} from './AzureSasTokenManager.js';
const USERS_PER_PAGE = 5;
let lastVisibleUserDoc = null;
let currentFilter = {};
let isFullCycleComplete = false;
let loadedUserIds = new Set();
let isFirstLoadWithFilter = true;

/**
 * 사용자 목록 UI를 초기화합니다.
 * @param {string} message - 표시할 메시지
 */
export function clearUserList(message = '로그인하여 사용자 목록을 확인하세요.') {
    if (AppUI.userListUl) {
        AppUI.userListUl.innerHTML = `<li class="p-4 text-gray-500 text-center">${message}</li>`;
    }
}

/**
 * 쿼리 필터를 적용합니다.
 * @param {Query} baseQuery - 기본 Firestore 쿼리 객체
 * @param {Object} filter - 필터 조건 객체
 * @returns {Query} 필터가 적용된 새로운 쿼리 객체
 */
export function applyUserFilters(baseQuery, filter) {
    let currentQuery = baseQuery;
    
    if (filter.gender && filter.gender !== 'all') {
        currentQuery = query(currentQuery, where("gender", "==", filter.gender));
    }
    
    if (filter.region && filter.region !== 'all') {
        currentQuery = query(currentQuery, where("region", "==", filter.region));
    }
    
    if (filter.minAgeGroupValue && filter.minAgeGroupValue !== 'all' && filter.maxAgeGroupValue && filter.maxAgeGroupValue !== 'all') {
        const minAgeGroup = detailedAgeGroups.find(g => g.value === filter.minAgeGroupValue);
        const maxAgeGroup = detailedAgeGroups.find(g => g.value === filter.maxAgeGroupValue);
        const currentYear = new Date().getFullYear();
    
        if (minAgeGroup && maxAgeGroup) {
            const maxBirthYear = currentYear - minAgeGroup.min;
            const minBirthYear = currentYear - maxAgeGroup.max;
            currentQuery = query(currentQuery,
                where("birthYear", ">=", minBirthYear),
                where("birthYear", "<=", maxBirthYear));
        }
    }
    
    return currentQuery;
}

function addLoadMoreButton() {
    if (!AppUI.userListUl) {
        console.warn("addLoadMoreButton: user-list 요소가 아직 로드되지 않았습니다.");
        return;
    }
    
    const existingButton = AppUI.userListUl.querySelector('.load-more-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    if (isFullCycleComplete) {
        const loadMoreButton = document.createElement('button');
        loadMoreButton.className = 'load-more-btn';
        loadMoreButton.textContent = '더 이상 사용자 없습니다';
        loadMoreButton.disabled = true;
        loadMoreButton.style.cursor = 'not-allowed';    
        AppUI.userListUl.appendChild(loadMoreButton);
        console.log("🚫 순환 완료 상태 - 더 보기 버튼 추가 중단");
        return;
    }else{
        const loadMoreButton = document.createElement('button');
        loadMoreButton.className = 'load-more-btn';
        loadMoreButton.textContent = '더 많은 사용자 로드';
        loadMoreButton.onclick = () => {
            filterDisplayUsers(currentFilter, true);
        };
        
        AppUI.userListUl.appendChild(loadMoreButton);
    }
}

// ✅ bindUserListEvent 함수 수정
export function bindUserListEvent(){
    AppUI.userListUl.querySelectorAll('.add-friend-btn').forEach(button =>{
        button.onclick = (e) =>{
            openFriendRequestModal(e.target.dataset.uid, e.target.dataset.nickname, e.target.dataset.profileimg);
        };
    });
    AppUI.userListUl.querySelectorAll('.cancel-friend-request-btn').forEach(button =>{
        button.onclick = (e) => {
            cancelFriendRequest(e.target.dataset.uid, e.target.dataset.nickname);
        };
    });
    AppUI.userListUl.querySelectorAll('.accept-request-btn').forEach(button =>{
        button.onclick = (e) => {
            const targetUid = e.target.dataset.uid;

            openReceivedRequestDetailsModal(targetUid);
        };
    });
    AppUI.userListUl.querySelectorAll('.user-profile-img').forEach(img => {
        img.onerror = () => {
             retryImageLoad(img);
        };
    });
}
// allUserDiv.js 파일에 추가
export function getActionButtonHtml(targetUser, currentUserData) {
    const sentRequests = new Set(currentUserData.friendRequestsSent || []);
    const receivedRequestsUids  = new Set((currentUserData.friendRequestsReceived || []).map(req => req.from));
    const friendIds = new Set(currentUserData.friendIds || []);

    const isFriend = friendIds.has(targetUser.id);
    const hasSentRequest = sentRequests.has(targetUser.id);
    const hasReceivedRequest = receivedRequestsUids.has(targetUser.id);

    const nickname = targetUser.nickname || '사용자';
    const profileImg = targetUser.profileImgUrl || getDefaultProfileImage(targetUser.gender);

    if (isFriend) {
        return `<button class="cancel-friend-btn" data-uid="${targetUser.id}" data-nickname="${targetUser.nickname}" > 친구 취소 </button>`;
    } else if (hasSentRequest) {
        return `<button class="cancel-friend-request-btn" data-uid="${targetUser.id}" data-nickname="${nickname}">요청보냄</button>`;
    } else if (hasReceivedRequest) {
        return `<button class="accept-request-btn bg-purple-500 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-600" data-uid="${targetUser.id}">요청 받음</button>`;
    } else {
        return `<button class="add-friend-btn bg-indigo-500 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-600" data-uid="${targetUser.id}" data-nickname="${nickname}" data-profileimg="${profileImg}">친구 요청</button>`;
    }
}
export async function renderUserItem(targetUser, currentUserId, currentUserData) {
    const actionButtonHtml = getActionButtonHtml(targetUser, currentUserData);
    const ageLabel = getAgeGroupLabelFromBirthYear(targetUser.birthYear) || '나이 정보 없음';
    const cachedTokens = JSON.parse(localStorage.getItem('sasTokens') || '{}');
    const userSasToken = cachedTokens[targetUser.id];

    const displayProfileImgUrl = targetUser.profileImgUrl && userSasToken ?
        `${targetUser.profileImgUrl}?${userSasToken}` :
        getDefaultProfileImage(targetUser.gender);

    const friendIds = new Set(currentUserData.friendIds || []);
    const isFriend = friendIds.has(targetUser.id);

    // ✅ data-birth-year와 data-gender 속성을 추가하여 필요한 정보를 저장합니다.
   return `
       <li class="user-list-item" id="user-${targetUser.id}" data-gender="${targetUser.gender}" data-birth-year="${targetUser.birthYear}" data-is-friend="${isFriend}">
           <div class="user-item-content">
               <img src="${displayProfileImgUrl}"
                    alt="${targetUser.nickname}"
                    class="user-profile-img"
                    data-uid="${targetUser.id}"
                    data-image-path="${targetUser.profileImgUrl}">
               <div class="user-details-group">
                   <h4 class="user-nickname-heading">${targetUser.nickname}</h4>
                   <span class="user-info-text">${getGenderLabel(targetUser.gender)}, ${ageLabel}, ${getRegionLabel(targetUser.region)}</span>
                   <p class="user-bio-text">${targetUser.bio || '소개 없음'}</p>
               </div>
               <div class="user-action-button-container">
                   ${actionButtonHtml}
               </div>
           </div>
       </li>
   `;
}

// ✅ 2. updateAllUserItemButtons 함수 수정 (오타 수정 및 데이터셋 활용)

export async function updateAllUserItemButtons() {
    if (!AppUI.userListUl || !currentUserUid || !currentUserData) {
        console.warn("updateAllUserItemButtons: 필수 데이터가 없어 실행할 수 없습니다.");
        return [];
    }
    const newlyAddedFriendUids = [];
    console.log("🔄 UI 업데이트: 현재 목록의 버튼 상태를 변경합니다.");

    const userListItems = AppUI.userListUl.querySelectorAll('.user-list-item');


    userListItems.forEach((item) => {
        const targetUserId = item.id.replace('user-', '');

        if (targetUserId !== currentUserUid) {
            const nickname = item.querySelector('.user-nickname-heading')?.textContent || '사용자';
            const profileImg = item.querySelector('.user-profile-img')?.src || '';

            const friendIds = new Set(currentUserData.friendIds || []);
            const isFriend = friendIds.has(targetUserId);
            const wasFriend = item.dataset.isFriend === 'true';
            item.dataset.isFriend = isFriend;


            if (isFriend && !wasFriend) {
                newlyAddedFriendUids.push(targetUserId);
            }

            const targetUser = {
                id: targetUserId,
                nickname: item.querySelector('.user-nickname-heading')?.textContent || '사용자',
            };

            const actionButtonHtml = getActionButtonHtml(targetUser, currentUserData);
            const actionButtonContainer = item.querySelector('.user-action-button-container');

            if (actionButtonContainer) {
                actionButtonContainer.innerHTML = actionButtonHtml;
            }
        }
    });
  
    bindUserListEvent();
    return newlyAddedFriendUids;
}

export async function filterDisplayUsers(filter, append = false) {
    if (!AppUI.userListUl || !currentUserUid || !currentUserData) {
        if (!currentUserUid) clearUserList();
        return;
    }
    
    const isFilterChanged = JSON.stringify(currentFilter) !== JSON.stringify(filter);

    if (!append || isFilterChanged) {
        AppUI.userListUl.innerHTML = '';
        lastVisibleUserDoc = null;
        isFullCycleComplete = false;
        currentFilter = filter;
    }

    // 🎯 수정된 부분: addLoadMoreButton() 호출 전 상태 체크
    if (isFullCycleComplete) {
        addLoadMoreButton();
        return;
    }

    try {
        let usersRef = collection(db, 'users');
        let finalQuery;
        let baseQueryWithFilters = applyUserFilters(usersRef, filter);
        const limitCount = USERS_PER_PAGE +1;

        if (append && lastVisibleUserDoc) {
            finalQuery = query(baseQueryWithFilters, orderBy("birthYear"), startAfter(lastVisibleUserDoc), limit(limitCount));
        } else {
            finalQuery = query(baseQueryWithFilters, orderBy("birthYear"), limit(limitCount));
        }

        const querySnapshot = await getDocs(finalQuery);


        const filteredDocs = querySnapshot.docs.filter(doc => doc.id !== currentUserUid);

        if (filteredDocs.length === 0 && !append) {
            clearUserList('조건에 맞는 사용자가 없습니다.');
        }else {
            const docsToRender = filteredDocs.slice(0, USERS_PER_PAGE);
            const usersForToken = docsToRender.map(doc => ({
                uid: doc.id,
                blobPath: doc.data().profileImgUrl
            }));

            const response = await fetch(`${SERVER_BASE_URL}/api/get-multiple-sas-tokens`,{
                method: 'POST',
                headers: { 'Content-Type': 'application/json'},
                body: JSON.stringify({ users: usersForToken})
            });
            if (!response.ok) {
                throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
            }
            const tokenData = await response.json();

            if(tokenData.success){
                localStorage.setItem('sasTokens', JSON.stringify(tokenData.tokens));
                localStorage.setItem('sasTokensExpiry', tokenData.expiry);
            }else{
                console.error("토큰 발급 실패:" , tokenData.message);
                showToast("토큰을 불러오는데 실패했습니다.", "error");
            }

            const renderPromises = docsToRender.map(doc => {
                const userData = { id: doc.id, ...doc.data() };
                return renderUserItem(userData, currentUserUid, currentUserData);
            });
            const userItemHtmls = await Promise.all(renderPromises);

            userItemHtmls.forEach(html =>{
                if(html){
                    AppUI.userListUl.insertAdjacentHTML('beforeend', html);
                }
            });
        }

        if (querySnapshot.docs.length > 0) {
            lastVisibleUserDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        } else {
            lastVisibleUserDoc = null;
        }

        // 🎯 최종 수정된 부분: '더보기' 버튼 표시 여부를 결정하는 로직
        // 가져온 문서의 개수가 limitCount와 같을 때만 '더보기'를 표시할 수 있습니다.
        // 그 외의 경우(더 적게 가져온 경우)는 목록의 끝입니다.
        if (querySnapshot.docs.length < limitCount) {
            isFullCycleComplete = true;
        } else {
            isFullCycleComplete = false;
        }

        addLoadMoreButton();
        bindUserListEvent();

    } catch (error) {
        console.error("사용자 목록 로드 중 오류 발생:", error);
        showToast("사용자 목록을 불러오는 데 실패했습니다.", "error");
    }
}
// allUserDiv.js 파일에 추가
async function retryImageLoad(imgElement) {
    const uid = imgElement.dataset.uid;
    const fullPath = imgElement.dataset.imagePath;

    if (!uid || !fullPath) {
        console.error("retryImageLoad: UID 또는 이미지 경로가 누락되었습니다.");
        // ✅ 이미지 로딩 실패 시 기본 이미지로 대체
        imgElement.src = getDefaultProfileImage(imgElement.dataset.gender);
        return;
    }

    const blobName = new URL(fullPath).pathname.substring(1);
    const newToken = await fetchNewSasToken(uid, blobName);

    if (newToken) {
        const oldUrl = imgElement.src.split('?')[0];
        imgElement.src = `${oldUrl}?${newToken}`;
        imgElement.dataset.retried = 'true';
    } else {
        // ✅ 재시도 실패 시 기본 이미지로 대체
        imgElement.src = getDefaultProfileImage(imgElement.dataset.gender);
    }
}