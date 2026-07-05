# 01b — 일간 추세 그래프(Daily Trend Chart) 디자인 스펙

통계 화면(stats)에 신규 추가되는 **일간 추세 그래프** 컴포넌트의 UX/UI 스펙.
기존 동별/단지별 히트맵은 그대로 유지되며, 이 컴포넌트는 그 **위(툴바 아래)**에 삽입된다.

- 대상 화면: `js/views/stats.js`
- 배치: `#kpi-slot` → `#my-slot` → `.stats-toolbar` → **[신규] `#trend-slot`** → `#heatmap-slot` → 내보내기 버튼
- 구현 제약: 빌드도구·차트 라이브러리 금지. **순수 인라인 SVG + 디자인 토큰 CSS**만.
- 산출물 성격: 스펙 문서. 실제 코드(js/*, styles.css)는 frontend-builder가 이 문서대로 구현한다.

---

## 0. 핵심 권고 (요약 — 이것부터 읽어라)

**"하나의 컴포넌트, range에 따라 두 렌더 모드"**를 권고한다. 480px 폭에서 가독성이 가장 좋은 구성이다.

| range | 일수 | 렌더 모드 | 이유 |
|-------|------|----------|------|
| `7`  | 7일  | **MODE A — 강도 스택 막대** | 막대 슬롯 ~55px, 실제 막대 폭 ~40px. 강도(1/2/3) 3색 스택이 또렷하게 구분됨. |
| `30` | 30일 | **MODE A — 강도 스택 막대** | 막대 슬롯 ~13px, 막대 폭 ~9px. 스택 세그먼트가 아직 식별 가능. 가로 스크롤 불필요(뷰포트에 그대로 들어감). |
| `year` | 최대 ~185일 | **MODE B — 총합 area-라인 + 강도 평균 히트 스트립** | 185개 일별 막대는 폭 ~2px로 스택 세그먼트가 뭉개짐. 대신 총합을 area-라인 한 줄로 그리면 추세가 깔끔하고 **가로 스크롤 없이 전 구간이 한눈에** 들어옴. 강도는 축 아래 1행 히트 스트립(히트맵 셀색 재사용)으로 표현 → 아래 히트맵과 시각적으로 자연스럽게 연결. |

**왜 스택 막대를 year까지 밀지 않는가:** year를 막대+가로스크롤로 하면 바로 아래 히트맵(year일 때 이미 가로 스크롤됨)과 스크롤 UI가 중복되어 어수선하다. 추세 그래프의 존재 이유는 "히트맵과 달리 전 구간을 한 화면에 요약"하는 것이므로, year는 **스크롤 없는 라인 오버뷰**가 정답이다.

**색 사용 원칙 준수:** 라벤더(`--primary`)는 MODE B의 area-라인 한 곳에만 액센트로 쓴다(단일 차트의 주선). 막대의 데이터 색은 오직 `--intensity-1/2/3`. 히트 스트립은 `--cell-1/2/3-bg`. 색만으로 정보 전달하지 않도록 범례·수치·aria-label을 항상 병기한다.

---

## 1. 컴포넌트 구조

### 1.1 컨테이너 (공통)

`#trend-slot` 안에 카드 하나를 렌더한다. 톤은 기존 `.kpi__card` / `.my-card`와 동일한 surface-1 계열(신규 클래스 `.trend-card`).

```
┌─ .trend-card (surface-1, 1px hairline, r-lg 12px, padding 16px) ─────────┐
│  .trend-card__head                                                        │
│    └ .eyebrow  "일간 추세"            [범례: ■약함 ■보통 ■심함]  ← 우측    │
│  .trend__readout   (aria-live=polite, --mono)                             │
│    └ 기본: "최근 7일 · 총 24건 · 하루 평균 3.4건"                          │
│       (막대/포인트 hover·tap 시: "7월 3일 · 4건 (약함1·보통2·심함1)")      │
│  .trend__plot                                                             │
│    └ <svg role="img" aria-label="…요약…"> … </svg>                        │
│  <table class="visually-hidden">  ← 스크린리더용 데이터 대체표             │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.2 DOM 뼈대 (frontend-builder가 생성)

```html
<div class="trend-card" aria-label="일간 추세">
  <div class="trend-card__head">
    <span class="eyebrow">일간 추세</span>
    <div class="trend__legend" aria-hidden="true">
      <span class="trend__lg"><i class="sw i1"></i>약함</span>
      <span class="trend__lg"><i class="sw i2"></i>보통</span>
      <span class="trend__lg"><i class="sw i3"></i>심함</span>
    </div>
  </div>

  <p class="trend__readout" aria-live="polite">최근 7일 · 총 24건 · 하루 평균 3.4건</p>

  <div class="trend__plot">
    <svg class="trend__svg" role="img"
         aria-label="최근 7일 일간 추세. 총 24건, 하루 평균 3.4건.">
      <!-- (아래 2.x 참조: 그리드선, 막대 or 라인, 히트 스트립, 축 라벨, 히트 rect) -->
    </svg>
  </div>

  <!-- 스크린리더 대체표: 색·모양에 의존하지 않는 완전한 데이터 -->
  <table class="visually-hidden">
    <caption>일간 등록 건수</caption>
    <thead><tr><th>날짜</th><th>건수</th><th>약함</th><th>보통</th><th>심함</th></tr></thead>
    <tbody>
      <tr><th scope="row">7월 3일</th><td>4</td><td>1</td><td>2</td><td>1</td></tr>
      <!-- … dates 순회 … -->
    </tbody>
  </table>
</div>
```

### 1.3 SVG 내부 레이어 순서 (뒤→앞)

1. **그리드/축** — 베이스라인 + y축 눈금선(0 / mid / yMax), 축 라벨(`--mono`).
2. **데이터 마크** — MODE A: 스택 막대 3세그먼트 / MODE B: area 채움 + 라인 path.
3. **강도 히트 스트립** — MODE B 전용, 축 아래 1행.
4. **x축 라벨** — 날짜.
5. **히트 레이어** — 날짜별 투명 `.trend__hit` rect(슬롯 전폭 × 플롯 전높이). `role="img"` + `aria-label="M월 D일, N건"` + `<title>`. hover/focus/tap 대상.

### 1.4 빈 상태 (Empty state)

두 단계로 구분한다.

- **전체 데이터 0건:** stats.js가 이미 `#heatmap-slot`에서 처리(“아직 등록이 없어요…”). 이 경우 **`#trend-slot`은 렌더하지 않고 비운다**(카드 자체를 만들지 않음). → 홈 유도 메시지 중복 방지.
- **전체는 있으나 선택 range 안에 0건:** 카드는 렌더하되 플롯 영역에 인라인 안내:

```html
<div class="trend-card" aria-label="일간 추세">
  <div class="trend-card__head"><span class="eyebrow">일간 추세</span></div>
  <p class="trend-empty">이 기간에는 등록이 없어요. 기간을 넓혀보세요.</p>
</div>
```

`.trend-empty`: `.empty-state` 톤 축소판(패딩 24px 12px, `--ink-muted`, 14px, 중앙 정렬).

---

## 2. range별 렌더링 규칙 & 반응형

### 2.0 공통 좌표계 (px = viewBox 1:1, 왜곡 없음)

SVG는 `width="100%"`로 두되, **컨테이너 `clientWidth`를 측정해 그 px값과 동일한 viewBox**로 그린다(`preserveAspectRatio` 왜곡 금지). 스트로크/텍스트가 항상 선명하다.

```js
const H = 168;                         // SVG 총 높이(px). 고정.
const M = { l: 30, r: 8, t: 12, b: 22 }; // year 모드는 b: 28 (히트 스트립 공간)
const W = container.clientWidth;       // 측정값 (레이아웃 후)
const plotL = M.l, plotR = W - M.r;
const plotW = plotR - plotL;
const plotT = M.t, plotB = H - M.b;
const plotH = plotB - plotT;           // ≈ 134 (year: ≈128)
```

- 480px 콘텐츠 폭 기준 실측 가용 폭: `480 − 2×16(page) − 2×16(card) ≈ 416px`. viewBox W가 여기에 맞춰 자동 축소되므로 더 좁은 폰(360px)에서도 동일 로직으로 스케일된다.
- `y` 스케일: `yMax = max(일별 총건수, 1)`. `scale = plotH / yMax`.
- **리사이즈/방향 전환 대응:** stats.js `load()` 재호출 시 다시 그림. 추가로 `ResizeObserver`(있으면) 또는 `window.resize` debounce(200ms, util의 `debounce` 재사용)로 재렌더 권장. 필수는 아님(뷰 전환 시 어차피 재렌더).

### 2.1 MODE A — 강도 스택 막대 (7일 / 30일)

```js
const n = dates.length;
const slot = plotW / n;
const barW = Math.min(slot * 0.72, 40);   // 7일에서 과하게 굵어지지 않게 40px 캡
// day i:
const cx   = plotL + slot * (i + 0.5);
const barX = cx - barW / 2;
// 강도별 건수 c1,c2,c3 (그 날 clientDate === dates[i] 인 리포트를 intensity로 분류)
const h1 = c1 * scale, h2 = c2 * scale, h3 = c3 * scale;
const y1 = plotB - h1;         // 약함: 바닥
const y2 = y1  - h2;           // 보통
const y3 = y2  - h3;           // 심함: 맨 위
```

- 스택 순서(바닥→위): **약함(i1) → 보통(i2) → 심함(i3)**. 심함이 위로 쌓여 “심한 날”이 시각적으로 튀어 보이게.
- 각 세그먼트 `fill`: `--intensity-1/2/3`. 세그먼트 사이 1px 헤어라인 간격 없음(맞붙임). 최상단 세그먼트만 `rx=2`(둥근 머리), 하위는 각짐. 폭이 얇은 30일에선 `rx=1`.
- **라벨 규칙**
  - 7일: **매일** 표기. 기본은 일(`D`), 매월 1일은 `M/1`(월 경계). (heatmap.js와 동일 규칙 재사용)
  - 30일: **5일 간격**(i % 5 === 0) + 매월 1일. 나머지는 라벨 생략(막대는 모두 그림).
  - 라벨은 슬롯 중앙 `text-anchor="middle"`. 겹치면 생략이 회전보다 낫다(회전 금지).
- **가로 스크롤: 없음.** 7·30일 모두 뷰포트에 들어간다.
- y축: 눈금 3개(0, `round(yMax/2)`, `yMax`) + 각 눈금 가로 헤어라인(`--hairline`, 0.5px 느낌). 라벨은 좌측 gutter(`--mono`, 10px, `--ink-subtle`).

### 2.2 MODE B — 총합 area-라인 + 강도 히트 스트립 (year, 최대 ~185일)

```js
// margins: M.b = 28 (히트 스트립 + 라벨)
const n = dates.length;
const x = i => plotL + (n === 1 ? plotW/2 : (i/(n-1)) * plotW);
const yTot = i => plotB - (total_i / yMax) * plotH;   // total_i = 그 날 총건수
```

- **총합 라인(주선):** `stroke=var(--primary)`, `stroke-width=1.5`, `fill=none`, `stroke-linejoin/​cap=round`. ← 라벤더가 허용되는 **유일한 액센트 지점**.
- **area 채움:** 라인 아래를 `fill=var(--primary-tint-15)`로 살짝. path는 `M x0,plotB L x0,y0 … L xn-1,yn-1 L xn-1,plotB Z`.
- **강도 히트 스트립(보조):** 축 baseline 바로 아래 1행. 날짜당 셀 1개, 폭 = `plotW/n`(≈2.1px, 간격 0으로 연속 밴드). 각 셀 `fill`은 그 날 `cellLevel(avgIntensity(그날items))` → `--cell-1/2/3-bg`, 0건은 `--cell-0-bg`(투명, 미세 헤어라인 baseline만). 위치: `y = plotB + 2`, `height = 7`.
  - 의미: 라인은 “얼마나 많이”, 스트립은 “얼마나 독한 날이었나”. 아래 히트맵과 같은 셀색이라 시선이 자연스럽게 이어진다.
- **라벨 규칙:** 매월 1일에만 월 숫자(`7`처럼). `text-anchor="middle"`, `y = H − 6`. (heatmap.js year 라벨 규칙과 동일 톤)
- **가로 스크롤: 없음.** 전 구간을 한 화면에.
- 데이터 포인트가 1개뿐이면 라인 대신 중앙에 점 1개(`r=2.5`, `--primary`) + area 생략.

### 2.3 반응형 요약표

| 항목 | 7일 (A) | 30일 (A) | year (B) |
|------|---------|----------|----------|
| 마크 | 스택 막대 | 스택 막대 | area-라인 + 히트 스트립 |
| 막대/슬롯 폭 | slot ~55px / bar ≤40px | slot ~13px / bar ~9px | 라인(막대 없음), 스트립 셀 ~2.1px |
| x 라벨 간격 | 매일(+월경계) | 5일마다(+월경계) | 매월 1일 |
| 가로 스크롤 | 없음 | 없음 | 없음 |
| 강도 표현 | 3색 스택 | 3색 스택 | 히트 스트립(cell 색) |
| 라벤더 사용 | 없음 | 없음 | 라인 1개 + area tint |

---

## 3. 색 / 치수 / 타이포 토큰 매핑

모두 **기존 토큰만** 사용. 다크/라이트는 토큰이 `prefers-color-scheme`로 자동 전환되므로 별도 분기 CSS 불필요.

### 3.1 색

| 용도 | 토큰 | 다크값 | 라이트값 |
|------|------|--------|----------|
| 카드 배경 | `--surface-1` | #0f1011 | #ffffff |
| 카드 보더 | `--hairline` | #23252a | #e5e7eb |
| 막대 약함(i1) | `--intensity-1` | #eab308 | #a16207 |
| 막대 보통(i2) | `--intensity-2` | #e0a000 | #b45309 |
| 막대 심함(i3) | `--intensity-3` | #e15353 | #b91c1c |
| 히트 스트립 lv1/2/3 | `--cell-1-bg`/`--cell-2-bg`/`--cell-3-bg` | rgba 틴트 | 파스텔 |
| 히트 스트립 lv0/baseline | `--cell-0-bg` / `--hairline` | 투명/헤어라인 | 투명/헤어라인 |
| year 라인(주선) | `--primary` | #5e6ad2 | #5e6ad2 |
| year area 채움 | `--primary-tint-15` | rgba(94,106,210,.15) | rgba(94,106,210,.14) |
| y축 눈금선 | `--hairline` | #23252a | #e5e7eb |
| 축 라벨 텍스트 | `--ink-subtle` | #8a8f98 | #6b7280 |
| readout 텍스트 | `--ink-muted` | #d0d6e0 | #4a4d55 |
| 포커스 링 | `--primary-focus` | #5e69d1 | #5e69d1 |

> 범례 스와치(`.trend__legend .sw.i1/i2/i3`)는 **막대와 동일하게 `--intensity-1/2/3` 솔리드**로 칠한다(히트맵 범례의 cell-틴트와 다름에 주의 — 막대는 데이터 잉크라 채도 높은 원색).

### 3.2 치수 (px)

| 항목 | 값 |
|------|----|
| 카드 padding | 16px (`--sp-md`) |
| 카드 radius | 12px (`--r-lg`) |
| 카드 보더 | 1px `--hairline` |
| head ↔ readout ↔ plot 세로 간격 | 8px (`--sp-xs`) |
| SVG 높이 H | 168px 고정 |
| 여백 M | l:30, r:8, t:12, b:22 (year b:28) |
| 막대 폭 | `min(slot*0.72, 40)` |
| 막대 상단 radius | 2px (30일 1px) |
| year 라인 굵기 | 1.5px |
| 히트 스트립 높이 | 7px, baseline+2px 아래 |
| y축 눈금선 | 1px(시각적 0.5~1px) `--hairline` |
| 범례 스와치 | 10×10px, radius 2px |
| 포커스 아웃라인 | 2px `--primary-focus` |
| 최소 터치 타겟 | 히트 rect는 슬롯 전폭×플롯 전높이(세로 134px 확보 → 44px 충족). 7·30일 폭도 히트 rect는 슬롯 전폭이라 겹침 문제 없음. |

### 3.3 타이포

| 항목 | family | size | weight | 비고 |
|------|--------|------|--------|------|
| eyebrow "일간 추세" | 본문(Jua 등) | 13px | 500 | `.eyebrow` 재사용, `letter-spacing .4px`, `--ink-subtle` |
| readout | **`--mono`** | 13px | 400 | 수치 데이터 → 고정폭. `--ink-muted` |
| y축/x축 라벨 | **`--mono`** | 10px | 400 | `--ink-subtle` |
| 범례 라벨 | 본문 | 11px | 400 | `--ink-muted` |
| 대체표(visually-hidden) | — | — | — | 화면 비표시, SR 전용 |

> 모든 **수치(건수·평균·축 눈금)는 `--mono`**로 통일(요구사항: "--mono(수치)").

---

## 4. 인터랙션 & 접근성

### 4.1 hover / tap → readout 갱신 (툴팁 대체)

모바일에서 떠다니는 툴팁은 손가락에 가려지므로, **차트 상단 고정 `.trend__readout`** 한 줄을 값 표시 영역으로 쓴다.

- 기본 문구(로드 시): `"최근 7일 · 총 {합계}건 · 하루 평균 {평균}건"` (range별 접두: 최근 7일 / 최근 30일 / 올해)
- **hover(데스크톱)·focus·touchstart/tap(모바일)** 시 해당 날짜로 교체:
  `"{M월 D일} · {N}건 (약함{c1}·보통{c2}·심함{c3})"` — 0건인 강도는 생략 가능, 총 0건이면 `"{M월 D일} · 없음"`.
- 포인터가 떠나면(`mouseleave`) 기본 문구로 복귀. 모바일 tap은 다음 tap 전까지 유지.
- 대상 날짜의 마크 강조: 해당 `.trend__hit`에 `.is-active`(막대는 밝기↑ 또는 1px `--ink` outline; year는 그 x에 세로 가이드선 `--hairline-strong` + 라인 위 점 `r=2.5 --primary`).
- `readout`은 `aria-live="polite"`라 SR도 갱신값을 읽는다.

### 4.2 접근성 규칙 (색만으로 정보 전달 금지)

1. **SVG 요약:** `<svg role="img" aria-label="최근 7일 일간 추세. 총 24건, 하루 평균 3.4건, 가장 많은 날 7월 3일 4건.">`.
2. **날짜별 aria-label(요구 명시):** 각 `.trend__hit` rect에
   `role="img"` + `aria-label="{M월 D일}, {N}건"` (예: `"7월 3일, 4건"`). `<title>` 자식으로 네이티브 hover 툴팁도 병행. → **"막대/포인트에 aria-label로 'M월 D일, N건' 병기"** 충족.
3. **완전 대체표:** `.visually-hidden <table>`에 날짜×(총/약/보/심) 전체를 넣어 색·모양 없이도 데이터 접근 가능.
4. **범례 + 수치 병기:** 강도는 범례 텍스트(약함/보통/심함)와 readout·표의 숫자로 이중 표기. 색맹 대응.
5. **키보드:** 히트 rect를 탭 순회시키려면 `tabindex="0"`를 부여(선택). 부담되면 대체표만으로 SR 요건 충족 → rect는 `tabindex` 없이 `<title>`+`aria-label`만. **권고: 대체표 필수 + rect `<title>`/aria-label, tabindex는 생략 가능.**
6. **대비:** 축/범례 텍스트는 `--ink-subtle`/`--ink-muted`로 surface-1 위 WCAG AA 충족(기존 토큰 검증됨). 막대 원색은 데이터 마크로 텍스트 대비 규정 비적용.
7. **모션:** 막대 grow/라인 draw 애니메이션은 선택 사항. 넣는다면 `--dur-med`/`--ease`, `prefers-reduced-motion: reduce`에서 즉시 표시로 폴백.

### 4.3 데이터 파이프라인 (stats.js 연동)

- stats.js `load()` 안에서 이미 계산되는 **`scoped`(range 필터된 reports)와 `dates`**를 그대로 넘긴다. 신규 slot 추가만 하면 됨:
  ```js
  // renderStats innerHTML: 툴바와 heatmap-slot 사이에 추가
  <div id="trend-slot"></div>
  // load() 안, renderHeatmap 호출 직전:
  renderTrend(trendSlot, { reports: scoped, dates, range: s.range });
  ```
- `s.view`(building/complex)는 **추세 그래프에 영향 없음**(전 단지 합산 추이). view 토글 시 재렌더돼도 결과 동일 — 문제 없음. (원하면 향후 확장 여지로만 남김)
- 유틸 재사용: `avgIntensity`, `cellLevel`(히트 스트립), `formatKorMD`(라벨/aria), `esc`(문자열). 신규 헬퍼는 `js/components/trend.js` 내부 지역 함수로.

---

## 5. 구현자용 체크리스트 (frontend-builder)

**파일**
- [ ] `js/components/trend.js` 신규 생성, `export function renderTrend(container, { reports, dates, range })`.
- [ ] `js/views/stats.js`: 툴바와 `#heatmap-slot` 사이에 `<div id="trend-slot"></div>` 추가, `renderTrend` import 및 `load()` 안에서 호출(전체 0건이면 미렌더).
- [ ] `styles.css`: `.trend-card`, `.trend-card__head`, `.trend__legend`, `.trend__readout`, `.trend__plot`, `.trend__svg`, `.trend__hit`, `.trend-empty`, 범례 `.sw.i1/i2/i3` 스타일 추가. **토큰만 사용.**

**렌더 로직**
- [ ] `dates` 길이로 모드 결정: `dates.length > 60 → MODE B(line)`, else `MODE A(bars)`. (year는 heatmap.js와 동일한 `>60` 임계 사용해 일관성 유지)
- [ ] 컨테이너 `clientWidth` 측정 후 viewBox `0 0 W 168`, `preserveAspectRatio` 왜곡 없이.
- [ ] 일별 집계: `dates` 순회하며 각 날짜의 intensity 1/2/3 건수(c1/c2/c3)·총합 계산. `yMax = max(총합, 1)`.
- [ ] MODE A: 스택 막대(약함→보통→심함, 위 세그먼트 rx=2), x라벨(7일=매일, 30일=5일+월1일), y눈금 3개.
- [ ] MODE B: area+라인(`--primary`/`--primary-tint-15`), 축 아래 히트 스트립(`cellLevel`→`--cell-*-bg`), x라벨=매월 1일.
- [ ] 날짜별 투명 `.trend__hit` rect(슬롯 전폭×플롯 전높이) + `role="img"` `aria-label="M월 D일, N건"` + `<title>`.
- [ ] `.visually-hidden` 대체표 생성(날짜/총/약/보/심).
- [ ] `.trend__readout` 기본 문구(range별 접두 + 총합 + 하루 평균) 설정, `aria-live="polite"`.

**인터랙션**
- [ ] hit rect에 `mouseenter`/`focus`/`touchstart`(passive) → readout 갱신 + `.is-active` 강조. `mouseleave` → 기본 복귀.
- [ ] MODE B active 시 세로 가이드선 + 포인트 점 표기.
- [ ] (선택) `window.resize` debounce 재렌더.

**품질/엣지**
- [ ] 전체 0건: `#trend-slot` 비움(카드 없음).
- [ ] range 내 0건: `.trend-empty` 안내.
- [ ] 데이터 포인트 1개(year): 라인 대신 중앙 점.
- [ ] 라이트/다크: 토큰 자동 전환 확인(추가 미디어쿼리 불필요).
- [ ] 360px 폰: 라벨 겹침 시 생략(회전 금지), 막대/라인 스케일 정상.
- [ ] `--mono`로 모든 수치 렌더 확인, 라벤더는 MODE B 라인/area 외 사용 없음 확인.
- [ ] 히트맵은 그대로 아래 유지(중복·간섭 없음).

---

## 6. 참고 SVG 스니펫 (구현 착수용, 예시값)

**MODE A — 7일 스택 막대 (한 날 예시)**
```html
<svg class="trend__svg" role="img" aria-label="최근 7일 일간 추세. 총 24건, 하루 평균 3.4건.">
  <!-- y 눈금선 -->
  <line x1="30" y1="146" x2="392" y2="146" stroke="var(--hairline)"/>
  <line x1="30" y1="79"  x2="392" y2="79"  stroke="var(--hairline)"/>
  <text x="26" y="150" text-anchor="end" font-family="var(--mono)" font-size="10"
        fill="var(--ink-subtle)">0</text>
  <text x="26" y="83"  text-anchor="end" font-family="var(--mono)" font-size="10"
        fill="var(--ink-subtle)">4</text>

  <!-- 7월 3일: 약함1·보통2·심함1 (scale=134/8 등 예시) -->
  <g>
    <rect x="43" y="129" width="34" height="17" fill="var(--intensity-1)"/>
    <rect x="43" y="95"  width="34" height="34" fill="var(--intensity-2)"/>
    <rect x="43" y="78"  width="34" height="17" rx="2" fill="var(--intensity-3)"/>
  </g>
  <text x="60" y="160" text-anchor="middle" font-family="var(--mono)" font-size="10"
        fill="var(--ink-subtle)">3</text>

  <!-- 히트(투명, 슬롯 전폭×플롯 전높이) -->
  <rect class="trend__hit" x="37" y="12" width="46" height="134"
        fill="transparent" role="img" aria-label="7월 3일, 4건">
    <title>7월 3일 · 4건 (약함1·보통2·심함1)</title>
  </rect>
</svg>
```

**MODE B — year 라인 + 히트 스트립 (골격)**
```html
<svg class="trend__svg" role="img" aria-label="올해 일간 추세. 총 128건, 하루 평균 0.9건.">
  <line x1="30" y1="140" x2="472" y2="140" stroke="var(--hairline)"/>
  <!-- area -->
  <path d="M30,140 L30,120 L48,96 L66,110 … L472,132 L472,140 Z"
        fill="var(--primary-tint-15)"/>
  <!-- 총합 라인 (유일한 라벤더 액센트) -->
  <path d="M30,120 L48,96 L66,110 … L472,132"
        fill="none" stroke="var(--primary)" stroke-width="1.5"
        stroke-linejoin="round" stroke-linecap="round"/>
  <!-- 강도 히트 스트립 (baseline+2, h7): 날짜당 cell -->
  <g>
    <rect x="30"   y="142" width="2.1" height="7" fill="var(--cell-2-bg)"/>
    <rect x="32.1" y="142" width="2.1" height="7" fill="var(--cell-3-bg)"/>
    <!-- … dates … -->
  </g>
  <!-- 월 라벨: 매월 1일 -->
  <text x="30" y="162" text-anchor="middle" font-family="var(--mono)" font-size="10"
        fill="var(--ink-subtle)">1</text>
  <!-- … 히트 rect들 동일 패턴 … -->
</svg>
```

> 위 좌표는 예시(고정 W)일 뿐, 실제로는 `clientWidth` 측정값 기반으로 계산한다.

STATUS: DONE
