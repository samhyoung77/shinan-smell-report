// map-overlay.js — 광역 벡터 개략도 배경 + SVG 오버레이 + 줌/팬 컨트롤러.
// 개울이 단지를 좌→하→우로 감싸는 넓은 조망(viewBox 0 0 2039 1025).
import { BUILDINGS, MAP_IMAGE } from '../buildings.js';
import { esc } from '../util.js';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const TAP_THRESHOLD = 6; // px 이동량 미만이면 '탭', 이상이면 '드래그(팬)'

/**
 * 동 footprint(회전 둥근 사각형) — 01e_map_wide_zoom_spec.md 표 기준.
 * length=장변(로컬 x), depth=단변(로컬 y), angle=시계방향°.
 * 중심(cx,cy)은 buildings.js와 동일 인덱스 순서로 정합.
 */
const FOOTPRINTS = [
  { cx:  505, cy: 253, length: 150, depth: 52, angle: -20 }, // 101
  { cx:  685, cy: 306, length: 150, depth: 58, angle: -12 }, // 102
  { cx:  641, cy: 385, length: 130, depth: 48, angle: -34 }, // 103
  { cx:  791, cy: 365, length: 128, depth: 46, angle: -68 }, // 104
  { cx:  816, cy: 498, length: 150, depth: 52, angle: -28 }, // 105
  { cx:  995, cy: 306, length: 170, depth: 60, angle:  -8 }, // 201
  { cx: 1114, cy: 326, length: 160, depth: 60, angle:  -4 }, // 202
  { cx:  982, cy: 554, length: 155, depth: 55, angle:   8 }, // 203
  { cx: 1130, cy: 546, length: 155, depth: 55, angle:   4 }, // 204
  { cx: 1267, cy: 510, length: 150, depth: 55, angle:  24 }, // 205
  { cx: 1329, cy: 364, length: 145, depth: 52, angle:  54 }, // 206
  { cx: 1479, cy: 345, length: 150, depth: 52, angle:  72 }, // 207
];

// 개울: 실제 지형과 같은 소문자 y자.
//  · 본류(STREAM_MAIN): 우상단에서 우측 사면을 따라 내려와 단지 아래 합류점(~980,815)을
//    지나 아래로 꼬리가 빠짐(y의 긴 획 + 내림꼬리).
//  · 좌측 팔(STREAM_BRANCH): 좌상단에서 내려와 같은 합류점에서 본류와 만남(y의 짧은 획).
const STREAM_MAIN =
  'M 1980 180 C 1850 300 1710 440 1590 570 ' +
  'C 1380 710 1170 785 980 815 ' +
  'C 948 892 918 982 900 1075';
const STREAM_BRANCH =
  'M 20 -30 C 180 260 430 520 700 690 C 802 754 898 796 980 815';

// 상단 문현로 얇은 띠 1개.
const ROAD_PATH = 'M 0 95 Q 550 55 1000 120 T 2039 105';

/** 흐름 방향 화살표 마크업(물길 위 놓임). */
function flowArrow(x, y, deg) {
  return `<polygon class="bg-water-arrow" points="36,0 -22,-24 -22,24"
            transform="translate(${x} ${y}) rotate(${deg})" />`;
}

/**
 * 배경 개략도 인라인 SVG 마크업. viewBox는 오버레이와 동일(W×H)해 정합 유지.
 * 색은 전부 CSS 커스텀 프로퍼티 → 다크/라이트 자동 대응.
 */
function mapBackgroundSVG(W, H) {
  const blocks = FOOTPRINTS.map(f => {
    const x = f.cx - f.length / 2;
    const y = f.cy - f.depth / 2;
    return `<rect class="bg-block" x="${x}" y="${y}" width="${f.length}" height="${f.depth}"
              rx="12" transform="rotate(${f.angle} ${f.cx} ${f.cy})" />`;
  }).join('');

  return `
    <rect class="bg-ground" x="0" y="0" width="${W}" height="${H}" />

    <!-- 문현로 (상단 방향감용 얇은 띠 1개) -->
    <path class="bg-road" d="${ROAD_PATH}" />
    <text class="bg-road-label" x="1000" y="72">문현로</text>

    <!-- 개울 (핵심 강조): Y자 물길 — 본류 + 아래 지류. 굵은 리본 + 밝은 하이라이트 -->
    <path class="bg-water" d="${STREAM_MAIN}" />
    <path class="bg-water" d="${STREAM_BRANCH}" />
    <path class="bg-water-hi" d="${STREAM_MAIN}" />
    <path class="bg-water-hi" d="${STREAM_BRANCH}" />
    <!-- 흐름 방향 화살표 (좌·우 두 팔 → 합류점 → 아래 꼬리) -->
    ${flowArrow(470, 545, 55)}
    ${flowArrow(1520, 620, 148)}
    ${flowArrow(935, 955, 100)}
    <text class="bg-water-label" x="300" y="640">개울</text>

    <!-- 건물 블록 -->
    <g class="bg-blocks">${blocks}</g>
  `;
}

