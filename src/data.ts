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
    effects: [{ kind: 'sparkle' }],
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
}
export type UpgradeId = 'tap' | 'critChance' | 'critMult' | 'autoMult';

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
export const AUTO_MULT_UPGRADE: LeveledUpgrade = { id: 'autoMult', name: '전설의 기운', icon: '🌟', baseCost: 50_000_000, growth: 3 };

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
