// date-picker.js — 헤더 pill + native <input type=date> 트리거
import { todayYMD, daysAgoYMD, formatKorMD } from '../util.js';

/**
 * Mount date pill into container.
 * @param {HTMLElement} container
 * @param {object} opts
 *   value: 'YYYY-MM-DD'  (initial)
 *   onChange: (ymd) => void
 */
export function mountDatePicker(container, { value, onChange } = {}) {
  const today = todayYMD();
  const min = daysAgoYMD(30);
  const max = today;
  let current = value && value >= min && value <= max ? value : today;

  container.innerHTML = `
    <button type="button"
            class="date-pill ${current === today ? '' : 'date-pill--past'}"
            aria-label="신고 날짜 선택. 현재 ${current === today ? '오늘' : formatKorMD(current)}">
      <span aria-hidden="true">🗓</span>
      <span class="date-pill__label">${current === today ? '오늘' : formatKorMD(current)}</span>
    </button>
    <input type="date" class="date-pill__hidden" tabindex="-1" aria-hidden="true"
           value="${current}" min="${min}" max="${max}">
  `;

  const btn = container.querySelector('.date-pill');
  const input = container.querySelector('input[type=date]');
  const label = container.querySelector('.date-pill__label');

  btn.addEventListener('click', () => {
    if (typeof input.showPicker === 'function') {
      try { input.showPicker(); return; } catch {}
    }
    input.focus();
    input.click();
  });

  input.addEventListener('change', () => {
    const v = input.value;
    if (!v) return;
    if (v > max) { input.value = max; return; }
    if (v < min) {
      // gently correct + toast is left to caller
      input.value = min;
      current = min;
    } else {
      current = v;
    }
    updateVisual();
    onChange && onChange(current);
  });

  function updateVisual() {
    const isToday = current === today;
    btn.classList.toggle('date-pill--past', !isToday);
    label.textContent = isToday ? '오늘' : formatKorMD(current);
    btn.setAttribute('aria-label',
      `신고 날짜 선택. 현재 ${isToday ? '오늘' : formatKorMD(current)}`);
  }

  return {
    getValue: () => current,
    setValue: (ymd) => {
      current = ymd;
      input.value = ymd;
      updateVisual();
    },
  };
}
