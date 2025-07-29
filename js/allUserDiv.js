// js/allUserDiv.js

import {currentUserUid, currentUserData } from '../src/user-data.js';
import { collection, doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot, query, where, getDocs,limit, orderBy,FieldPath, startAfter , documentId, endBefore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // ⭐ 경로 통일!
import { auth, db } from '../src/firebase-init.js';


// auth-service.js에서 updateAuthUIForMode를 가져옵니다.
import { updateAuthUIForMode } from '../src/auth-service.js';
import { getDefaultProfileImage, getAgeGroupLabel, getGenderLabel, getRegionLabel, detailedAgeGroups ,showToast} from '../utils.js';

import { openFriendRequestModal, cancelFriendRequest } from '../friendRequest.js'; // friendRequest.js 모듈 다시 가져오기


// HTML 요소 가져오기 - DOMContentLoaded 이후에 할당
let userListUl;
let lastVisibleUserDoc = null; // 마지막으로 표시된 사용자 문서
let currentFilter = {}; // 현재 필터 상태를 저장
let loadedUserIds = new Set(); 
// 현재 사용자 UID가 변경될 때마다 사용자 목록을 업데이트합니다.
let currentRandomStartSeed = null;   // 현재 세션의 무작위 시작점 (UID 문자열)
let isFullCycleComplete = false;     // 현재 세션에서 모든 사용자를 한 바퀴 다 돌았는지 여부
let initialLoadComplete = false;    
const USERS_PER_PAGE = 6;
document.addEventListener('DOMContentLoaded', () => {
    userListUl = document.getElementById('user-list');
    // DOM 로드 후 바로 사용자 목록을 표시해야 한다면 여기서 displayUsers() 호출
    // 현재는 script.js의 onAuthStateChanged에서 호출되므로 생략 가능
});


/**
 * 모든 사용자 목록을 표시하고 필터링합니다.
 * @param {Object} filter - 성별, 나이대, 지역 등의 필터 조건
 */
function addLoadMoreButton() {
    if (!userListUl) {
        console.warn("addLoadMoreButton: user-list 요소가 아직 로드되지 않았습니다.");
        return;
    }

    // 기존 로드 더 보기 버튼이 있다면 제거
    const existingButton = userListUl.querySelector('.load-more-btn');
    if (existingButton) {
        existingButton.remove();
    }

     // ⭐ isFullCycleComplete가 true이면 더보기 버튼을 추가하지 않습니다.
    if (isFullCycleComplete) {
        console.log("모든 사용자를 순환 조회 완료했습니다.");
        const allLoadedMessage = document.createElement('li');
        allLoadedMessage.className = 'p-4 text-gray-500 text-center';
        allLoadedMessage.textContent = '모든 사용자를 조회했습니다.';
        userListUl.appendChild(allLoadedMessage);
        return;
    }
    // 로드 더 보기 버튼 생성
    const loadMoreButton = document.createElement('button');
    loadMoreButton.className = 'load-more-btn';
    loadMoreButton.textContent = '더 많은 사용자 로드';
    loadMoreButton.onclick = () => {
        filterDisplayUsers(currentFilter,true); // 현재 필터로 사용자 목록을 다시 불러옵니다.
    };

    userListUl.appendChild(loadMoreButton);
}

export async function filterDisplayUsers(filter = {} ,append = false) {
    // userListUl이 null이면 함수를 종료
   
    if (!userListUl) {
        console.warn("displayUsers: user-list 요소가 아직 로드되지 않았습니다.");
        return;
    }

    
    if(!append) {
        // 새로 로드할 때마다 마지막 사용자 UID를 초기화    
    userListUl.innerHTML = '<li class="p-4 text-gray-500">사용자를 로드 중...</li>';
    lastVisibleUserDoc = null; // 새로 로드할 때마다 초기화
    currentFilter = filter; // 현재 필터 상태를 저장
    isFullCycleComplete = false;
    initialLoadComplete = false;
    loadedUserIds.clear(); // ⭐ 새로운 로드이므로 Set 초기화
    
    currentRandomStartSeed = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log(`새로운 무작위 시작점 (UID): ${currentRandomStartSeed}`);   
    } else{ 
        // append가 true인 경우, 기존 목록에 추가
        if (userListUl.querySelector('.load-more-btn')) {
            userListUl.querySelector('.load-more-btn').remove(); // 기존 로드 더 보기 버튼 제거
        }
    }

    let usersRef = collection(db, "users");
    let usersQuery ;

    // ⭐ 3. UID 기반 순환 로직 적용
    // 쿼리 정렬 기준을 documentId()로 변경합니다.
    if (lastVisibleUserDoc) {
        // 다음 페이지 로드: 이전에 가져온 마지막 문서 이후부터 시작
        usersQuery = query(usersRef, orderBy(documentId()), startAfter(lastVisibleUserDoc));
    } else if (initialLoadComplete) { 
        // 초기 로드(무작위 시드 이후)가 완료된 후: 맨 처음부터 무작위 시드 이전까지 조회
        console.log(`순환 로직: 맨 처음부터 시작점(${currentRandomStartSeed}) 이전까지 조회합니다.`);
        usersQuery = query(usersRef, orderBy(documentId()), endBefore(currentRandomStartSeed));
    } else if (currentRandomStartSeed) { 
        // 첫 로드 (lastVisibleUserDoc이 null이고 initialLoadComplete가 false일 때): 무작위 시드 이후부터 시작
        usersQuery = query(usersRef, orderBy(documentId()), startAfter(currentRandomStartSeed));
    } else { // 예외 상황 (거의 발생 안 함)
        usersQuery = query(usersRef, orderBy(documentId())); // 기본 쿼리
    }
    
    usersQuery = applyUserFilters(usersQuery, currentFilter); // ⭐ 오타 수정
    usersQuery = query(usersQuery, limit(USERS_PER_PAGE)); 
    
    console.log("Constructed Firestore Query (by UID):", usersQuery); // ⭐ 로그 메시지 수정
    try {
            const currentUserDoc = await getDoc(doc(db, "users", currentUserUid));
            if (!currentUserDoc.exists()) {
                console.error("현재 사용자 정보를 찾을 수 없습니다:", currentUserUid);
                userListUl.innerHTML = '<li class="p-4 text-gray-500">현재 사용자 정보를 찾을 수 없습니다.</li>';
                return;
            }
            // 현재 사용자 문서에서 친구 목록과 요청 목록을 가져옵니다.
            // 친구 목록과 요청 목록은 배열로 가정합니다.
            // 현재 사용자 UID와 친구 목록, 요청 목록을 가져옵니다.
           
            
            const currentUserData = currentUserDoc.data();
            const myFriendIds = new Set(currentUserData.friendIds || []);

            const sentRequests = new Set((currentUserData.sentRequests || []).map(item => {
                return typeof item === 'object' && item !== null && item.uid ? item.uid : item;
            }));

            const receivedRequests = new Set((currentUserData.receivedRequests || []).map(item => {
                return typeof item === 'object' && item !== null && item.uid ? item.uid : item;
            }));
            // 사용자 목록을 가져옵니다.
            // 쿼리 실행   주문 목록생성 

            const querySnapshot = await getDocs(usersQuery);
            let userFoundInThisBatch = false; // ⭐ 변수명 변경: userFound 
          
           
            if(!append) userListUl.innerHTML = ''; // 기존 목록 초기화

            for (const docSnap of querySnapshot.docs) {
                const userData = docSnap.data();
                console.log(`사용자 데이터: ${userData.nickname} => (${docSnap.id})`);
                if (docSnap.id === currentUserUid) continue; // 자신은 목록에서 제외
                if (myFriendIds.has(docSnap.id)) continue;
                if (loadedUserIds.has(docSnap.id)) { // ⭐ 중복 방지
                     console.log(`중복 사용자 (${docSnap.id}) 건너뛰기`);
                     continue;
                }
                  console.log(`사용자: ${userData.nickname} (${docSnap.id}) - 현재 나의 친구인가? ${myFriendIds.has(docSnap.id)}, 내가 요청 보냈나? ${sentRequests.has(docSnap.id)}, 내가 요청 받았나? ${receivedRequests.has(docSnap.id)}`);
               //sas토큰을 발행하여 가져올수 이미지 다운 방식
                 const ageLabel = getAgeGroupLabel(userData.ageGroup);
                 let displayProfileImgUrl = getDefaultProfileImage(userData.gender);

                 try {
                            displayProfileImgUrl = await getProfileImgUrlWithSas({uid:docSnap.id, ...userData}, displayProfileImgUrl);
                } catch (error) {
                            console.error('Error calling getProfileImageUrl API:', error);
                            // 네트워크 오류 등으로 API 호출 자체가 실패한 경우에도 기본 이미지가 할당되어 있음
                }
 
                let actionButtonHtml = '';
                if (sentRequests.has(docSnap.id)) {
                    actionButtonHtml = `<button class="cancel-friend-request-btn" data-uid="${docSnap.id}" data-nickname="${userData.nickname}">요청 보냄 (취소)</button>`;
                } else if (receivedRequests.has(docSnap.id)) {
                    actionButtonHtml = `<button class="accept-friend-request-btn" data-uid="${docSnap.id}" data-nickname="${userData.nickname}">요청 받음</button>`;
                }else {
                    actionButtonHtml = `<button class="add-friend-btn primary-action-btn" data-uid="${docSnap.id}" data-nickname="${userData.nickname}" data-profileimg="${displayProfileImgUrl}">친구 요청</button>`;
                }
                userFoundInThisBatch  = true; // 사용자 발견
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
                loadedUserIds.add(docSnap.id); // ⭐ 로드된 사용자 ID 추가  
            } // for 문 종료
         // 마지막으로 표시된 사용자 UID와 문서를 업데이트
        lastVisibleUserDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;

        if (querySnapshot.docs.length < USERS_PER_PAGE && !initialLoadComplete) {
            // 현재 시작점 이후의 모든 데이터를 가져왔다면 (첫 번째 순회 완료)
            initialLoadComplete = true; // 초기 순회 완료 플래그 설정
            lastVisibleUserDoc = null; // 다음 쿼리를 위해 lastVisibleUserDoc 초기화 (맨 처음부터 시작해야 함)
            console.log("무작위 시작점 이후의 초기 순회 완료. 이제 맨 처음부터 다시 조회합니다.");
        } else if (querySnapshot.docs.length < USERS_PER_PAGE && initialLoadComplete) {
            // 맨 처음부터 시작점 이전까지의 데이터를 모두 가져왔다면, 전체 순회 완료
            isFullCycleComplete = true;
            console.log("모든 사용자를 한 바퀴 순회 완료했습니다!");
        }       
        if (!isFullCycleComplete) { 
            addLoadMoreButton();    
        } else {
            const existingButton = userListUl.querySelector('.load-more-btn');
            if (existingButton) {
                existingButton.remove();
            }
        }       
        
         // ⭐ 8. 사용자 목록이 비었을 때 메시지 표시 (수정된 변수명 사용)
        if (!userFoundInThisBatch && !append) { // 필터링 결과가 아예 없거나, 나 자신만 있는 경우
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
       userListUl.querySelectorAll('.accept-friend-request-btn').forEach(button => {
            button.onclick = (e) => {
                showToast(`'${e.target.dataset.nickname}' 님의 친구 요청을 수락하시겠습니까? (기능 구현 필요)`, "info");
            };
        });

    } catch (error) {
        console.error("사용자 목록 가져오기 오류:", error);
        userListUl.innerHTML = '<li class="p-4 text-red-500">사용자 목록을 불러오는 데 오류가 발생했습니다.</li>';
        showToast("사용자 목록을 불러오는 데 실패했습니다.", "error");
    }

}
function applyUserFilters(baseQuery, filter) {
    let currentQuery = baseQuery;
    if (filter.gender && filter.gender !== 'all') {
        currentQuery = query(currentQuery, where("gender", "==", filter.gender));
    }
    if (filter.minAgeGroupValue && filter.minAgeGroupValue !== 'all' && filter.maxAgeGroupValue && filter.maxAgeGroupValue !== 'all') {
        const minAgeGroup = detailedAgeGroups.find(g => g.value === filter.minAgeGroupValue);
        const maxAgeGroup = detailedAgeGroups.find(g => g.value === filter.maxAgeGroupValue);

        if (minAgeGroup && maxAgeGroup) {
            if (minAgeGroup.min && maxAgeGroup.max) {
                currentQuery = query(currentQuery,
                    where("age", ">=", minAgeGroup.min),
                    where("age", "<=", maxAgeGroup.max));
            }
        }
    }
    if (filter.region && filter.region !== 'all') {
        currentQuery = query(currentQuery, where("region", "==", filter.region));
    }
    return currentQuery; // 수정된 쿼리 반환
}
async function getProfileImgUrlWithSas(userData, displayProfileImgUrl) {
    const response = await fetch('http://localhost:3000/api/getProfileImageUrl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: userData.uid, // 이미지를 요청하는 대상 사용자의 UID
            requestorUid: currentUserUid // 현재 로그인한 사용자의 UID
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
    return displayProfileImgUrl;
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