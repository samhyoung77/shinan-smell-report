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

  // Total columns = 1 (label) + dates.length
  const cols = `68px repeat(${dates.length}, minmax(24px, 1fr))`;

  const headerCells = [
    `<div class="heatmap__col-header heatmap__col-header--label" aria-hidden="true"></div>`,
    ...dates.map(d => {
      const short = d.slice(5).replace('-', '/'); // MM/DD
      return `<div class="heatmap__col-header" title="${d}">${short}</div>`;
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
