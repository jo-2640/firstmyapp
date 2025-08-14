// socketManager.js에서 필요한 함수들을 불러옵니다.
import { joinChatRoom, sendChatMessage } from './socketIO.js';

// HTML 요소들을 가져옵니다.
export const chatTabs = document.querySelector('.chat-tabs');
const chatRoomsContainer = document.querySelector('.chat-rooms');
const chatForm = document.querySelector('.chat-input-container');
const chatInput = chatForm.querySelector('.chat-input');

let activeRoomId = null;

// 임시 메시지 데이터베이스 (실제로는 서버에서 관리)
export let messagesDatabase = {
  'user123': [
    { senderId: 'user123', text: '안녕하세요!' },
    { senderId: 'self', text: '네, 안녕하세요.' },
    { senderId: 'user123', text: '오늘 날씨가 좋네요.' },
  ],
  'user456': [
    { senderId: 'user456', text: '프로젝트는 잘 진행되고 있나요?' },
    { senderId: 'self', text: '네, 덕분에 잘 되고 있어요.' },
  ]
};

// ----------------------------------------------------
// 메시지 전송
// ----------------------------------------------------

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();

  if (message && activeRoomId) {
    // ⭐ socketManager.js의 sendChatMessage 함수를 사용
    console.log('클라이언트: 메시지 전송 시도');
    sendChatMessage(message, activeRoomId);
    chatInput.value = '';
    chatInput.focus();
  }
});

// ----------------------------------------------------
// 탭 생성 및 활성화
// ----------------------------------------------------
export function getDirectMessageRoomId(myUid, otherUid) //이건 최초생성시에 필요하다
{
    const uids = [myUid, otherUid].sort();
    return uids.join('_');

}


export function openChatRoom(roomId, roomName) {
  // 1. 채팅방 UI 요소가 없으면 새로 만듭니다.
  let roomElement = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
  if (!roomElement) {
    roomElement = createChatRoomElement(roomId);
    chatRoomsContainer.appendChild(roomElement);
  }

  // 2. 소켓 서버에 조인 요청
  joinChatRoom(roomId);

  // 3. UI 활성화 및 상태 업데이트
  document.querySelectorAll('.chat-tab').forEach(tab => tab.classList.remove('active', 'has-new-message'));
  document.querySelectorAll('.chat-room').forEach(room => room.classList.remove('active'));

  const activeTab = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.classList.remove('has-new-message'); // 알림 제거
  }
  roomElement.classList.add('active');
  activeRoomId = roomId;

  loadChatMessages(roomId);
}

export function createChatTab(roomId, roomName) {
  const tab = document.createElement('div');
  tab.className = 'chat-tab';
  tab.dataset.roomId = roomId;
  tab.textContent = roomName;

  // ⭐ 탭 클릭 시, 채팅방을 활성화하는 openChatRoom을 호출합니다.
  tab.addEventListener('click', () => {
    openChatRoom(roomId, roomName);
  });

  return tab; // 탭 요소를 반환
}

function createChatRoomElement(roomId) {
  const roomElement = document.createElement('div');
  roomElement.className = 'chat-room hidden';
  roomElement.dataset.roomId = roomId;

  const messagesElement = document.createElement('div');
  messagesElement.className = 'chat-messages';
  roomElement.appendChild(messagesElement);

  return roomElement;
}

// ----------------------------------------------------
// 메시지 로드 및 표시
// ----------------------------------------------------

function loadChatMessages(roomId) {
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.chat-room').forEach(room => {
    room.classList.remove('active');
  });

  const currentTab = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
  const currentChatRoom = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);

  if (currentTab) currentTab.classList.add('active');
  if (currentChatRoom) currentChatRoom.classList.add('active');

  activeRoomId = roomId;
  const chatMessagesElement = currentChatRoom.querySelector('.chat-messages');

  if (!chatMessagesElement) {
    console.error('채팅 메시지 영역을 찾을 수 없습니다.');
    return;
  }

  const messages = messagesDatabase[roomId] || [];
  chatMessagesElement.innerHTML = '';
  messages.forEach(msg => {
    addMessageToRoom(chatMessagesElement, msg.text, msg.senderId === 'self');
  });

  requestAnimationFrame(() => scrollToBottom(chatMessagesElement));

  if (currentTab) {
      currentTab.classList.add('active');
      currentTab.classList.remove('has-new-message');
  }

}

export function addMessageToRoom(messagesContainer, message, isSelf = false) {
  const msgElem = document.createElement('div');

  msgElem.textContent = message;
  msgElem.classList.add('chat-message');
  if (isSelf) {
      msgElem.classList.add('self');
  }
  messagesContainer.prepend(msgElem);

  requestAnimationFrame(() => scrollToBottom(messagesContainer));
    console.log('메시지 전송 직후 messagesDatabase 상태:', messagesDatabase);
}

function scrollToBottom(element) {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

// ----------------------------------------------------
// 페이지 로드 시
// ----------------------------------------------------
export function closeChatRoom(roomId) {
    // 1. 소켓 연결에서 방 나가기
    leaveChatRoom(roomId);

    // 2. UI 요소 제거
    const tabElement = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
    const roomElement = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
    if (tabElement) {
        tabElement.remove();
    }
    if (roomElement) {
        roomElement.remove();
    }

    // 3. 로컬 데이터베이스 정리
    if (messagesDatabase[roomId]) {
        delete messagesDatabase[roomId];
    }
    // localStorage도 사용하는 경우, 아래 코드 추가
    // localStorage.removeItem(`chat_room_${roomId}`);

    // ⭐⭐ 활성화된 채팅방이 없다면, activeRoomId를 초기화합니다.
    if (activeRoomId === roomId) {
        activeRoomId = null;
        // 다른 채팅방을 자동으로 열거나, 초기 화면을 보여주는 로직 추가
    }
}