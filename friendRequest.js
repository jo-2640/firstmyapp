// friendRequest.js

// script.js에서 필요한 전역 변수와 함수를 임포트합니다.
import { auth , db } from './src/firebase-init.js';
import { currentUserUid, currentUserData } from './src/user-data.js'
import { getDefaultProfileImage, getAgeGroupLabel, getGenderLabel, getRegionLabel,showToast } from './utils.js';
import { updateUserActionButton }  from './js/allUserDiv.js';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot } from "firebase/firestore";

// HTML 요소 가져오기 (친구 요청 모달 관련)
const friendRequestMessageModalOverlay = document.getElementById('friend-request-message-modal-overlay');
const friendRequestMessageModalCloseBtn = document.getElementById('friend-request-message-modal-close-btn');
const requestTargetImg = document.getElementById('request-target-img');
const requestTargetNickname = document.getElementById('request-target-nickname');
const requestMessageInput = document.getElementById('request-message-input');
const sendRequestBtn = document.getElementById('send-request-btn');
const sendRequestCancelBtn = document.getElementById('send-request-cancel-btn');

// 받은 친구 요청 목록 모달 관련 요소
const friendRequestsInboxModalOverlay = document.getElementById('friend-requests-inbox-modal-overlay');
const friendRequestsInboxModalCloseBtn = document.getElementById('friend-requests-inbox-modal-close-btn');
const receivedFriendRequestsList = document.getElementById('received-friend-requests-list');
const noPendingRequests = document.getElementById('no-pending-requests'); // '받은 친구 요청이 없습니다.' 메시지 요소

// 친구 요청을 보낼 대상 사용자 정보를 임시 저장하는 변수
let targetUserId = null;
let targetUserNickname = null;
let targetUserProfileImg = null;

// ====================================================================
// ★★★ 변경 시작: unsubscribeFriendRequestsInboxListener 관리 방식 변경 ★★★
// ====================================================================

// 받은 친구 요청함 리스너 구독 해제를 위한 내부 변수
let _unsubscribeFriendRequestsInboxListener = null; // _ (언더스코어)를 붙여 내부용 변수임을 명시

// 외부에서 이 리스너를 설정할 수 있도록 export 하는 함수
export function setUnsubscribeFriendRequestsInboxListener(listener) {
    _unsubscribeFriendRequestsInboxListener = listener;
}

// 외부에서 이 리스너 함수를 가져와 호출할 수 있도록 export 하는 함수
export function getUnsubscribeFriendRequestsInboxListener() {
    return _unsubscribeFriendRequestsInboxListener;
}
// ====================================================================
// ★★★ 변경 끝 ★★★
// ====================================================================


// --- 친구 요청 보내기 모달 관련 함수 ---

/**
 * 친구 요청 메시지 모달을 엽니다.
 * @param {string} uid - 친구 요청을 보낼 대상 사용자의 UID
 * @param {string} nickname - 대상 사용자의 닉네임
 * @param {string} profileImg - 대상 사용자의 프로필 이미지 URL
 */
export function openFriendRequestModal(uid, nickname, profileImg) {
    if (!currentUserUid) {
        showToast("로그인 후 친구 요청을 보낼 수 있습니다.", "error");
        return;
    }
    targetUserId = uid;
    targetUserNickname = nickname;
    targetUserProfileImg = profileImg;

    if (requestTargetImg) requestTargetImg.src = profileImg || getDefaultProfileImage(null);
    if (requestTargetNickname) requestTargetNickname.textContent = nickname;
    if (requestMessageInput) requestMessageInput.value = '';

    if (friendRequestMessageModalOverlay) friendRequestMessageModalOverlay.classList.remove('hidden');
}

/**
 * 친구 요청 메시지 모달을 닫습니다.
 */
function closeFriendRequestModal() {
    if (friendRequestMessageModalOverlay) friendRequestMessageModalOverlay.classList.add('hidden');
    targetUserId = null;
    targetUserNickname = null;
    targetUserProfileImg = null;
}

/**
 * 친구 요청을 보냅니다.
 * Firestore의 'users' 컬렉션에 sentRequests (보낸 사람) 및 receivedRequests (받는 사람) 배열을 업데이트합니다.
 */
