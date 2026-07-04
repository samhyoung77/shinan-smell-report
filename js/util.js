// 날짜/포맷/KPI 계산 유틸

/** YYYY-MM-DD (local time) */
export function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD into local Date (midnight) */
export function fromYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayYMD() {
  return toYMD(new Date());
}

/** 30일 전 YYYY-MM-DD */
export function daysAgoYMD(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

/** "M월 D일" (한국어) */
export function formatKorMD(ymd) {
  const d = fromYMD(ymd);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** relative time — "12분 전" */
export function relativeKor(fromIso) {
  const then = new Date(fromIso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return '방금 전';
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

/** 이번 주 시작 (월요일, 로컬 자정) → YYYY-MM-DD */
export function thisWeekStartYMD() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return toYMD(d);
}

/** 이번 달 시작 YYYY-MM-DD */
export function thisMonthStartYMD() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return toYMD(d);
}

/** N일치 날짜 배열 (오래된 → 최신) */
export function lastNDays(n) {
  const arr = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    arr.push(toYMD(d));
  }
  return arr;
}

/** 리포트에서 단순 KPI 3종 계산 */
export function computeKPI(reports) {
  const today = todayYMD();
  const weekStart = thisWeekStartYMD();
  const monthStart = thisMonthStartYMD();
  let t = 0, w = 0, m = 0;
  for (const r of reports) {
    if (r.clientDate === today) t++;
    if (r.clientDate >= weekStart) w++;
    if (r.clientDate >= monthStart) m++;
  }
  return { today: t, week: w, month: m };
}

/** 강도 평균 (0이면 null) */
export function avgIntensity(items) {
  if (!items.length) return null;
  return items.reduce((s, r) => s + r.intensity, 0) / items.length;
}

/** 셀 레벨 매핑 (Math.round) — 0/1/2/3 */
export function cellLevel(avg) {
  if (avg == null) return 0;
  return Math.max(1, Math.min(3, Math.round(avg)));
}

/** CSV escape */
export function csvCell(v) {
  const s = String(v ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** ISO → "YYYY-MM-DD HH:mm" */
export function fmtTs(iso) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

/** debounce (mostly for future use) */
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** simple HTML escape */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
