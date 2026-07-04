// Minimal hash router. Views register themselves; app.js kicks it off.
const routes = new Map();

export function route(name, render) {
  routes.set(name, render);
}

export function go(name) {
  if (location.hash === `#${name}`) {
    apply(); // force re-render on same route
  } else {
    location.hash = name;
  }
}

export function currentRoute() {
  return location.hash.slice(1) || 'home';
}

function apply() {
  const name = currentRoute();
  const render = routes.get(name) || routes.get('home');
  const root = document.getElementById('view-root');
  if (!root) return;
  root.innerHTML = '';
  try {
    render(root);
  } catch (err) {
    console.error('[router] render error', err);
    root.innerHTML = `<div class="empty-state">화면을 그리지 못했어요. 새로고침 해주세요.</div>`;
  }
  // Update tabbar active state
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.classList.toggle('is-active', el.dataset.tab === name);
    el.setAttribute('aria-current', el.dataset.tab === name ? 'page' : 'false');
  });
}

export function start() {
  window.addEventListener('hashchange', apply);
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
}
