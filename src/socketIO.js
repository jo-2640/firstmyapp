// public/socketManager.js
console.log('socketManager.js 파일이 로드되었습니다!');
import { auth } from './firebase-init.js'; // ⭐⭐ auth 인스턴스를 import 합니다
import { addMessageToRoom,messagesDatabase, openChatRoom, createChatTab } from './chat.js';

let socket = null;

export async function getFreshToken() {
   const user = auth.currentUser;
   if (user) {
     // true 옵션을 사용하면 토큰이 만료되었을 때 강제로 새로고침하여 새 토큰을 받아옵니다.
     return await user.getIdToken(true);
   }
   return null;
 }
let isTokenRefreshing = false;
export function disconnectSocket() {
    if (socket) {
        socket.disconnect(); // ✅ 소켓 연결 종료 함수
        socket = null; // ✅ 소켓 객체 초기화
        console.log("Socket 연결이 끊어졌습니다.");
    }
}
// 소켓 연결을 시도하는 함수 (비동기)
export const initializeSocket = async (forceRefresh = false) => {
    if (socket) {
        return socket;
    }

    const user = auth.currentUser;
    if (!user) {
        console.error('사용자 인증 정보가 없습니다. 로그인을 확인하세요.');
        return;
    }

    let authToken;
    try {
        // ⭐ forceRefresh가 true일 때만 강제 새로고침
        authToken = await user.getIdToken(forceRefresh);
    } catch (error) {
        console.error('토큰을 가져오는 중 오류 발생:', error);
        return;
    }

    // 이전에 연결 시도한 소켓이 있다면 끊어주고 시작
    if (socket) {
        socket.disconnect();
    }

    socket = io('http://localhost:3000', {
        auth: {
            token: authToken,
        },
    });

    socket.on('connect', () => {
        console.log('소켓 서버에 연결되었습니다:', socket.id);
        isTokenRefreshing = false; // 연결 성공 시 상태 초기화
    });

    socket.on('connect_error', async (err) => {
        console.error('소켓 연결 오류:', err.message);

        // ⭐ 오류 메시지에 토큰 만료 내용이 포함되어 있고, 아직 새로고침을 시도하지 않았다면
        if (err.message.includes('auth/id-token-expired') && !isTokenRefreshing) {
            isTokenRefreshing = true;
            console.log('토큰이 만료되었습니다. 새 토큰으로 재연결 시도합니다.');
            // 새 토큰으로 다시 연결 시도 (재귀 호출)
            await initializeSocket(true);
        }
    });


    socket.on('chat message', (data) => {
        const { message, roomId, senderId } = data;
        console.log(`서버로부터 응답을 받음:`, data);

        const myUserId = localStorage.getItem('myUserId');
        const isSelf = senderId === myUserId;
        console.log(`myUserId: ${myUserId}`);

        const currentChatRoom = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
        if (currentChatRoom) {
            const chatMessagesElement = currentChatRoom.querySelector('.chat-messages');
            addMessageToRoom(chatMessagesElement, message, isSelf);
        } else {
            console.error(`메시지를 표시할 채팅방 [${roomId}]을 찾을 수 없습니다.`);
        }

        if(!messagesDatabase[roomId]){
            messagesDatabase[roomId] = [];
        }
        messagesDatabase[roomId].push({
            senderId,
            text: message,
        });
    });

    // ⭐⭐ 이중 중첩된 코드를 제거하고, 알림 로직을 올바르게 수정했습니다.
    socket.on('notify message', (data) => {
        const { roomId, senderName } = data;
        console.log(`[알림] 새 메시지가 도착했습니다: 방 ${roomId} - 발신자 ${senderName}`);

        // 탭이 없으면 생성하고, 있으면 기존 탭을 사용
        let chatTab = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
        if (!chatTab) {
            // createChatTab 함수는 탭 요소를 반환합니다.
            const newTab = createChatTab(roomId, senderName);
            document.querySelector('.chat-tabs').appendChild(newTab); // 탭을 화면에 추가
            chatTab = newTab; // 변수에 할당
        }

        // 탭이 존재한다면 알림 클래스를 추가
        if (chatTab) {
            chatTab.classList.add('has-new-message');
        }

        // 메시지를 로컬 데이터베이스에 저장하는 로직
        if (!messagesDatabase[roomId]) {
            messagesDatabase[roomId] = [];
        }
        messagesDatabase[roomId].push({
            senderId: data.senderId,
            text: data.message,
        });
    });

    return socket;
};

// 특정 채팅방에 참여하는 함수
export const joinChatRoom = (roomId) => {
    if (socket && roomId) {
        socket.emit('join room', roomId);
    }
};

export const leaveChatRoom = (roomId) => {
    if (socket && roomId) {
        socket.emit('leave room', roomId);
    }
};

// 메시지를 서버로 보내는 함수
export const sendChatMessage = (message, roomId) => {
    const senderId = localStorage.getItem('myUserId');
    if (socket && message && roomId && senderId) {
        socket.emit('chat message', { message, roomId, senderId });
    }
};