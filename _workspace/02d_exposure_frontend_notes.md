# 동별 노출 히트맵 — 프론트엔드 구현 노트 (2026-07-05)

## 수정/추가 파일
- **신규** `js/components/exposure-heatmap.js` — `renderExposure` 컴포넌트.
- **수정** `js/views/stats.js` — import + `#exposure-slot` DOM + `load()` 연동 (최소 침습 Edit).
- **수정** `styles.css` — `/* --- Stats: Exposure heatmap --- */` 섹션 신규(heatmap/legend 블록 뒤).
- data.js / Firestore / buildings.js 불변.

## renderExposure 시그니처·소비 shape
```js
export function renderExposure(container, { reports, dates, view })
```
- `container`: `#exposure-slot` HTMLElement.
- `reports`: range로 이미 scoped된 Array<Report>. 사용 필드: `buildingId`, `intensity`. (heatmap.js와 동일 소비. clientDate는 미사용 — 누적 집계라 날짜별 분해 불필요.)
- `dates`: `Array<'YYYY-MM-DD'>` — 기간 라벨 산출용만(부제). `dates.length > 60` → '올해', 아니면 `최근 {n}일` (trend/heatmap과 동일 임계).
- `view`: `'building'` | `'complex'`.

## 집계·정렬·색 공식
- **row 정의:** heatmap.js와 동일. building=12개 동, complex=`COMPLEXES` 별 `buildingIds` 합산.
- **집계:** row별 `count = reports.filter(r => buildingIds.includes(r.buildingId)).length`. 보조 `avg = avgIntensity(items)`(util 재사용) — tooltip/aria 병기용.
- **정렬:** `count` 내림차순 → `avg`(null=0) 내림차순 → `label.localeCompare(ko)`.
- **색(주 인코딩):** `ratio = count / maxCount`. `alpha = 0.12 + 0.88*ratio`. `rgba(225,83,83, alpha)` 인라인 style. maxCount row가 가장 진함. `count=0` row는 fill `width:0`(무채색 --surface-2 트랙만 노출) — 스펙의 "빈 셀" 처리.
- **막대 길이(보조):** 같은 ratio로 fill `width = ratio*100%` (min-width 2px로 저건수도 시각 확인).
- **숫자:** 우측 `N건` (--mono, tabular-nums).
- **순위:** 좌측 순위번호(mono, 모든 row) + 1위 `최다` 뱃지(--primary-tint-15) + 라벨 볼드. 색 단독 정보전달 금지 원칙 준수(색+막대+숫자+순위 4중 인코딩).
- **범례:** 헤더 우측 "연함=적음 · 진함=많음" + 3단 rgba 스와치.

## stats.js 연동 지점
1. import 추가(trend-chart import 다음 줄).
2. `#trend-slot`과 `#heatmap-slot` 사이에 `#exposure-slot` 삽입 → 배치순서: KPI→내등록→툴바→추세→**노출**→격자→내보내기.
3. `const exposureSlot = ...` 조회.
4. `load()` 정상 경로: `renderTrend` 다음 `renderExposure(exposureSlot, { reports: scoped, dates, view: s.view })` 호출 → range/view 토글 시 자동 재렌더(load 재호출).
5. 전체 0건 분기: `exposureSlot.innerHTML = ''`로 slot 비움(격자 히트맵 empty-state와 중복 방지, 스펙 준수).

## 빈 상태
- **전체 0건:** stats.js가 slot 비움(위 5번).
- **range 내 0건(전체>0, scoped=0):** `maxCount===0` → 컴포넌트가 축소판 안내 카드("이 기간에는 등록이 없어요. 기간을 넓혀보세요.") 렌더 — trend-chart 패턴과 일관. (12개 빈 row 나열 방지.)
- **일부 동만 0:** 정렬상 하단, fill 없는 빈 트랙 + is-empty 흐린 텍스트.

## 접근성
- 컨테이너 `role=list`, row `role=listitem`.
- row `aria-label`: "{동} {N}건, 노출 {순위}위 중 {전체}"(+평균 강도). `title` 툴팁 병기.
- 순위번호/뱃지/스와치는 `aria-hidden`(중복 낭독 방지, 정보는 aria-label에).

## 검증
- `node --check js/components/exposure-heatmap.js`, `node --check js/views/stats.js` → 통과.
- 차트 라이브러리 없음(순수 DOM/CSS). 토큰만 사용, heat만 값별 rgba 인라인(스펙).

## 알려진 한계
- 색상(red rgba)이 강도색(intensity-1/2/3)과 시각적으로 유사 → 범례 문구/뱃지로 의미 분리하나, 강도 히트맵과 나란히 볼 때 혼동 여지 있음(스펙에서 인지된 트레이드오프).
- 브라우저 실측(렌더/토글/반응형)은 미수행 — qa-verifier 검증 권장.

STATUS: DONE
