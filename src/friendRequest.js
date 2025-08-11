// friendRequest.js

// script.js에서 필요한 전역 변수와 함수를 임포트합니다.
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, runTransaction, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth , db } from './firebase-init.js';
import { currentUserUid, currentUserData } from './user-data.js'
import { getDefaultProfileImage, getAgeGroupLabel, getGenderLabel, getRegionLabel,showToast ,getAgeGroupLabelFromBirthYear} from './utils.js';
import {updateAllUserItemButtons} from './allUserDiv.js';


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
// 받은친구 바로 확인해서 거절 취소하는 모달
const receivedRequestDetailsModalOverlay = document.getElementById('received-request-details-modal-overlay');
const receivedRequestDetailsCloseBtn = document.getElementById('received-request-details-close-btn');
const receivedRequestDetailsImg = document.getElementById('received-request-details-img');
const receivedRequestDetailsNicknameText = document.getElementById('received-request-details-nickname-text');
const receivedRequestDetailsInfo = document.getElementById('received-request-details-info');
const receivedRequestDetailsMessage = document.getElementById('received-request-details-message');
const acceptFromModalBtn = document.getElementById('accept-from-modal-btn');
const declineFromModalBtn = document.getElementById('decline-from-modal-btn');

// 친구 요청을 보낼 대상 사용자 정보를 임시 저장하는 변수
let targetUserId = null;
let targetUserNickname = null;
let targetUserProfileImg = null;

