// 새 버전 자동 감지.
// GitHub Pages 는 HTML 을 10분간 캐시(max-age=600)해서 배포 후에도 예전 화면이 뜰 수 있다.
// 서버의 version.json 을 캐시 없이 읽어 내 빌드 ID 와 다르면, 캐시를 피하는 새 주소(?v=빌드ID)로 다시 연다.

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const GUARD_KEY = 'afk-yeonsu-update-tried';

async function check() {
  let latest: string;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    latest = ((await res.json()) as { build: string }).build;
  } catch (e) {
    console.warn('버전 확인 실패', e);
    return;
  }
  if (latest === __BUILD_ID__) return;

  // 같은 버전으로 이미 한 번 시도했는데도 예전 것이 뜨면(CDN 반영 지연) 반복하지 않는다
  try {
    if (sessionStorage.getItem(GUARD_KEY) === latest) return;
    sessionStorage.setItem(GUARD_KEY, latest);
  } catch {
    // 저장소를 못 쓰는 환경이면 가드 없이 진행
  }
  // 진행 상황은 beforeunload 에서 저장된다 (main.ts)
  const url = new URL(location.href);
  url.searchParams.set('v', latest);
  location.replace(url.toString());
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
