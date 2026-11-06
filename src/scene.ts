// 집 배경 장면: 방 전환, 캐릭터 프레임 애니메이션, 배경 효과, 현실 시간대 색감
import { EXPRESSION_MS, FRAMES, IDLE_SEQUENCE, STAGES, WANDER, frameImg, type Expression, type Frame, type RoomTime } from './data';

type RealTime = 'day' | 'evening' | 'night';

function realTimeOfDay(d = new Date()): RealTime {
  const h = d.getHours();
  if (h >= 7 && h < 17) return 'day';
  if (h >= 17 && h < 19) return 'evening';
  return 'night';
}

/** 배경에 그려진 시간대와 현실 시간대가 다를 때만 방 색감을 보정 (multiply) */
const TINT: Record<RoomTime, Record<RealTime, string>> = {
  day: { day: 'transparent', evening: 'rgba(255, 170, 110, 0.35)', night: 'rgba(80, 90, 165, 0.55)' },
  evening: { day: 'transparent', evening: 'transparent', night: 'rgba(110, 115, 185, 0.35)' },
  night: { day: 'transparent', evening: 'transparent', night: 'transparent' },
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

export interface SceneEls {
  roomA: HTMLElement;
  roomB: HTMLElement;
  tint: HTMLElement;
  sunbeam: HTMLElement;
  fxRoom: HTMLElement;
  fxDust: HTMLElement;
  charWrap: HTMLElement;
  sprite: HTMLElement;
}

export class Scene {
  private stage = -1;
  private activeRoom: HTMLElement;
  private frames = new Map<Frame, HTMLImageElement>();
  private current: Frame = 'idle';
  private seqIdx = 0;
  private seqTimer = 0;

  // 방 돌아다니기 상태
  private x = 50;
  private depth = 0.3;
  private target: { x: number; depth: number } | null = null;
  private walking = false;
  private lastStep = 0;

  constructor(private els: SceneEls) {
    this.activeRoom = els.roomA;
    this.spawnDust();
    this.updateTimeOfDay();
    window.setInterval(() => this.updateTimeOfDay(), 60_000);
    this.placeCharacter();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.scheduleWalk();
  }

  /** 모든 단계의 방/프레임 이미지를 미리 불러와 전환 시 깜빡임을 없앤다 */
  static preload() {
    STAGES.forEach((s, i) => {
      new Image().src = s.room;
      for (const f of FRAMES) new Image().src = frameImg(i, f);
    });
  }

  setStage(stage: number, animate: boolean) {
    if (stage === this.stage) return;
    this.stage = stage;
    const st = STAGES[stage];

    // 방 크로스페이드
    const first = !this.activeRoom.classList.contains('show');
    const next = first ? this.activeRoom : this.activeRoom === this.els.roomA ? this.els.roomB : this.els.roomA;
    next.style.backgroundImage = `url(${st.room})`;
    next.classList.add('show');
    if (!first) this.activeRoom.classList.remove('show');
    this.activeRoom = next;

    // 캐릭터 프레임 세트 교체
    this.els.sprite.replaceChildren();
    this.frames.clear();
    for (const f of FRAMES) {
      const img = document.createElement('img');
      img.src = frameImg(stage, f);
      img.alt = '';
      img.draggable = false;
      this.els.sprite.appendChild(img);
      this.frames.set(f, img);
    }
    this.frames.get('idle')!.alt = st.name;
    this.show('idle');
    this.restartIdle();

    this.els.charWrap.classList.toggle('aura', st.effects.some((e) => e.kind === 'sparkle'));
    if (animate) {
      this.els.charWrap.classList.remove('jump');
      void this.els.charWrap.offsetWidth;
      this.els.charWrap.classList.add('jump');
    }

    this.buildRoomEffects();
    this.updateTimeOfDay();
  }

  /** 탭 표정: 잠깐 보여주고 대기 루프로 복귀 */
  showExpression(e: Expression) {
    window.clearTimeout(this.seqTimer);
    this.show(e);
    this.seqTimer = window.setTimeout(() => this.restartIdle(), EXPRESSION_MS);
  }

  squish() {
    const s = this.els.sprite;
    s.classList.remove('squish');
    void s.offsetWidth;
    s.classList.add('squish');
  }

  private show(f: Frame) {
    this.frames.get(this.current)?.classList.remove('on');
    this.frames.get(f)!.classList.add('on');
    this.current = f;
  }

  private restartIdle() {
    window.clearTimeout(this.seqTimer);
    this.seqIdx = 0;
    this.stepIdle();
  }

  private stepIdle() {
    const [frame, ms] = IDLE_SEQUENCE[this.seqIdx];
    // 걷는 중엔 동작(act) 컷 대신 기본 자세 — 눈 깜빡임은 그대로
    this.show(this.walking && frame === 'act' ? 'idle' : frame);
    this.seqIdx = (this.seqIdx + 1) % IDLE_SEQUENCE.length;
    this.seqTimer = window.setTimeout(() => this.stepIdle(), ms);
  }

  // ---------- 방 돌아다니기 ----------
  private scheduleWalk() {
    window.setTimeout(() => this.startWalk(), rand(WANDER.restMin, WANDER.restMax) * 1000);
  }

  private startWalk() {
    // 너무 가까운 곳은 피해서 목적지 선택
    let tx = this.x;
    while (Math.abs(tx - this.x) < 12) tx = rand(WANDER.xMin, WANDER.xMax);
    this.target = { x: tx, depth: rand(0, 1) };
    this.walking = true;
    this.els.charWrap.classList.add('walking');
    this.els.charWrap.classList.toggle('facing-left', tx < this.x);
    if (this.current === 'act') this.show('idle');
    this.lastStep = performance.now();
    requestAnimationFrame((t) => this.walkStep(t));
  }

  private walkStep(now: number) {
    if (!this.target) return;
    // 탭이 숨겨졌다 돌아오면 dt 가 커지므로 상한을 둔다
    const dt = Math.min((now - this.lastStep) / 1000, 0.1);
    this.lastStep = now;

    const dx = this.target.x - this.x;
    const dd = (this.target.depth - this.depth) * 25; // 깊이 이동은 화면상 짧으므로 가중치
    const dist = Math.hypot(dx, dd);
    const step = WANDER.speed * dt;
    if (dist <= step) {
      this.x = this.target.x;
      this.depth = this.target.depth;
      this.target = null;
      this.walking = false;
      this.els.charWrap.classList.remove('walking');
      this.placeCharacter();
      this.scheduleWalk();
      return;
    }
    this.x += (dx / dist) * step;
    this.depth += (dd / dist) * step / 25;
    this.placeCharacter();
    requestAnimationFrame((t) => this.walkStep(t));
  }

  private placeCharacter() {
    const scale = 1 - this.depth * WANDER.depthShrink;
    const s = this.els.charWrap.style;
    s.left = `${this.x}%`;
    s.bottom = `${WANDER.bottom + this.depth * WANDER.depthRise}cqw`;
    s.width = `${WANDER.width * scale}cqw`;
  }

  private updateTimeOfDay() {
    if (this.stage < 0) return;
    const roomTime = STAGES[this.stage].roomTime;
    const real = realTimeOfDay();
    this.els.tint.style.backgroundColor = TINT[roomTime][real];
    this.els.sunbeam.classList.toggle('hidden', !(roomTime === 'day' && real === 'day'));
  }

  private spawnDust() {
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('div');
      d.className = 'dust';
      d.style.left = `${rand(5, 95)}%`;
      d.style.top = `${rand(25, 90)}%`;
      d.style.setProperty('--s', `${rand(0.2, 0.5).toFixed(2)}cqw`);
      d.style.setProperty('--d', `${rand(7, 13).toFixed(1)}s`);
      d.style.setProperty('--delay', `${-rand(0, 12).toFixed(1)}s`);
      d.style.setProperty('--dx', `${rand(-3, 3).toFixed(1)}cqw`);
      this.els.fxDust.appendChild(d);
    }
  }

  private buildRoomEffects() {
    const layer = this.els.fxRoom;
    layer.replaceChildren();
    for (const fx of STAGES[this.stage].effects) {
      if (fx.kind === 'lamp') {
        const el = document.createElement('div');
        el.className = 'fx-lamp';
        el.style.left = `${fx.x}%`;
        el.style.top = `${fx.y}%`;
        layer.appendChild(el);
      } else if (fx.kind === 'steam') {
        for (let i = 0; i < 3; i++) {
          const el = document.createElement('div');
          el.className = 'fx-steam';
          el.style.left = `${fx.x + (i - 1) * 1.5}%`;
          el.style.top = `${fx.y}%`;
          el.style.setProperty('--delay', `${i * 0.9}s`);
          el.style.setProperty('--dx', `${(i - 1) * 0.8}cqw`);
          layer.appendChild(el);
        }
      } else if (fx.kind === 'sparkle') {
        for (let i = 0; i < 12; i++) {
          const el = document.createElement('div');
          el.className = 'fx-sparkle';
          el.style.left = `${rand(5, 92)}%`;
          el.style.top = `${rand(4, 60)}%`;
          el.style.setProperty('--s', `${rand(0.8, 1.8).toFixed(1)}cqw`);
          el.style.setProperty('--d', `${rand(1.8, 3.4).toFixed(1)}s`);
          el.style.setProperty('--delay', `${-rand(0, 3).toFixed(1)}s`);
          layer.appendChild(el);
        }
      }
    }
  }
}
