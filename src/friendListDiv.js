import { db } from './firebase-init.js';
import { doc, collection, onSnapshot, getDocs, query, where, documentId } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import AppUI from './AppUI.js';
import { currentUserUid, setCurrentUser, currentUserData } from './user-data.js';
import {renderUserItem,getActionButtonHtml} from './allUserDiv.js';
import {deleteFriend} from './friendRequest.js';
import {getGenderLabel,getAgeGroupLabelFromBirthYear,getRegionLabel} from './utils.js';
import {openChatRoom} from './chat.js';
let allFriendIds  = [];
let currentPage = 0;
let FRIEND_PER_PAGE = 10;


function bindFriendListEvents() {
    if (AppUI.friendListUl) {
        console.log("--- 친구 목록 클릭 이벤트 감지! ---");
        AppUI.friendListUl.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.cancel-friend-btn');

            if (deleteButton) {
                const friendUid = deleteButton.dataset.uid;
                const friendNickname = deleteButton.dataset.nickname || '친구';

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

          openChatRoom(friendId, friendName);  // 이 함수는 아래에 구현하세요
        });
    }
}
export async  function initializeFriendList(){

    allFriendIds  =  currentUserData.friendIds || [] ;

    currentPage = 0;
    loadFriendsByPage();
     bindFriendListEvents();
}

async function loadFriendsByPage(){

    const friendsPerPage = FRIEND_PER_PAGE;
    const startIndex = currentPage * friendsPerPage;
    const endIndex = startIndex + friendsPerPage;

    const uidsForThisPage = allFriendIds.slice(startIndex, endIndex);

    if(uidsForThisPage.length === 0){
        console.log("더 이상 친구가 없습니다.");
        return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where(documentId(), 'in',  uidsForThisPage));

    try{
        const querySnapshot = await getDocs(q);
        const friends = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const isInitialLoad = currentPage === 0;
        renderFriendsList(friends, isInitialLoad);
        currentPage++;
    } catch(error){
        console.error("친구 목록을 가져오는 중 오류발생:", error);
    }
}
// ✅ 함수 이름 변경: bindUserListEvent -> bindFriendListEvent

function renderFriendsList(friends, isInitialLoad = false){
    if(!AppUI.friendListUl){
        console.warn("friendListUl: 친구 목록을 표시할 HTML 요소를 찾을 수 없습니다.");
        return;
    }
    if(isInitialLoad){
        AppUI.friendListUl.innerHTML = '';
    }


    if(friends.length === 0 && isInitialLoad){
        friendListUl.innerHTML = '<li class="noneList">친구가 없습니다</li>';
        return;
    }

    friends.forEach(friend => {
            // ✅ renderUserItem 대신 친구 목록에 맞는 HTML을 직접 생성합니다.
        const friendItemHtml = `
            <li class="user-list-item" id="user-${friend.id}" data-gender="${friend.gender}" data-birth-year="${friend.birthYear}">
                <div class="user-item-content">
                    <img src="${friend.profileImgUrl || getDefaultProfileImage(friend.gender)}" alt="${friend.nickname}" class="user-profile-img">
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

export function updateFriendList(newlyAddedFriendUids = []){

    if (!Array.isArray(newlyAddedFriendUids)) {
        newlyAddedFriendUids = newlyAddedFriendUids ? [newlyAddedFriendUids] : [];
    }

    const friendListItems = AppUI.friendListUl.querySelectorAll('.user-list-item');
    const currentFriendIds = new Set(currentUserData.friendIds || []);

    friendListItems.forEach((item)=>{
       const targetUserId = item.id.replace('user-', '');
       if(!currentFriendIds.has(targetUserId)){
        item.remove();
       }
    });
    newlyAddedFriendUids.forEach(uid => {
            // ✅ 전체 사용자 목록에서 해당 UID를 가진 요소를 직접 찾습니다.
            const userListItemInAllUsers = document.getElementById(`user-${uid}`);

            if (userListItemInAllUsers) {
                const friend = {
                    id: uid,
                    nickname: userListItemInAllUsers.querySelector('.user-nickname-heading')?.textContent || '사용자',
                    profileImgUrl: userListItemInAllUsers.querySelector('.user-profile-img')?.src || '',
                    gender: userListItemInAllUsers.dataset.gender,
                    birthYear: userListItemInAllUsers.dataset.birthYear,
                    bio: userListItemInAllUsers.querySelector('.user-bio-text')?.textContent || '소개 없음',
                };
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
        }
    });

    const updatedListItems = AppUI.friendListUl.querySelectorAll('.user-list-item');
    if (updatedListItems.length > FRIEND_PER_PAGE) {
        updatedListItems[updatedListItems.length - 1].remove();
    }
}