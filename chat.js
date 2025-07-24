// chat.js
// 이 파일은 채팅 모달의 UI 및 메시지 전송/수신 로직을 담당합니다.

// script.js에서 필요한 함수와 변수를 가져옵니다.
import { showToast, currentUserData } from './script.js';

// HTML 요소 가져오기 (채팅 모달 관련)
const chatModalOverlay = document.getElementById('chat-modal-overlay');
const chatModalCloseBtn = document.getElementById('chat-modal-close-btn');
const chatPartnerName = document.getElementById('chat-partner-name');
const chatMessages = document.getElementById('chat-messages');
const chatMsgInput = document.getElementById('chat-msg-input');
const chatSendBtn = document.getElementById('chat-send-btn');

// 채팅을 위한 전역 변수
let currentChatPartnerId = null;
let currentChatPartnerNickname = null;

// --- 채팅 기능 ---

/**
 * 채팅 모달을 열고 대화 상대 정보를 설정합니다.
 * @param {string} partnerId - 대화 상대의 objectId
 * @param {string} partnerNickname - 대화 상대의 닉네임
 */
export function openChatModal(partnerId, partnerNickname) {
    currentChatPartnerId = partnerId;
    currentChatPartnerNickname = partnerNickname;
    chatPartnerName.textContent = partnerNickname;
    chatMessages.innerHTML = ''; // 이전 메시지 지우기

    // TODO: 여기에 Backendless에서 기존 메시지를 불러오고 실시간 리스너를 설정하는 로직 추가
    console.log(`${partnerNickname}님과의 채팅 시작. (ID: ${partnerId})`);
    chatMessages.innerHTML = '<p style="text-align: center; color: #666;">이전 메시지를 불러오는 중...</p>';
    // 예시: loadMessages(partnerId); // 실제 메시지 로드 함수 호출
    // 예시: setupRealtimeChatListener(partnerId); // 실시간 리스너 설정

    chatModalOverlay.classList.remove('hidden');
    chatMsgInput.focus();
}

/**
 * 채팅 모달을 닫고 채팅 관련 상태를 초기화합니다.
 */
function closeChatModal() {
    chatModalOverlay.classList.add('hidden');
    currentChatPartnerId = null;
    currentChatPartnerNickname = null;
    chatMessages.innerHTML = ''; // 메시지 영역 비우기

    // TODO: 여기에 실시간 리스너를 해제하는 로직 추가
    console.log('채팅 종료.');
}

/**
 * 메시지를 Backendless에 전송합니다. (현재는 콘솔 로그만)
 */
async function sendMessage() {
    const messageText = chatMsgInput.value.trim();
    if (!messageText || !currentChatPartnerId) {
        return;
    }

    console.log(`메시지 전송: To ${currentChatPartnerNickname}: ${messageText}`);
    // TODO: 여기에 Backendless Messages 테이블에 메시지를 저장하는 로직 추가
    // 예:
    // const messageObject = {
    //     senderId: currentUserData.objectId,
    //     receiverId: currentChatPartnerId,
    //     message: messageText,
    //     timestamp: new Date().toISOString()
    // };
    // await Backendless.Data.of('Messages').save(messageObject);

    // 메시지 입력 필드 초기화
    chatMsgInput.value = '';
    // TODO: 메시지 전송 후 UI에 즉시 반영 (displayMessage 함수 호출)
    // displayMessage({ message: messageText, senderId: currentUserData.objectId, timestamp: new Date() }, true);
}

/**
 * 채팅 메시지를 UI에 표시합니다. (현재는 placeholder)
 * @param {object} messageData - 메시지 데이터 (message, senderId, timestamp 등)
 * @param {boolean} isOwnMessage - 현재 사용자가 보낸 메시지인지 여부
 */
function displayMessage(messageData, isOwnMessage) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('chat-message');
    messageElement.classList.add(isOwnMessage ? 'my-message' : 'other-message');

    const sender = isOwnMessage ? '나' : currentChatPartnerNickname; // 또는 실제 닉네임 사용
    const time = new Date(messageData.timestamp).toLocaleTimeString(); // 시간 형식화

    messageElement.innerHTML = `
        <div class="message-sender">${sender} <span class="message-time">${time}</span></div>
        <div class="message-text">${messageData.message}</div>
    `;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // 스크롤 하단으로
}

// --- 이벤트 리스너 ---

// 채팅 모달 닫기 버튼
chatModalCloseBtn.addEventListener('click', closeChatModal);

// 채팅 메시지 전송 버튼
chatSendBtn.addEventListener('click', sendMessage);

// 엔터 키로 메시지 전송 (메시지 입력 필드에서)
chatMsgInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
