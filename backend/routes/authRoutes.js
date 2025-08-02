
const express = require('express');
const router = express.Router(); // express.Router()를 통해 라우터 객체를 초기화합니다.

// 필요한 Firebase 및 Azure 라이브러리 및 유틸리티 함수들을 불러옵니다.
const { db, admin, auth } = require('../config/firebaseAdmin');
const { getDefaultProfileImageUrl } = require('../config/defaultImages');
const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');

// 환경 변수 설정
const AZURE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_ACCOUNT_KEY = process.env.AZURE_STORAGE_ACCOUNT_KEY;
// ✅ 컨테이너 이름을 환경 변수에서 불러오도록 수정
const AZURE_CONTAINER_NAME = process.env.AZURE_CONTAINER_NAME;

// ❗ 추가된 유효성 검사: Azure 환경 변수가 설정되어 있는지 확인
if (!AZURE_ACCOUNT_NAME || !AZURE_ACCOUNT_KEY || !AZURE_CONTAINER_NAME) {
    console.error("Critical Error: Azure Storage Account Name, Key, or Container Name is not set in environment variables.");
    // 환경 변수 누락 시 모든 라우터에 500 에러를 반환
    router.use((req, res) => {
        res.status(500).json({ success: false, message: '서버 설정 오류: Azure 환경 변수가 설정되지 않았습니다.' });
    });
} else {
    // 1. 사용자 계정 생성 (UID 확보) 라우터
    router.post('/signup/create-user', async (req, res) => {
        try {
            const { email, password, gender, nickname } = req.body;

            // 필수 필드 유효성 검사
            if (!email || !password || !gender || !nickname) {
                return res.status(400).json({ success: false, message: '이메일, 비밀번호, 닉네임, 성별은 필수 입력 항목입니다.' });
            }

            // Firebase 사용자 계정 생성
            const userRecord = await auth.createUser({
                email: email.trim(),
                password: password,
                displayName: nickname.trim(),
                photoURL: getDefaultProfileImageUrl(gender)
            });

            const uid = userRecord.uid;
            console.log(`서버: Firebase 사용자 생성 성공 - UID: ${uid}`);

            // 성공 시 UID 반환
            return res.status(200).json({
                success: true,
                message: '사용자 계정이 성공적으로 생성되었습니다.',
                uid: uid
            });

        } catch (error) {
            console.error("서버: 사용자 계정 생성 중 오류 발생:", error);
            // Firebase Auth 오류 코드에 따라 에러 메시지 조정
            if (error.code === 'auth/email-already-exists') {
                return res.status(409).json({ success: false, message: '이미 사용 중인 이메일 주소입니다.' });
            }
            return res.status(500).json({ success: false, message: '계정 생성 중 오류가 발생했습니다.' });
        }
    });

    // 2. 프로필 이미지 업로드용 SAS 토큰 발급 라우터
    router.post('/signup/get-profile-sas-token', async (req, res) => {
        const { uid, blobPath } = req.body;

        if (!uid || !blobPath) {
            return res.status(400).json({ success: false, message: 'UID와 파일명이 필요합니다.' });
        }

        try {
            const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_ACCOUNT_NAME, AZURE_ACCOUNT_KEY);
            const blobServiceClient = new BlobServiceClient(`https://${AZURE_ACCOUNT_NAME}.blob.core.windows.net`, sharedKeyCredential);
            // ✅ 환경 변수에서 컨테이너 이름 사용
            const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

            // UID 기반의 폴더 경로 설정
            const blobName = blobPath;

            // SAS 토큰 옵션 설정
            const writeSasOptions = {
                containerName: AZURE_CONTAINER_NAME,
                blobName: blobName,
                permissions: BlobSASPermissions.from({ create: true, write: true }),
                expiresOn: new Date(new Date().valueOf() + 300 * 1000) 
            };
            console.log(`서버: UID ${uid}에 대한 SAS 토큰 발급 요청 - Blob 이름: ${sasOptions.blobName}`);
            console.log(`서버: SAS 토큰 만료 시간: ${sasOptions.expiresOn}`);
            console.log(`서버: SAS 토큰 권한: ${sasOptions.permissions.toString()}`);    
            console.log(`서버: Azure Storage 계정 이름: ${AZURE_ACCOUNT_NAME}`);
            console.log(`서버: Azure Storage 컨테이너 이름: ${AZURE_CONTAINER_NAME}`);  
            
            const writeSasToken = generateBlobSASQueryParameters(writeSasOptions, sharedKeyCredential).toString();

            const readSasOptions = {
                containerName: AZURE_CONTAINER_NAME,    
                blobName: blobName,
                permissions: BlobSASPermissions.from({ read: true }),
                expiresOn: new Date(new Date().valueOf() + 3600 *1000)
            };
            const readSasToken = generateBlobSSAQueryParameters(readSasOptions, sharedKeyCredential).toString();
            const blobUrl = containerClient.getBlobClient(blobName).url;

            console.log(`서버: UID ${uid}에 대한 SAS 토큰 발급 성공`);
            return res.status(200).json({
                success: true,
                message: 'SAS 토큰이 성공적으로 발급되었습니다.읽기/쓰기',
                writeSasToken: writeSasToken,
                readSasToken: readSasToken,
                blobUrl: blobUrl
            });

        } catch (error) {
            // ✅ 오류 객체 전체를 로깅하여 상세 정보를 확인합니다.
            console.error("서버: SAS 토큰 발급 중 오류 발생:", error);
            return res.status(500).json({ success: false, message: 'SAS 토큰 발급 중 오류가 발생했습니다.' });
        }
    });

    // 3. Firestore에 최종 정보 저장 라우터
    router.post('/signup/finalize', async (req, res) => {
        try {
            const { uid, nickname, birthYear, region, gender, minAgeGroup, maxAgeGroup, bio, profileImgUrl } = req.body;

            // 필수 필드 유효성 검사
            if (!uid || !nickname || !birthYear || !region || !gender || minAgeGroup === undefined || maxAgeGroup === undefined) {
                return res.status(400).json({ success: false, message: '필수 정보가 누락되었습니다.' });
            }

            // Firestore에 사용자 정보 저장
            await db.collection('users').doc(uid).set({
                nickname: nickname.trim(),
                birthYear: parseInt(birthYear),
                region: region.trim(),
                gender: gender,
                minAgeGroup: minAgeGroup,
                maxAgeGroup: maxAgeGroup,
                profileImgUrl: profileImgUrl,
                bio: bio ? bio.trim() : '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                friendIds: [],
                friendRequestsSent: [],
                friendRequestsReceived: []
            });

            // Firebase Auth의 photoURL도 최종 이미지 URL로 업데이트
            await auth.updateUser(uid, { photoURL: profileImgUrl });

            console.log(`서버: Firestore에 최종 사용자 정보 저장 성공 - UID: ${uid}`);

            return res.status(200).json({
                success: true,
                message: '회원가입이 완료되었습니다!',
                uid: uid
            });

        } catch (error) {
            console.error("서버: 최종 데이터 저장 중 오류 발생:", error);
            return res.status(500).json({ success: false, message: '최종 데이터 저장 중 오류가 발생했습니다.' });
        }
    });
}


// ⭐ 이 부분이 있어야 server.js에서 이 라우터를 import 할 수 있습니다.
module.exports = router;
