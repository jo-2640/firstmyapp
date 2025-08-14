console.log('socketManager.js 파일이 로드되었습니다!');
import { auth } from './firebase-init.js'; // ⭐⭐ auth 인스턴스를 import 합니다
import { addMessageToRoom, messagesDatabase, openChatRoom, createChatTab } from './chat.js';

let socket = null;

// ⭐ 서버 주소 환경 변수 사용
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;

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
    // ⭐ 이미 연결되어 있는 경우, 새로운 소켓을 만들지 않고 기존 소켓을 반환합니다.
    if (socket && socket.connected) {
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

    // ⭐ 소켓 인스턴스가 없거나 비활성 상태일 때만 새로 생성
    if (!socket || !socket.active) {
        socket = io(SERVER_BASE_URL, {
            auth: {
                token: authToken,
            },
            transports: ["websocket", "polling"],
        });
    } else {
        // ⭐ 이미 연결 시도 중인 소켓이 있다면, 인증 정보만 업데이트
        socket.auth = { token: authToken };
    }

    // ⭐⭐ 이벤트 리스너를 한 번만 등록하도록 기존 리스너를 먼저 제거
    socket.off('connect');
    socket.off('connect_error');
    socket.off('chat message');
    socket.off('notify message');


    socket.on('connect', () => {
        console.log('소켓 서버에 연결되었습니다:', socket.id);
        isTokenRefreshing = false; // 연결 성공 시 상태 초기화
    });

    socket.on('connect_error', async (err) => {
        console.error('소켓 연결 오류:', err.message);

        // ⭐ 토큰 만료 오류일 경우에만 재연결 로직 실행
        if (err.message.includes('auth/id-token-expired') && !isTokenRefreshing) {
            isTokenRefreshing = true;
            console.log('토큰이 만료되었습니다. 새 토큰으로 재연결을 시도합니다.');
            try {
                const newAuthToken = await getFreshToken();
                socket.auth = { token: newAuthToken }; // 소켓 인증 정보 업데이트
                socket.connect(); // 새 토큰으로 재연결
            } catch (refreshError) {
                console.error('토큰 재발급 실패:', refreshError);
                isTokenRefreshing = false;
                // 재발급 실패 시 더 이상 재연결 시도하지 않고 사용자에게 알리는 로직 추가 가능
            }
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

    socket.on('notify message', (data) => {
        const { roomId, senderName } = data;
        console.log(`[알림] 새 메시지가 도착했습니다: 방 ${roomId} - 발신자 ${senderName}`);

        let chatTab = document.querySelector(`.chat-tab[data-room-id="${roomId}"]`);
        if (!chatTab) {
            const newTab = createChatTab(roomId, senderName);
            document.querySelector('.chat-tabs').appendChild(newTab);
            chatTab = newTab;
        }

        if (chatTab) {
            chatTab.classList.add('has-new-message');
        }

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