// 이전 렌더의 window resize 리스너 정리를 위한 참조.
let activeCleanup = null;

/**
 * Render map overlay into container.
 * @param {HTMLElement} container
 * @param {object} opts
 *   selectedId: string|null
 *   counts: Map<buildingId, number>  — badge counts (today or week)
 *   onSelect: (buildingId) => void
 */
export function renderMap(container, { selectedId = null, counts = new Map(), onSelect } = {}) {
  const { naturalWidth: W, naturalHeight: H } = MAP_IMAGE;

  // 이전 컨트롤러의 전역(window) 리스너 제거.
  if (activeCleanup) { try { activeCleanup(); } catch {} activeCleanup = null; }

  const overlay = BUILDINGS.map(b => {
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
         aria-label="${esc(b.name)} 선택${count > 0 ? `, 등록 ${count}건` : ''}${isSel ? ', 선택됨' : ''}">
        <circle class="b-circle" cx="${b.cx}" cy="${b.cy}" r="${b.r}"></circle>
        <text class="b-label" x="${b.cx}" y="${b.cy}">${esc(b.name)}</text>
        ${badge}
      </g>`;
  }).join('');

  container.innerHTML = `
    <div class="map-wrap" role="group" aria-label="확대·축소 가능한 배치도">
      <div class="map-inner">
        <svg class="map-bg"
             viewBox="0 0 ${W} ${H}"
             preserveAspectRatio="xMidYMid slice"
             role="img"
             aria-label="효천마을 신안인스빌 배치도. 단지를 개울이 감쌈. 확대·축소로 동 선택.">
          ${mapBackgroundSVG(W, H)}
        </svg>
        <svg class="map-svg"
             viewBox="0 0 ${W} ${H}"
             preserveAspectRatio="xMidYMid slice"
             role="img"
             aria-label="효천마을 신안인스빌 지도. 동을 골라 등록할 수 있어요.">
          ${overlay}
        </svg>
      </div>
      <div class="map-zoom">
        <button type="button" class="map-zoom__btn" data-zoom="in" aria-label="지도 확대">＋</button>
        <button type="button" class="map-zoom__btn" data-zoom="out" aria-label="지도 축소">－</button>
        <button type="button" class="map-zoom__btn map-zoom__btn--reset" data-zoom="reset" aria-label="지도 원위치">⟳</button>
      </div>
    </div>
  `;

  const wrap = container.querySelector('.map-wrap');
  const inner = container.querySelector('.map-inner');
  const svgEl = container.querySelector('.map-svg');

  function handleSelect(id) {
    svgEl.querySelectorAll('.b').forEach(g => {
      g.classList.toggle('selected', g.dataset.buildingId === id);
    });
    try { localStorage.setItem('shinanAPT.lastBuildingId', id); } catch {}
    onSelect && onSelect(id);
  }

  // 키보드: 포커스된 <g>에서 Enter/Space (기존 유지).
  svgEl.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const g = ev.target.closest('.b');
    if (!g) return;
    ev.preventDefault();
    handleSelect(g.dataset.buildingId);
  });

  const ctrl = setupZoomPan(wrap, inner, W, H, (clientX, clientY) => {
    // pointerup 이동량이 임계 미만 → '탭'. 그 지점의 .b 선택.
    const el = document.elementFromPoint(clientX, clientY);
    const g = el && el.closest ? el.closest('.b') : null;
    if (g) handleSelect(g.dataset.buildingId);
  });
  activeCleanup = ctrl.destroy;

  // 줌 버튼: 팬과 충돌 방지 위해 pointerdown 전파 차단.
  wrap.querySelectorAll('.map-zoom__btn').forEach(btn => {
    btn.addEventListener('pointerdown', ev => ev.stopPropagation());
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const k = btn.dataset.zoom;
      if (k === 'in') ctrl.zoomIn();
      else if (k === 'out') ctrl.zoomOut();
      else ctrl.reset();
    });
  });

  // 초기: 항상 전체 조망(scale 1)으로 시작 — 개울 포함 단지 전경을 먼저 보여주고,
  // 선택 동은 하이라이트로만 표시. 확대는 사용자가 직접(줌/팬).
  requestAnimationFrame(() => {
    ctrl.reset();
  });
}

/**
 * transform 기반 줌/팬 컨트롤러.
 * .map-inner 는 wrap 을 100% 덮고(transform-origin 0 0), 그 위에 translate+scale 을 적용.
 * 상태: scale(1~5), tx/ty(CSS px). 클램프로 항상 뷰포트를 덮게 유지(빈 여백 방지).
 */
function setupZoomPan(wrap, inner, W, H, onTap) {
  const st = { scale: 1, tx: 0, ty: 0 };
  const pointers = new Map(); // pointerId -> {x,y} (wrap 기준)
  let raf = 0;
  let start = null;   // 단일 포인터: {x0,y0,lx,ly}
  let dragging = false;
  let pinchPrev = null;

  function vp() { return { w: wrap.clientWidth, h: wrap.clientHeight }; }

  function clamp() {
    const { w, h } = vp();
    // inner 가 wrap 을 정확히 덮으므로 content 크기 = w*scale, h*scale.
    const minTx = w - w * st.scale; // = w(1-scale) <= 0
    const minTy = h - h * st.scale;
    if (st.tx > 0) st.tx = 0;
    if (st.tx < minTx) st.tx = minTx;
    if (st.ty > 0) st.ty = 0;
    if (st.ty < minTy) st.ty = minTy;
  }

  function apply() {
    raf = 0;
    clamp();
    inner.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale})`;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(apply); }

  // (px,py)=wrap 기준 좌표. 그 지점의 content 점이 제자리에 있도록 줌.
  function zoomAt(px, py, factor) {
    const ns = Math.min(MAX_SCALE, Math.max(MIN_SCALE, st.scale * factor));
    if (ns === st.scale) return;
    const cx = (px - st.tx) / st.scale;
    const cy = (py - st.ty) / st.scale;
    st.scale = ns;
    st.tx = px - cx * ns;
    st.ty = py - cy * ns;
    schedule();
  }

  function pinchState(r) {
    const pts = [...pointers.values()];
    const a = pts[0], b = pts[1];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    };
  }

  function onDown(ev) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    try { wrap.setPointerCapture(ev.pointerId); } catch {}
    const r = wrap.getBoundingClientRect();
    pointers.set(ev.pointerId, { x: ev.clientX - r.left, y: ev.clientY - r.top });
    if (pointers.size === 1) {
      start = { x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY };
      dragging = false;
    } else if (pointers.size === 2) {
      pinchPrev = pinchState(r);
    }
  }

  function onMove(ev) {
    if (!pointers.has(ev.pointerId)) return;
    const r = wrap.getBoundingClientRect();
    pointers.set(ev.pointerId, { x: ev.clientX - r.left, y: ev.clientY - r.top });

    if (pointers.size >= 2) {
      const now = pinchState(r);
      if (pinchPrev && now.dist > 0 && pinchPrev.dist > 0) {
        zoomAt(now.cx, now.cy, now.dist / pinchPrev.dist);
        // 두 손가락 중점 이동만큼 팬.
        st.tx += now.cx - pinchPrev.cx;
        st.ty += now.cy - pinchPrev.cy;
        schedule();
      }
      pinchPrev = now;
      dragging = true;
      return;
    }

    if (pointers.size === 1 && start) {
      const totX = ev.clientX - start.x0;
      const totY = ev.clientY - start.y0;
      if (!dragging && Math.hypot(totX, totY) > TAP_THRESHOLD) dragging = true;
      if (dragging) {
        st.tx += ev.clientX - start.lx;
        st.ty += ev.clientY - start.ly;
        schedule();
      }
      start.lx = ev.clientX;
      start.ly = ev.clientY;
    }
  }

  function onUp(ev) {
    if (!pointers.has(ev.pointerId)) return;
    pointers.delete(ev.pointerId);
    try { wrap.releasePointerCapture(ev.pointerId); } catch {}
    if (pointers.size < 2) pinchPrev = null;
    if (pointers.size === 0) {
      if (start && !dragging) onTap(ev.clientX, ev.clientY);
      start = null;
      dragging = false;
    }
  }

  function onWheel(ev) {
    ev.preventDefault();
    const r = wrap.getBoundingClientRect();
    const factor = ev.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(ev.clientX - r.left, ev.clientY - r.top, factor);
  }

  function onDblClick(ev) {
    const r = wrap.getBoundingClientRect();
    zoomAt(ev.clientX - r.left, ev.clientY - r.top, 1.8);
  }

  function onResize() { schedule(); }

  wrap.addEventListener('pointerdown', onDown);
  wrap.addEventListener('pointermove', onMove);
  wrap.addEventListener('pointerup', onUp);
  wrap.addEventListener('pointercancel', onUp);
  wrap.addEventListener('wheel', onWheel, { passive: false });
  wrap.addEventListener('dblclick', onDblClick);
  window.addEventListener('resize', onResize);

  return {
    zoomIn() { const { w, h } = vp(); zoomAt(w / 2, h / 2, 1.6); },
    zoomOut() { const { w, h } = vp(); zoomAt(w / 2, h / 2, 1 / 1.6); },
    reset() { st.scale = 1; st.tx = 0; st.ty = 0; schedule(); },
    centerOn(b, targetScale) {
      const { w, h } = vp();
      st.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale));
      // content px = (좌표/viewBox) * (base 크기). base 크기 = wrap 크기(inner 가 100% 덮음).
      const contentX = (b.cx / W) * w;
      const contentY = (b.cy / H) * h;
      st.tx = w / 2 - contentX * st.scale;
      st.ty = h / 2 - contentY * st.scale;
      schedule();
    },
    destroy() { window.removeEventListener('resize', onResize); },
  };
}
