// home.js — 지도 신고 화면
import { getReports, reportSmell, myReports, deleteReport } from '../data.js';
import { findBuilding } from '../buildings.js';
import { renderMap } from '../components/map-overlay.js';
import { mountDatePicker } from '../components/date-picker.js';
import { todayYMD, thisWeekStartYMD, relativeKor, formatKorMD, esc } from '../util.js';
import { showToast } from '../toast.js';

let state = {
  selectedBuildingId: null,
  intensity: null,
  date: todayYMD(),
  view: 'today', // 'today' | 'week'
  submitting: false,
  reports: [],
};

export async function renderHome(root) {
  // Reset session state on nav
  try {
    const last = localStorage.getItem('shinanAPT.lastBuildingId');
    state.selectedBuildingId = last || null;
  } catch { state.selectedBuildingId = null; }
  state.date = todayYMD();
  state.intensity = null;
  state.view = 'today';
  state.submitting = false;

  // Mount date pill into header slot
  const headerRight = document.getElementById('header-right');
  if (headerRight) {
    headerRight.innerHTML = '';
    mountDatePicker(headerRight, {
      value: state.date,
      onChange: v => {
        state.date = v;
        updateCta();
      },
    });
  }

  root.innerHTML = shell();

  state.reports = await getReports({});
  renderMapArea(root);

  root.querySelectorAll('.seg-view__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      root.querySelectorAll('.seg-view__btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      renderMapArea(root);
    });
  });

  root.querySelectorAll('.intensity__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.intensity = Number(btn.dataset.level);
      root.querySelectorAll('.intensity__btn').forEach(b => {
        b.setAttribute('aria-checked', String(b === btn));
      });
      const hint = root.querySelector('#intensity-hint');
      if (hint) hint.textContent = '';
      updateCta();
    });
  });

  root.querySelector('#cta-report').addEventListener('click', () => onSubmit(root));

  updateCta();
  updateSelectedLine();
  updateRecent();
}

function shell() {
  return `
    <section class="home">
      <div class="map-card">
        <div class="map-card__toolbar">
          <div class="seg-view" role="tablist" aria-label="집계 기간">
            <button type="button" class="seg-view__btn is-active" data-view="today" role="tab" aria-selected="true">오늘</button>
            <button type="button" class="seg-view__btn" data-view="week" role="tab" aria-selected="false">이번 주</button>
          </div>
          <span class="status-badge" id="total-badge">0건</span>
        </div>
        <div id="map-area"></div>
      </div>

      <div class="selection-line" id="selection-line">동을 골라주세요</div>

      <div>
        <p class="eyebrow">강도</p>
        <div class="intensity" role="radiogroup" aria-label="냄새 강도">
          <button type="button" class="intensity__btn" data-level="1" role="radio" aria-checked="false">
            <span class="num">1</span><span class="label">약함</span>
          </button>
          <button type="button" class="intensity__btn" data-level="2" role="radio" aria-checked="false">
            <span class="num">2</span><span class="label">보통</span>
          </button>
          <button type="button" class="intensity__btn" data-level="3" role="radio" aria-checked="false">
            <span class="num">3</span><span class="label">심함</span>
          </button>
        </div>
        <div class="hint" id="intensity-hint" role="alert"></div>
      </div>

      <button type="button" class="cta" id="cta-report" aria-disabled="true">
        <span class="cta__label">지금 냄새 남</span>
      </button>

      <p class="recent" id="recent-line"></p>
    </section>
  `;
}

function renderMapArea(root) {
  const area = root.querySelector('#map-area');
  const counts = computeCounts(state.reports, state.view);
  renderMap(area, {
    selectedId: state.selectedBuildingId,
    counts,
    onSelect: id => {
      state.selectedBuildingId = id;
      updateCta();
      updateSelectedLine();
    },
  });
  const total = [...counts.values()].reduce((s, n) => s + n, 0);
  const badge = root.querySelector('#total-badge');
  if (badge) badge.textContent = `${total}건`;
}

function computeCounts(reports, view) {
  const from = view === 'today' ? todayYMD() : thisWeekStartYMD();
  const counts = new Map();
  for (const r of reports) {
    if (r.clientDate >= from) {
      counts.set(r.buildingId, (counts.get(r.buildingId) || 0) + 1);
    }
  }
  return counts;
}

