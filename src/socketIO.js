// public/socketManager.js
console.log('socketManager.js 파일이 로드되었습니다!'); // ⭐ 이 코드를 맨 위에 추
import { addMessageToRoom } from './chat.js';

let socket = null;

// 소켓 연결을 시작하고 이벤트 리스너를 설정하는 함수
export const initializeSocket = () => {
    // 이미 연결되어 있으면 다시 연결하지 않음
    if (socket) {
        return socket;
    }
    console.log('소켓 연결 초기화 중...'); // ⭐ 이 로그를 추가하세요.
    const authToken = localStorage.getItem('authToken');
    console.log('클라이언트에서 보낼 토큰:', authToken); // ⭐ 보내기 전 토큰을 확인
    socket = io('http://localhost:3000',{
        auth: {
            token: authToken,
        },
    });

    // 연결 성공 시
    socket.on('connect', () => {
        console.log('소켓 서버에 연결되었습니다:', socket.id);
    });

    // 서버로부터 'chat message' 이벤트를 받을 때
    socket.on('chat message', (data) => {
        // ⭐ 문제 해결: 서버가 보낸 data 객체(messagePayload)에서 바로 속성을 가져옵니다.
        const { message, roomId, senderId, senderName } = data;

        console.log(`서버로부터 응답을 받음:`, data); // 로그도 data 객체 전체를 출력하도록 수정

        // ⭐⭐ senderId와 myUserId를 비교하여 isSelf를 판단합니다.
        const myUserId = localStorage.getItem('myUserId');
        const isSelf = senderId === myUserId;

        const currentChatRoom = document.querySelector(`.chat-room[data-room-id="${roomId}"]`);
        if (currentChatRoom) {
            const chatMessagesElement = currentChatRoom.querySelector('.chat-messages');
            addMessageToRoom(chatMessagesElement, message, isSelf);
        } else {
            console.error(`메시지를 표시할 채팅방 [${roomId}]을 찾을 수 없습니다.`);
        }
    });

    socket.on('notify message', (data) => {
        // ⭐ 서버가 보낸 모든 데이터를 destructuring 합니다.
        const { roomId, senderId, senderName, message } = data;

        // ⭐ 콘솔 로그를 더 명확하게 수정했습니다.
        console.log(`[알림] 새 메시지가 도착했습니다: 방 ${roomId} - 발신자 ${senderName}`);

        // 이 부분에 알림 UI를 띄우는 로직을 추가할 수 있습니다.
        // 예를 들어, 화면 상단에 토스트 알림을 표시하는 등의 기능
    });
    // 연결 종료 시
    socket.on('disconnect', () => {
        console.log('소켓 연결이 종료되었습니다.');
    });

    return socket;
};

// 특정 채팅방에 참여하는 함수
export const joinChatRoom = (roomId) => {
    if (socket && roomId) {
        socket.emit('join room', roomId);
    }
};

// 메시지를 서버로 보내는 함수
export const sendChatMessage = (message, roomId) => {
    if (socket && message && roomId) {
        socket.emit('chat message', { message, roomId });
    }
};