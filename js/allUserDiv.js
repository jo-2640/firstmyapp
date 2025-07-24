// js/allUserDiv.js

import {currentUserUid, currentUserData } from '../src/user-data.js';
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // ⭐ 경로 통일!
import { auth, db } from '../src/firebase-init.js';


// auth-service.js에서 updateAuthUIForMode를 가져옵니다.
import { updateAuthUIForMode } from '../src/auth-service.js';
import { getDefaultProfileImage, getAgeGroupLabel, getGenderLabel, getRegionLabel, detailedAgeGroups ,showToast} from '../utils.js';

import { openFriendRequestModal, cancelFriendRequest } from '../friendRequest.js'; // friendRequest.js 모듈 다시 가져오기

// HTML 요소 가져오기 - DOMContentLoaded 이후에 할당
let userListUl;

document.addEventListener('DOMContentLoaded', () => {
    userListUl = document.getElementById('user-list');
    // DOM 로드 후 바로 사용자 목록을 표시해야 한다면 여기서 displayUsers() 호출
    // 현재는 script.js의 onAuthStateChanged에서 호출되므로 생략 가능
});


/**
 * 모든 사용자 목록을 표시하고 필터링합니다.
 * @param {Object} filter - 성별, 나이대, 지역 등의 필터 조건
 */
export async function filterDisplayUsers(filter = {}) {
    // userListUl이 null이면 함수를 종료
    console.log("filterDisplayUsers 함수 시작 시점의 db:", db); // ⭐ 이 라인을 추가
        console.log("db가 객체인지 확인:", typeof db === 'object' && db !== null); // ⭐
    if (!userListUl) {
        console.warn("displayUsers: user-list 요소가 아직 로드되지 않았습니다.");
        return;
    }

    if (!currentUserUid) {
        userListUl.innerHTML = '<li class="p-4 text-gray-500">로그인 후 사용자 목록을 볼 수 있습니다.</li>';
        return;
    }

    userListUl.innerHTML = '<li class="p-4 text-gray-500">사용자를 로드 중...</li>';
    let usersRef = collection(db, "users");
    let usersQuery = query(usersRef);

    // 필터 조건 적용 (필터링 로직은 기존과 동일)
    if (filter.gender && filter.gender !== 'all') {
        usersQuery = query(usersQuery, where("gender", "==", filter.gender));
    }
    if (filter.minAgeGroupValue && filter.minAgeGroupValue !== 'all' && filter.maxAgeGroupValue && filter.maxAgeGroupValue !== 'all') {
        const minAgeGroup = detailedAgeGroups.find(g => g.value === filter.minAgeGroupValue);
        const maxAgeGroup = detailedAgeGroups.find(g => g.value === filter.maxAgeGroupValue);

        if (minAgeGroup && maxAgeGroup) {
            // 예시: 실제 나이(age) 필드가 users 컬렉션에 있다고 가정하고 min/max 나이를 가져와 쿼리합니다.
            if (minAgeGroup.min && maxAgeGroup.max) {
                 usersQuery = query(usersQuery,
                                     where("age", ">=", minAgeGroup.min),
                                     where("age", "<=", maxAgeGroup.max));
            }
        }
    }
    if (filter.region && filter.region !== 'all') {
        usersQuery = query(usersQuery, where("region", "==", filter.region));
    }

    try {
            const currentUserDoc = await getDoc(doc(db, "users", currentUserUid));
            if (!currentUserDoc.exists()) {
                console.error("현재 사용자 정보를 찾을 수 없습니다:", currentUserUid);
                userListUl.innerHTML = '<li class="p-4 text-gray-500">현재 사용자 정보를 찾을 수 없습니다.</li>';
                return;
            }
            const currentUserData = currentUserDoc.data();

     //       console.log("★★★★ displayUsers - 현재 사용자 데이터:", currentUserData);
     //       console.log("★★★★ displayUsers - sentRequests (내가 보낸 요청):", currentUserData.sentRequests);
     //       console.log("★★★★ displayUsers - receivedRequests (내가 받은 요청):", currentUserData.receivedRequests);


            const myFriendIds = new Set(currentUserData.friendIds || []);

            const sentRequests = new Set((currentUserData.sentRequests || []).map(item => {
                return typeof item === 'object' && item !== null && item.uid ? item.uid : item;
            }));

            const receivedRequests = new Set((currentUserData.receivedRequests || []).map(item => {
                return typeof item === 'object' && item !== null && item.uid ? item.uid : item;
            }));


       //     console.log("★★★★ displayUsers - Set으로 변환된 sentRequests:", sentRequests);
       //     console.log("★★★★ displayUsers - Set으로 변환된 receivedRequests:", receivedRequests);

            const querySnapshot = await getDocs(usersQuery);
            let userFound = false;

        userListUl.innerHTML = ''; // 기존 목록 초기화

        for (const docSnap of querySnapshot.docs) {
            if (docSnap.id === currentUserUid) continue; // 자신은 목록에서 제외

            if (myFriendIds.has(docSnap.id)) continue;

            const userData = docSnap.data();
            console.log(`사용자: ${userData.nickname} (${docSnap.id}) - 현재 나의 친구인가? ${myFriendIds.has(docSnap.id)}, 내가 요청 보냈나? ${sentRequests.has(docSnap.id)}, 내가 요청 받았나? ${receivedRequests.has(docSnap.id)}`);
//sas토큰을 발행하여 가져올수 이미지 다운 방식
            const ageLabel = getAgeGroupLabel(userData.ageGroup);
            let displayProfileImgUrl = getDefaultProfileImage(userData.gender);
             try {
                            const response = await fetch('http://localhost:3000/api/getProfileImageUrl', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    userId: userData.uid,           // 이미지를 요청하는 대상 사용자의 UID
                                    requestorUid: currentUserUid    // 현재 로그인한 사용자의 UID
                                    // TODO: 필요시 Firebase Auth ID Token을 여기에 추가하여 백엔드에서 검증
                                    // idToken: await firebase.auth().currentUser.getIdToken(),
                                })
                            });
                            const data = await response.json();

                            if (response.ok && data.success) {
                                displayProfileImgUrl = data.imageUrl; // 백엔드에서 SAS 토큰이 붙은 URL 또는 기본 이미지 URL
                            } else {
                                console.error('Failed to get profile image URL from backend:', data.message || 'Unknown error');
                                // 백엔드에서 실패했더라도 기본 이미지가 이미 할당되어 있음
                            }
                        } catch (error) {
                            console.error('Error calling getProfileImageUrl API:', error);
                            // 네트워크 오류 등으로 API 호출 자체가 실패한 경우에도 기본 이미지가 할당되어 있음
                        }
               //
            let actionButtonHtml = '';
            if (sentRequests.has(docSnap.id)) {
                actionButtonHtml = `<button class="cancel-friend-request-btn" data-uid="${docSnap.id}" data-nickname="${userData.nickname}">요청 보냄 (취소)</button>`;
            } else if (receivedRequests.has(docSnap.id)) {
                // Modified: Removed Tailwind classes and added custom class
                actionButtonHtml = '<button class="received-request-btn" disabled>요청 받음</button>';
            } else {
                // Modified: Removed Tailwind classes and added custom class
                actionButtonHtml = `<button class="add-friend-btn primary-action-btn" data-uid="${docSnap.id}" data-nickname="${userData.nickname}" data-profileimg="${displayProfileImgUrl}">친구 요청</button>`;
            }

           // js/allUserDiv.js 파일 내에서 li.innerHTML을 할당하는 부분:

                   userFound = true; // 사용자 발견
                   const li = document.createElement('li');
                   li.className = 'user-list-item'; // 새로운 클래스 추가
                   li.setAttribute('data-uid', docSnap.id); // 사용자 UID를 li 요소에 추가
                   li.innerHTML = `
                      <div class="user-item-content">
                          <img src="${displayProfileImgUrl}" alt="${userData.nickname}" class="user-profile-img">
                          <div class="user-details-group">
                              <h4 class="user-nickname-heading">${userData.nickname}</h4>
                              <span class="user-info-text">${getGenderLabel(userData.gender)}, ${ageLabel}, ${getRegionLabel(userData.region)}</span>
                              <p class="user-bio-text">${userData.bio || '소개 없음'}</p>
                          </div>
                      </div>
                      <div class="user-action-button-container">
                          ${actionButtonHtml}
                      </div>
                  `;
                  userListUl.appendChild(li);
         }

       if (!userFound) { // 필터링 결과가 아예 없거나, 나 자신만 있는 경우
            userListUl.innerHTML = '<li class="p-4 text-gray-500">다른 사용자를 찾을 수 없습니다.</li>';
       }

       // ★★★★ 핵심 수정: 동적으로 생성된 모든 버튼에 이벤트 리스너 재할당 (요청 취소 버튼 포함) ★★★★
       userListUl.querySelectorAll('.add-friend-btn').forEach(button => {
           button.onclick = (e) => {
               openFriendRequestModal(e.target.dataset.uid, e.target.dataset.nickname, e.target.dataset.profileimg);
           };
       });
       userListUl.querySelectorAll('.cancel-friend-request-btn').forEach(button => {
           button.onclick = (e) => {
               cancelFriendRequest(e.target.dataset.uid, e.target.dataset.nickname);
           };
       });
       // '요청 받음' 버튼은 disabled이므로 클릭 이벤트가 필요 없습니다.


    } catch (error) {
        console.error("사용자 목록 가져오기 오류:", error);
        userListUl.innerHTML = '<li class="p-4 text-red-500">사용자 목록을 불러오는 데 오류가 발생했습니다.</li>';
        showToast("사용자 목록을 불러오는 데 실패했습니다.", "error");
    }
}

