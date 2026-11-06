import { defineConfig } from 'vite';

// GitHub Pages 는 https://<user>.github.io/AFK_Yeonsu/ 하위 경로로 서빙되므로 빌드(와 빌드 미리보기) 시 base 를 맞춘다
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/AFK_Yeonsu/' : '/',
}));
