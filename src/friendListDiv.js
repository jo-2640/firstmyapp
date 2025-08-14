// friendListDiv.js

import { db } from './firebase-init.js';
import { doc, collection, onSnapshot, getDocs, query, where, documentId } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import AppUI from './AppUI.js';
import { SERVER_BASE_URL } from './constants.js';
import { currentUserUid, setCurrentUser, currentUserData } from './user-data.js';
import { renderUserItem, getActionButtonHtml} from './allUserDiv.js';
import { deleteFriend} from './friendRequest.js';
import { getGenderLabel, getAgeGroupLabelFromBirthYear, getRegionLabel} from './utils.js';
import { openChatRoom, getDirectMessageRoomId, createChatTab} from './chat.js';

// 전역 변수 초기화
let allFriendIds  = [];
let currentPage = 0;
let FRIEND_PER_PAGE = 10;

// 친구 목록 클릭 이벤트 바인딩
function bindFriendListEvents() {
    if (AppUI.friendListUl) {
        console.log("--- 친구 목록 클릭 이벤트 감지! ---");
        AppUI.friendListUl.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.cancel-friend-btn');

            if (deleteButton) {
                const friendUid = deleteButton.dataset.uid;
                const friendNickname = deleteButton.dataset.nickname || '친구';

                // 사용자에게 확인 후 친구 삭제
                if (confirm(`${friendNickname}님을 친구 목록에서 삭제하시겠습니까?`)) {
                    await deleteFriend(friendUid);
                }
            }
        });
        
        // 추가: 친구 항목 더블클릭 시 채팅방 열기
        AppUI.friendListUl.addEventListener('dblclick', (e) => {
            const friendItem = e.target.closest('.user-list-item');
            if (!friendItem) return;
            const friendId = friendItem.id.replace('user-', '');
            const friendName = friendItem.querySelector('.user-nickname-heading')?.textContent || '친구';
            const roomId = getDirectMessageRoomId(currentUserUid, friendId);
            console.log('생성된 방 ID:', roomId);
            console.log('채팅방 이름:', friendName);
            let chatTab = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
            if (!chatTab)
            {
                const newTab = createChatTab(roomId, friendName);
                document.querySelector('.chat-tabs').appendChild(newTab); // 탭을 화면에 추가
            }
            openChatRoom(roomId, friendName);
        });
    }
}

export async function initializeFriendList(){
    // 현재 로그인된 사용자의 친구 ID 목록을 가져옵니다.
    allFriendIds = currentUserData.friendIds || [];

    currentPage = 0;
    // 첫 페이지의 친구 목록을 불러옵니다.
    await loadFriendsByPage();
    // 이벤트 리스너를 바인딩합니다.
    bindFriendListEvents();
}

/**
 * 페이지 단위로 친구 목록을 불러오는 함수
 */
async function loadFriendsByPage(){
    const friendsPerPage = FRIEND_PER_PAGE;
    const startIndex = currentPage * friendsPerPage;
    const endIndex = startIndex + friendsPerPage;

    const uidsForThisPage = allFriendIds.slice(startIndex, endIndex);

    if (uidsForThisPage.length === 0) {
        console.log("더 이상 친구가 없습니다.");
        return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(documentId(), 'in', uidsForThisPage));

    try {
        const querySnapshot = await getDocs(q);
        const friends = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const isInitialLoad = currentPage === 0;

        // ✅ 수정된 부분: SAS 토큰을 가져와서 이미지 URL에 추가한 후 렌더링
        const friendsWithTokens = await fetchAndAppendSasTokens(friends);
        renderFriendsList(friendsWithTokens, isInitialLoad);
        currentPage++;
    } catch(error) {
        console.error("친구 목록을 가져오는 중 오류발생:", error);
    }
}

/**
 * 여러 사용자의 SAS 토큰을 가져와 이미지 URL에 추가하는 함수
 * @param {Array<Object>} friends - Firestore에서 가져온 친구 데이터 배열
 * @returns {Array<Object>} - SAS 토큰이 추가된 친구 데이터 배열
 */