// 기존 displayUsers 함수는 clearUserList를 포함하고 있었으므로 별도의 clearUserList는 필요 없습니다.
// 다만, 사용자 목록의 버튼 액션 업데이트 함수를 명시적으로 export하여 필요할 때 호출할 수 있게 합니다.
export function updateUserActionButton(targetUid, newButtonHtml) {
    if (!userListUl) {
        console.warn("updateUserActionButton: user-list 요소가 아직 로드되지 않았습니다.");
        return;
    }

    const userListItem = userListUl.querySelector(`li[data-uid="${targetUid}"]`);
    if (userListItem) {
        const actionButtonContainer = userListItem.querySelector('.user-action-button-container');
        if (actionButtonContainer) {
            actionButtonContainer.innerHTML = newButtonHtml;
            // 새 버튼에 이벤트 리스너 다시 할당
            const newButton = actionButtonContainer.querySelector('button');
            if (newButton) {
                if (newButton.classList.contains('add-friend-btn')) {
                    newButton.onclick = (e) => {
                        openFriendRequestModal(e.target.dataset.uid, e.target.dataset.nickname, e.target.dataset.profileimg);
                    };
                } else if (newButton.classList.contains('cancel-friend-request-btn')) {
                    newButton.onclick = (e) => {
                        cancelFriendRequest(e.target.dataset.uid, e.target.dataset.nickname);
                    };
                }
            }
        }
    }
}