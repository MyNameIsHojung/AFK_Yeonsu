const UNITS = ['', '만', '억', '조', '경', '해', '자', '양'];

/** 한국식 단위(만/억/조...)로 큰 수를 짧게 표시 */
export function fmt(n: number): string {
  if (n < 100) return (Math.floor(n * 10) / 10).toLocaleString('ko-KR');
  if (n < 10_000) return Math.floor(n).toLocaleString('ko-KR');
  let unit = 0;
  while (n >= 10_000 && unit < UNITS.length - 1) {
    n /= 10_000;
    unit++;
  }
  const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
  let s = n.toFixed(digits);
  if (digits > 0) s = s.replace(/\.?0+$/, '');
  return `${s}${UNITS[unit]}`;
}

export function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  if (m > 0) return `${m}분`;
  return `${Math.floor(sec)}초`;
}
