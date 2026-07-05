// trend-chart.js — 일간 추세 그래프. 순수 인라인 SVG.
//   MODE A (dates.length <= 60): 강도 스택 막대 (7일 / 30일)
//   MODE B (dates.length > 60):  총합 area-라인 + 강도 히트 스트립 (올해)
// heatmap.js 컨벤션(순수 함수, container.innerHTML, esc, aria-label 병기, >60 임계)을 따름.
import { avgIntensity, cellLevel, formatKorMD, esc } from '../util.js';

const H = 168; // SVG 총 높이(px) 고정

/**
 * @param {HTMLElement} container  (#trend-slot)
 * @param {object} opts
 *   reports: Array<Report>          (이미 range로 필터된 scoped reports)
 *   dates:   Array<'YYYY-MM-DD'>    (오래된 → 최신, 연속)
 *
 * 전체 데이터 0건 처리는 호출부(stats.js)에서 담당한다(카드 미렌더).
 * 여기서는 "range 내 0건"만 인라인 빈 상태로 처리한다.
 */
export function renderTrend(container, { reports = [], dates = [] } = {}) {
  if (!container) return;

  // 이전 렌더가 남긴 리사이즈 리스너 정리
  if (container._trendCleanup) {
    container._trendCleanup();
    container._trendCleanup = null;
  }

  if (!dates.length) { container.innerHTML = ''; return; }

  const isYear = dates.length > 60;
  const prefix = isYear ? '올해' : `최근 ${dates.length}일`;

  // ---- 일별 집계 (강도 1/2/3 건수 + 총합) ----
  const byDate = new Map();
  for (const r of reports) {
    let e = byDate.get(r.clientDate);
    if (!e) { e = { c1: 0, c2: 0, c3: 0 }; byDate.set(r.clientDate, e); }
    const iv = Number(r.intensity);
    if (iv === 1) e.c1++;
    else if (iv === 2) e.c2++;
    else if (iv === 3) e.c3++;
  }
  const days = dates.map(d => {
    const e = byDate.get(d) || { c1: 0, c2: 0, c3: 0 };
    const total = e.c1 + e.c2 + e.c3;
    const md = formatKorMD(d);
    return { date: d, md, c1: e.c1, c2: e.c2, c3: e.c3, total };
  });

  const sum = days.reduce((a, d) => a + d.total, 0);

  // ---- range 내 0건: 축소판 빈 상태 카드 ----
  if (sum === 0) {
    container.innerHTML = `
      <div class="trend-card" aria-label="일간 추세">
        <div class="trend-card__head"><span class="eyebrow">일간 추세</span></div>
        <p class="trend-empty">이 기간에는 등록이 없어요. 기간을 넓혀보세요.</p>
      </div>`;
    return;
  }

  const avg = sum / dates.length;
  const avgStr = avg.toFixed(1);
  const peak = days.reduce((m, d) => (d.total > m.total ? d : m), days[0]);

  const defaultReadout = `${prefix} · 총 ${sum}건 · 하루 평균 ${avgStr}건`;
  const svgAria =
    `${prefix} 일간 추세. 총 ${sum}건, 하루 평균 ${avgStr}건` +
    (peak.total > 0 ? `, 가장 많은 날 ${peak.md} ${peak.total}건.` : '.');

  // ---- 카드 뼈대 먼저 삽입 → .trend__plot 폭 측정 후 SVG 주입 ----
  container.innerHTML = `
    <div class="trend-card" aria-label="일간 추세">
      <div class="trend-card__head">
        <span class="eyebrow">일간 추세</span>
        <div class="trend__legend" aria-hidden="true">
          <span class="trend__lg"><i class="sw i1"></i>약함</span>
          <span class="trend__lg"><i class="sw i2"></i>보통</span>
          <span class="trend__lg"><i class="sw i3"></i>심함</span>
        </div>
      </div>
      <p class="trend__readout" aria-live="polite">${esc(defaultReadout)}</p>
      <div class="trend__plot"></div>
      ${buildTable(days)}
    </div>`;

  const plotEl = container.querySelector('.trend__plot');
  const readoutEl = container.querySelector('.trend__readout');

  const draw = () => {
    let W = plotEl.clientWidth;
    if (!W || W < 40) W = 416; // 레이아웃 전/숨김 상태 폴백 (480px 콘텐츠 기준 가용폭)
    plotEl.innerHTML = isYear
      ? buildModeB(days, W, { sum, avgStr, yMax: Math.max(1, peak.total) }, svgAria)
      : buildModeA(days, W, { yMax: Math.max(1, peak.total) }, svgAria);
    wireInteractions(plotEl, readoutEl, defaultReadout, isYear);
  };

  draw();

  // 리사이즈/방향 전환 시 재렌더 (debounce). 리스너 누수 방지 cleanup 저장.
  let t;
  const onResize = () => { clearTimeout(t); t = setTimeout(draw, 200); };
  window.addEventListener('resize', onResize);
  container._trendCleanup = () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
}

