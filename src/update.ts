// 새 버전 자동 감지.
// GitHub Pages 는 HTML·version.json 을 CDN 에서 최대 10분(max-age=600) 캐시하고, 쿼리스트링(?v=)도 캐시 키에서 무시한다.
// 그래서 "version.json 이 새 버전" + "지금 받은 index.html 이 새 번들을 가리킴" 을 둘 다 확인한 뒤에만 새로고침한다.
// CDN 이 아직 예전 HTML 을 주면 새로고침하지 않고 다음 확인 때 다시 본다 (예전엔 한 번 실패하면 그 세션 동안 멈춰 있었음).

const CHECK_INTERVAL_MS = 60 * 1000;
const BASE = import.meta.env.BASE_URL;

/** 현재 실행 중인 번들 파일명 (예: assets/index-AbC123.js) */
function currentBundle(): string | null {
  const s = document.querySelector<HTMLScriptElement>('script[type="module"][src*="assets/index-"]');
  return s?.getAttribute('src')?.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null;
}

let checking = false;
async function check() {
  if (checking) return;
  checking = true;
  try {
    const res = await fetch(`${BASE}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const latest = ((await res.json()) as { build: string }).build;
    if (latest === __BUILD_ID__) return;

    // 서버가 실제로 새 HTML 을 주는지 확인 (CDN 반영 전이면 다음 확인으로 미룸)
    const html = await (await fetch(`${BASE}?t=${Date.now()}`, { cache: 'no-store' })).text();
    const served = html.match(/assets\/index-[\w-]+\.js/)?.[0];
    const mine = currentBundle();
    if (!served || !mine || served === mine) return;

    // 진행 상황은 beforeunload 에서 저장된다 (main.ts). ?v= 는 브라우저 캐시를 피하는 용도
    const url = new URL(location.href);
    url.searchParams.set('v', latest);
    location.replace(url.toString());
  } catch (e) {
    console.warn('버전 확인 실패', e);
  } finally {
    checking = false;
  }
}

export function setupAutoUpdate() {
  if (!import.meta.env.PROD) return;
  void check();
  window.setInterval(check, CHECK_INTERVAL_MS);
  // 폰에서 앱을 다시 열었을 때(탭 복귀) 바로 확인
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
}
