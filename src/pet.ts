// 탱이: 연수를 졸졸 따라다니는 펫. 프레임 애니메이션 + 총총 걸음 + 보물 찾기/좋아함 반응
import { PET, PET_FRAMES, PET_IDLE_SEQUENCE, PET_STAGES, WANDER, petFrameImg, type PetFrame } from './data';

export interface PetEls {
  wrap: HTMLElement;
  sprite: HTMLElement;
}

export class Pet {
  private stage = -1;
  private frames = new Map<PetFrame, HTMLImageElement>();
  private current: PetFrame = 'idle';
  private seqIdx = 0;
  private seqTimer = 0;
  /** 보물 찾기/좋아함 같은 반응 프레임 재생 중 */
  private reacting = false;

  private x = 30;
  private depth = 0.3;
  private walking = false;
  private lastStep = 0;
  private running = false;

  constructor(
    private els: PetEls,
    private target: () => { x: number; depth: number },
  ) {}

  static preload() {
    PET_STAGES.forEach((_, i) => {
      for (const f of PET_FRAMES) new Image().src = petFrameImg(i, f);
    });
  }

  /** 단계 설정. -1 이면 숨김 (미입양) */
  setStage(stage: number, animate: boolean) {
    if (stage === this.stage) return;
    this.stage = stage;
    this.els.wrap.classList.toggle('hidden', stage < 0);
    if (stage < 0) return;

    this.els.sprite.replaceChildren();
    this.frames.clear();
    for (const f of PET_FRAMES) {
      const img = document.createElement('img');
      img.src = petFrameImg(stage, f);
      img.alt = '';
      img.draggable = false;
      this.els.sprite.appendChild(img);
      this.frames.set(f, img);
    }
    this.frames.get('idle')!.alt = PET_STAGES[stage].name;
    this.current = 'idle';
    this.frames.get('idle')!.classList.add('on');
    this.restartIdle();

    if (animate) {
      const w = this.els.wrap;
      w.classList.remove('jump');
      void w.offsetWidth;
      w.classList.add('jump');
    }
    if (!this.running) {
      // 처음 나타날 땐 연수 옆에서 시작
      const t = this.target();
      this.x = Math.max(8, t.x - PET.followGap);
      this.depth = t.depth;
      this.running = true;
      this.lastStep = performance.now();
      requestAnimationFrame((now) => this.step(now));
    }
    this.place();
  }

  /** 반응 프레임(좋아함/땅 파기)을 잠깐 보여주고 대기 루프로 복귀 */
  react(f: 'happy' | 'dig' | 'act', ms: number) {
    if (this.stage < 0) return;
    window.clearTimeout(this.seqTimer);
    this.reacting = true;
    this.show(f);
    this.seqTimer = window.setTimeout(() => {
      this.reacting = false;
      this.restartIdle();
    }, ms);
  }

  /** 무대 기준 탱이 머리 위 좌표 (px) — 숫자 띄우기용 */
  headPoint(): { x: number; y: number } {
    const w = this.els.wrap;
    return { x: w.offsetLeft, y: w.offsetTop + w.offsetHeight * 0.15 };
  }

  private show(f: PetFrame) {
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
    const [frame, ms] = PET_IDLE_SEQUENCE[this.seqIdx];
    // 걷는 중엔 꼬리 흔들기 컷 대신 기본 자세
    this.show(this.walking && frame === 'act' ? 'idle' : frame);
    this.seqIdx = (this.seqIdx + 1) % PET_IDLE_SEQUENCE.length;
    this.seqTimer = window.setTimeout(() => this.stepIdle(), ms);
  }

  /** 매 프레임: 연수 옆 자리로 따라간다 */
  private step(now: number) {
    const dt = Math.min((now - this.lastStep) / 1000, 0.1);
    this.lastStep = now;
    if (this.stage >= 0) {
      const t = this.target();
      // 지금 있는 쪽(왼/오)을 유지하며 연수와 일정 간격, 화면 밖으로는 안 나가게
      const side = this.x <= t.x ? -1 : 1;
      let gx = t.x + side * PET.followGap;
      if (gx < 8 || gx > 92) gx = t.x - side * PET.followGap;
      const dx = gx - this.x;
      const dd = t.depth - this.depth;
      // 땅 파는 중엔 제자리
      const shouldWalk = !this.reacting && Math.abs(dx) > 2.5;
      if (shouldWalk) {
        const stepLen = PET.speed * dt;
        this.x += Math.sign(dx) * Math.min(Math.abs(dx), stepLen);
        this.depth += Math.sign(dd) * Math.min(Math.abs(dd), dt * 0.8);
      }
      if (shouldWalk !== this.walking) {
        this.walking = shouldWalk;
        this.els.wrap.classList.toggle('walking', shouldWalk);
        if (shouldWalk && this.current === 'act') this.show('idle');
      }
      // 탱이 그림은 기본이 왼쪽을 봄 → 오른쪽으로 갈 때/연수가 오른쪽에 있을 때 반전
      const faceRight = shouldWalk ? dx > 0 : t.x > this.x;
      this.els.wrap.classList.toggle('facing-right', faceRight);
      this.place();
    }
    requestAnimationFrame((n) => this.step(n));
  }

  private place() {
    if (this.stage < 0) return;
    const scale = (1 - this.depth * WANDER.depthShrink) * PET_STAGES[this.stage].scale;
    const s = this.els.wrap.style;
    s.left = `${this.x}%`;
    s.bottom = `${WANDER.bottom + this.depth * WANDER.depthRise}cqw`;
    s.width = `${PET.width * scale}cqw`;
  }
}
