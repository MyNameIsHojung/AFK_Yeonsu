import {
  AUTO_MULT,
  COST_GROWTH,
  CRIT,
  GENERATORS,
  OFFLINE_CAP_SEC,
  PET,
  PET_STAGES,
  REBIRTH,
  STAGES,
  STAGE_BONUS_PER_LEVEL,
  type Generator,
  type LeveledUpgrade,
  type UpgradeId,
} from './data';

const SAVE_KEY = 'afk-yeonsu-save-v1';

export interface GameState {
  power: number;
  totalEarned: number;
  tapLevel: number;
  critChanceLevel: number;
  critMultLevel: number;
  autoMultLevel: number;
  /** 탱이: 입양 여부(0/1), 레벨, 능력 레벨 */
  petAdopted: number;
  petLevel: number;
  petPokeLevel: number;
  petTreasureLevel: number;
  petFriendLevel: number;
  /** 환생 횟수 (환생해도 유지) */
  rebirths: number;
  /** 환생 직후 첫 화면에서 축하 창을 띄우기 위한 표시 */
  justReborn: boolean;
  owned: Record<string, number>;
  stage: number;
  lastSaved: number;
}

export function newState(): GameState {
  return {
    power: 0,
    totalEarned: 0,
    tapLevel: 0,
    critChanceLevel: 0,
    critMultLevel: 0,
    autoMultLevel: 0,
    petAdopted: 0,
    petLevel: 0,
    petPokeLevel: 0,
    petTreasureLevel: 0,
    petFriendLevel: 0,
    rebirths: 0,
    justReborn: false,
    owned: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    stage: 0,
    lastSaved: Date.now(),
  };
}

export function stageMultiplier(s: GameState): number {
  return 1 + s.stage * STAGE_BONUS_PER_LEVEL;
}

/** 전설의 기운 배수 */
export function autoMultiplier(s: GameState): number {
  return Math.pow(AUTO_MULT.perLevel, s.autoMultLevel);
}

/** 탱이 우정: 모든 생산량 배수 */
export function friendMultiplier(s: GameState): number {
  return 1 + s.petFriendLevel * PET.friendPerLevel;
}

/** 환생 배수: 2^환생 횟수. 모든 획득의 맨 마지막에 곱한다 */
export function rebirthMultiplier(s: GameState): number {
  return Math.pow(REBIRTH.perRebirth, s.rebirths);
}

export function canRebirth(s: GameState): boolean {
  return s.stage >= REBIRTH.minStage;
}

/** 환생: 환생 횟수만 남기고 완전 초기화 */
export function rebirth(s: GameState): GameState {
  return { ...newState(), rebirths: s.rebirths + 1, justReborn: true };
}

/** 환생 배수를 곱하기 전 초당 생산량 */
function rawPowerPerSec(s: GameState): number {
  const base = GENERATORS.reduce((sum, g) => sum + g.pps * (s.owned[g.id] ?? 0), 0);
  return base * stageMultiplier(s) * autoMultiplier(s) * friendMultiplier(s);
}

export function powerPerSec(s: GameState): number {
  return rawPowerPerSec(s) * rebirthMultiplier(s);
}

export function tapValue(s: GameState): number {
  // 탭은 기본값 + 초당 생산량의 2% 를 함께 준다 (후반에도 탭이 의미 있도록). 환생 배수는 마지막에 한 번만
  return ((1 + s.tapLevel) * stageMultiplier(s) * friendMultiplier(s) + rawPowerPerSec(s) * 0.02) * rebirthMultiplier(s);
}

// ---------- 탱이 ----------
/** 탱이 단계 (미입양이면 -1). 탱이 레벨로 진화하되 연수 단계를 넘지 않는다 */
export function petStage(s: GameState): number {
  if (!s.petAdopted) return -1;
  let k = 0;
  while (k + 1 < PET_STAGES.length && s.petLevel >= PET_STAGES[k + 1].minLevel) k++;
  return Math.min(k, s.stage);
}

/** 탱이 능력 배수: 레벨당 +5%, 진화 단계당 ×1.5 */
export function petMultiplier(s: GameState): number {
  return (1 + s.petLevel * PET.levelBonus) * Math.pow(PET.evolveMult, Math.max(0, petStage(s)));
}

/** 꼬리 콕콕 간격(초). 미구매면 null */
export function petPokeIntervalSec(s: GameState): number | null {
  if (!s.petAdopted || s.petPokeLevel === 0) return null;
  return Math.max(PET.pokeMinSec, PET.pokeBaseSec - (s.petPokeLevel - 1) * PET.pokeStepSec);
}

/** 보물 1개의 가치 */
export function petTreasureValue(s: GameState): number {
  return powerPerSec(s) * (PET.treasureBaseSec + PET.treasureStepSec * s.petTreasureLevel) * petMultiplier(s);
}

export function critChance(s: GameState): number {
  return Math.min(CRIT.maxChance, CRIT.baseChance + s.critChanceLevel * CRIT.chancePerLevel);
}

export function critMultiplier(s: GameState): number {
  return CRIT.baseMult + s.critMultLevel * CRIT.multPerLevel;
}

/** 탭 1회: 크리티컬 판정 포함 */
export function rollTap(s: GameState): { value: number; crit: boolean } {
  const crit = Math.random() < critChance(s);
  const base = tapValue(s);
  return { value: crit ? base * critMultiplier(s) : base, crit };
}

