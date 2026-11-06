// 전체화면 + 가로 모드.
// 1) Fullscreen API 로 전체화면 → 2) screen.orientation.lock('landscape') 로 가로 고정 (안드로이드 크롬 등)
// 3) 그래도 세로로 들고 있으면(iPhone 사파리처럼 둘 다 미지원) CSS 로 화면 래퍼를 90도 돌린다.
//    가로 고정에 성공한 기기는 실제로 가로가 되므로 CSS 회전은 자동으로 적용되지 않는다.

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type LockableOrientation = ScreenOrientation & {
  lock?: (o: 'landscape') => Promise<void>;
  unlock?: () => void;
};

const doc = document as FsDocument;
const portraitQuery = window.matchMedia('(orientation: portrait)');

let active = false;
/** Fullscreen API 로 실제 전체화면에 들어갔는지 (iPhone 처럼 미지원이면 false) */
let fsEntered = false;

function fullscreenElement(): Element | null {
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** 브라우저에 따라 응답이 없을 수 있어 일정 시간 뒤 실패로 간주 */
function withTimeout(p: Promise<boolean>, ms = 1500): Promise<boolean> {
  return Promise.race([p, new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}

async function enterFullscreen(): Promise<boolean> {
  const el = document.documentElement as FsElement;
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else return false;
    return true;
  } catch (e) {
    console.warn('전체화면 요청 실패', e);
    return false;
  }
}

async function lockLandscape(): Promise<boolean> {
  const o = screen.orientation as LockableOrientation | undefined;
  if (!o?.lock) return false;
  try {
    await o.lock('landscape');
    return true;
  } catch (e) {
    console.warn('가로 고정 실패', e);
    return false;
  }
}

function applyRotation() {
  document.body.classList.toggle('force-landscape', active && portraitQuery.matches);
}

/** CSS 강제 회전 중인지 — 탭 좌표 변환에 사용 */
export function isRotated(): boolean {
  return document.body.classList.contains('force-landscape');
}

/** buttons: 전체화면 토글 버튼들 (상단 아이콘 + 세로 화면용 큰 버튼) */
export function setupFullscreen(buttons: HTMLButtonElement[]) {
  const sync = () => {
    document.body.classList.toggle('fullscreen-on', active);
    for (const b of buttons) {
      b.setAttribute('aria-label', active ? '전체화면 끝내기' : '전체화면');
      b.title = active ? '전체화면 끝내기' : '전체화면 (가로)';
    }
    applyRotation();
  };

  const toggle = async () => {
    if (!active) {
      // 화면 상태는 바로 반영하고, 전체화면/가로 고정은 가능한 만큼 시도
      active = true;
      sync();
      fsEntered = await withTimeout(enterFullscreen());
      if (fsEntered) await withTimeout(lockLandscape());
    } else {
      active = false;
      fsEntered = false;
      sync();
      (screen.orientation as LockableOrientation | undefined)?.unlock?.();
      if (fullscreenElement()) {
        try {
          if (doc.exitFullscreen) await doc.exitFullscreen();
          else await doc.webkitExitFullscreen?.();
        } catch (e) {
          console.warn('전체화면 종료 실패', e);
        }
      }
    }
  };
  for (const b of buttons) b.addEventListener('click', toggle);

  // 사용자가 ESC/뒤로가기로 전체화면을 빠져나간 경우 상태 정리 (전체화면 미지원이라 CSS 회전만 쓰는 경우는 해당 없음)
  const onFsChange = () => {
    if (!fullscreenElement() && active && fsEntered) {
      active = false;
      fsEntered = false;
      sync();
    }
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  portraitQuery.addEventListener('change', applyRotation);
  sync();
}