async function fetchAndAppendSasTokens(friends) {
    if (friends.length === 0) return friends;
    
    // API에 보낼 데이터 형식에 맞게 변환
    const usersForTokens = friends.map(friend => ({
        uid: friend.id,
        blobPath: friend.profileImgUrl
    }));
    
    try {
        const response = await fetch(`${SERVER_BASE_URL}/api/get-multiple-sas-tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: usersForTokens })
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
        }
        
        const data = await response.json();
        const tokens = data.tokens;

        // 각 친구의 이미지 URL에 토큰을 추가
        return friends.map(friend => {
            const token = tokens[friend.id];
            if (token) {
                return {
                    ...friend,
                    profileImgUrl: `${friend.profileImgUrl}?${token}`
                };
            }
            return friend;
        });
    } catch (error) {
        console.error("SAS 토큰 가져오는 중 오류 발생:", error);
        return friends; // 오류 발생 시 토큰 없이 기존 데이터 반환
    }
}

/**
 * 친구 목록을 HTML로 렌더링하는 함수
 * @param {Array<Object>} friends - 렌더링할 친구 데이터 배열
 * @param {boolean} isInitialLoad - 첫 로드인지 여부
 */
function renderFriendsList(friends, isInitialLoad = false){
    if (!AppUI.friendListUl) {
        console.warn("friendListUl: 친구 목록을 표시할 HTML 요소를 찾을 수 없습니다.");
        return;
    }
    if (isInitialLoad) {
        AppUI.friendListUl.innerHTML = '';
    }

    if (friends.length === 0 && isInitialLoad) {
        AppUI.friendListUl.innerHTML = '<li class="noneList">친구가 없습니다</li>';
        return;
    }

    friends.forEach(friend => {
        const friendItemHtml = `
            <li class="user-list-item" id="user-${friend.id}" data-gender="${friend.gender}" data-birth-year="${friend.birthYear}">
                <div class="user-item-content">
                    <img src="${friend.profileImgUrl}" alt="${friend.nickname}" class="user-profile-img">
                    <div class="user-details-group">
                        <h4 class="user-nickname-heading">${friend.nickname}</h4>
                        <span class="user-info-text">${getGenderLabel(friend.gender)}, ${getAgeGroupLabelFromBirthYear(friend.birthYear)}, ${getRegionLabel(friend.region)}</span>
                        <p class="user-bio-text">${friend.bio || '소개 없음'}</p>
                    </div>
                    <div class="user-action-button-container">
                        <button class="cancel-friend-btn" data-uid="${friend.id}" data-nickname="${friend.nickname}">친구 취소</button>
                    </div>
                </div>
            </li>
        `;
        if (friendItemHtml) {
            AppUI.friendListUl.insertAdjacentHTML('beforeend', friendItemHtml);
        }
    });
}

/**
 * 친구 목록을 실시간으로 업데이트하는 함수
 * @param {Array<string>} newlyAddedFriendUids - 새로 추가된 친구의 UID 배열
 */
export async function updateFriendList(newlyAddedFriendUids = []){
    if (!Array.isArray(newlyAddedFriendUids)) {
        newlyAddedFriendUids = newlyAddedFriendUids ? [newlyAddedFriendUids] : [];
    }
    const friendListItems = AppUI.friendListUl.querySelectorAll('.user-list-item');
    const currentFriendIds = new Set(currentUserData.friendIds || []);

    friendListItems.forEach((item)=>{
        const targetUserId = item.id.replace('user-', '');
        if (!currentFriendIds.has(targetUserId)) {
            item.remove();
        }
    });

    const newFriendsToRender = [];
    for (const uid of newlyAddedFriendUids) {
        // ✅ 수정된 부분: Firestore에서 데이터 가져와 SAS 토큰 요청
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const friendData = { id: userDoc.id, ...userDoc.data() };
            // 새로운 친구의 SAS 토큰을 가져와 URL에 추가
            const friendWithToken = await fetchAndAppendSasTokens([friendData]);
            if (friendWithToken.length > 0) {
                newFriendsToRender.push(friendWithToken[0]);
            }
        }
    }

    newFriendsToRender.forEach(friend => {
        const friendItemHtml = `
            <li class="user-list-item" id="user-${friend.id}">
                <div class="user-item-content">
                    <img src="${friend.profileImgUrl}" alt="${friend.nickname}" class="user-profile-img">
                    <div class="user-details-group">
                        <h4 class="user-nickname-heading">${friend.nickname}</h4>
                        <span class="user-info-text">${getGenderLabel(friend.gender)}, ${getAgeGroupLabelFromBirthYear(friend.birthYear)}, ${getRegionLabel(friend.region)}</span>
                        <p class="user-bio-text">${friend.bio}</p>
                    </div>
                    <div class="user-action-button-container">
                        <button class="cancel-friend-btn" data-uid="${friend.id}" data-nickname="${friend.nickname}">친구 취소</button>
                    </div>
                </div>
            </li>
        `;
        AppUI.friendListUl.insertAdjacentHTML('afterbegin', friendItemHtml);
    });
    
    const updatedListItems = AppUI.friendListUl.querySelectorAll('.user-list-item');
    if (updatedListItems.length > FRIEND_PER_PAGE) {
        updatedListItems[updatedListItems.length - 1].remove();
    }
}

