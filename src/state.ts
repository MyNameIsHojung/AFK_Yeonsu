import {
  COST_GROWTH,
  GENERATORS,
  OFFLINE_CAP_SEC,
  STAGES,
  STAGE_BONUS_PER_LEVEL,
  TAP_UPGRADE,
  type Generator,
} from './data';

const SAVE_KEY = 'afk-yeonsu-save-v1';

export interface GameState {
  power: number;
  totalEarned: number;
  tapLevel: number;
  owned: Record<string, number>;
  stage: number;
  lastSaved: number;
}

export function newState(): GameState {
  return {
    power: 0,
    totalEarned: 0,
    tapLevel: 0,
    owned: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    stage: 0,
    lastSaved: Date.now(),
  };
}

export function stageMultiplier(s: GameState): number {
  return 1 + s.stage * STAGE_BONUS_PER_LEVEL;
}

export function powerPerSec(s: GameState): number {
  const base = GENERATORS.reduce((sum, g) => sum + g.pps * (s.owned[g.id] ?? 0), 0);
  return base * stageMultiplier(s);
}

export function tapValue(s: GameState): number {
  // 탭은 기본값 + 초당 생산량의 2% 를 함께 준다 (후반에도 탭이 의미 있도록)
  return (1 + s.tapLevel) * stageMultiplier(s) + powerPerSec(s) * 0.02;
}

export function generatorCost(s: GameState, g: Generator): number {
  return Math.ceil(g.baseCost * Math.pow(COST_GROWTH, s.owned[g.id] ?? 0));
}

export function tapUpgradeCost(s: GameState): number {
  return Math.ceil(TAP_UPGRADE.baseCost * Math.pow(TAP_UPGRADE.growth, s.tapLevel));
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

export function buyTapUpgrade(s: GameState): boolean {
  const cost = tapUpgradeCost(s);
  if (s.power < cost) return false;
  s.power -= cost;
  s.tapLevel++;
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
