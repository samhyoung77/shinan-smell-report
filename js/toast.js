// toast.js — 라이트 토스트 (Surface-2, 3초)
export function showToast(message, { kind = 'info', ms = 3000 } = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast toast--${kind}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 180ms ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  }, ms);
}