/* ------------------------------------------------------------------ */
/* MODE A — 강도 스택 막대                                             */
/* ------------------------------------------------------------------ */
function buildModeA(days, W, { yMax }, svgAria) {
  const M = { l: 30, r: 8, t: 12, b: 22 };
  const plotL = M.l, plotR = W - M.r, plotW = plotR - plotL;
  const plotT = M.t, plotB = H - M.b, plotH = plotB - plotT;
  const scale = plotH / yMax;

  const n = days.length;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.72, 40);
  const rx = n > 14 ? 1 : 2;

  const grid = gridLines(yMax, plotL, plotR, plotB, scale);

  let marks = '';
  let labels = '';
  let hits = '';

  days.forEach((d, i) => {
    const cx = plotL + slot * (i + 0.5);
    const barX = cx - barW / 2;
    // 스택: 약함(바닥) → 보통 → 심함(위)
    const h1 = d.c1 * scale, h2 = d.c2 * scale, h3 = d.c3 * scale;
    const y1 = plotB - h1;
    const y2 = y1 - h2;
    const y3 = y2 - h3;
    // 최상단(비어있지 않은) 세그먼트만 둥근 머리
    const topIntensity = d.c3 > 0 ? 3 : d.c2 > 0 ? 2 : d.c1 > 0 ? 1 : 0;

    let segs = '';
    if (d.c1 > 0) segs += `<rect x="${f(barX)}" y="${f(y1)}" width="${f(barW)}" height="${f(h1)}"${topIntensity === 1 ? ` rx="${rx}"` : ''} fill="var(--intensity-1)"/>`;
    if (d.c2 > 0) segs += `<rect x="${f(barX)}" y="${f(y2)}" width="${f(barW)}" height="${f(h2)}"${topIntensity === 2 ? ` rx="${rx}"` : ''} fill="var(--intensity-2)"/>`;
    if (d.c3 > 0) segs += `<rect x="${f(barX)}" y="${f(y3)}" width="${f(barW)}" height="${f(h3)}"${topIntensity === 3 ? ` rx="${rx}"` : ''} fill="var(--intensity-3)"/>`;
    marks += `<g class="trend__day" data-i="${i}">${segs}</g>`;

    const lbl = labelA(d.date, i, n);
    if (lbl) labels += `<text x="${f(cx)}" y="${plotB + 14}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-subtle)">${esc(lbl)}</text>`;

    hits += hitRect(plotL + slot * i, plotT, slot, plotH, i, d);
  });

  return `<svg class="trend__svg" role="img" viewBox="0 0 ${f(W)} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-label="${esc(svgAria)}">${grid}${marks}${labels}${hits}</svg>`;
}

