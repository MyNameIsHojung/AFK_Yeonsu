// 게임 수치 데이터. 캐릭터 이미지는 scripts/genImages.sh (Codex) 로 생성.

// BASE_URL: 개발 서버는 '/', GitHub Pages 빌드는 '/AFK_Yeonsu/' (vite.config.ts)
const ART = `${import.meta.env.BASE_URL}assets/yeonsu`;
const BG = `${import.meta.env.BASE_URL}assets/bg`;

/** 배경 그림에 그려진 시간대 (현실 시간 색감 보정에 사용) */
export type RoomTime = 'day' | 'evening' | 'night';

/** 방별 소품 효과. x/y 는 배경 이미지(정사각) 기준 % 위치 */
export type RoomEffect =
  | { kind: 'lamp'; x: number; y: number }
  | { kind: 'steam'; x: number; y: number }
  | { kind: 'sparkle' };

export interface Stage {
  name: string;
  desc: string;
  /** 누적 획득 연수력이 이 값 이상이면 도달 */
  threshold: number;
  img: string;
  room: string;
  roomTime: RoomTime;
  effects: RoomEffect[];
  /** 캐릭터 금빛 오라 (CSS) */
  aura?: boolean;
}

export const STAGES: Stage[] = [
  { name: '아기 연수', desc: '젖병만 있으면 행복해요', threshold: 0, img: `${ART}/stage1.png`, room: `${BG}/room1.png`, roomTime: 'day', effects: [] },
  { name: '초딩 연수', desc: '책가방이 몸보다 커요', threshold: 500, img: `${ART}/stage2.png`, room: `${BG}/room2.png`, roomTime: 'day', effects: [] },
  {
    name: '수험생 연수', desc: '머리띠 질끈, 오늘도 밤샘', threshold: 10_000, img: `${ART}/stage3.png`, room: `${BG}/room3.png`, roomTime: 'night',
    effects: [{ kind: 'lamp', x: 37, y: 28 }],
  },
  {
    name: '직장인 연수', desc: '월요일이 너무 빨리 와요', threshold: 200_000, img: `${ART}/stage4.png`, room: `${BG}/room4.png`, roomTime: 'evening',
    effects: [{ kind: 'steam', x: 55, y: 34 }],
  },
  { name: '헬창 연수', desc: '3대 500을 향하여', threshold: 5_000_000, img: `${ART}/stage5.png`, room: `${BG}/room5.png`, roomTime: 'day', effects: [] },
  {
    name: '전설의 연수', desc: '모두가 우러러보는 그 이름', threshold: 100_000_000, img: `${ART}/stage6.png`, room: `${BG}/room6.png`, roomTime: 'night',
    effects: [{ kind: 'sparkle' }], aura: true,
  },
  {
    name: '우주 연수', desc: '지구가 내 방 창문 밖에', threshold: 3_000_000_000, img: `${ART}/stage7.png`, room: `${BG}/room7.png`, roomTime: 'night',
    effects: [{ kind: 'sparkle' }],
  },
  {
    name: '연수신', desc: '구름 위에서 세상을 보살펴요', threshold: 100_000_000_000, img: `${ART}/stage8.png`, room: `${BG}/room8.png`, roomTime: 'day',
    effects: [{ kind: 'sparkle' }], aura: true,
  },
  {
    name: '차원을 넘은 연수', desc: '은하 하나쯤은 손바닥 위에', threshold: 3_000_000_000_000, img: `${ART}/stage9.png`, room: `${BG}/room9.png`, roomTime: 'night',
    effects: [{ kind: 'sparkle' }], aura: true,
  },
];

/** 단계가 하나 오를 때마다 모든 생산량 +50% */
export const STAGE_BONUS_PER_LEVEL = 0.5;

export const EXPRESSIONS = ['happy', 'surprised', 'pout'] as const;
export type Expression = (typeof EXPRESSIONS)[number];

/** 캐릭터 프레임 종류: 대기(idle/blink/act) + 탭 표정 */
export type Frame = 'idle' | 'blink' | 'act' | Expression;
export const FRAMES: Frame[] = ['idle', 'blink', 'act', ...EXPRESSIONS];

/** 단계별 프레임 이미지 (해당 단계 의상 그대로) */
export function frameImg(stage: number, f: Frame): string {
  return f === 'idle' ? STAGES[stage].img : `${ART}/stage${stage + 1}_${f}.png`;
}

/** 대기 애니메이션 순서 (프레임, 유지 ms) — 손그림 애니메이션처럼 불규칙한 박자 */
export const IDLE_SEQUENCE: [Frame, number][] = [
  ['idle', 1600],
  ['act', 700],
  ['idle', 1300],
  ['blink', 140],
  ['idle', 2200],
  ['blink', 120],
  ['idle', 160],
  ['blink', 120],
];

/** 탭 표정 유지 시간 */
export const EXPRESSION_MS = 650;

