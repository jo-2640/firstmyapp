// src/AzureSasTokenManager.js

import { SERVER_BASE_URL } from './constants.js';
import { showToast } from './utils.js';

// localStorage에 토큰 정보(토큰 값, 만료 시간)를 저장하고 가져오는 함수
export function setCachedSasToken(token, expiryTime) {
    localStorage.setItem('sasToken', token);
    localStorage.setItem('sasTokenExpiry', expiryTime);
}

export function getCachedSasToken() {
    const token = localStorage.getItem('sasToken');
    const expiryTime = localStorage.getItem('sasTokenExpiry');

    // 토큰이 존재하고, 아직 만료되지 않았다면 반환
    if (token && expiryTime && new Date(expiryTime) > new Date()) {
        return token;
    }
    return null;
}

// 백엔드 API를 통해 새로운 토큰을 가져오는 비동기 함수 (개선)
export async function fetchNewSasToken(uid, blobName) { // ✅ uid와 blobName을 인수로 받음
    try {
        const response = await fetch(`${SERVER_BASE_URL}/api/get-sas-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, blobName }) // ✅ 서버에 필요한 데이터를 전달
        });

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태 코드: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.token) {
            setCachedSasToken(data.token, data.expiry);
            return data.token;
        } else {
            console.error("새로운 SAS 토큰 가져오기 실패:", data.message);
            return null;
        }

    } catch (error) {
        console.error("새로운 SAS 토큰 가져오기 실패:", error.message);
        return null;
    }
}

// 최종적으로 사용할 SAS 토큰을 가져오는 함수
export async function getValidSasToken(uid) {
    let token = getCachedSasToken();

    if (token) {
        return token;
    }

    token = await fetchNewSasToken(uid);
    return token;
}