/* ------------------------------------------------------------------ */
/* MODE B — 총합 area-라인 + 강도 히트 스트립                          */
/* ------------------------------------------------------------------ */
function buildModeB(days, W, { yMax }, svgAria) {
  const M = { l: 30, r: 8, t: 12, b: 28 };
  const plotL = M.l, plotR = W - M.r, plotW = plotR - plotL;
  const plotT = M.t, plotB = H - M.b, plotH = plotB - plotT;
  const scale = plotH / yMax;

  const n = days.length;
  const xAt = i => plotL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = tot => plotB - (tot / yMax) * plotH;

  const grid = gridLines(yMax, plotL, plotR, plotB, scale);

  // area + line
  let dataMark = '';
  if (n === 1) {
    dataMark = `<circle cx="${f(xAt(0))}" cy="${f(yAt(days[0].total))}" r="2.5" fill="var(--primary)"/>`;
  } else {
    const pts = days.map((d, i) => `${f(xAt(i))},${f(yAt(d.total))}`);
    const linePath = 'M' + pts.join(' L');
    const areaPath = `M${f(xAt(0))},${f(plotB)} L${pts.join(' L')} L${f(xAt(n - 1))},${f(plotB)} Z`;
    dataMark =
      `<path d="${areaPath}" fill="var(--primary-tint-15)"/>` +
      `<path d="${linePath}" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  // 강도 히트 스트립 (baseline+2, h7)
  const cellW = plotW / n;
  let strip = '';
  days.forEach((d, i) => {
    const avg = d.total ? (d.c1 + d.c2 * 2 + d.c3 * 3) / d.total : null;
    const lv = cellLevel(avg);
    const fill = lv === 0 ? 'var(--cell-0-bg)' : `var(--cell-${lv}-bg)`;
    strip += `<rect x="${f(plotL + i * cellW)}" y="${f(plotB + 2)}" width="${f(cellW + 0.4)}" height="7" fill="${fill}"/>`;
  });
  // baseline 헤어라인 (0건 구간 시각 기준)
  strip += `<line x1="${f(plotL)}" y1="${f(plotB + 2)}" x2="${f(plotR)}" y2="${f(plotB + 2)}" stroke="var(--hairline)"/>`;

  // active 가이드선 + 포인트 (초기 숨김)
  const guide =
    `<line class="trend__guide" x1="0" y1="${plotT}" x2="0" y2="${plotB}" stroke="var(--hairline-strong)" style="visibility:hidden"/>` +
    `<circle class="trend__pt" cx="0" cy="0" r="2.5" fill="var(--primary)" style="visibility:hidden"/>`;

  // x 라벨: 매월 1일에만 월 숫자
  let labels = '';
  days.forEach((d, i) => {
    const day = Number(d.date.slice(8, 10));
    if (day === 1) {
      const month = Number(d.date.slice(5, 7));
      labels += `<text x="${f(xAt(i))}" y="${H - 6}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-subtle)">${month}</text>`;
    }
  });

  // hit rects (슬롯 전폭 × 플롯 전높이). 가이드 좌표는 data-x/data-y로 전달.
  let hits = '';
  days.forEach((d, i) => {
    hits += hitRect(plotL + i * cellW, plotT, cellW, plotH, i, d, { x: xAt(i), y: yAt(d.total) });
  });

  return `<svg class="trend__svg" role="img" viewBox="0 0 ${f(W)} ${H}" width="100%" height="${H}" preserveAspectRatio="none" aria-label="${esc(svgAria)}">${grid}${dataMark}${strip}${guide}${labels}${hits}</svg>`;
}

/* ------------------------------------------------------------------ */
/* 공통 헬퍼                                                           */
/* ------------------------------------------------------------------ */
function gridLines(yMax, plotL, plotR, plotB, scale) {
  const ticks = yMax <= 1 ? [0, yMax] : [0, Math.round(yMax / 2), yMax];
  const uniq = [...new Set(ticks)];
  return uniq.map(v => {
    const y = plotB - v * scale;
    return `<line x1="${f(plotL)}" y1="${f(y)}" x2="${f(plotR)}" y2="${f(y)}" stroke="var(--hairline)"/>` +
      `<text x="${f(plotL - 4)}" y="${f(y + 3)}" text-anchor="end" font-family="var(--mono)" font-size="10" fill="var(--ink-subtle)">${v}</text>`;
  }).join('');
}

function labelA(date, i, n) {
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  if (n <= 7) return day === 1 ? `${month}/1` : String(day);
  // 30일: 5일 간격 + 매월 1일
  if (day === 1) return `${month}/1`;
  if (i % 5 === 0) return String(day);
  return '';
}

function hitRect(x, y, w, h, i, d, guide) {
  const aria = d.total === 0 ? `${d.md}, 없음` : `${d.md}, ${d.total}건`;
  const title = readoutFor(d);
  const attrs = guide ? ` data-x="${f(guide.x)}" data-y="${f(guide.y)}"` : '';
  return `<rect class="trend__hit" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="transparent" data-i="${i}" data-readout="${esc(readoutFor(d))}"${attrs} role="img" aria-label="${esc(aria)}"><title>${esc(title)}</title></rect>`;
}

function readoutFor(d) {
  if (d.total === 0) return `${d.md} · 없음`;
  const parts = [];
  if (d.c1) parts.push(`약함${d.c1}`);
  if (d.c2) parts.push(`보통${d.c2}`);
  if (d.c3) parts.push(`심함${d.c3}`);
  return `${d.md} · ${d.total}건 (${parts.join('·')})`;
}

function buildTable(days) {
  const rows = days.map(d =>
    `<tr><th scope="row">${esc(d.md)}</th><td>${d.total}</td><td>${d.c1}</td><td>${d.c2}</td><td>${d.c3}</td></tr>`
  ).join('');
  return `<table class="visually-hidden"><caption>일간 등록 건수</caption>` +
    `<thead><tr><th>날짜</th><th>건수</th><th>약함</th><th>보통</th><th>심함</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`;
}

/* ------------------------------------------------------------------ */
/* 인터랙션: hover/focus/tap → readout 갱신 + 마크 강조                */
/* ------------------------------------------------------------------ */
function wireInteractions(plotEl, readoutEl, defaultReadout, isYear) {
  const svg = plotEl.querySelector('.trend__svg');
  if (!svg) return;
  const hits = svg.querySelectorAll('.trend__hit');
  const guide = svg.querySelector('.trend__guide');
  const pt = svg.querySelector('.trend__pt');

  const clearActive = () => {
    svg.querySelectorAll('.is-active').forEach(el => el.classList.remove('is-active'));
    if (guide) guide.style.visibility = 'hidden';
    if (pt) pt.style.visibility = 'hidden';
  };

  const setActive = (rect) => {
    clearActive();
    readoutEl.textContent = rect.getAttribute('data-readout') || defaultReadout;
    rect.classList.add('is-active');
    if (!isYear) {
      const i = rect.getAttribute('data-i');
      const g = svg.querySelector(`.trend__day[data-i="${i}"]`);
      if (g) g.classList.add('is-active');
    } else if (guide && pt) {
      const gx = rect.getAttribute('data-x');
      const gy = rect.getAttribute('data-y');
      if (gx != null) {
        guide.setAttribute('x1', gx);
        guide.setAttribute('x2', gx);
        guide.style.visibility = 'visible';
        pt.setAttribute('cx', gx);
        pt.setAttribute('cy', gy);
        pt.style.visibility = 'visible';
      }
    }
  };

  const reset = () => {
    clearActive();
    readoutEl.textContent = defaultReadout;
  };

  hits.forEach(rect => {
    rect.addEventListener('mouseenter', () => setActive(rect));
    rect.addEventListener('mouseleave', reset);
    rect.addEventListener('focus', () => setActive(rect));
    rect.addEventListener('touchstart', () => setActive(rect), { passive: true });
  });
}

/** 좌표 반올림(소수 2자리) — SVG 문자열 경량화 */
function f(n) {
  return Math.round(n * 100) / 100;
}
