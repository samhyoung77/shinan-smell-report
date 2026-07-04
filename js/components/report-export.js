// report-export.js — CSV/인쇄 바텀시트
import { BUILDINGS, findBuilding } from '../buildings.js';
import { getReports } from '../data.js';
import { csvCell, daysAgoYMD, todayYMD, fmtTs, esc } from '../util.js';

const RANGE_OPTIONS = [
  { key: '7',   label: '최근 7일',  days: 7   },
  { key: '30',  label: '최근 30일', days: 30  },
  { key: 'year', label: '올해',      days: null },
];

export function openReportSheet({ defaultRange = '7' } = {}) {
  const region = document.getElementById('sheet-region');
  if (!region) return;
  closeSheet(); // ensure single instance

  let range = defaultRange;
  let format = 'csv';

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.addEventListener('click', closeSheet);

  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', '리포트 내보내기');
  sheet.innerHTML = `
    <div class="sheet__handle" aria-hidden="true"></div>
    <h2 class="sheet__title">리포트 내보내기</h2>

    <div class="sheet__section">
      <span class="sheet__section-label">기간</span>
      <div class="sheet__row" role="radiogroup" aria-label="기간">
        ${RANGE_OPTIONS.map(o => `
          <button type="button" class="chip ${o.key === range ? 'is-active' : ''}"
                  data-range="${o.key}" role="radio" aria-checked="${o.key === range}">
            ${o.label}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="sheet__section">
      <span class="sheet__section-label">형식</span>
      <div class="sheet__row" role="radiogroup" aria-label="형식">
        <button type="button" class="chip is-active" data-format="csv" role="radio" aria-checked="true">CSV 다운로드</button>
        <button type="button" class="chip" data-format="print" role="radio" aria-checked="false">인쇄용 요약</button>
      </div>
    </div>

    <button type="button" class="cta" data-action="run">다운로드</button>
    <button type="button" class="btn-secondary" data-action="cancel" style="margin-top:8px;">취소</button>
  `;

  region.appendChild(backdrop);
  region.appendChild(sheet);
  region.setAttribute('aria-hidden', 'false');

  sheet.querySelectorAll('[data-range]').forEach(chip => {
    chip.addEventListener('click', () => {
      range = chip.dataset.range;
      sheet.querySelectorAll('[data-range]').forEach(c => {
        const on = c.dataset.range === range;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-checked', on);
      });
    });
  });
  sheet.querySelectorAll('[data-format]').forEach(chip => {
    chip.addEventListener('click', () => {
      format = chip.dataset.format;
      sheet.querySelectorAll('[data-format]').forEach(c => {
        const on = c.dataset.format === format;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-checked', on);
      });
      const cta = sheet.querySelector('[data-action="run"]');
      cta.textContent = format === 'csv' ? '다운로드' : '인쇄';
    });
  });
  sheet.querySelector('[data-action="cancel"]').addEventListener('click', closeSheet);
  sheet.querySelector('[data-action="run"]').addEventListener('click', async () => {
    const opt = RANGE_OPTIONS.find(o => o.key === range);
    const from = opt.days == null
      ? `${new Date().getFullYear()}-01-01`
      : daysAgoYMD(opt.days - 1);
    const to = todayYMD();
    const reports = await getReports({ from, to });
    if (format === 'csv') exportCSV(reports, { from, to });
    else openPrint(reports, { from, to, rangeLabel: opt.label });
    closeSheet();
  });

  // esc to close
  document.addEventListener('keydown', escClose);
}

function escClose(ev) {
  if (ev.key === 'Escape') closeSheet();
}

export function closeSheet() {
  const region = document.getElementById('sheet-region');
  if (!region) return;
  region.innerHTML = '';
  region.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', escClose);
}

function exportCSV(reports, { from, to }) {
  const header = ['date', 'building', 'complex', 'intensity', 'note', 'ts'];
  const rows = reports
    .slice()
    .sort((a, b) => a.clientDate.localeCompare(b.clientDate) || a.ts.localeCompare(b.ts))
    .map(r => {
      const b = findBuilding(r.buildingId);
      return [
        r.clientDate,
        b ? b.name : r.buildingId,
        b ? b.complex : '',
        r.intensity,
        r.note || '',
        r.ts,
      ].map(csvCell).join(',');
    });
  const bom = '﻿'; // Excel에서 한글 UTF-8 인식
  const csv = bom + header.join(',') + '\n' + rows.join('\n') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `smell-reports_${from}_to_${to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openPrint(reports, { from, to, rangeLabel }) {
  const total = reports.length;
  const avg = total ? (reports.reduce((s, r) => s + r.intensity, 0) / total).toFixed(2) : '-';
  const perBuilding = BUILDINGS.map(b => {
    const items = reports.filter(r => r.buildingId === b.id);
    return {
      name: b.name, complex: b.complex, count: items.length,
      avg: items.length ? (items.reduce((s, r) => s + r.intensity, 0) / items.length).toFixed(2) : '-',
    };
  });
  const rows = reports
    .slice()
    .sort((a, b) => a.clientDate.localeCompare(b.clientDate) || a.ts.localeCompare(b.ts))
    .map(r => {
      const b = findBuilding(r.buildingId);
      return `<tr>
        <td>${esc(r.clientDate)}</td>
        <td>${esc(b ? b.name : r.buildingId)}</td>
        <td>${esc(b ? b.complex : '')}</td>
        <td>${r.intensity}</td>
        <td>${esc(r.note || '')}</td>
        <td>${esc(fmtTs(r.ts))}</td>
      </tr>`;
    }).join('');
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>똥냄새 피해현황 · ${esc(from)} ~ ${esc(to)}</title>
<style>
  body { font-family: system-ui, 'Malgun Gothic', sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
  .kpi { display: flex; gap: 16px; margin-bottom: 16px; }
  .kpi div { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 12px; }
  .kpi strong { font-size: 18px; display: block; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
  th { background: #f2f2f2; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <h1>효천마을 신안인스빌 똥냄새 피해현황</h1>
  <div class="meta">기간: ${esc(rangeLabel)} (${esc(from)} ~ ${esc(to)})</div>
  <div class="kpi">
    <div><strong>${total}</strong>총 등록 건수</div>
    <div><strong>${avg}</strong>평균 강도</div>
    <div><strong>${new Date().toLocaleDateString('ko-KR')}</strong>발행일</div>
  </div>
  <h2>동별 요약</h2>
  <table>
    <thead><tr><th>동</th><th>단지</th><th>건수</th><th>평균 강도</th></tr></thead>
    <tbody>
      ${perBuilding.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.complex)}</td><td>${r.count}</td><td>${r.avg}</td></tr>`).join('')}
    </tbody>
  </table>
  <h2>전체 등록 내역</h2>
  <table>
    <thead><tr><th>날짜</th><th>동</th><th>단지</th><th>강도</th><th>메모</th><th>기록시각</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888">데이터 없음</td></tr>'}</tbody>
  </table>
  <div class="no-print" style="text-align:center;margin-top:16px;">
    <button onclick="window.print()">인쇄</button>
    <button onclick="window.close()">닫기</button>
  </div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('팝업 차단으로 인쇄창을 열지 못했어요. 브라우저 팝업 허용 후 다시 시도해주세요.');
    return;
  }
  w.document.write(html);
  w.document.close();
  // print after render
  setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
}