async function sendFriendRequest() {
    if (!currentUserUid || !targetUserId) {
        showToast("친구 요청을 보낼 수 없습니다. 사용자 정보를 확인해주세요.", "error");
        return;
    }

    if (currentUserUid === targetUserId) {
        showToast("자기 자신에게 친구 요청을 보낼 수 없습니다.", "error");
        return;
    }

    showToast("친구 요청 보내는 중...", "info");

    try {
        const currentUserRef = doc(db, "users", currentUserUid);
        const targetUserRef = doc(db, "users", targetUserId);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const targetUserDoc = await transaction.get(targetUserRef);

            if (!currentUserDoc.exists()) {
                throw new Error("현재 사용자 문서가 존재하지 않습니다!");
            }
            if (!targetUserDoc.exists()) {
                throw new Error("대상 사용자 문서가 존재하지 않습니다!");
            }

            const currentSentRequests = currentUserDoc.data().sentRequests || [];
            const targetReceivedRequests = targetUserDoc.data().receivedRequests || [];
            const currentFriends = currentUserDoc.data().friendIds || [];

            if (currentFriends.includes(targetUserId)) {
                throw "이미 친구인 사용자입니다.";
            }

            if (currentSentRequests.includes(targetUserId)) {
                throw "이미 친구 요청을 보냈습니다.";
            }

            if (targetReceivedRequests.includes(currentUserUid)) {
                throw "상대방이 이미 당신에게 친구 요청을 보냈습니다. 받은 요청함에서 확인해주세요.";
            }

            transaction.update(currentUserRef, {
                sentRequests: arrayUnion(targetUserId)
            });

            transaction.update(targetUserRef, {
                receivedRequests: arrayUnion(currentUserUid)
            });
        });

        showToast("친구 요청을 성공적으로 보냈습니다!", "success");
        closeFriendRequestModal();
       const pendingButtonHtml = `<button class="cancel-friend-request-btn bg-yellow-500 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-600" data-uid="${targetUserId}" data-nickname="${targetUserNickname}" data-profileimg="${targetUserProfileImg}">요청 보냄 (취소)</button>`;
       updateUserActionButton(targetUserId, pendingButtonHtml);
        updateFriendRequestBadge();


    } catch (error) {
        console.error("친구 요청 오류:", error);
        let errorMessage = "친구 요청에 실패했습니다.";
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.code) {
            switch (error.code) {
                case 'already-exists':
                    errorMessage = '이미 요청이 존재하거나 처리되었습니다.';
                    break;
                case 'not-found':
                    errorMessage = '요청 대상을 찾을 수 없습니다.';
                    break;
                case 'permission-denied':
                    errorMessage = '권한이 부족하여 요청을 보낼 수 없습니다. 로그인 상태를 확인해주세요.';
                    break;
                default:
                    errorMessage = error.message;
            }
        }
        showToast(errorMessage, "error");
    }
}

/**
 * 보낸 친구 요청을 취소합니다.
 * @param {string} targetUid - 요청을 취소할 대상 사용자의 UID
 * @param {string} targetNickname - 대상 사용자의 닉네임 (토스트 메시지용)
 */
export async function cancelFriendRequest(targetUid, targetNickname) {
    if (!currentUserUid || !currentUserData || !targetUid) {
        showToast('사용자 정보가 부족하여 요청을 취소할 수 없습니다.', 'error');
        return;
    }

    showToast("친구 요청 취소 중...", "info");
    try {
        const currentUserRef = doc(db, 'users', currentUserUid);
        const targetUserRef = doc(db, 'users', targetUid);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const targetUserDoc = await transaction.get(targetUserRef);

            if (!currentUserDoc.exists()) {
                throw new Error("현재 사용자 문서를 찾을 수 없습니다.");
            }
            if (!targetUserDoc.exists()) {
                throw new Error("대상 사용자 문서를 찾을 수 없습니다.");
            }

            transaction.update(currentUserRef, {
                sentRequests: arrayRemove(targetUid)
            });

            transaction.update(targetUserRef, {
                receivedRequests: arrayRemove(currentUserUid)
            });
        });

        showToast('친구 요청이 성공적으로 취소되었습니다.', 'success');
        console.log(`친구 요청 취소: ${targetUid}에게 보낸 요청이 ${currentUserUid}에 의해 취소됨.`);
        const addButtonHtml = `<button class="add-friend-btn bg-indigo-500 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-600" data-uid="${targetUid}" data-nickname="${targetNickname}" >친구 요청</button>`;
        updateUserActionButton(targetUid, addButtonHtml);
        updateFriendRequestBadge();


    } catch (error) {
        console.error("친구 요청 취소 오류:", error);
        let errorMessage = '친구 요청 취소 중 오류가 발생했습니다.';
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        showToast(errorMessage, 'error');
    }
}


