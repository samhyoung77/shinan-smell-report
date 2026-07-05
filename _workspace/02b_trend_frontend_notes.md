# 02b — 일간 추세 그래프 프론트엔드 구현 노트

01b 스펙(`_workspace/01b_trend_design_spec.md`)대로 통계 화면에 일간 추세 그래프를 신규 구현했다.

## 수정/추가 파일
- **추가** `js/components/trend-chart.js` — 추세 그래프 렌더 컴포넌트(순수 인라인 SVG, 차트 라이브러리 없음).
- **수정** `js/views/stats.js` — import 1줄, `#trend-slot` DOM 1줄, `trendSlot` 참조 1줄, `load()` 내 `renderTrend(...)` 호출 + 전체 0건 분기에서 `trendSlot` 비움. (최소 침습)
- **수정** `styles.css` — `/* --- Stats: Trend chart --- */` 섹션 신규(툴바 섹션과 Heatmap 섹션 사이). 기존 토큰만 사용, 하드코딩 색 없음.
- **불변** `js/data.js`, `js/util.js`(신규 유틸 불필요 — 기존 `avgIntensity/cellLevel/formatKorMD/esc` 재사용), `js/components/heatmap.js`.

## renderTrend 시그니처 · 소비 shape
```js
export function renderTrend(container, { reports, dates })
```
- `container`: `#trend-slot` 엘리먼트.
- `reports`: range로 이미 필터된 `scoped` 배열. 소비 필드 = `{ clientDate:'YYYY-MM-DD', intensity:1|2|3 }` (읽기 전용).
- `dates`: `'YYYY-MM-DD'` 오름차순 배열. **모드 분기 기준**: `dates.length > 60 → MODE B`, else `MODE A` (heatmap.js와 동일 `>60` 임계).
- range 접두사는 `dates.length`에서 파생(7/30 → "최근 N일", year → "올해"). `range` 인자를 별도로 받지 않음(과제 시그니처 준수).

## stats.js 연동 지점
- 툴바(`.stats-toolbar`)와 `#heatmap-slot` 사이에 `<div id="trend-slot"></div>` 배치.
- `load()` 안, 전체 0건 early-return **이후**, `renderHeatmap` 호출 **직전**에 `renderTrend(trendSlot, { reports: scoped, dates })` 호출 → 뷰 토글/range 변경 시 자동 재렌더.
- 빈 상태 2단계: (1) 전체 0건은 stats.js가 `trendSlot`을 비우고 히트맵 슬롯에만 홈 유도(카드 미렌더, 중복 방지). (2) 전체는 있으나 range 내 0건은 컴포넌트가 `.trend-empty` 축소판 카드로 안내.

## 렌더 동작 요약
- **MODE A (7/30일)**: 강도 스택 막대(약함→보통→심함, 최상단 세그먼트만 rx, 30일 rx=1). y눈금 3개(0/mid/yMax) + 헤어라인. x라벨 7일=매일(+월경계 M/1), 30일=5일간격+월1일. 가로 스크롤 없음.
- **MODE B (year)**: `--primary` area-라인(라벤더는 여기서만) + `--primary-tint-15` 채움, baseline 아래 강도 히트 스트립(`cellLevel`→`--cell-*-bg`), x라벨=매월 1일. 데이터 포인트 1개면 중앙 점.
- **좌표계**: `.trend__plot` clientWidth 측정 → `viewBox 0 0 W 168`, 왜곡 없음. 측정 실패/숨김 시 416px 폴백.
- **인터랙션**: 날짜별 투명 `.trend__hit` rect(슬롯 전폭×플롯 전높이)에 mouseenter/mouseleave/focus/touchstart(passive) → 상단 `.trend__readout`(aria-live) 갱신 + 마크 강조(A=막대 밝기↑, B=세로 가이드선+포인트). 데스크톱은 leave 시 기본 복귀, 모바일 tap은 다음 tap까지 유지.
- **접근성**: `svg role="img"` 요약 aria-label, 각 hit rect `aria-label="M월 D일, N건"` + `<title>`, `.visually-hidden` 대체표(날짜/총/약/보/심 전체). 모든 수치 `--mono`.
- **리사이즈**: `window.resize` debounce(200ms) 재렌더. 재호출 시 이전 리스너를 `container._trendCleanup`으로 정리해 누수 방지.

## 검증
- `node --check js/components/trend-chart.js` → OK
- `node --check js/views/stats.js` → OK

## 알려진 한계 / 결정
- hit rect에 `tabindex` 미부여(스펙 권고: 대체표+`<title>`/aria-label로 SR 요건 충족, year 185개 탭스톱 방지). 키보드 사용자는 대체표로 데이터 접근.
- `s.view`(동별/단지별)는 추세에 영향 없음(전 단지 합산). view 토글 시 재렌더돼도 결과 동일.
- 좌표를 소수 2자리로 반올림해 SVG 문자열 경량화(시각 영향 없음).
- 리사이즈 리스너는 stats 뷰를 떠날 때 명시적 unmount 훅이 없어 `resize`에서 재렌더를 시도할 수 있으나, 다음 렌더 시 정리되고 stale 컨테이너 접근은 무해(clientWidth 폴백). 실사용 영향 미미.

STATUS: DONE
