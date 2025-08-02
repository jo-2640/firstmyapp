const { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
const { AZURE_CONTAINER_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_ACCOUNT_NAME } = require('../config/env');
const express = require('express');
const router = express.Router();

router.post('/getProfileImgUrlWithSas' , async (req, res) =>{
    console.log("백엔드: 프로필 이미지 url 요청받음 Sas토큰발행, 요청 본문:", req.body);
    
    const{uid, profileImgUrl } = req.body;
    if(!profileImgUrl) {
        return res.status(400).json({ success: false, message:'프로필 이미지 URL이 존재하지 않습니다'});
    }

    try{
        const sharedKeyCredential = new StorageSharedKeyCredential(AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY);
        const blobServiceClient = new BlobServiceClient(`https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, sharedKeyCredential); 
        const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME)

        const url = new URL(profileImgUrl);
        const blobNameWithContainer = url.pathname.slice(1);
        const blobName = blobNameWithContainer.split('/').slice(1).join('/'); // 컨테이너 이름을 제외한 blob 이름

        if(!blobName){
            return res.status(400).json({ success: false, message: '유효한 blob 경로를 추출할 수없습니다.'});
        }
        const readSasOptions ={
            containerName: AZURE_CONTAINER_NAME,
            blobName: blobName,
            permissions: BlobSASPermissions.from({ read: true}),
            expiresOn: new Date(new Date().valueOf() +300 * 1000),
        };
        console.log(`서버: UID${uid}에 대한 SAS 토큰 발급 요청 - Blob 이름: ${readSasOptions.blobName}`);

        const readSasToken = generateBlobSASQueryParameters(readSasOptions, sharedKeyCredential).toString();
        const blobUrl = containerClient.getBlobClient(blobName).url;

        console.log(`서버: UID ${uid}에 대한 SAS 토큰 발급 성공`);
        return res.status(200).json({
            success: true,
            message: 'SAS 토큰이 성공적으로 발급되었습니다.',
            readSasToken: readSasToken,
            blobUrl: blobUrl
        });
    } catch (error) {
        console.error("서버: SAS 토큰 발급 중 오류 발생:", error);
        return res.status(500).json({ success: false, message: 'SAS 토큰 발급 중 오류가 발생했습니다.' });
    }
});
module.exports = router;