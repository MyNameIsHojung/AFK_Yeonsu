import './style.css';
import { EVENT, GENERATORS, STAGES, TAP_UPGRADE, type Expression } from './data';
import { Scene } from './scene';
import { isRotated, setupFullscreen } from './fullscreen';
import { setupAutoUpdate } from './update';
import { fmt, fmtDuration } from './format';
import {
  buyGenerator,
  buyTapUpgrade,
  checkEvolve,
  earn,
  generatorCost,
  load,
  powerPerSec,
  resetSave,
  save,
  tapUpgradeCost,
  tapValue,
} from './state';

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
};

const ui = {
  power: $('power'),
  pps: $('pps'),
  tap: $('tap'),
  stageLevel: $('stage-level'),
  stageName: $('stage-name'),
  stageDesc: $('stage-desc'),
  progressFill: $('progress-fill'),
  progressLabel: $('progress-label'),
  arena: $('arena'),
  yeonsu: $<HTMLButtonElement>('yeonsu'),
  eventBubble: $<HTMLButtonElement>('event-bubble'),
  shopList: $('shop-list'),
  resetBtn: $<HTMLButtonElement>('reset-btn'),
  fullscreenBtn: $<HTMLButtonElement>('fullscreen-btn'),
  fullscreenBig: $<HTMLButtonElement>('fullscreen-big'),
  screen: $('screen'),
  modal: $('modal'),
  modalImg: $<HTMLImageElement>('modal-img'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalOk: $<HTMLButtonElement>('modal-ok'),
};

const { state, offlineGain, offlineSec } = load();

const scene = new Scene({
  roomA: $('room-a'),
  roomB: $('room-b'),
  tint: $('fx-tint'),
  sunbeam: $('fx-sunbeam'),
  fxRoom: $('fx-room'),
  fxDust: $('fx-dust'),
  charWrap: $('char-wrap'),
  sprite: $('sprite'),
});

// ---------- 모달 ----------
const modalQueue: { title: string; body: string; img?: string; bg?: string }[] = [];
function showModal(title: string, body: string, img?: string, bg?: string) {
  modalQueue.push({ title, body, img, bg });
  if (ui.modal.classList.contains('hidden')) nextModal();
}
function nextModal() {
  const m = modalQueue.shift();
  if (!m) {
    ui.modal.classList.add('hidden');
    return;
  }
  ui.modalTitle.textContent = m.title;
  ui.modalBody.textContent = m.body;
  ui.modalImg.classList.toggle('hidden', !m.img);
  if (m.img) ui.modalImg.src = m.img;
  ui.modalImg.style.backgroundImage = m.bg ? `url(${m.bg})` : '';
  ui.modal.classList.remove('hidden');
}
ui.modalOk.addEventListener('click', nextModal);

// ---------- 캐릭터 ----------
function floatNumber(text: string, x: number, y: number) {
  const el = document.createElement('div');
  el.className = 'float-num';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  ui.arena.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function popAt(evt: PointerEvent | null, text: string) {
  const w = ui.arena.offsetWidth;
  const h = ui.arena.offsetHeight;
  if (!evt) return floatNumber(text, w / 2, h / 2);
  const rect = ui.arena.getBoundingClientRect();
  // 강제 가로(90도 회전) 중이면 화면 좌표를 무대 좌표로 되돌린다: 무대 x축 = 화면 아래쪽, y축 = 화면 왼쪽
  const x = isRotated() ? evt.clientY - rect.top : evt.clientX - rect.left;
  const y = isRotated() ? rect.right - evt.clientX : evt.clientY - rect.top;
  floatNumber(text, x, y - h * 0.05);
}

const TAP_EXPRESSIONS: Expression[] = ['happy', 'happy', 'surprised', 'pout'];
ui.yeonsu.addEventListener('pointerdown', (evt) => {
  const v = tapValue(state);
  earn(state, v);
  popAt(evt, `+${fmt(v)}`);
  scene.squish();
  if (Math.random() < 0.35) scene.showExpression(TAP_EXPRESSIONS[Math.floor(Math.random() * TAP_EXPRESSIONS.length)]);
  afterGain();
});

// ---------- 진화 ----------
function afterGain() {
  const evolved = checkEvolve(state);
  if (evolved === null) return;
  const st = STAGES[evolved];
  const flash = document.createElement('div');
  flash.className = 'flash';
  ui.screen.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());
  scene.setStage(evolved, true);
  showModal(`🎉 ${st.name}(으)로 성장!`, `${st.desc}\n모든 생산량 보너스가 올랐어요.`, st.img, st.room);
  save(state);
}

// ---------- 상점 ----------
interface ShopRow {
  btn: HTMLButtonElement;
  shown: boolean;
  wasLocked: boolean;
  name: HTMLElement;
  icon: HTMLElement;
  sub: HTMLElement;
  cost: HTMLElement;
  owned: HTMLElement;
}

function makeRow(onBuy: () => void): ShopRow {
  const btn = document.createElement('button');
  btn.className = 'shop-item hidden';
  btn.innerHTML = `
    <div class="shop-icon"></div>
    <div class="shop-info"><div class="shop-name"></div><div class="shop-sub"></div></div>
    <div class="shop-right"><div class="shop-cost"></div><div class="shop-owned"></div></div>`;
  btn.addEventListener('click', onBuy);
  ui.shopList.appendChild(btn);
  const q = (sel: string) => btn.querySelector(sel) as HTMLElement;
  btn.addEventListener('animationend', () => btn.classList.remove('appear', 'unlock'));
  return { btn, shown: false, wasLocked: true, icon: q('.shop-icon'), name: q('.shop-name'), sub: q('.shop-sub'), cost: q('.shop-cost'), owned: q('.shop-owned') };
}

const tapRow = makeRow(() => {
  if (buyTapUpgrade(state)) render();
});
tapRow.icon.textContent = TAP_UPGRADE.icon;
tapRow.name.textContent = TAP_UPGRADE.name;

const genRows = GENERATORS.map((g) => {
  const row = makeRow(() => {
    if (buyGenerator(state, g)) render();
  });
  return { g, row };
});

// ---------- 배고픈 연수 이벤트 ----------
let nextEventAt = 0;
let eventEndsAt = 0;
function scheduleEvent(now: number) {
  const span = EVENT.maxIntervalSec - EVENT.minIntervalSec;
  nextEventAt = now + (EVENT.minIntervalSec + Math.random() * span) * 1000;
}
ui.eventBubble.addEventListener('pointerdown', (evt) => {
  const reward = Math.max(EVENT.rewardMin, powerPerSec(state) * EVENT.rewardSec);
  earn(state, reward);
  popAt(evt, `🍗 +${fmt(reward)}`);
  scene.showExpression('happy');
  ui.eventBubble.classList.add('hidden');
  eventEndsAt = 0;
  scheduleEvent(Date.now());
  afterGain();
});

// ---------- 상점 순차 등장 ----------
let revealOrder = 0;
let initialReveal = true;
/** 행이 처음 보일 때 아래에서 튀어나오는 연출. 첫 화면에서는 순서대로 시차를 둔다 */
function reveal(row: ShopRow) {
  if (row.shown) return;
  row.shown = true;
  row.btn.classList.remove('hidden');
  row.btn.style.animationDelay = initialReveal ? `${revealOrder++ * 110}ms` : '0ms';
  row.btn.classList.add('appear');
}

// ---------- 렌더 ----------
function render() {
  ui.power.textContent = fmt(state.power);
  ui.pps.textContent = fmt(powerPerSec(state));
  ui.tap.textContent = fmt(tapValue(state));

  const st = STAGES[state.stage];
  ui.stageLevel.textContent = `Lv.${state.stage + 1}`;
  ui.stageName.textContent = st.name;
  ui.stageDesc.textContent = st.desc;
  const next = STAGES[state.stage + 1];
  if (next) {
    const ratio = (state.totalEarned - st.threshold) / (next.threshold - st.threshold);
    ui.progressFill.style.width = `${Math.min(100, ratio * 100)}%`;
    ui.progressLabel.textContent = `다음: ${next.name} (${fmt(state.totalEarned)} / ${fmt(next.threshold)})`;
  } else {
    ui.progressFill.style.width = '100%';
    ui.progressLabel.textContent = '최종 단계 도달!';
  }

  const tc = tapUpgradeCost(state);
  tapRow.btn.disabled = state.power < tc;
  tapRow.sub.textContent = '탭 +1';
  tapRow.cost.textContent = `💪 ${fmt(tc)}`;
  tapRow.owned.textContent = state.tapLevel > 0 ? `Lv.${state.tapLevel}` : '';
  reveal(tapRow);

  // 열린 항목 + 다음 잠긴 항목 1개(???)까지만 보여준다
  let teaserShown = false;
  for (const { g, row } of genRows) {
    const cost = generatorCost(state, g);
    const owned = state.owned[g.id] ?? 0;
    const locked = owned === 0 && state.totalEarned < g.baseCost / 2;
    if (locked && teaserShown) continue;
    if (locked) teaserShown = true;
    reveal(row);
    if (row.wasLocked && !locked && !initialReveal) {
      row.btn.style.animationDelay = '0ms';
      row.btn.classList.add('unlock');
    }
    row.wasLocked = locked;
    row.btn.classList.toggle('locked', locked);
    row.icon.textContent = locked ? '❔' : g.icon;
    row.name.textContent = locked ? '???' : g.name;
    row.sub.textContent = locked ? '좀 더 키우면 열려요' : `초당 +${fmt(g.pps)}`;
    row.cost.textContent = `💪 ${fmt(cost)}`;
    row.owned.textContent = owned > 0 ? `${owned}` : '';
    row.btn.disabled = locked || state.power < cost;
  }
  initialReveal = false;
}

// ---------- 루프 ----------
let last = performance.now();
let renderAcc = 0;
let saveAcc = 0;
function tick(nowPerf: number) {
  const dt = Math.min((nowPerf - last) / 1000, 8 * 3600);
  last = nowPerf;

  earn(state, powerPerSec(state) * dt);
  afterGain();

  const now = Date.now();
  if (eventEndsAt === 0 && now >= nextEventAt) {
    eventEndsAt = now + EVENT.durationSec * 1000;
    ui.eventBubble.classList.remove('hidden');
  } else if (eventEndsAt !== 0 && now >= eventEndsAt) {
    eventEndsAt = 0;
    ui.eventBubble.classList.add('hidden');
    scheduleEvent(now);
  }

  renderAcc += dt;
  if (renderAcc >= 0.1) {
    renderAcc = 0;
    render();
  }
  saveAcc += dt;
  if (saveAcc >= 5 && !resetting) {
    saveAcc = 0;
    save(state);
  }
  requestAnimationFrame(tick);
}

let resetting = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && !resetting) save(state);
});
window.addEventListener('beforeunload', () => {
  if (!resetting) save(state);
});

ui.resetBtn.addEventListener('click', () => {
  if (!confirm('정말 처음부터 다시 할까요? 모든 진행이 사라져요.')) return;
  resetting = true;
  resetSave();
  location.reload();
});

// ---------- 시작 ----------
setupFullscreen([ui.fullscreenBtn, ui.fullscreenBig]);
setupAutoUpdate();
Scene.preload();
checkEvolve(state);
scene.setStage(state.stage, false);
scheduleEvent(Date.now());
render();
if (offlineGain > 0 && offlineSec >= 60) {
  showModal('💤 연수가 혼자 컸어요', `${fmtDuration(offlineSec)} 동안\n💪 ${fmt(offlineGain)} 연수력을 모았어요!`);
}
requestAnimationFrame(tick);