// --- 받은 친구 요청 목록 모달 관련 함수 ---

/**
 * 받은 친구 요청 목록 모달을 엽니다.
 */
export async function openFriendRequestsInboxModal() {
    if (!currentUserUid) {
        showToast("로그인 후 친구 요청을 확인할 수 있습니다.", "error");
        return;
    }

    if (receivedFriendRequestsList) receivedFriendRequestsList.innerHTML = '';
    if (noPendingRequests) noPendingRequests.style.display = 'none';

    showToast("친구 요청 불러오는 중...", "info");

    const userDocRef = doc(db, "users", currentUserUid);

    // ====================================================================
    // ★★★ 변경 시작: unsubscribeFriendRequestsInboxListener 사용 방식 변경 ★★★
    // ====================================================================
    const currentUnsubscribe = getUnsubscribeFriendRequestsInboxListener(); // getter 함수 사용
    if (currentUnsubscribe) {
        currentUnsubscribe();
        setUnsubscribeFriendRequestsInboxListener(null); // setter 함수 사용
    }

    const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
    // ====================================================================
    // ★★★ 변경 끝 ★★★
    // ====================================================================
        if (docSnap.exists()) {
            const userData = docSnap.data();
            const receivedRequestsUids = userData.receivedRequests || [];
            const friendIds = userData.friendIds || [];

            const pendingRequests = receivedRequestsUids.filter(reqUid => !friendIds.includes(reqUid));

            if (receivedFriendRequestsList) receivedFriendRequestsList.innerHTML = '';
            if (noPendingRequests) noPendingRequests.style.display = 'none';

            updateFriendRequestBadge();

            if (pendingRequests.length === 0) {
                if (noPendingRequests) noPendingRequests.style.display = 'block';
            } else {
                const requestPromises = pendingRequests.map(async (requesterUid) => {
                    const requesterDocRef = doc(db, "users", requesterUid);
                    const requesterDocSnap = await getDoc(requesterDocRef);
                    if (requesterDocSnap.exists()) {
                        return { id: requesterDocSnap.id, data: requesterDocSnap.data() };
                    }
                    return null;
                });

                const validRequests = (await Promise.all(requestPromises)).filter(req => req !== null);

                if (validRequests.length === 0) {
                     if (noPendingRequests) noPendingRequests.style.display = 'block';
                } else {
                    validRequests.forEach(requester => {
                        const requesterData = requester.data;
                        const li = document.createElement('li');
                        li.classList.add('user-item', 'incoming-request-item');
                        li.dataset.uid = requester.id;
                        li.id = `request-${requester.id}`;


                        let profileImgSrc = getDefaultProfileImage(requesterData.gender);
                        if (requesterData.profileImgUrl) {
                            profileImgSrc = requesterData.profileImgUrl;
                        }

                        const ageLabel = getAgeGroupLabel(requesterData.minAgeGroupValue) || '나이 정보 없음';


                        li.innerHTML = `
                            <img src="${profileImgSrc}" alt="${requesterData.nickname} 프로필" class="user-profile-img">
                            <div class="user-info">
                                <span class="user-nickname">${requesterData.nickname}</span>
                                <span class="user-details">${getGenderLabel(requesterData.gender)}, ${ageLabel}, ${getRegionLabel(requesterData.region)}</span>
                                <p class="user-bio">${requesterData.bio || '소개 없음'}</p>
                            </div>
                            <div class="request-actions">
                                <button class="accept-request-btn action-btn primary" data-uid="${requester.id}">수락</button>
                                <button class="decline-request-btn action-btn secondary" data-uid="${requester.id}">거절</button>
                            </div>
                        `;
                        if (receivedFriendRequestsList) receivedFriendRequestsList.appendChild(li);
                    });
                }
            }
        } else {
            console.warn("현재 사용자 문서를 찾을 수 없어 친구 요청 수신함을 로드할 수 없습니다.");
            if (receivedFriendRequestsList) receivedFriendRequestsList.innerHTML = '<li class="p-4 text-gray-500">사용자 정보를 찾을 수 없습니다.</li>';
            if (noPendingRequests) noPendingRequests.style.display = 'none';
            updateFriendRequestBadge();

        }
    }, (error) => {
        console.error("친구 요청 수신함 스냅샷 리스너 오류:", error);
        if (error.code === 'permission-denied') {
            if (receivedFriendRequestsList) receivedFriendRequestsList.innerHTML = '<li class="p-4 text-gray-500">친구 요청 목록을 불러올 권한이 없습니다.</li>';
        }

    });

    // ====================================================================
    // ★★★ 변경 시작: 새로 생성된 리스너 함수를 setter 함수로 저장 ★★★
    // ====================================================================
    setUnsubscribeFriendRequestsInboxListener(unsubscribe);
    // ====================================================================
    // ★★★ 변경 끝 ★★★
    // ====================================================================


    if (friendRequestsInboxModalOverlay) friendRequestsInboxModalOverlay.classList.remove('hidden');
}