export function generatorCost(s: GameState, g: Generator): number {
  return Math.ceil(g.baseCost * Math.pow(COST_GROWTH, s.owned[g.id] ?? 0));
}

// ---------- 레벨형 업그레이드 (탭 강화 / 크리티컬 / 전설의 기운) ----------
type LevelKey =
  | 'tapLevel'
  | 'critChanceLevel'
  | 'critMultLevel'
  | 'autoMultLevel'
  | 'petAdopted'
  | 'petLevel'
  | 'petPokeLevel'
  | 'petTreasureLevel'
  | 'petFriendLevel';
const LEVEL_KEY: Record<UpgradeId, LevelKey> = {
  tap: 'tapLevel',
  critChance: 'critChanceLevel',
  critMult: 'critMultLevel',
  autoMult: 'autoMultLevel',
  petAdopt: 'petAdopted',
  petFeed: 'petLevel',
  petPoke: 'petPokeLevel',
  petTreasure: 'petTreasureLevel',
  petFriend: 'petFriendLevel',
};

export function upgradeLevel(s: GameState, u: LeveledUpgrade): number {
  return s[LEVEL_KEY[u.id]];
}

export function isMaxed(s: GameState, u: LeveledUpgrade): boolean {
  return u.maxLevel !== undefined && upgradeLevel(s, u) >= u.maxLevel;
}

export function upgradeCost(s: GameState, u: LeveledUpgrade): number {
  return upgradeCostN(s, u, 1);
}

/** 누적 가격형: 레벨 L 까지 쓴 총 가격 */
function cumulativeSpent(u: LeveledUpgrade, level: number): number {
  const c = u.cumulative!;
  return c.a * Math.pow(level, c.p);
}

/** n 레벨을 한꺼번에 살 때 총 가격 (등비수열 합) */
export function upgradeCostN(s: GameState, u: LeveledUpgrade, n: number): number {
  if (n <= 0) return 0;
  const lv = upgradeLevel(s, u);
  if (u.cumulative) return Math.ceil(cumulativeSpent(u, lv + n) - cumulativeSpent(u, lv));
  const first = u.baseCost * Math.pow(u.growth, upgradeLevel(s, u));
  if (u.growth === 1) return Math.ceil(first * n);
  return Math.ceil((first * (Math.pow(u.growth, n) - 1)) / (u.growth - 1));
}

/** 지금 연수력으로 살 수 있는 최대 레벨 수 */
export function maxAffordable(s: GameState, u: LeveledUpgrade): number {
  const lv = upgradeLevel(s, u);
  let n: number;
  if (u.cumulative) {
    // a·(L+n)^p ≤ a·L^p + power  →  L+n ≤ ((a·L^p + power)/a)^(1/p)
    const c = u.cumulative;
    n = Math.floor(Math.pow((cumulativeSpent(u, lv) + s.power) / c.a, 1 / c.p)) - lv;
  } else {
    const first = u.baseCost * Math.pow(u.growth, lv);
    n = u.growth === 1 ? Math.floor(s.power / first) : Math.floor(Math.log(1 + (s.power * (u.growth - 1)) / first) / Math.log(u.growth));
  }
  if (u.maxLevel !== undefined) n = Math.min(n, u.maxLevel - upgradeLevel(s, u));
  // 부동소수 오차 보정
  while (n > 0 && upgradeCostN(s, u, n) > s.power) n--;
  return Math.max(0, n);
}

export function buyUpgradeN(s: GameState, u: LeveledUpgrade, n: number): boolean {
  if (n <= 0) return false;
  if (u.maxLevel !== undefined && upgradeLevel(s, u) + n > u.maxLevel) return false;
  const cost = upgradeCostN(s, u, n);
  if (s.power < cost) return false;
  s.power -= cost;
  s[LEVEL_KEY[u.id]] += n;
  return true;
}

export function buyUpgrade(s: GameState, u: LeveledUpgrade): boolean {
  if (isMaxed(s, u)) return false;
  return buyUpgradeN(s, u, 1);
}

export function earn(s: GameState, amount: number): void {
  s.power += amount;
  s.totalEarned += amount;
}

/** 진화 조건을 확인하고, 진화했다면 새 단계 인덱스를 반환 */
export function checkEvolve(s: GameState): number | null {
  let next = s.stage;
  while (next + 1 < STAGES.length && s.totalEarned >= STAGES[next + 1].threshold) next++;
  if (next === s.stage) return null;
  s.stage = next;
  return next;
}

export function buyGenerator(s: GameState, g: Generator): boolean {
  const cost = generatorCost(s, g);
  if (s.power < cost) return false;
  s.power -= cost;
  s.owned[g.id] = (s.owned[g.id] ?? 0) + 1;
  return true;
}

export function save(s: GameState): void {
  s.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}

/** 저장 데이터를 불러오고 오프라인 보상을 적용한다. 보상량과 경과 시간을 함께 반환 */
export function load(): { state: GameState; offlineGain: number; offlineSec: number } {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return { state: newState(), offlineGain: 0, offlineSec: 0 };

  const parsed = JSON.parse(raw) as Partial<GameState>;
  const state: GameState = { ...newState(), ...parsed, owned: { ...newState().owned, ...parsed.owned } };

  const offlineSec = Math.min(Math.max(0, (Date.now() - state.lastSaved) / 1000), OFFLINE_CAP_SEC);
  const offlineGain = powerPerSec(state) * offlineSec;
  earn(state, offlineGain);
  return { state, offlineGain, offlineSec };
}

export function resetSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
