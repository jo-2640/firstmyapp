//src/chat.js

const chatTabs = document.querySelector('.chat-tabs');
const chatRooms = document.querySelector('.chat-room');

let activeRoomId = null;

function createChatTab(friendId, friendName) {
  if (document.querySelector(`.chat-tab[data-room-id="${friendId}"]`)) return;

  const tab = document.createElement('button');
  tab.className = 'chat-tab';
  tab.dataset.roomId = friendId;
  tab.textContent = friendName;

  tab.addEventListener('click', () => {
    activateRoom(friendId);
  });

  chatTabs.appendChild(tab);
}
export function openChatRoom(friendId, friendName){
  if(document.querySelector(`.chat-tab[data-room-id="${friendId}"]`)){
      activateRoom(friendId);
      return;
  }

  createChatTab(friendId, friendName);

  // 채팅방 생성
  const room = document.createElement('div');
  room.className = 'chat-room';
  room.dataset.roomId = friendId;
  room.innerHTML = `
    <div class="messages"></div>
    <input type="text" class="chat-input" placeholder="메시지를 입력하고 Enter" />
  `;
  chatRooms.appendChild(room);

  room.querySelector('.chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
      sendMessage(friendId, e.target.value.trim());
      e.target.value = '';
    }
  });

  activateRoom(friendId);
}


function activateRoom(roomId) {
  // 탭 활성화 처리
  document.querySelectorAll('.chat-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.roomId === roomId);
  })
  document.querySelectorAll('.chat-room').forEach(room => {
      room.classList.toggle('active', room.dataset.roomId === roomId);
    })

  activeRoomId = roomId;
}
function sendMessage(roomId, message) {
  console.log(`방 ${roomId}에 메시지 전송:`, message);
  // TODO: socket.io로 서버에 보내기

  // 일단 화면에 바로 표시 (자기 메시지)
  addMessageToRoom(roomId, message, true);
}

function addMessageToRoom(roomId, message, isSelf = false) {
  const room = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
  if (!room) return;

  const messagesDiv = room.querySelector('.messages');
  const msgElem = document.createElement('div');
  msgElem.className = 'message' + (isSelf ? ' self' : '');
  msgElem.textContent = message;

  messagesDiv.appendChild(msgElem);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}