let currentRequestSenderId = null; // 현재 상세 보기 중인 요청의 발신자 UID
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

        console.log(`${db}`);

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

    if (requestTargetImg) {
        requestTargetImg.src = profileImg || getDefaultProfileImage(null);
        requestTargetImg.onerror = () => requestTargetImg.src = getDefaultProfileImage(null);
    }
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

        const tempTargetUserData = await getDoc(targetUserRef);
        console.log(`CU:${currentUserUid} TU:${targetUserId} TUName: ${tempTargetUserData.data().nickname}`);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const targetUserDoc = await transaction.get(targetUserRef);

            if (!currentUserDoc.exists()) {
                throw new Error("현재 사용자 문서가 존재하지 않습니다!");
            }
            if (!targetUserDoc.exists()) {
                throw new Error("대상 사용자 문서가 존재하지 않습니다!");
            }


            const currentSentRequests = currentUserDoc.data().friendRequestsSent || [];
            const theirReceivedRequests = targetUserDoc.data().friendRequestsReceived || [];
            const currentFriends = currentUserDoc.data().friendIds || [];

            if (currentFriends.includes(targetUserId)) {
                throw "이미 친구인 사용자입니다.";
            }

            if (currentSentRequests.includes(targetUserId)) {
                throw "이미 친구 요청을 보냈습니다.";
            }

            const hasReceivedRequest = theirReceivedRequests.some(req => req.from === currentUserUid);
            if (hasReceivedRequest) {
                throw "상대방이 이미 당신에게 친구 요청을 보냈습니다. 받은 요청함에서 확인해주세요.";
            }
            const message = requestMessageInput.value;
            const requestData = {
                from: currentUserUid,
                message: message,
                timestamp: new Date()
            }
            transaction.update(currentUserRef, {
                friendRequestsSent: arrayUnion(targetUserId)
            });

            transaction.update(targetUserRef, {
                friendRequestsReceived: arrayUnion(requestData)
            });
        });

        showToast("친구 요청을 성공적으로 보냈습니다!", "success");
        closeFriendRequestModal();

     //   updateFriendRequestBadge();


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
                friendRequestsSent: arrayRemove(targetUid)
            });
           const theirReceivedRequests = targetUserDoc.data().friendRequestsReceived || [];

               // 'from' 필드만 확인하여 currentUserUid와 다른 객체만 남김
           const newReceivedRequests = theirReceivedRequests.filter(req => req.from !== currentUserUid);

           // ✅ 3. 수정된 배열로 필드를 통째로 업데이트
           transaction.update(targetUserRef, {
               friendRequestsReceived: newReceivedRequests
           });
        });

        showToast('친구 요청이 성공적으로 취소되었습니다.', 'success');
        console.log(`친구 요청 취소: ${targetUid}에게 보낸 요청이 ${currentUserUid}에 의해 취소됨.`);
      //   updateFriendRequestBadge();

        const friendItem = document.getElementById(`user-${targetUid}`);
        if(friendItem){
            friendItem.dataset.isFriend = "false";
            friendItem.style.display = "block";
            updateAllUserItemButtons();
        }
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

            const ReceivedRequests = currentUserDoc.data().friendRequestsReceived || [];
            const requestToDelete = ReceivedRequests.find(req => req.from == senderId);
            if(requestToDelete)
            {
                transaction.update(currentUserRef, {
                    friendRequestsReceived: arrayRemove(requestToDelete),
                    friendIds: arrayUnion(senderId)
                });

                transaction.update(senderUserRef, {
                    friendRequestsSent: arrayRemove(currentUserUid),
                    friendIds: arrayUnion(currentUserUid)
                });
            }
        });

        showToast('친구 요청을 수락했습니다!', 'success');

        checkNoPendingRequests();
        const friendsButtonHtml = `<button class="bg-green-500 text-white px-3 py-1 rounded-md text-sm cursor-not-allowed" disabled>친구</button>`;


        //updateFriendRequestBadge();


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
                friendRequestsReceived: arrayRemove(senderId)
            });

            transaction.update(senderUserRef, {
                friendRequestsSent: arrayRemove(currentUserUid)
            });
        });

        showToast('친구 요청을 거절했습니다.', 'info');
        const listItemToRemove = document.getElementById(`request-${senderId}`);
        if (listItemToRemove) {
            listItemToRemove.remove();
        }
        checkNoPendingRequests();

        //updateFriendRequestBadge();

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
export async function openReceivedRequestDetailsModal(requesterId) {
    if (!receivedRequestDetailsModalOverlay) return;

    if (!requesterId) {
        console.error("requesterId가 유효하지 않습니다.");
        return;
    }


    receivedRequestDetailsModalOverlay.classList.remove('hidden');

    showToast("상대방 정보를 불러오는 중...", "info");

    try{
        const docRef = doc(db, "users", requesterId);
        const docSnap = await getDoc(docRef);

        if(!docSnap.exists()) {
            throw new Error("해당 사용자의 정보를 찾을 수 없습니다.");
        }
        const requesterData ={ id: docSnap.id, ...docSnap.data() };
        const receivedRequest = (currentUserData.friendRequestsReceived || []).find(req => req.from == requesterId);
        const message = receivedRequest ? receivedRequest.message : '메시지 없음';

        const ageLabel = getAgeGroupLabelFromBirthYear(requesterData.birthYear) || '나이 정보 없음';
        const userInfoText = `${getGenderLabel(requesterData.gender)}, ${ageLabel}, ${getRegionLabel(requesterData.region)}`;

        receivedRequestDetailsImg.src = currentUserData.profileImgUrl;
        receivedRequestDetailsImg.onerror = () => {
            receivedRequestDetailsImg.src  = getDefaultProfileImage(requesterData.gender);
        }
        receivedRequestDetailsNicknameText.textContent = requesterData.nickname;
        receivedRequestDetailsInfo.textContent = userInfoText;
        receivedRequestDetailsMessage.textContent = message || '메시지 없음';
        currentRequestSenderId = requesterId;
    } catch (error){
        console.error("받은 요청 모달 로딩 중 오류", error);
        showToast(error.message, "error");
        receivedRequestDetailsModalOverlay.classList.add('hidden');
    }


}
export async function deleteFriend(targetUid) {
    if (!currentUserUid || !targetUid) {
        showToast('사용자 정보가 부족하여 친구를 삭제할 수 없습니다.', 'error');
        return;
    }

    if (currentUserUid === targetUid) {
        showToast('자기 자신을 친구 목록에서 삭제할 수 없습니다.', 'error');
        return;
    }

    showToast("친구 삭제 중...", "info");

    try {
        const currentUserRef = doc(db, 'users', currentUserUid);
        const targetUserRef = doc(db, 'users', targetUid);

        await runTransaction(db, async (transaction) => {
            const currentUserDoc = await transaction.get(currentUserRef);
            const targetUserDoc = await transaction.get(targetUserRef);

            if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
                throw new Error("사용자 문서를 찾을 수 없습니다.");
            }

            // 내 friendIds 배열에서 상대방 UID 삭제
            transaction.update(currentUserRef, {
                friendIds: arrayRemove(targetUid)
            });

            // 상대방의 friendIds 배열에서 내 UID 삭제
            transaction.update(targetUserRef, {
                friendIds: arrayRemove(currentUserUid)
            });
        });

        showToast('친구를 성공적으로 삭제했습니다.', 'success');
        console.log(`친구 삭제: ${currentUserUid}가 ${targetUid}를 친구 목록에서 삭제함.`);

    } catch (error) {
        console.error("친구 삭제 오류:", error);
        let errorMessage = '친구 삭제 중 오류가 발생했습니다.';
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (error.message) {
            errorMessage = error.message;
        }
        showToast(errorMessage, 'error');
    }
}
function closeReceivedRequestDetailsModal() {
    if (receivedRequestDetailsModalOverlay) {
        receivedRequestDetailsModalOverlay.classList.add('hidden');
        currentRequestSenderId = null;
    }
}

// 이벤트 리스너 추가
if (receivedRequestDetailsCloseBtn) {
    receivedRequestDetailsCloseBtn.addEventListener('click', closeReceivedRequestDetailsModal);
}

if (acceptFromModalBtn) {
    acceptFromModalBtn.addEventListener('click', () => {
        if (currentRequestSenderId) {
            acceptFriendRequest(currentRequestSenderId);
            closeReceivedRequestDetailsModal();
        }
    });
}

if (declineFromModalBtn) {
    declineFromModalBtn.addEventListener('click', () => {
        if (currentRequestSenderId) {
            rejectFriendRequest(currentRequestSenderId);
            closeReceivedRequestDetailsModal();
        }
    });
}

if (friendRequestMessageModalCloseBtn) {
    friendRequestMessageModalCloseBtn.addEventListener('click', closeFriendRequestModal);
}
if (sendRequestCancelBtn) {
    sendRequestCancelBtn.addEventListener('click', closeFriendRequestModal);
}

if (sendRequestBtn) {
    sendRequestBtn.addEventListener('click', sendFriendRequest);
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