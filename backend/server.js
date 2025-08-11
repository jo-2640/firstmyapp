// backend/server.js
const express = require('express');
const cors = require('cors');
const http = require('http');            // 수정
const { Server } = require('socket.io'); // 수정
// 1. 환경 설정 및 서비스 초기화 모듈 로드
// 이 모듈들은 자체적으로 초기화 로직을 실행하거나 필요한 인스턴스를 내보냅니다.
require('./config/env');          // 환경 변수 로드 및 유효성 검사 (앱 전역에서 사용)
require('./config/firebaseAdmin'); // Firebase Admin SDK 초기화
require('./config/azureStorage');  // Azure Storage 클라이언트 초기화 및 컨테이너 준비

// 2. API 라우트 모듈 불러오기
// 각 파일은 특정 기능 그룹의 API 엔드포인트를 정의합니다.
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const storageRoutes = require('./routes/storageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userInfoRoutes = require('./routes/userInfoRoutes');
const app = express();
const port = process.env.PORT || 3000; // 환경 변수에서 포트 가져오기

// 3. 공통 미들웨어 설정
// 모든 요청에 대해 CORS 및 JSON 본문 파싱을 활성화합니다.
const corsOptions = {
    origin: 'http://localhost:5173', // 프론트엔드 (Vite) 개발 서버 주소
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    credentials: true,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
app.use(express.json()); // 요청 본문을 JSON으로 파싱

// 4. API 라우트 연결
// 각 라우트 모듈을 '/api' 경로 접두사 아래에 마운트합니다.
app.use('/api', authRoutes);    // 예: /signup/finalize
app.use('/api', userRoutes);    // 예: /api/getBirthYearRange
app.use('/api', storageRoutes); // 예: /api/getBlobSasToken
app.use('/api', adminRoutes);   // 예: /api/delete-all-data
app.use('/api', userInfoRoutes); // 예: /api/getProfileImageUrl 
// 5. 서버 시작


const server = http.createServer(app);
const io = new Server(server, {
    cors:{
        origin: "*",
    }
}); 
// 여기서 io 이벤트 핸들러 등록 가능
io.on('connection', (socket) => {
  console.log('새 클라이언트 접속:', socket.id);

  // 예) 메시지 이벤트 처리
  socket.on('chat message', (msg) => {
    console.log('메시지 받음:', msg);
    io.emit('chat message', msg); // 모든 클라이언트에 메시지 전달
  });

  socket.on('disconnect', () => {
    console.log('클라이언트 접속 종료:', socket.id);
  });
});
server.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`); 
    console.log(`애플리케이션이 성공적으로 초기화되었습니다.`);
    // 개발 편의를 위한 주요 엔드포인트 로그
    console.log(`주요 API 엔드포인트:`);
    console.log(`  POST/signup/finalize`);
    console.log(`  POST /signup/create-user`);
    console.log(`  POST /signup/get-profile-sas-token`);
    console.log(`  GET /api/getBirthYearRange`);
    console.log(`  POST /api/getBlobSasToken`);
    console.log(`  POST /api/getProfileImageUrl`);
    console.log(`  POST /api/delete-all-data`);
    console.log(`  POST /api/cuarrent-year`);
    console.log(`  POST /api/getProfileImageUrl`);
    console.log(new Date().toUTCString())
    
});