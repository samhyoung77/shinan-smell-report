// kpi.js — 3칸 카드 (오늘 / 이번 주 / 이번 달)
import { esc } from '../util.js';

export function renderKPI(container, { today = 0, week = 0, month = 0 } = {}) {
  container.innerHTML = `
    <div class="kpi" role="list">
      <div class="kpi__card" role="listitem" aria-label="오늘 등록 ${today}건">
        <span class="kpi__num">${today}</span>
        <span class="kpi__label">오늘</span>
      </div>
      <div class="kpi__card" role="listitem" aria-label="이번 주 등록 ${week}건">
        <span class="kpi__num">${week}</span>
        <span class="kpi__label">이번 주</span>
      </div>
      <div class="kpi__card" role="listitem" aria-label="이번 달 등록 ${month}건">
        <span class="kpi__num">${month}</span>
        <span class="kpi__label">이번 달</span>
      </div>
    </div>
  `;
}
