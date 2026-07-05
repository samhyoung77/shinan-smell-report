# 동별 노출 히트맵(누적 랭킹) 스펙 — 2026-07-05

## 목표
"어느 동이 냄새 문제에 제일 많이 노출됐나"를 **한눈에**. 많이 노출된 동 = 진한 색, 적은 동 = 연한 색. 색 농도로 노출량을 인코딩하는 정렬형 히트맵.

## 데이터
- 입력: `reports`(선택 range로 이미 scoped, stats.js `scoped`), `view`('building'|'complex'), `dates`(기간 라벨용).
- 집계: row(동 또는 단지)별 **총 신고 건수** `count`. 보조로 평균 강도 `avg`(avgIntensity) 계산해 tooltip/aria에 병기.
- 정렬: `count` 내림차순(동점이면 avg 강도 높은 순 → 이름순).
- view='building'이면 12개 동, 'complex'이면 2개 단지(row.buildingIds로 합산). 기존 heatmap.js의 row 구성 로직과 동일하게.

## 시각화 (요약→상세: 격자 히트맵 '위'에 배치)
각 row = 가로 셀 1줄:
```
[동 라벨]  [■■■■■■░░░░  heat bar]  [N건(mono)]
```
- **색 농도(주 인코딩):** heat = count/maxCount 비율. 0..1 → 알파 `0.12 + 0.88*ratio`의 단일 난색(red 계열, "열"). count=0 row는 무채색 빈 셀(--surface-2)+연한 hairline. maxCount 동은 가장 진함.
- **막대 길이(보조 인코딩):** 같은 ratio로 bar width. 색+길이 이중 인코딩으로 판별 쉽게.
- **숫자:** 우측에 `N건` (--mono, tabular-nums).
- **순위 강조:** 1위 row에 작은 '최다' 뱃지 or 좌측 강조선(--primary 아주 절제). 과하지 않게.
- 헤더: "동별 노출 (최근 7일)" 등 range 반영 부제. 범례: "연함=적음 · 진함=많음".

## 색 정의 (테마 대응)
- heat 색은 값별 계산이라 JS에서 rgba 생성. 기준 rgb = red `225,83,83`(=intensity-3 계열, '열'). `rgba(225,83,83, alpha)`.
  - 라이트: 흰 배경 위 → 연한 분홍~진한 빨강. 다크: 근검정 위 → 어두운 적갈~강한 빨강. 둘 다 '열'로 읽힘.
- 텍스트/라벨: `--ink`/`--ink-muted`(토큰 자동 대응). 숫자: `--mono`.
- 빈 셀: `--surface-2` + `--hairline`.
- ⚠️ 이 red는 '노출량(열)' 표현이며 강도색(1/2/3)과 의미가 다름 → 범례로 명확히("진할수록 노출 많음"). 라벤더(--primary)는 순위 강조 정도만.

## range/view 연동
- stats.js `load()`에서 `scoped`,`s.view`,`s.range` 전달. range/view 변경 시 재렌더(기존 히트맵과 동일 타이밍).
- 부제의 기간 문구는 range로 분기("최근 7일"/"최근 30일"/"올해").

## 빈 상태
- 전체 0건: 컴포넌트 미렌더(stats.js가 slot 비움) — 홈 유도 메시지 중복 방지(기존 격자 히트맵 empty 로직과 일관).
- 데이터는 있으나 특정 동만 0: 해당 row는 빈 셀로 표시(정렬상 하단).

## 접근성
- 각 row `aria-label`: "{동} {N}건, 노출 {순위}위 중 {전체}". 색 단독 정보전달 금지 — 숫자·순위·막대 병기.
- 컨테이너 `role=list`, row `role=listitem`.

## 구현
- 신규 `js/components/exposure-heatmap.js` — `export function renderExposure(container, { reports, dates, view })`. 순수 DOM(막대는 CSS width%, 색 인라인 style rgba). 차트 라이브러리 금지.
- `js/views/stats.js`: 툴바 아래·`#trend-slot`과 `#heatmap-slot` 사이(또는 trend 아래)에 `#exposure-slot` 추가 + import + `load()` 연동.
- `styles.css`: `.exposure*` 스타일 신규(`/* --- Stats: Exposure heatmap --- */`). 토큰만.
- 유틸 재사용: `avgIntensity, esc`. 새 유틸 불필요 예상.

## 배치 순서(최종 stats)
KPI → 내 등록 → 툴바(동별/단지별·range) → 추세 그래프 → **동별 노출 히트맵(신규)** → 격자 히트맵 → 내보내기

STATUS: DONE (design)