/** 방 돌아다니기 (총총 걸음). x 는 무대 폭 %, depth 0=앞(크게) ~ 1=뒤(작게) */
export const WANDER = {
  xMin: 20,
  xMax: 80,
  /** 앞쪽일 때 캐릭터 폭(cqw)과 바닥 위치(cqw) */
  width: 26,
  bottom: 10.5,
  /** 가장 뒤쪽일 때: 바닥이 이만큼 올라가고 크기가 이만큼 줄어든다 */
  depthRise: 3.5,
  depthShrink: 0.12,
  /** 걷는 속도 (무대 폭 %/초) */
  speed: 9,
  /** 멈춰 있는 시간 (초) */
  restMin: 2.5,
  restMax: 6,
};

export interface Generator {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  /** 1개당 초당 생산량 */
  pps: number;
}

export const GENERATORS: Generator[] = [
  { id: 'snack', name: '간식 먹이기', icon: '🍙', baseCost: 15, pps: 0.1 },
  { id: 'nap', name: '낮잠 재우기', icon: '😴', baseCost: 100, pps: 1 },
  { id: 'youtube', name: '유튜브 시청', icon: '📺', baseCost: 1_100, pps: 8 },
  { id: 'study', name: '공부하기', icon: '📚', baseCost: 12_000, pps: 47 },
  { id: 'gym', name: '운동하기', icon: '🏋️', baseCost: 130_000, pps: 260 },
  { id: 'meditate', name: '명상하기', icon: '🧘', baseCost: 1_400_000, pps: 1_400 },
];

export const COST_GROWTH = 1.15;

/** 레벨형 업그레이드. 가격 = baseCost × growth^현재레벨 */
export interface LeveledUpgrade {
  id: UpgradeId;
  name: string;
  icon: string;
  baseCost: number;
  growth: number;
  maxLevel?: number;
  /** 있으면 등비 가격 대신 "누적 가격 = a × 레벨^p" 로 계산 (레벨이 수천까지 가는 항목용) */
  cumulative?: { a: number; p: number };
}
export type UpgradeId =
  | 'tap'
  | 'critChance'
  | 'critMult'
  | 'autoMult'
  | 'petAdopt'
  | 'petFeed'
  | 'petPoke'
  | 'petTreasure'
  | 'petFriend';

/** 탭 강화: 레벨당 탭 기본값 +1 */
export const TAP_UPGRADE: LeveledUpgrade = { id: 'tap', name: '손가락 단련', icon: '👆', baseCost: 50, growth: 2.2 };

/** 크리티컬: 기본 확률 5%, 크리티컬 시 ×1.2 */
export const CRIT = {
  baseChance: 0.05,
  chancePerLevel: 0.01,
  maxChance: 0.5,
  baseMult: 1.2,
  multPerLevel: 0.1,
};
/** 크리티컬 확률 +1%p / 레벨 (최대 50% → 45레벨) */
export const CRIT_CHANCE_UPGRADE: LeveledUpgrade = {
  id: 'critChance', name: '급소 찌르기', icon: '🎯', baseCost: 100, growth: 1.6,
  maxLevel: Math.round((CRIT.maxChance - CRIT.baseChance) / CRIT.chancePerLevel),
};
/** 크리티컬 배율 +0.1 / 레벨 */
export const CRIT_MULT_UPGRADE: LeveledUpgrade = { id: 'critMult', name: '한 방의 힘', icon: '💥', baseCost: 200, growth: 1.8 };

/** 자동 생산 배수: 레벨당 ×1.2 (곱연산), 전설 단계부터 등장 */
export const AUTO_MULT = { perLevel: 1.2, unlockStage: 5 };
/** 가격 증가 ×3 → ×1.5 로 완화 (2026-11-06 피드백) */
export const AUTO_MULT_UPGRADE: LeveledUpgrade = { id: 'autoMult', name: '전설의 기운', icon: '🌟', baseCost: 50_000_000, growth: 1.5 };

/** 오프라인 보상 최대 시간(초) */
export const OFFLINE_CAP_SEC = 8 * 60 * 60;

/** 배고픈 연수 이벤트 */
export const EVENT = {
  minIntervalSec: 60,
  maxIntervalSec: 120,
  durationSec: 10,
  /** 보상 = 초당 생산량 × rewardSec (최소 rewardMin) */
  rewardSec: 60,
  rewardMin: 50,
};

// ---------- 탱이 (펫) — docs/plans/tangiPetPlan.md ----------
const PET_ART = `${import.meta.env.BASE_URL}assets/tangi`;

export type PetFrame = 'idle' | 'blink' | 'act' | 'happy' | 'dig';
export const PET_FRAMES: PetFrame[] = ['idle', 'blink', 'act', 'happy', 'dig'];

export function petFrameImg(stage: number, f: PetFrame): string {
  return f === 'idle' ? `${PET_ART}/stage${stage + 1}.png` : `${PET_ART}/stage${stage + 1}_${f}.png`;
}

