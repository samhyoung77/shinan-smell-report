// app.js — entry point. Builds shell, mounts router, and wires header/tabbar.
import { route, start } from './router.js';
import { renderHome } from './views/home.js';
import { renderStats } from './views/stats.js';

// Guard against uncaught async errors surfacing as blank screen.
window.addEventListener('error', ev => console.error('[app] error', ev.error || ev.message));
window.addEventListener('unhandledrejection', ev => console.error('[app] unhandledrejection', ev.reason));

/**
 * Build outer shell: header + view root + tabbar.
 * Views populate #header-right per route.
 */
function buildShell() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="app">
      <header class="header" role="banner">
        <div class="header__brand">
          <span class="brand-dot" aria-hidden="true"></span>
          <span id="header-title">똥냄새 피해현황</span>
        </div>
        <div id="header-right"></div>
      </header>

      <nav class="topseg" role="navigation" aria-label="화면 전환">
        <a class="topseg__item" href="#home" data-tab="home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5"/>
            <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>
          </svg>
          <span>홈 · 신고하기</span>
        </a>
        <a class="topseg__item" href="#stats" data-tab="stats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 20V10"/>
            <path d="M10 20V4"/>
            <path d="M16 20v-8"/>
            <path d="M22 20H2"/>
          </svg>
          <span>통계 보기</span>
        </a>
      </nav>

      <main id="main" class="main" tabindex="-1">
        <div id="view-root"></div>
      </main>

      <nav class="tabbar" role="navigation" aria-label="주요 화면">
        <div class="tabbar__inner">
          <a class="tabbar__item" href="#home" data-tab="home">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 10.5 12 3l9 7.5"/>
                <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>
              </svg>
            </span>
            <span>홈</span>
          </a>
          <a class="tabbar__item" href="#stats" data-tab="stats">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 20V10"/>
                <path d="M10 20V4"/>
                <path d="M16 20v-8"/>
                <path d="M22 20H2"/>
              </svg>
            </span>
            <span>통계</span>
          </a>
        </div>
      </nav>
    </div>
  `;
}

function setHeader({ title, rightHtml = '' }) {
  const t = document.getElementById('header-title');
  const r = document.getElementById('header-right');
  if (t) t.textContent = title;
  if (r) r.innerHTML = rightHtml;
}

function bootRoutes() {
  route('home', async (root) => {
    setHeader({ title: '똥냄새 피해현황' });
    await renderHome(root);
  });

  route('stats', async (root) => {
    setHeader({ title: '통계' });
    await renderStats(root);
  });
}

buildShell();
bootRoutes();
start();
