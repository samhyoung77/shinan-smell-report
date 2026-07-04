---
name: vanilla-web-implementation
description: 빌드 도구 없이 정적 HTML/CSS/Vanilla JavaScript로 SPA를 구현한다. GitHub Pages 배포 가능한 형태. 해시 라우팅, ES6 모듈, CDN SDK 로딩, 모바일 반응형 CSS, localStorage stub, Firestore 연동 준비 등 정적 웹앱 구현 관련 요청은 반드시 이 스킬을 사용하라. React/Vue 없이 순수 웹으로 만드는 요구가 명시된 경우 우선 트리거.
---

# Vanilla 웹 구현

## 언제 사용하는가
- 빌드 도구·프레임워크 없이 정적 파일만으로 SPA를 구현할 때
- GitHub Pages/Netlify Drop 같은 정적 호스팅용 앱
- 컨텍스트가 "Vanilla JS", "빌드 없이", "정적 사이트"인 경우

## 파일 골격

```
프로젝트루트/
├── index.html
├── styles.css
├── js/
│   ├── app.js
│   ├── views/{name}.js
│   ├── components/{name}.js
│   ├── data.js
│   └── util.js
└── assets/
```

## index.html 필수 요소

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#XXXXXX">
  <title>앱 이름</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./js/app.js"></script>
</body>
</html>
```

- `type="module"` 사용 → import 가능, 자동 defer
- 상대 경로 `./` 필수 (GitHub Pages 하위 경로 대비)
- `viewport-fit=cover` iOS 노치 대응
- `theme-color`로 모바일 상단 바 색상 통일

## 해시 라우터 (한 함수)

```js
// js/router.js
const routes = new Map();
export function route(name, render) { routes.set(name, render); }
export function go(name) { location.hash = name; }
function apply() {
  const name = location.hash.slice(1) || 'home';
  const render = routes.get(name) || routes.get('home');
  const root = document.getElementById('app');
  root.innerHTML = '';
  render(root);
}
window.addEventListener('hashchange', apply);
window.addEventListener('DOMContentLoaded', apply);
```

## 뷰 함수 시그니처

```js
// js/views/home.js
export function renderHome(root) {
  root.innerHTML = `<section class="home">...</section>`;
  root.querySelector('#report-btn').addEventListener('click', onReport);
}
```

- 각 뷰는 `render{Name}(root)` 시그니처
- 이벤트 리스너는 querySelector 후 등록 (인라인 onclick 금지)

## data.js 이중화 패턴

Firestore 연동 전 로컬 스텁으로 개발하고, 통합 시 함수 몸통만 교체:

```js
// js/data.js — 스텁 버전
const KEY = 'shinanAPT';
function load() { return JSON.parse(localStorage.getItem(KEY) || '{"complexes":[],"reports":[]}'); }
function save(x) { localStorage.setItem(KEY, JSON.stringify(x)); }

export async function listComplexes() {
  return load().complexes;
}
export async function addComplex({name, region}) {
  const s = load();
  const id = crypto.randomUUID();
  s.complexes.push({id, name, region, createdAt: Date.now()});
  save(s);
  return id;
}
export async function reportSmell({complexId, intensity, note}) {
  const s = load();
  const now = new Date();
  s.reports.push({
    complexId, intensity, note: note || '',
    ts: now.toISOString(),
    clientDate: now.toISOString().slice(0, 10),
  });
  save(s);
}
export async function getReports({from, to} = {}) {
  return load().reports.filter(r => (!from || r.clientDate >= from) && (!to || r.clientDate <= to));
}
```

핵심: **반환 타입이 실제 Firestore 구현과 동일**해야 뷰 코드를 안 고침. `ts`는 ISO string, `clientDate`는 `YYYY-MM-DD`.

## CSS 원칙

```css
:root {
  --brand: #XXX;
  --ink: #XXX;
  --bg: #XXX;
  --surface: #XXX;
  --border: #XXX;
  --radius: 12px;
  --space: 16px;
}
@media (prefers-color-scheme: dark) {
  :root { --ink: #XXX; --bg: #XXX; --surface: #XXX; --border: #XXX; }
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto,
               'Apple SD Gothic Neo', sans-serif;
  color: var(--ink);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
.container {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space);
  min-height: 100dvh;
}
button {
  min-height: 44px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
```

- CSS 변수로 테마 → 다크 모드는 미디어 쿼리 하나로
- `min-height: 100dvh` iOS 주소창 대응
- `max-width: 480px` 데스크톱에서 폭 제한

## 히트맵 컴포넌트 골격

```js
// js/components/heatmap.js
// data: Array<{complexId, clientDate, intensity}>
// 반환: 단지×날짜 격자, 셀 색상은 강도 평균
export function renderHeatmap(container, data, complexes) {
  const dates = Array.from(new Set(data.map(d => d.clientDate))).sort();
  const rows = complexes.map(c => {
    const cells = dates.map(date => {
      const items = data.filter(d => d.complexId === c.id && d.clientDate === date);
      if (!items.length) return `<td class="cell empty" title="${date}"></td>`;
      const avg = items.reduce((s, i) => s + i.intensity, 0) / items.length;
      const level = Math.round(avg);
      return `<td class="cell level-${level}" title="${date}: ${items.length}건, 강도 ${avg.toFixed(1)}">${items.length}</td>`;
    }).join('');
    return `<tr><th scope="row">${c.name}</th>${cells}</tr>`;
  }).join('');
  container.innerHTML = `
    <div class="heatmap-scroll">
      <table class="heatmap">
        <thead><tr><th></th>${dates.map(d => `<th>${d.slice(5)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}
```

- 가로 스크롤 컨테이너로 감싸서 모바일에서 좌우 스와이프
- 셀에 `title`로 상세 (터치에서는 롱프레스)

## 신고 버튼 UX

```html
<div class="report-panel">
  <p class="q">지금 냄새가 나나요?</p>
  <div class="intensity" role="radiogroup" aria-label="냄새 강도">
    <button class="i i1" data-level="1" role="radio">약함</button>
    <button class="i i2" data-level="2" role="radio">보통</button>
    <button class="i i3" data-level="3" role="radio">강함</button>
  </div>
  <button id="report-btn" class="cta">지금 냄새 남 신고</button>
</div>
```

- 3개 강도 버튼 즉시 노출 → 선택 후 CTA. 2단계지만 화면 1개로 완료.
- ARIA 라디오그룹.

## 자주 하는 실수
- **절대 경로 `/js/app.js`** → GitHub Pages 하위 경로에서 깨짐. 항상 `./js/app.js`.
- **`type="module"` 미사용** → import 안 됨, 전역 오염
- **인라인 이벤트 핸들러** → CSP 대응 어려움, 테스트 어려움
- **날짜를 Date 객체로만 저장** → JSON 직렬화 시 손실. `ts`는 ISO string, `clientDate`는 `YYYY-MM-DD`로.
- **iframe 없는데 X-Frame-Options에 의존** → GitHub Pages 헤더는 조정 불가

## Firestore 통합 준비
`data.js`의 함수 시그니처는 유지하고 몸통만 교체 가능해야 한다. `firestore-anonymous-setup` 스킬이 이어받는다.