export interface PetStage {
  name: string;
  /** 이 탱이 레벨 이상이면 진화 (단, 연수 단계를 넘을 수 없음) */
  minLevel: number;
  /** 화면 크기 배율 (강아지 시절은 작게) */
  scale: number;
}
// 진화 필요 레벨은 단계마다 ×3 (3, 9, 27 … 6561) — 2026-11-06 피드백
export const PET_STAGES: PetStage[] = [
  { name: '아기 탱이', minLevel: 0, scale: 0.72 },
  { name: '꼬마 탱이', minLevel: 3, scale: 0.85 },
  { name: '공부견 탱이', minLevel: 9, scale: 1 },
  { name: '직장견 탱이', minLevel: 27, scale: 1 },
  { name: '헬스견 탱이', minLevel: 81, scale: 1 },
  { name: '전설의 탱이', minLevel: 243, scale: 1 },
  { name: '우주견 탱이', minLevel: 729, scale: 1 },
  { name: '천상견 탱이', minLevel: 2_187, scale: 1 },
  { name: '차원견 탱이', minLevel: 6_561, scale: 1 },
];

export const PET = {
  /** 진화 1단계마다 탱이 능력 ×1.5 */
  evolveMult: 1.5,
  /** 탱이 레벨당 탱이 능력 +1% (레벨이 수천까지 올라가므로 +5% → +1%) */
  levelBonus: 0.01,
  /** 탱이를 직접 탭했을 때: 연수 탭 값의 50% */
  tapShare: 0.5,
  /** 꼬리 콕콕: Lv.1 에 4초, 레벨당 -0.3초, 최소 1초 */
  pokeBaseSec: 4,
  pokeStepSec: 0.3,
  pokeMinSec: 1,
  /** 보물 찾기: 60초마다 초당 생산량 × (20 + 10×레벨)초 */
  treasureIntervalSec: 60,
  treasureBaseSec: 20,
  treasureStepSec: 10,
  /** 우정: 모든 생산량 +10% / 레벨 (더하기, 탱이 성장 배수와 무관) */
  friendPerLevel: 0.1,
  /** 화면: 탱이 폭(cqw, 성체 기준)과 연수와의 간격(무대 폭 %) */
  width: 15,
  followGap: 13,
  speed: 14,
  /** 보물 찾기 / 탭 반응 프레임 유지 시간 */
  digMs: 1600,
  happyMs: 900,
};

export const PET_IDLE_SEQUENCE: [PetFrame, number][] = [
  ['idle', 1800],
  ['act', 900],
  ['idle', 1400],
  ['blink', 140],
  ['idle', 2200],
  ['blink', 120],
];

export const PET_ADOPT_UPGRADE: LeveledUpgrade = { id: 'petAdopt', name: '탱이 입양하기', icon: '🐾', baseCost: 1_000, growth: 1, maxLevel: 1 };
/** 레벨이 수천까지 가므로 누적 가격 = 30 × Lv^2.9 — 진화 레벨까지의 누적이 연수 단계 기준과 비슷하게 맞춤
 *  누적: Lv.3 ≈ 730 · Lv.9 ≈ 1.8만 · Lv.27 ≈ 42만 · Lv.81 ≈ 1천만 · Lv.243 ≈ 2.5억 · Lv.729 ≈ 60억 · Lv.2187 ≈ 1,500억 · Lv.6561 ≈ 3.5조 */
export const PET_FEED_UPGRADE: LeveledUpgrade = {
  id: 'petFeed', name: '간식 주기', icon: '🍖', baseCost: 30, growth: 1,
  cumulative: { a: 30, p: 2.9 },
};
/** 간식 주기 대량 구매 수량 (카드 왼쪽 위 버튼으로 전환) */
export const FEED_QTY_MODES = [1, 10, 100, 'max'] as const;
export type FeedQty = (typeof FEED_QTY_MODES)[number];
export const PET_POKE_UPGRADE: LeveledUpgrade = {
  id: 'petPoke', name: '꼬리 콕콕', icon: '🐾', baseCost: 2_000, growth: 2,
  maxLevel: 1 + Math.round((PET.pokeBaseSec - PET.pokeMinSec) / PET.pokeStepSec),
};
export const PET_TREASURE_UPGRADE: LeveledUpgrade = { id: 'petTreasure', name: '보물 찾기', icon: '🦴', baseCost: 5_000, growth: 2.5 };
export const PET_FRIEND_UPGRADE: LeveledUpgrade = { id: 'petFriend', name: '우정', icon: '💕', baseCost: 10_000, growth: 2.2 };
/** 보물 찾기 / 우정 카드가 열리는 탱이 레벨 */
export const PET_UNLOCK = { treasureLevel: 3, friendLevel: 9 };

// ---------- 환생 — docs/plans/rebirthPlan.md ----------
export const REBIRTH = {
  /** 이 연수 단계(인덱스) 이상이면 환생 가능: 5 = 6단계 전설의 연수 */
  minStage: 5,
  /** 환생 1회당 모든 획득 ×2 (최종 곱) */
  perRebirth: 2,
};
