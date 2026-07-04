// map-overlay.js — 지도 이미지 + SVG 오버레이. 12개 동 원형 히트 영역.
import { BUILDINGS, MAP_IMAGE } from '../buildings.js';
import { esc } from '../util.js';

/**
 * Render map overlay into container.
 * @param {HTMLElement} container
 * @param {object} opts
 *   selectedId: string|null
 *   counts: Map<buildingId, number>  — badge counts (today or week)
 *   onSelect: (buildingId) => void
 */
export function renderMap(container, { selectedId = null, counts = new Map(), onSelect } = {}) {
  const { src, naturalWidth: W, naturalHeight: H } = MAP_IMAGE;

  const svg = BUILDINGS.map(b => {
    const isSel = b.id === selectedId;
    const count = counts.get(b.id) || 0;
    const badgeR = 36;
    const bx = b.cx + b.r * 0.7;
    const by = b.cy - b.r * 0.7;
    const badge = count > 0
      ? `<g class="b-badge" aria-hidden="true">
           <circle class="b-badge__bg" cx="${bx}" cy="${by}" r="${badgeR}" />
           <text class="b-badge__text" x="${bx}" y="${by}">${count > 99 ? '99+' : count}</text>
         </g>`
      : '';
    return `
      <g class="b ${isSel ? 'selected' : ''}"
         data-building-id="${b.id}"
         role="button"
         tabindex="0"
         aria-label="${esc(b.name)} 선택${count > 0 ? `, 신고 ${count}건` : ''}${isSel ? ', 선택됨' : ''}">
        <circle class="b-circle" cx="${b.cx}" cy="${b.cy}" r="${b.r}"></circle>
        <text class="b-label" x="${b.cx}" y="${b.cy}">${esc(b.name)}</text>
        ${badge}
      </g>`;
  }).join('');

  container.innerHTML = `
    <div class="map-wrap">
      <div class="map-inner">
        <img src="${src}" alt="효천마을 신안인스빌 전체 지도"
             width="${W}" height="${H}" draggable="false">
        <svg class="map-svg"
             viewBox="0 0 ${W} ${H}"
             role="img"
             aria-label="효천마을 신안인스빌 지도. 동을 골라 신고할 수 있어요.">
          ${svg}
        </svg>
      </div>
    </div>
  `;

  const wrap = container.querySelector('.map-wrap');
  const svgEl = container.querySelector('.map-svg');

  // Delegate click on <g class="b">
  svgEl.addEventListener('click', ev => {
    const g = ev.target.closest('.b');
    if (!g) return;
    handleSelect(g.dataset.buildingId);
  });
  // Keyboard: Enter/Space on focused <g>
  svgEl.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const g = ev.target.closest('.b');
    if (!g) return;
    ev.preventDefault();
    handleSelect(g.dataset.buildingId);
  });

  function handleSelect(id) {
    // Update visuals immediately for responsiveness.
    svgEl.querySelectorAll('.b').forEach(g => {
      g.classList.toggle('selected', g.dataset.buildingId === id);
    });
    try { localStorage.setItem('shinanAPT.lastBuildingId', id); } catch {}
    onSelect && onSelect(id);
  }

  // Center map horizontally on selected building on first paint.
  if (selectedId) {
    requestAnimationFrame(() => {
      const b = BUILDINGS.find(x => x.id === selectedId);
      if (!b || !wrap) return;
      const inner = container.querySelector('.map-inner');
      if (!inner) return;
      const scale = inner.clientWidth / W;
      const targetX = b.cx * scale - wrap.clientWidth / 2;
      wrap.scrollLeft = Math.max(0, targetX);
    });
  }
}
