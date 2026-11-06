import './style.css';
import {
  AUTO_MULT,
  AUTO_MULT_UPGRADE,
  CRIT_CHANCE_UPGRADE,
  CRIT_MULT_UPGRADE,
  EVENT,
  FEED_QTY_MODES,
  GENERATORS,
  PET,
  PET_ADOPT_UPGRADE,
  PET_FEED_UPGRADE,
  PET_FRIEND_UPGRADE,
  PET_POKE_UPGRADE,
  PET_STAGES,
  PET_TREASURE_UPGRADE,
  PET_UNLOCK,
  REBIRTH,
  STAGES,
  TAP_UPGRADE,
  petFrameImg,
  type FeedQty,
  type Expression,
  type LeveledUpgrade,
} from './data';
import { Scene } from './scene';
import { Pet } from './pet';
import { isRotated, setupFullscreen } from './fullscreen';
import { setupAutoUpdate } from './update';
import { fmt, fmtDuration } from './format';
import {
  autoMultiplier,
  buyGenerator,
  buyUpgrade,
  buyUpgradeN,
  canRebirth,
  maxAffordable,
  rebirth,
  rebirthMultiplier,
  upgradeCostN,
  checkEvolve,
  critChance,
  critMultiplier,
  earn,
  generatorCost,
  isMaxed,
  load,
  petPokeIntervalSec,
  petMultiplier,
  petStage,
  petTreasureSeconds,
  petTreasureValue,
  powerPerSec,
  resetSave,
  rollTap,
  save,
  tapValue,
  upgradeCost,
  upgradeLevel,
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
  shopAuto: $('shop-auto'),
  shopTap: $('shop-tap'),
  shopPet: $('shop-pet'),
  tabAuto: $<HTMLButtonElement>('tab-auto'),
  tabTap: $<HTMLButtonElement>('tab-tap'),
  tabPet: $<HTMLButtonElement>('tab-pet'),
  pet: $<HTMLButtonElement>('pet'),
  resetBtn: $<HTMLButtonElement>('reset-btn'),
  fullscreenBtn: $<HTMLButtonElement>('fullscreen-btn'),
  fullscreenBig: $<HTMLButtonElement>('fullscreen-big'),
  screen: $('screen'),
  modal: $('modal'),
  modalImg: $<HTMLImageElement>('modal-img'),
  modalTitle: $('modal-title'),
  modalBody: $('modal-body'),
  modalOk: $<HTMLButtonElement>('modal-ok'),
  modalCancel: $<HTMLButtonElement>('modal-cancel'),
  rebirthBtn: $<HTMLButtonElement>('rebirth-btn'),
  rebirthBadge: $('rebirth-badge'),
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
const pet = new Pet({ wrap: $('pet-wrap'), sprite: $('pet-sprite') }, () => scene.charPos());

// ---------- 모달 ----------
interface ModalItem {
  title: string;
  body: string;
  img?: string;
  bg?: string;
  /** 있으면 확인/취소 창: 확인 시 호출 */
  onConfirm?: () => void;
}
const modalQueue: ModalItem[] = [];
let currentModal: ModalItem | null = null;
function showModal(title: string, body: string, img?: string, bg?: string) {
  modalQueue.push({ title, body, img, bg });
  if (ui.modal.classList.contains('hidden')) nextModal();
}
function showConfirm(title: string, body: string, onConfirm: () => void, img?: string, bg?: string) {
  modalQueue.unshift({ title, body, img, bg, onConfirm });
  nextModal();
}
function nextModal() {
  const m = modalQueue.shift() ?? null;
  currentModal = m;
  if (!m) {
    ui.modal.classList.add('hidden');
    return;
  }
  ui.modalCancel.classList.toggle('hidden', !m.onConfirm);
  ui.modalTitle.textContent = m.title;
  ui.modalBody.textContent = m.body;
  ui.modalImg.classList.toggle('hidden', !m.img);
  if (m.img) ui.modalImg.src = m.img;
  ui.modalImg.style.backgroundImage = m.bg ? `url(${m.bg})` : '';
  ui.modal.classList.remove('hidden');
}
ui.modalOk.addEventListener('click', () => {
  const m = currentModal;
  nextModal();
  m?.onConfirm?.();
});
ui.modalCancel.addEventListener('click', nextModal);

// ---------- 캐릭터 ----------
function floatNumber(text: string, x: number, y: number, crit = false, kind = '') {
  const el = document.createElement('div');
  el.className = ['float-num', crit ? 'crit' : '', kind].filter(Boolean).join(' ');
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  ui.arena.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function popAt(evt: PointerEvent | null, text: string, crit = false) {
  const w = ui.arena.offsetWidth;
  const h = ui.arena.offsetHeight;
  if (!evt) return floatNumber(text, w / 2, h / 2, crit);
  const rect = ui.arena.getBoundingClientRect();
  // 강제 가로(90도 회전) 중이면 화면 좌표를 무대 좌표로 되돌린다: 무대 x축 = 화면 아래쪽, y축 = 화면 왼쪽
  const x = isRotated() ? evt.clientY - rect.top : evt.clientX - rect.left;
  const y = isRotated() ? rect.right - evt.clientX : evt.clientY - rect.top;
  floatNumber(text, x, y - h * 0.05, crit);
}

/** 연수 머리 위 좌표 (탱이 자동 탭 숫자용) */
function charHeadPoint() {
  const w = document.getElementById('char-wrap')!;
  return { x: w.offsetLeft, y: w.offsetTop + w.offsetHeight * 0.2 };
}

/** 크리티컬 시 무대 흔들림 */
function shake() {
  ui.arena.classList.remove('shake');
  void ui.arena.offsetWidth;
  ui.arena.classList.add('shake');
}
ui.arena.addEventListener('animationend', (e) => {
  if (e.target === ui.arena) ui.arena.classList.remove('shake');
});

const TAP_EXPRESSIONS: Expression[] = ['happy', 'happy', 'surprised', 'pout'];
ui.yeonsu.addEventListener('pointerdown', (evt) => {
  const { value, crit } = rollTap(state);
  earn(state, value);
  scene.squish();
  if (crit) {
    popAt(evt, `크리티컬! +${fmt(value)}`, true);
    shake();
    scene.showExpression('surprised');
  } else {
    popAt(evt, `+${fmt(value)}`);
    if (Math.random() < 0.35) scene.showExpression(TAP_EXPRESSIONS[Math.floor(Math.random() * TAP_EXPRESSIONS.length)]);
  }
  afterGain();
});

// ---------- 탱이 ----------
ui.pet.addEventListener('pointerdown', (evt) => {
  evt.stopPropagation();
  const v = tapValue(state) * PET.tapShare;
  earn(state, v);
  popAt(evt, `💕 +${fmt(v)}`);
  pet.react('happy', PET.happyMs);
  afterGain();
});

let pokeAcc = 0;
let treasureAcc = 0;
/** 꼬리 콕콕(자동 탭)·보물 찾기 타이머 */
function petTick(dt: number) {
  if (petStage(state) < 0) return;
  const interval = petPokeIntervalSec(state);
  if (interval !== null) {
    pokeAcc += dt;
    if (pokeAcc >= interval) {
      pokeAcc = 0;
      const { value, crit } = rollTap(state);
      const v = value * petMultiplier(state);
      earn(state, v);
      pet.react('act', 450);
      scene.squish();
      const p = charHeadPoint();
      floatNumber(`🐾 ${crit ? '크리티컬! ' : ''}+${fmt(v)}`, p.x, p.y, crit, crit ? '' : 'pet-fx');
      if (crit) shake();
    }
  }
  if (state.petTreasureLevel > 0) {
    treasureAcc += dt;
    if (treasureAcc >= PET.treasureIntervalSec) {
      treasureAcc = 0;
      pet.react('dig', PET.digMs);
      window.setTimeout(() => {
        const v = petTreasureValue(state);
        earn(state, v);
        const p = pet.headPoint();
        floatNumber(`🦴 보물 발견! +${fmt(v)}`, p.x, p.y, false, 'pet-fx');
        afterGain();
      }, PET.digMs * 0.8);
    }
  }
}

/** 탱이 진화 확인 (먹이 구매 / 연수 진화 시) */
let shownPetStage = -1;
function checkPetStage(animate: boolean) {
  const k = petStage(state);
  if (k === shownPetStage) return;
  const prev = shownPetStage;
  shownPetStage = k;
  pet.setStage(k, animate);
  if (!animate || k < 0) return;
  const ps = PET_STAGES[k];
  if (prev < 0) {
    showModal('🐶 탱이가 집에 왔어요!', '연수 옆을 졸졸 따라다녀요.\n간식을 주면 쑥쑥 자라요.', petFrameImg(k, 'happy'), STAGES[state.stage].room);
  } else {
    showModal(`🐶 ${ps.name}(으)로 성장!`, `꼬리 콕콕이 더 세지고(×${petMultiplier(state).toFixed(2)}) 보물이 더 커졌어요.`, petFrameImg(k, 'happy'), STAGES[state.stage].room);
  }
}

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
  const rebirthHint = evolved === REBIRTH.minStage ? '\n♻ 이제 환생할 수 있어요! (오른쪽 위 버튼)' : '';
  showModal(`🎉 ${st.name}(으)로 성장!`, `${st.desc}\n모든 생산량 보너스가 올랐어요.${rebirthHint}`, st.img, st.room);
  // 연수가 커지면 막혀 있던 탱이 진화가 풀릴 수 있다
  checkPetStage(true);
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

// 탭: 자동 생산 / 클릭 강화
type TabId = 'auto' | 'tap' | 'pet';
let activeTab: TabId = 'auto';
const tabs: Record<TabId, { btn: HTMLButtonElement; list: HTMLElement }> = {
  auto: { btn: ui.tabAuto, list: ui.shopAuto },
  tap: { btn: ui.tabTap, list: ui.shopTap },
  pet: { btn: ui.tabPet, list: ui.shopPet },
};
function selectTab(id: TabId) {
  activeTab = id;
  for (const [k, t] of Object.entries(tabs) as [TabId, (typeof tabs)[TabId]][]) {
    t.btn.classList.toggle('active', k === id);
    t.list.classList.toggle('hidden', k !== id);
  }
  tabs[id].btn.classList.remove('has-new');
}
ui.tabAuto.addEventListener('click', () => selectTab('auto'));
ui.tabTap.addEventListener('click', () => selectTab('tap'));
ui.tabPet.addEventListener('click', () => selectTab('pet'));

function makeRow(tab: TabId, onBuy: () => void): ShopRow & { tab: TabId } {
  const btn = document.createElement('button');
  btn.className = 'shop-item hidden';
  btn.innerHTML = `
    <div class="shop-icon"></div>
    <div class="shop-info"><div class="shop-name"></div><div class="shop-sub"></div></div>
    <div class="shop-right"><div class="shop-cost"></div><div class="shop-owned"></div></div>`;
  btn.addEventListener('click', onBuy);
  tabs[tab].list.appendChild(btn);
  const q = (sel: string) => btn.querySelector(sel) as HTMLElement;
  btn.addEventListener('animationend', () => btn.classList.remove('appear', 'unlock'));
  return { tab, btn, shown: false, wasLocked: true, icon: q('.shop-icon'), name: q('.shop-name'), sub: q('.shop-sub'), cost: q('.shop-cost'), owned: q('.shop-owned') };
}

function makeUpgradeRow(tab: TabId, u: LeveledUpgrade) {
  const row = makeRow(tab, () => {
    if (!buyUpgrade(state, u)) return;
    if (tab === 'pet') checkPetStage(true);
    render();
  });
  row.icon.textContent = u.icon;
  row.name.textContent = u.name;
  return row;
}

const genRows = GENERATORS.map((g) => {
  const row = makeRow('auto', () => {
    if (buyGenerator(state, g)) render();
  });
  return { g, row };
});
const autoMultRow = makeUpgradeRow('auto', AUTO_MULT_UPGRADE);
const tapRow = makeUpgradeRow('tap', TAP_UPGRADE);
const critChanceRow = makeUpgradeRow('tap', CRIT_CHANCE_UPGRADE);
const critMultRow = makeUpgradeRow('tap', CRIT_MULT_UPGRADE);
const petAdoptRow = makeUpgradeRow('pet', PET_ADOPT_UPGRADE);
// 간식 주기: 카드 왼쪽 위 수량 버튼(×1/×10/×100/최대)으로 대량 구매
let feedQty: FeedQty = 1;
const feedCount = () => (feedQty === 'max' ? maxAffordable(state, PET_FEED_UPGRADE) : feedQty);
const petFeedRow = makeRow('pet', () => {
  if (!buyUpgradeN(state, PET_FEED_UPGRADE, feedCount())) return;
  checkPetStage(true);
  render();
});
petFeedRow.icon.textContent = PET_FEED_UPGRADE.icon;
petFeedRow.name.textContent = PET_FEED_UPGRADE.name;
const feedQtyChip = document.createElement('span');
feedQtyChip.className = 'qty-chip';
feedQtyChip.setAttribute('role', 'button');
feedQtyChip.title = '구매 수량 바꾸기';
petFeedRow.btn.appendChild(feedQtyChip);
feedQtyChip.addEventListener('click', (e) => {
  e.stopPropagation();
  feedQty = FEED_QTY_MODES[(FEED_QTY_MODES.indexOf(feedQty) + 1) % FEED_QTY_MODES.length];
  render();
});
const petPokeRow = makeUpgradeRow('pet', PET_POKE_UPGRADE);
const petTreasureRow = makeUpgradeRow('pet', PET_TREASURE_UPGRADE);
const petFriendRow = makeUpgradeRow('pet', PET_FRIEND_UPGRADE);

// ---------- 배고픈 연수 이벤트 ----------
let nextEventAt = 0;
let eventEndsAt = 0;
function scheduleEvent(now: number) {
  const span = EVENT.maxIntervalSec - EVENT.minIntervalSec;
  nextEventAt = now + (EVENT.minIntervalSec + Math.random() * span) * 1000;
}
ui.eventBubble.addEventListener('pointerdown', (evt) => {
  const reward = Math.max(EVENT.rewardMin * rebirthMultiplier(state), powerPerSec(state) * EVENT.rewardSec);
  earn(state, reward);
  popAt(evt, `🍗 +${fmt(reward)}`);
  scene.showExpression('happy');
  ui.eventBubble.classList.add('hidden');
  eventEndsAt = 0;
  scheduleEvent(Date.now());
  afterGain();
});

// ---------- 상점 순차 등장 ----------
const revealOrder: Record<TabId, number> = { auto: 0, tap: 0, pet: 0 };
let initialReveal = true;
/** 행이 처음 보일 때 아래에서 튀어나오는 연출. 첫 화면에서는 순서대로 시차를 둔다 */
function reveal(row: ShopRow & { tab: TabId }) {
  if (row.shown) return;
  row.shown = true;
  row.btn.classList.remove('hidden');
  row.btn.style.animationDelay = initialReveal ? `${revealOrder[row.tab]++ * 110}ms` : '0ms';
  row.btn.classList.add('appear');
  // 다른 탭에 새 항목이 생기면 빨간 점 (첫 화면 제외)
  if (!initialReveal && row.tab !== activeTab) tabs[row.tab].btn.classList.add('has-new');
}

/** 레벨형 업그레이드 카드 갱신 */
function renderUpgrade(row: ShopRow, u: LeveledUpgrade, sub: string) {
  const lv = upgradeLevel(state, u);
  const maxed = isMaxed(state, u);
  const cost = upgradeCost(state, u);
  row.sub.textContent = sub;
  row.cost.textContent = maxed ? 'MAX' : `💪 ${fmt(cost)}`;
  row.owned.textContent = lv > 0 ? `Lv.${lv}` : '';
  row.btn.disabled = maxed || state.power < cost;
}

const pct = (r: number) => `${Math.round(r * 100)}%`;

// ---------- 렌더 ----------
function render() {
  ui.power.textContent = fmt(state.power);
  ui.pps.textContent = fmt(powerPerSec(state));
  ui.tap.textContent = fmt(tapValue(state));

  ui.rebirthBadge.classList.toggle('hidden', state.rebirths === 0);
  ui.rebirthBadge.textContent = `♻ ${state.rebirths}회 · ×${fmt(rebirthMultiplier(state))}`;
  ui.rebirthBtn.classList.toggle('hidden', !canRebirth(state));

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

  // 클릭 강화 탭
  renderUpgrade(tapRow, TAP_UPGRADE, '탭 +1');
  reveal(tapRow);
  renderUpgrade(critChanceRow, CRIT_CHANCE_UPGRADE, `크리 확률 ${pct(critChance(state))}`);
  reveal(critChanceRow);
  // 한 방의 힘은 급소 찌르기를 한 번 산 뒤 등장
  if (state.critChanceLevel > 0) {
    renderUpgrade(critMultRow, CRIT_MULT_UPGRADE, `크리 배율 ×${critMultiplier(state).toFixed(1)}`);
    reveal(critMultRow);
  }

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
  // 탱이 탭: 입양 전엔 입양 카드만
  if (!state.petAdopted) {
    renderUpgrade(petAdoptRow, PET_ADOPT_UPGRADE, '연수의 단짝 강아지');
    reveal(petAdoptRow);
  } else {
    petAdoptRow.btn.classList.add('hidden');
    const k = petStage(state);
    const next = PET_STAGES[k + 1];
    let feedSub = `${PET_STAGES[k].name} · 최종 진화`;
    if (next) {
      feedSub = state.petLevel >= next.minLevel ? `진화하려면 연수 Lv.${k + 2} 필요` : `다음 진화 Lv.${next.minLevel}`;
    }
    const n = feedCount();
    const cost = upgradeCostN(state, PET_FEED_UPGRADE, Math.max(1, n));
    petFeedRow.sub.textContent = feedSub;
    petFeedRow.cost.textContent = `💪 ${fmt(cost)}`;
    petFeedRow.owned.textContent = `Lv.${state.petLevel}`;
    // disabled 를 쓰면 안쪽 수량 버튼도 안 눌리므로 클래스로 흐리게만 처리 (구매는 클릭 시 검사)
    petFeedRow.btn.classList.toggle('is-disabled', n === 0 || state.power < cost);
    feedQtyChip.textContent = feedQty === 'max' ? `최대 ${n}` : `×${feedQty}`;
    reveal(petFeedRow);
    const interval = petPokeIntervalSec(state);
    renderUpgrade(
      petPokeRow,
      PET_POKE_UPGRADE,
      interval === null ? `${PET.pokeBaseSec}초마다 자동 탭` : `${interval.toFixed(1)}초마다 탭×${petMultiplier(state).toFixed(2)}`,
    );
    reveal(petPokeRow);
    if (state.petLevel >= PET_UNLOCK.treasureLevel || state.petTreasureLevel > 0) {
      renderUpgrade(
        petTreasureRow,
        PET_TREASURE_UPGRADE,
        state.petTreasureLevel > 0 ? `${PET.treasureIntervalSec}초마다 생산 ${Math.round(petTreasureSeconds(state))}초치` : `${PET.treasureIntervalSec}초마다 보물`,
      );
      reveal(petTreasureRow);
    }
    if (state.petLevel >= PET_UNLOCK.friendLevel || state.petFriendLevel > 0) {
      renderUpgrade(petFriendRow, PET_FRIEND_UPGRADE, `모든 생산 +${Math.round(state.petFriendLevel * PET.friendPerLevel * 100)}%`);
      reveal(petFriendRow);
    }
  }

  // 전설의 기운은 전설 단계부터 등장
  if (state.stage >= AUTO_MULT.unlockStage) {
    renderUpgrade(autoMultRow, AUTO_MULT_UPGRADE, `자동 생산 ×${autoMultiplier(state).toFixed(2)}`);
    reveal(autoMultRow);
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
  petTick(dt);
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

ui.rebirthBtn.addEventListener('click', () => {
  if (!canRebirth(state)) return;
  const now = rebirthMultiplier(state);
  showConfirm(
    '♻ 환생할까요?',
    `연수력·단계·업그레이드·탱이까지 모든 진행이 처음으로 돌아가요.\n대신 모든 획득이 영원히 ×${fmt(now)} → ×${fmt(now * REBIRTH.perRebirth)}!`,
    () => {
      const next = rebirth(state);
      // state 객체를 그대로 교체 (beforeunload 저장도 새 상태로)
      for (const k of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[k];
      Object.assign(state, next);
      save(state);
      const flash = document.createElement('div');
      flash.className = 'flash';
      ui.screen.appendChild(flash);
      window.setTimeout(() => location.reload(), 450);
    },
  );
});

ui.resetBtn.addEventListener('click', () => {
  if (!confirm('정말 처음부터 다시 할까요? 환생 기록까지 모든 진행이 사라져요.')) return;
  resetting = true;
  resetSave();
  location.reload();
});

// ---------- 시작 ----------
setupFullscreen([ui.fullscreenBtn, ui.fullscreenBig]);
setupAutoUpdate();
Scene.preload();
Pet.preload();
checkEvolve(state);
scene.setStage(state.stage, false);
checkPetStage(false);
scheduleEvent(Date.now());
render();
if (state.justReborn) {
  state.justReborn = false;
  save(state);
  showModal(`♻ ${state.rebirths}번째 환생!`, `아기 연수로 다시 시작해요.\n이제 모든 획득 ×${fmt(rebirthMultiplier(state))}`, STAGES[0].img, STAGES[0].room);
}
if (offlineGain > 0 && offlineSec >= 60) {
  showModal('💤 연수가 혼자 컸어요', `${fmtDuration(offlineSec)} 동안\n💪 ${fmt(offlineGain)} 연수력을 모았어요!`);
}
requestAnimationFrame(tick);
