// socketManager.js에서 필요한 함수들을 불러옵니다.
import { initializeSocket, joinChatRoom, sendChatMessage } from './socketIO.js';

// HTML 요소들을 가져옵니다.
const chatTabs = document.querySelector('.chat-tabs');
const chatRoomsContainer = document.querySelector('.chat-rooms');
const chatForm = document.querySelector('.chat-input-container');
const chatInput = chatForm.querySelector('.chat-input');

let activeRoomId = null;

// 임시 메시지 데이터베이스 (실제로는 서버에서 관리)
const messagesDatabase = {
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
export function openChatRoom(roomId, roomName) { //이미 만들어진 방을 사용할때 필요함
  // ⭐ socketManager.js의 joinChatRoom 함수를 사용
  joinChatRoom(roomId);

  if (!document.querySelector(`.chat-tab[data-room-id="${roomId}"]`)) {
    createChatTab(roomId, roomName);
  }

  let roomElement = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
  if (!roomElement) {
    roomElement = createChatRoomElement(roomId);
    chatRoomsContainer.appendChild(roomElement);
  }
  loadChatMessages(roomId);
}

function createChatTab(roomId, roomName) {
  const tab = document.createElement('div');
  tab.className = 'chat-tab';
  tab.dataset.roomId = roomId;
  tab.textContent = roomName;

  tab.addEventListener('click', () => {
    loadChatMessages(roomId);
  });

  chatTabs.appendChild(tab);
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
}

export function addMessageToRoom(messagesContainer, message, isSelf = false) {
  const msgElem = document.createElement('div');

  msgElem.textContent = message;

  if (isSelf) {
      msgElem.classList.add('self');
  }
  messagesContainer.appendChild(msgElem);

  requestAnimationFrame(() => scrollToBottom(messagesContainer));
}

function scrollToBottom(element) {
  if (element) {
    element.scrollTop = element.scrollHeight;
  }
}

// ----------------------------------------------------
// 페이지 로드 시
// ----------------------------------------------------
