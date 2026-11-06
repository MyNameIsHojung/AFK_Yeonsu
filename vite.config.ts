import { defineConfig, type Plugin } from 'vite';

// 빌드마다 고유 ID. 앱에 박아 넣고(__BUILD_ID__) dist/version.json 으로도 내보내서
// 실행 중인 앱이 서버의 최신 버전과 비교해 자동 새로고침할 수 있게 한다 (src/update.ts)
const buildId = new Date().toISOString().replace(/\D/g, '').slice(0, 14);

const versionJson: Plugin = {
  name: 'version-json',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) });
  },
};

// GitHub Pages 는 https://<user>.github.io/AFK_Yeonsu/ 하위 경로로 서빙되므로 빌드(와 빌드 미리보기) 시 base 를 맞춘다
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/AFK_Yeonsu/' : '/',
  define: { __BUILD_ID__: JSON.stringify(command === 'build' ? buildId : 'dev') },
  plugins: [versionJson],
}));
