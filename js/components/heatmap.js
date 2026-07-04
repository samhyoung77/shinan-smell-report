// heatmap.js — 12행(동) × N일 히트맵. 가로 스크롤, 왼쪽 sticky.
import { BUILDINGS, COMPLEXES } from '../buildings.js';
import { avgIntensity, cellLevel, esc, formatKorMD } from '../util.js';

/**
 * @param {HTMLElement} container
 * @param {object} opts
 *   reports: Array<Report>  (already scoped)
 *   dates: Array<'YYYY-MM-DD'>  (chronological)
 *   view: 'building' | 'complex'
 */
export function renderHeatmap(container, { reports, dates, view = 'building' }) {
  const rows = view === 'complex'
    ? COMPLEXES.map(name => ({
        id: name,
        label: name,
        buildingIds: BUILDINGS.filter(b => b.complex === name).map(b => b.id),
      }))
    : BUILDINGS.map(b => ({
        id: b.id,
        label: b.name,
        buildingIds: [b.id],
      }));

  // 뷰별 컬럼 폭 & 라벨 규칙
  const isYearView  = dates.length > 60;
  const cellMin     = isYearView ? '10px' : '24px';
  const cols        = `68px repeat(${dates.length}, minmax(${cellMin}, 1fr))`;

  const headerCells = [
    `<div class="heatmap__col-header heatmap__col-header--label" aria-hidden="true"></div>`,
    ...dates.map(d => {
      const month = Number(d.slice(5, 7));
      const day   = Number(d.slice(8, 10));
      let label;
      if (isYearView) {
        // 올해 뷰: 매월 1일에만 월 숫자만 (예: '7'). 나머지는 빈 라벨.
        label = day === 1 ? String(month) : '';
      } else {
        // 30일/7일 뷰: 기본은 일만, 매월 1일엔 'M/1'로 월 경계 표시.
        label = day === 1 ? `${month}/1` : String(day);
      }
      return `<div class="heatmap__col-header" title="${d}">${label}</div>`;
    }),
  ].join('');

  const bodyRows = rows.map(row => {
    const labelCell = `<div class="heatmap__row-label" scope="row">${esc(row.label)}</div>`;
    const cells = dates.map(date => {
      const items = reports.filter(r =>
        row.buildingIds.includes(r.buildingId) && r.clientDate === date);
      const avg = avgIntensity(items);
      const lv = cellLevel(avg);
      const count = items.length;
      const aria = count === 0
        ? `${row.label}, ${formatKorMD(date)}, 없음`
        : `${row.label}, ${formatKorMD(date)}, ${count}건, 평균 강도 ${avg.toFixed(1)}`;
      const title = count === 0
        ? `${date}\n없음`
        : `${date}\n${count}건 · 평균 강도 ${avg.toFixed(1)}`;
      return `<button type="button" class="heatmap__cell lv-${lv}"
                      aria-label="${esc(aria)}" title="${esc(title)}"
                      data-date="${date}" data-row="${esc(row.id)}"></button>`;
    }).join('');
    return labelCell + cells;
  }).join('');

  container.innerHTML = `
    <div class="heatmap">
      <div class="heatmap__scroll">
        <div class="heatmap__grid" style="grid-template-columns: ${cols};" role="grid" aria-label="동별 등록 히트맵">
          ${headerCells}
          ${bodyRows}
        </div>
      </div>
      <div class="legend" aria-hidden="false">
        <span class="legend__item"><span class="legend__sw"></span>없음</span>
        <span class="legend__item"><span class="legend__sw lv-1"></span>약함</span>
        <span class="legend__item"><span class="legend__sw lv-2"></span>보통</span>
        <span class="legend__item"><span class="legend__sw lv-3"></span>심함</span>
      </div>
    </div>
  `;

  // Auto scroll to right (most recent) on init
  const scroller = container.querySelector('.heatmap__scroll');
  if (scroller) scroller.scrollLeft = scroller.scrollWidth;
}