function updateSelectedLine() {
  const el = document.querySelector('#selection-line');
  if (!el) return;
  const b = state.selectedBuildingId ? findBuilding(state.selectedBuildingId) : null;
  el.innerHTML = b
    ? `선택된 동: <strong>${esc(b.name)}</strong> <span style="color:var(--ink-subtle)">· ${esc(b.complex)}</span>`
    : '<span style="color:var(--ink-subtle)">동을 골라주세요</span>';
}

function updateCta() {
  const cta = document.querySelector('#cta-report');
  if (!cta) return;
  const label = cta.querySelector('.cta__label');
  const isToday = state.date === todayYMD();
  const ready = !!state.selectedBuildingId && !!state.intensity && !state.submitting;

  if (state.submitting) {
    label.textContent = '보내는 중…';
  } else if (isToday) {
    label.textContent = '지금 냄새 남';
    const existingBadge = cta.querySelector('.cta__badge');
    if (existingBadge) existingBadge.remove();
  } else {
    label.textContent = `${formatKorMD(state.date)} 신고하기`;
    if (!cta.querySelector('.cta__badge')) {
      const b = document.createElement('span');
      b.className = 'cta__badge';
      b.textContent = '과거 날짜';
      cta.appendChild(b);
    }
  }
  cta.setAttribute('aria-disabled', String(!ready));
}

function updateRecent() {
  const el = document.querySelector('#recent-line');
  if (!el) return;
  if (!state.reports.length) {
    el.innerHTML = '<span style="color:var(--ink-subtle)">이 지도의 첫 신고자가 되어보세요</span>';
    return;
  }
  const sorted = state.reports.slice().sort((a, b) => b.ts.localeCompare(a.ts));
  const latest = sorted[0];
  const b = findBuilding(latest.buildingId);
  const mineIds = new Set(myReports().map(m => m.id));
  const isMine = mineIds.has(latest.id);
  el.innerHTML = `최근 신고: ${esc(relativeKor(latest.ts))} · ${esc(b ? b.name : latest.buildingId)}` +
    (isMine ? ` <button type="button" class="link-btn" id="cancel-latest" data-id="${esc(latest.id)}">내 신고 취소</button>` : '');
  const btn = el.querySelector('#cancel-latest');
  if (btn) btn.addEventListener('click', () => onCancel(btn.dataset.id));
}

async function onCancel(id) {
  if (!id) return;
  if (!confirm('방금 남긴 신고를 취소할까요?')) return;
  try {
    await deleteReport(id);
    showToast('신고를 취소했어요.', { kind: 'success' });
    state.reports = await getReports({});
    const root = document.getElementById('view-root');
    if (root) {
      renderMapArea(root);
      updateRecent();
    }
  } catch (err) {
    console.error(err);
    showToast(err && err.message ? err.message : '취소에 실패했어요.', { kind: 'error' });
  }
}

async function onSubmit(root) {
  if (state.submitting) return;
  const cta = root.querySelector('#cta-report');

  if (!state.selectedBuildingId) {
    showToast('지도에서 동을 먼저 골라주세요', { kind: 'error' });
    cta.classList.remove('shake'); void cta.offsetWidth; cta.classList.add('shake');
    return;
  }
  if (!state.intensity) {
    const hint = root.querySelector('#intensity-hint');
    if (hint) hint.textContent = '강도를 골라주세요';
    cta.classList.remove('shake'); void cta.offsetWidth; cta.classList.add('shake');
    return;
  }

  state.submitting = true;
  updateCta();
  try {
    await reportSmell({
      buildingId: state.selectedBuildingId,
      intensity: state.intensity,
      clientDate: state.date,
    });
    showToast('신고가 접수됐어요. 감사합니다.', { kind: 'success' });
    // reset intensity only; keep building/date
    state.intensity = null;
    root.querySelectorAll('.intensity__btn').forEach(b => b.setAttribute('aria-checked', 'false'));
    // refresh badges
    state.reports = await getReports({});
    renderMapArea(root);
    updateRecent();
  } catch (err) {
    console.error(err);
    showToast('지금 전송이 안 됐어요. 잠시 후 다시 시도해주세요.', { kind: 'error' });
  } finally {
    state.submitting = false;
    updateCta();
  }
}
