// js/friendListDiv.js

import { db, currentUserUid, showToast } from '../script.js';
import { getAgeGroupLabel, getGenderLabel, getRegionLabel } from '../utils.js';
import { doc, getDoc, onSnapshot, runTransaction, arrayRemove } from "firebase/firestore"; // CDN URL 대신 npm 패키지 이름 사용

// HTML 요소 가져오기 - DOMContentLoaded 이후에 할당
let friendListUl;

// Firestore 리스너 구독 해제를 위한 변수 (friendListDiv.js 내부에서 관리)
let unsubscribeFriendListListener = null;

document.addEventListener('DOMContentLoaded', () => {
    friendListUl = document.getElementById('friend-list');
});

/**
 * 친구 목록 표시 및 실시간 업데이트 설정 함수
 * @param {string} userId - 현재 로그인한 사용자 UID
 */
export function setupFriendListListener(userId) {
    // friendListUl이 null이면 함수를 종료
    if (!friendListUl) {
        console.warn("setupFriendListListener: friend-list 요소가 아직 로드되지 않았습니다.");
        return;
    }

    if (!userId) {
        friendListUl.innerHTML = '<li class=\"p-4 text-gray-500\">로그인 후 친구 목록을 볼 수 있습니다.</li>';
        return;
    }

    // 기존 리스너가 있다면 해제 (중복 구독 방지)
    if (unsubscribeFriendListListener) {
        unsubscribeFriendListListener();
        unsubscribeFriendListListener = null;
        console.log("친구 목록 Firestore 리스너 구독 해제됨 (friendListDiv.js).");
    }

    const userDocRef = doc(db, "users", userId);

    // 새로운 리스너 설정 및 unsubscribe 함수 저장
    unsubscribeFriendListListener = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
            const userData = docSnap.data();
            const friendIds = userData.friendIds || [];

            if (friendIds.length === 0) {
                friendListUl.innerHTML = '<li class=\"p-4 text-gray-500\">친구가 없습니다.</li>';
                return;
            }

            friendListUl.innerHTML = ''; // 기존 목록 초기화

            const friendPromises = friendIds.map(id => getDoc(doc(db, "users", id)));
            const friendDocs = await Promise.all(friendPromises);

            friendDocs.forEach(friendDoc => {
                if (friendDoc.exists()) {
                    const friendData = friendDoc.data();
                    const friendUid = friendDoc.id;

                    const ageLabel = getAgeGroupLabel(friendData.ageGroup);
                    const genderLabel = getGenderLabel(friendData.gender);
                    const regionLabel = getRegionLabel(friendData.region);

                    const li = document.createElement('li');
                    li.className = 'flex items-center justify-between p-2 border-b border-gray-200';
                    li.innerHTML = `
                        <div class="flex items-center space-x-3">
                            <img src="${profileImg}" alt="${friendData.nickname}" class="w-10 h-10 rounded-full object-cover">
                            <div>
                                <span class="font-semibold text-lg">${friendData.nickname}</span>
                                <span class="text-sm text-gray-500">(${genderLabel}, ${ageLabel}, ${regionLabel})</span>
                            </div>
                        </div>
                        <button class="delete-friend-btn bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600" data-uid="${friendUid}" data-nickname="${friendData.nickname}">삭제</button>
                    `;
                    friendListUl.appendChild(li);
                }
            });

            // '삭제' 버튼에 이벤트 리스너 위임 (새로 추가된 버튼에도 적용되도록)
            friendListUl.querySelectorAll('.delete-friend-btn').forEach(button => {
                button.onclick = (e) => {
                    const targetUid = e.target.dataset.uid;
                    const targetNickname = e.target.dataset.nickname;
                    deleteFriend(targetUid, targetNickname);
                };
            });

        } else {
            console.log("친구 목록을 위한 사용자 문서가 존재하지 않습니다.");
            friendListUl.innerHTML = '<li class=\"p-4 text-gray-500\">친구 목록을 불러올 수 없습니다.</li>';
        }
    }, (error) => {
        console.error("친구 목록 Firestore 리스너 오류:", error);
        showToast("친구 목록을 불러오는 데 실패했습니다.", "error");
    });

    console.log("새로운 친구 목록 Firestore 리스너 설정됨 (friendListDiv.js).");
}

// 친구 리스너 해제 함수
export function unsubscribeFriendListListenerAndClear() {
    if (unsubscribeFriendListListener) {
        unsubscribeFriendListListener();
        unsubscribeFriendListListener = null;
        console.log("친구 목록 Firestore 리스너 구독 해제 및 데이터 초기화됨 (friendListDiv.js).");
    }
    if (friendListUl) {
        friendListUl.innerHTML = '<li class=\"p-4 text-gray-500\">로그인 후 친구 목록을 볼 수 있습니다.</li>'; // UI 초기화
    }
}

/**
 * 친구를 삭제하는 함수
 * @param {string} targetUid - 삭제할 친구의 UID
 * @param {string} targetNickname - 삭제할 친구의 닉네임 (확인 메시지용)
 */
export async function deleteFriend(targetUid, targetNickname) {
    if (!currentUserUid) {
        showToast("로그인 후 친구를 삭제할 수 있습니다.", "error");
        return;
    }

    const confirmation = window.confirm(`${targetNickname}님을 친구 목록에서 삭제하시겠습니까?`);
    if (!confirmation) {
        return;
    }

    showToast("친구 삭제 중...", "info");

    try {
        const currentUserDocRef = doc(db, "users", currentUserUid);
        const targetUserDocRef = doc(db, "users", targetUid);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserDocRef);
            const targetUserDoc = await transaction.get(targetUserDocRef);

            if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
                throw new Error("사용자 문서를 찾을 수 없습니다.");
            }

            // 1. 현재 사용자에게서 친구 삭제
            transaction.update(currentUserDocRef, {
                friendIds: arrayRemove(targetUid)
            });

            // 2. 상대방에게서도 친구 삭제 (양방향 제거)
            transaction.update(targetUserDocRef, {
                friendIds: arrayRemove(currentUserUid)
            });
        });

        showToast(`${targetNickname}님과의 친구 관계가 해제되었습니다.`, "info");
        // 친구 목록은 setupFriendListListener의 onSnapshot 리스너에 의해 자동으로 업데이트됩니다.
        // displayUsers() 호출은 script.js에서 여전히 담당하며, 친구 목록 변경 후 '모든 사용자' 목록도 업데이트될 수 있도록 합니다.
    } catch (error) {
        console.error("친구 삭제 중 오류 발생:", error);
        showToast("친구 삭제에 실패했습니다: " + error.message, "error");
    }
}