/**
 * 받은 친구 요청 모달을 닫습니다.
 */
function closeFriendRequestsInboxModal() {
    if (friendRequestsInboxModalOverlay) friendRequestsInboxModalOverlay.classList.add('hidden');
    if (receivedFriendRequestsList) receivedFriendRequestsList.innerHTML = '';
    if (noPendingRequests) noPendingRequests.style.display = 'none';
    // ====================================================================
    // ★★★ 변경 시작: unsubscribeFriendRequestsInboxListener 사용 방식 변경 ★★★
    // ====================================================================
    const currentUnsubscribe = getUnsubscribeFriendRequestsInboxListener(); // getter 함수 사용
    if (currentUnsubscribe) {
        currentUnsubscribe();
        setUnsubscribeFriendRequestsInboxListener(null); // setter 함수 사용
        console.log("친구 요청 수신함 Firestore 리스너 구독 해제됨 (모달 닫힘).");
    }
    // ====================================================================
    // ★★★ 변경 끝 ★★★
    // ====================================================================
    updateFriendRequestBadge();
}

/**
 * 친구 요청을 수락합니다.
 * @param {string} senderId - 요청을 보낸 사용자의 UID
 */
export async function acceptFriendRequest(senderId) {
    if (!currentUserUid || !senderId) return;

    showToast("요청 처리 중...", "info");

    try {
        const currentUserRef = doc(db, "users", currentUserUid);
        const senderUserRef = doc(db, "users", senderId);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const senderUserDoc = await transaction.get(senderUserRef);

            if (!currentUserDoc.exists() || !senderUserDoc.exists()) {
                throw new Error("사용자 문서를 찾을 수 없습니다.");
            }

            transaction.update(currentUserRef, {
                receivedRequests: arrayRemove(senderId),
                friendIds: arrayUnion(senderId)
            });

            transaction.update(senderUserRef, {
                sentRequests: arrayRemove(currentUserUid),
                friendIds: arrayUnion(currentUserUid)
            });
        });

        showToast('친구 요청을 수락했습니다!', 'success');
        const listItemToRemove = document.getElementById(`request-${senderId}`);
        if (listItemToRemove) {
            listItemToRemove.remove();
        }
        checkNoPendingRequests();
        const friendsButtonHtml = `<button class="bg-green-500 text-white px-3 py-1 rounded-md text-sm cursor-not-allowed" disabled>친구</button>`;
         updateUserActionButton(senderId, friendsButtonHtml);


        updateFriendRequestBadge();


    } catch (error) {
        console.error(`친구 요청 수락 오류:`, error);
        let errorMessage = `친구 요청 수락 실패: ${error.message}`;
        if (error.code === 'permission-denied') {
            errorMessage = '권한이 부족하여 친구 요청을 수락할 수 없습니다.';
        }
        showToast(errorMessage, 'error');
    }
}

/**
 * 친구 요청을 거절합니다.
 * @param {string} senderId - 요청을 보낸 사용자의 UID
 */
