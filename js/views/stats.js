// stats.js — 통계 대시보드
import { getReports, myReports, deleteReport } from '../data.js';
import { findBuilding } from '../buildings.js';
import { renderKPI } from '../components/kpi.js';
import { renderHeatmap } from '../components/heatmap.js';
import { openReportSheet } from '../components/report-export.js';
import { computeKPI, lastNDays, relativeKor, esc } from '../util.js';
import { showToast } from '../toast.js';
import { go } from '../router.js';

let s = {
  range: '7',        // '7' | '30' | 'year'
  view: 'building',  // 'building' | 'complex'
};

export async function renderStats(root) {
  root.innerHTML = `
    <section class="stats">
      <div id="kpi-slot"></div>

      <div id="my-slot"></div>

      <div class="stats-toolbar">
        <div class="seg-view" role="tablist" aria-label="히트맵 뷰">
          <button type="button" class="seg-view__btn is-active" data-view="building" role="tab" aria-selected="true">동별</button>
          <button type="button" class="seg-view__btn" data-view="complex" role="tab" aria-selected="false">단지별</button>
        </div>
        <label class="visually-hidden" for="range-sel" style="position:absolute;left:-9999px">기간</label>
        <select id="range-sel" class="select-pill" aria-label="기간">
          <option value="7">7일</option>
          <option value="30">30일</option>
          <option value="year">올해</option>
        </select>
      </div>

      <div id="heatmap-slot"></div>

      <button type="button" class="btn-secondary" id="export-btn">
        <span aria-hidden="true">📥</span> 리포트 내보내기
      </button>
    </section>
  `;

  const kpiSlot = root.querySelector('#kpi-slot');
  const mySlot = root.querySelector('#my-slot');
  const heatmapSlot = root.querySelector('#heatmap-slot');

  const load = async () => {
    // KPI covers all-time snapshot metrics; heatmap covers selected range.
    const allReports = await getReports({});
    const kpi = computeKPI(allReports);
    renderKPI(kpiSlot, kpi);
    renderMy(mySlot, load);

    const dates = getRangeDates(s.range);
    const from = dates[0];
    const to = dates[dates.length - 1];
    const scoped = allReports.filter(r => r.clientDate >= from && r.clientDate <= to);

    if (!allReports.length) {
      heatmapSlot.innerHTML = `
        <div class="empty-state">
          아직 신고가 없어요. <a href="#home" data-nav="home">홈</a>에서 첫 신고를 남겨보세요.
        </div>`;
      const link = heatmapSlot.querySelector('[data-nav]');
      link && link.addEventListener('click', ev => { ev.preventDefault(); go('home'); });
      return;
    }
    renderHeatmap(heatmapSlot, { reports: scoped, dates, view: s.view });
  };

  await load();

  // View toggle
  root.querySelectorAll('.seg-view__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      s.view = btn.dataset.view;
      root.querySelectorAll('.seg-view__btn').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      load();
    });
  });

  // Range select
  root.querySelector('#range-sel').addEventListener('change', ev => {
    s.range = ev.target.value;
    load();
  });

  // Export
  root.querySelector('#export-btn').addEventListener('click', () => {
    openReportSheet({ defaultRange: s.range });
  });
}

function renderMy(slot, reload) {
  if (!slot) return;
  const mine = myReports();
  if (!mine.length) { slot.innerHTML = ''; return; }
  const labels = { 1: '약함', 2: '보통', 3: '심함' };
  const items = mine.map(m => {
    const b = findBuilding(m.buildingId);
    return `
      <li class="my-item">
        <div class="my-item__meta">
          <span class="my-item__name">${esc(b ? b.name : m.buildingId)}</span>
          <span class="my-item__intensity intensity-${m.intensity}">${esc(labels[m.intensity] || '')}</span>
          <span class="my-item__time">${esc(relativeKor(m.ts))}</span>
        </div>
        <button type="button" class="link-btn" data-cancel="${esc(m.id)}">취소</button>
      </li>`;
  }).join('');
  slot.innerHTML = `
    <div class="my-card" aria-label="내 신고">
      <div class="my-card__head">
        <span class="eyebrow">내 신고 (24시간 내 취소 가능)</span>
      </div>
      <ul class="my-list">${items}</ul>
    </div>
  `;
  slot.querySelectorAll('[data-cancel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.cancel;
      if (!confirm('이 신고를 취소할까요?')) return;
      try {
        await deleteReport(id);
        showToast('신고를 취소했어요.', { kind: 'success' });
        await reload();
      } catch (err) {
        console.error(err);
        showToast(err && err.message ? err.message : '취소에 실패했어요.', { kind: 'error' });
      }
    });
  });
}

function getRangeDates(range) {
  if (range === 'year') {
    const y = new Date().getFullYear();
    const arr = [];
    const start = new Date(y, 0, 1);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    while (start <= end && arr.length < 400) {
      const yy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      arr.push(`${yy}-${mm}-${dd}`);
      start.setDate(start.getDate() + 1);
    }
    return arr;
  }
  const n = Number(range) || 7;
  return lastNDays(n);
}
