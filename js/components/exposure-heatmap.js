// exposure-heatmap.js — 동별(또는 단지별) 누적 노출 랭킹 히트맵.
//   "어느 동이 제일 많이 노출됐나"를 색 농도 + 막대 길이 + 건수 + 순위로 한눈에.
//   heatmap.js 컨벤션(순수 함수, container.innerHTML, esc, aria 병기, 동일 row 정의)을 따름.
import { BUILDINGS, COMPLEXES } from '../buildings.js';
import { avgIntensity, esc } from '../util.js';

// 노출량(열) 기준색 — intensity-3 계열 red. 강도색과 의미가 다름(범례로 명확히).
const HEAT_RGB = '225,83,83';

/**
 * @param {HTMLElement} container  (#exposure-slot)
 * @param {object} opts
 *   reports: Array<Report>          (이미 range로 필터된 scoped reports)
 *   dates:   Array<'YYYY-MM-DD'>    (오래된 → 최신, 연속; 기간 라벨용)
 *   view:    'building' | 'complex'
 *
 * 전체 데이터 0건 처리는 호출부(stats.js)에서 담당(slot 비움).
 * 여기서는 "range 내 0건"만 인라인 빈 상태로 처리한다.
 */
export function renderExposure(container, { reports = [], dates = [], view = 'building' } = {}) {
  if (!container) return;

  // heatmap.js와 동일한 row 정의 (building=12개 / complex=단지별 buildingIds 합산)
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

  // ---- 집계: row별 총 건수 + 평균 강도 ----
  const aggregated = rows.map(row => {
    const items = reports.filter(r => row.buildingIds.includes(r.buildingId));
    return { ...row, count: items.length, avg: avgIntensity(items) };
  });

  // ---- 정렬: count 내림차순 → avg 강도 내림차순 → 이름순 ----
  aggregated.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const av = a.avg == null ? 0 : a.avg;
    const bv = b.avg == null ? 0 : b.avg;
    if (bv !== av) return bv - av;
    return a.label.localeCompare(b.label, 'ko');
  });

  const unitWord = view === 'complex' ? '단지별' : '동별';
  const periodLabel = dates.length > 60 ? '올해' : `최근 ${dates.length}일`;
  const total = aggregated.length;
  const maxCount = aggregated.reduce((m, r) => Math.max(m, r.count), 0);

  // ---- range 내 0건: 축소판 빈 상태 카드 (전체 0건은 stats.js가 slot 비움) ----
  if (maxCount === 0) {
    container.innerHTML = `
      <div class="exposure-card" aria-label="${esc(unitWord)} 노출">
        <div class="exposure-card__head"><span class="eyebrow">${esc(unitWord)} 노출</span></div>
        <p class="exposure__empty">이 기간에는 등록이 없어요. 기간을 넓혀보세요.</p>
      </div>`;
    return;
  }

  // ---- row 마크업 ----
  const listRows = aggregated.map((r, i) => {
    const rank = i + 1;
    const ratio = r.count / maxCount;            // 0..1
    const alpha = (0.12 + 0.88 * ratio).toFixed(3);
    const width = (ratio * 100).toFixed(1);
    const hasData = r.count > 0;
    const fillStyle = hasData
      ? `width:${width}%;background:rgba(${HEAT_RGB},${alpha});`
      : `width:0;`;
    const avgStr = r.avg == null ? null : r.avg.toFixed(1);

    const aria = hasData
      ? `${r.label} ${r.count}건, 노출 ${rank}위 중 ${total}, 평균 강도 ${avgStr}`
      : `${r.label} 0건, 노출 ${rank}위 중 ${total}`;
    const title = hasData
      ? `${r.label}\n${r.count}건 · 평균 강도 ${avgStr}`
      : `${r.label}\n없음`;

    const topClass = rank === 1 ? ' is-top' : '';
    const emptyClass = hasData ? '' : ' is-empty';
    const badge = rank === 1
      ? `<span class="exposure__badge" aria-hidden="true">최다</span>`
      : '';

    return `
      <div class="exposure__row${topClass}${emptyClass}" role="listitem"
           aria-label="${esc(aria)}" title="${esc(title)}">
        <span class="exposure__rank" aria-hidden="true">${rank}</span>
        <span class="exposure__label">${esc(r.label)}${badge}</span>
        <span class="exposure__bar">
          <span class="exposure__fill" style="${fillStyle}"></span>
        </span>
        <span class="exposure__count">${r.count}건</span>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="exposure-card" aria-label="${esc(unitWord)} 노출">
      <div class="exposure-card__head">
        <span class="eyebrow">${esc(unitWord)} 노출 (${esc(periodLabel)})</span>
        <span class="exposure__hint" aria-hidden="true">
          연함=적음
          <span class="exposure__scale">
            <i style="background:rgba(${HEAT_RGB},0.16);"></i>
            <i style="background:rgba(${HEAT_RGB},0.5);"></i>
            <i style="background:rgba(${HEAT_RGB},1);"></i>
          </span>
          진함=많음
        </span>
      </div>
      <div class="exposure__list" role="list" aria-label="${esc(unitWord)} 노출 랭킹, 총 ${total}개">
        ${listRows}
      </div>
    </div>
  `;
}
