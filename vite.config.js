import { defineConfig } from 'vite';

export default defineConfig({
  // 개발 서버 설정
  server: {
    host: true, // 로컬 네트워크에서 접근 허용 (선택 사항)
    port: 5173, // 포트 설정 (기본값)
  },
  // 빌드 관련 설정 (선택 사항이지만, 명시적으로 HTML 진입점을 지정하는 것이 좋습니다.)
  build: {
    outDir: 'dist', // 빌드 결과물이 저장될 폴더 (npm run build 시)
    rollupOptions: {
      input: {
        main: 'index.html', // ★★★ 이 부분을 명시적으로 지정합니다. ★★★
      },
        output: { // 이전에 제가 제안했던 부분입니다. 추가하는 것을 권장합니다.
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
  },
  esbuild: {
    // '.js' 확장자를 가진 모든 파일을 ES 모듈 (ESM)로 처리하도록 강제합니다.
    // 이를 통해 Vite의 내부 파서가 'export' 구문을 가진 '.js' 파일을 올바르게 인식하게 됩니다.
    loader: 'js',
    target: 'esnext', // 최신 JavaScript 문법을 지원하도록 설정합니다.
  },
});