export async function rejectFriendRequest(senderId) {
    if (!currentUserUid || !senderId) return;

    showToast("요청 처리 중...", "info");

    try {
        const currentUserRef = doc(db, "users", currentUserUid);
        const senderUserRef = doc(db, "users", senderId);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const senderUserDoc = await transaction.get(senderUserRef);

            if (!currentUserDoc.exists() || !senderUserDoc.exists()) {
                throw new Error("사용자 문서를 찾을 수 없습니다.");
            }

            transaction.update(currentUserRef, {
                receivedRequests: arrayRemove(senderId)
            });

            transaction.update(senderUserRef, {
                sentRequests: arrayRemove(currentUserUid)
            });
        });

        showToast('친구 요청을 거절했습니다.', 'info');
        const listItemToRemove = document.getElementById(`request-${senderId}`);
        if (listItemToRemove) {
            listItemToRemove.remove();
        }
        checkNoPendingRequests();
        updateUserActionButton(senderId, 'none');
        updateFriendRequestBadge();

    } catch (error) {
        console.error("친구 요청 거절 오류:", error);
        let errorMessage = `친구 요청 거절 실패: ${error.message}`;
        if (error.code === 'permission-denied') {
            errorMessage = '권한이 부족하여 친구 요청을 거절할 수 없습니다.';
        }
        showToast(errorMessage, 'error');
    }
}

function checkNoPendingRequests() {
    if (receivedFriendRequestsList && noPendingRequests) {
        if (receivedFriendRequestsList.children.length === 0) {
            noPendingRequests.style.display = 'block';
        } else {
            noPendingRequests.style.display = 'none';
        }
    }
}


// --- 이벤트 리스너 ---

if (friendRequestMessageModalCloseBtn) {
    friendRequestMessageModalCloseBtn.addEventListener('click', closeFriendRequestModal);
}
if (sendRequestCancelBtn) {
    sendRequestCancelBtn.addEventListener('click', closeFriendRequestModal);
}

if (sendRequestBtn) {
    sendRequestBtn.addEventListener('click', sendFriendRequest);
}

if (friendRequestsInboxModalCloseBtn) {
    friendRequestsInboxModalCloseBtn.addEventListener('click', closeFriendRequestsInboxModal);
}
const friendRequestsInboxModalCloseFooterBtn = document.getElementById('friend-requests-inbox-modal-close-footer-btn');
if (friendRequestsInboxModalCloseFooterBtn) {
    friendRequestsInboxModalCloseFooterBtn.addEventListener('click', closeFriendRequestsInboxModal);
}


if (receivedFriendRequestsList) {
    receivedFriendRequestsList.addEventListener('click', (e) => {
        const acceptBtn = e.target.closest('.accept-request-btn');
        const declineBtn = e.target.closest('.decline-request-btn');

        if (acceptBtn) {
            const senderId = acceptBtn.dataset.uid;
            acceptFriendRequest(senderId);
        } else if (declineBtn) {
            const senderId = declineBtn.dataset.uid;
            rejectFriendRequest(senderId);
        }
    });
}

export async function updateFriendRequestBadge() {
    const friendRequestBadge = document.getElementById('friend-request-badge');
    if (!friendRequestBadge) {
        console.warn("친구 요청 배지 요소를 찾을 수 없습니다.");
        return;
    }
    if (!currentUserUid) { // 로그인하지 않았다면
        friendRequestBadge.textContent = '0';
        friendRequestBadge.classList.add('hidden');
        return;
    }

    try {
        const userDocRef = doc(db, "users", currentUserUid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const receivedRequests = userData.receivedRequests || [];
            const friendIds = userData.friendIds || [];

            // 아직 친구 수락을 하지 않은 요청만 카운트
            const pendingRequestsCount = receivedRequests.filter(reqUid => !friendIds.includes(reqUid)).length;

            friendRequestBadge.textContent = pendingRequestsCount.toString();
            if (pendingRequestsCount > 0) {
                friendRequestBadge.classList.remove('hidden'); // 요청이 있으면 보이게
            } else {
                friendRequestBadge.classList.add('hidden'); // 요청이 없으면 숨기게
            }
        } else {
            console.warn("현재 사용자 문서를 찾을 수 없어 배지를 업데이트할 수 없습니다.");
            friendRequestBadge.textContent = '0';
            friendRequestBadge.classList.add('hidden');
        }
    } catch (error) {
        console.error("친구 요청 배지 업데이트 중 오류 발생:", error);
        friendRequestBadge.textContent = '0';
        friendRequestBadge.classList.add('hidden');
    }
}

