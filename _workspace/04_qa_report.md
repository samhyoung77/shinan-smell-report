# QA Report — shinanAPT

## Environment
- Windows 11 + Git Bash (PowerShell 대신 bash로 실행)
- Node v (내장) — 15개 JS 파일 `node --check` 통과
- 로컬 서버: `python -m http.server 8765` 부팅 성공, index.html/app.js/data.js/assets/map.jpg 모두 200 OK 응답
- **브라우저 자동화: BROWSER_UNAVAILABLE** — claude-in-chrome MCP는 사용자 선택(AskUserQuestion) 없이 브라우저를 지정할 수 없어 이 서브에이전트 컨텍스트에서는 실측 불가. 정적 검증 + HTTP 리소스 확인으로 대체.

## Summary
- BLOCKER: 0
- MAJOR:   0
- MINOR:   2
- INFO:    4
- FIXED:   3 (모두 MINOR/INFO)

---

## Static Checks

### 1. JS Syntax (`node --check`)

| 파일 | 결과 |
|---|---|
| `js/app.js` | pass |
| `js/buildings.js` | pass |
| `js/data.js` | pass |
| `js/firebase.js` | pass |
| `js/firebase-config.example.js` | pass |
| `js/router.js` | pass |
| `js/toast.js` | pass |
| `js/util.js` | pass |
| `js/views/home.js` | pass |
| `js/views/stats.js` | pass |
| `js/components/date-picker.js` | pass |
| `js/components/heatmap.js` | pass |
| `js/components/kpi.js` | pass |
| `js/components/map-overlay.js` | pass |
| `js/components/report-export.js` | pass |

### 2. Boundary Consistency

| 경계면 | 상태 |
|---|---|
| `data.reportSmell({buildingId,intensity,clientDate,note?})` ↔ `home.js` 호출 (`buildingId,intensity,clientDate`) | pass. `note` 미전달이지만 optional. |
| `data.getReports()` 반환 `{id,buildingId,intensity,note,ts:ISO,clientDate}` ↔ `home.js` 소비 (`r.clientDate,r.buildingId,r.ts`) | pass |
| `data.getReports()` 반환 ↔ `stats.js` (`r.clientDate`) | pass |
| `data.getReports()` 반환 ↔ `heatmap.js` (`r.buildingId,r.clientDate,r.intensity`) | pass |
| `data.getReports()` 반환 ↔ `report-export.js` (`r.clientDate,r.ts,r.buildingId,r.intensity,r.note`) | pass |
| `BUILDINGS[i]` shape `{id,name,complex,cx,cy,r}` ↔ `map-overlay.js` (`b.id,b.cx,b.cy,b.r,b.name`) | pass |
| `BUILDINGS[i]` ↔ `heatmap.js` (`b.id,b.name,b.complex`) | pass |
| `firebase.js` exports `{firestoreReady,db,firestoreLib}` ↔ `data.js` imports 동일 | pass |
| `firestore.rules` 필드 `{buildingId,intensity,note,ts,clientDate}` ↔ `data.js` `firestoreReport` write | pass |
| Rules `buildingId in ['b101'..'b207']` 화이트리스트 ↔ `buildings.js` BUILDINGS ID | pass (12개 완전 일치) |
| Rules `intensity int 1..3` ↔ data.js `Number(intensity)` + `validate` | pass |
| Rules `note optional, string ≤200` ↔ data.js `(note||'').slice(0,200)` | pass (수정 후 stub도 동일) |
| Rules `ts == request.time` ↔ data.js `serverTimestamp()` | pass |
| Rules `clientDate matches YYYY-MM-DD` ↔ data.js `validate` 정규식 | pass |
| Firestore `Timestamp` → ISO 변환 (`docToReport`) | pass. Pending write는 `new Date().toISOString()` 폴백. |

### 3. Path & CSS Variables

| 항목 | 상태 |
|---|---|
| `index.html` → `./styles.css` | pass |
| `index.html` → `./js/app.js` (type=module) | pass |
| 모든 ES 모듈 import 경로 `./` prefix 사용 | pass |
| `./assets/map.jpg` 참조 존재 | pass (256 KB) |
| CSS 변수 정의 vs 사용 대조 | 사용된 변수 모두 정의됨. `--surface-4/-hairline-tertiary/-ink-tertiary`는 정의만 있고 미사용(무해). |
| `visually-hidden` 클래스 참조 vs 정의 | **[FIXED]** stats.js가 참조하지만 CSS 미정의 → 인라인 style로 커버되긴 하나 defensive 차원에서 `.visually-hidden` 유틸리티 추가. |
| `.hint--info` CSS 클래스 정의됨 | 어디에도 참조 없음 (dead code, INFO). |

### 4. Accessibility

| 항목 | 상태 |
|---|---|
| CTA/강도 셀 모두 `<button>` 요소 | pass |
| 강도 라디오그룹 `role="radiogroup" aria-label="냄새 강도"` | pass |
| 강도 각 셀 `role="radio" aria-checked` | pass |
| 지도 SVG `role="img" aria-label` | pass |
| 지도 `<g>` `role="button" tabindex="0" aria-label="…선택[, 신고 N건][, 선택됨]"` | pass |
| 지도 키보드 Enter/Space | pass (map-overlay.js keydown 리스너) |
| `#cta-report` 텍스트 라벨 `.cta__label` | pass |
| 헤더 날짜 pill `aria-label="신고 날짜 선택. 현재 …"` | pass |
| 히트맵 셀 `<button aria-label="…, 없음|N건, 평균 강도 …">` | pass |
| 히트맵 그리드 `role="grid" aria-label` | pass |
| Toast region `role="status" aria-live="polite"` | pass |
| 탭바 `role="navigation" aria-label` + `aria-current="page"` | pass |
| Skip link | pass |
| `:focus-visible` outline | pass |
| Reduced-motion 대응 (shake) | pass |
| `<label for="range-sel">` + inline hidden style | pass (다만 `visually-hidden` 클래스 정의 없었음 → **[FIXED]**) |

---

## Runtime Checks (browser)

| 항목 | 결과 |
|---|---|
| 콘솔 에러 0 (firebase-config 없이 stub fallback) | **[BROWSER_UNAVAILABLE]** — 정적으로 firebase.js에서 `[firebase] firebase-config.js not found — running in localStorage stub mode` 로그 경로 확인. |
| 홈 렌더 (지도 + 12개 원) | [BROWSER_UNAVAILABLE] — SVG 생성 코드 확인, viewBox/BUILDINGS 배열 유효. |
| 지도 원 탭 → 선택 상태 + localStorage `lastBuildingId` | [BROWSER_UNAVAILABLE] — map-overlay.js `handleSelect`가 setItem 실행. |
| 강도 세그먼트 선택 → CTA 활성 | [BROWSER_UNAVAILABLE] — `updateCta()` 로직 정합. |
| 신고 → success 토스트 + localStorage `shinanAPT.v1` 저장 | [BROWSER_UNAVAILABLE] — stubReport → saveStub 경로 정합. |
| 통계 이동 → KPI + 히트맵 렌더 | [BROWSER_UNAVAILABLE] — computeKPI + renderHeatmap 정합. |
| CSV 다운로드 트리거 | [BROWSER_UNAVAILABLE] — Blob+a[download] 코드 정합. |
| 날짜 선택기: 과거 날짜 → CTA 라벨 변경 | [BROWSER_UNAVAILABLE] — home.js `updateCta`가 `formatKorMD` 사용. |
| 모바일 뷰포트(390x844) 가로 스크롤 | [BROWSER_UNAVAILABLE] — `.map-wrap`만 `overflow-x:auto`, `.app`은 `max-width:480px` 중앙 정렬. 정적으로는 문제 없어 보임. |

---

## Issues

### [MINOR] `visually-hidden` 유틸리티 클래스가 CSS에 없었음
- 재현: `stats.js`의 `<label class="visually-hidden" for="range-sel">기간</label>` 렌더링 시 브라우저 개발자 도구에서 `visually-hidden`이 정의되어 있지 않음.
- 관측: 인라인 `style="position:absolute;left:-9999px"`로 실제 시각은 숨겨지지만, `.visually-hidden`이 재사용될 다른 스크린리더 전용 텍스트에 사용될 경우 실패 위험.
- 기대: 접근성 표준 유틸리티 클래스로 CSS에 정의되어 있어야 함.
- 파일: `styles.css` (기존 156줄 근처)
- 조치: **[FIXED]** `styles.css`에 `.visually-hidden { position:absolute!important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }` 추가.

### [MINOR] `stubReport`가 note 200자 제한을 적용하지 않음 (Firestore 모드와 불일치)
- 재현: 스텁 모드에서 200자 넘는 note를 넘기면 그대로 저장. Firestore로 전환 시 규칙에서 거부되어 데이터 유실 사고 가능.
- 관측: `firestoreReport`는 `(note||'').slice(0,200)` 적용, `stubReport`는 `note || ''`.
- 기대: 두 모드가 동일한 note 정규화.
- 파일: `js/data.js:141`
- 조치: **[FIXED]** `stubReport`에도 `.slice(0, 200)` 적용.

### [INFO] `_devSeed`가 UTC 기반 ISO 날짜 사용
- 재현: KST(UTC+9) 유저가 자정 근처에 `_devSeed(60)` 호출하면 일부 시드가 어제 날짜로 기록됨.
- 관측: `d.toISOString().slice(0, 10)` — UTC 기준.
- 기대: `todayYMD()`와 같은 로컬 자정 기준.
- 파일: `js/data.js` (구 `_devSeed`)
- 조치: **[FIXED]** 로컬 기준 `YYYY-MM-DD`로 변경 (getFullYear/getMonth/getDate).

### [INFO] `.hint--info` CSS 클래스가 정의만 있고 참조 없음
- 파일: `styles.css:517`
- 조치: [DEFER] dead code지만 향후 인포 힌트 확장 여지 있어 유지.

### [INFO] CSS 변수 3개 미사용 (`--surface-4`, `--hairline-tertiary`, `--ink-tertiary`)
- 파일: `styles.css` 정의 부만 존재.
- 조치: [DEFER] DESIGN.md 팔레트 완전성 목적. 미사용이라도 무해.

### [INFO] `home.js`의 "동 미선택" 알림이 인라인이 아닌 토스트로 나옴
- 재현: 강도만 선택한 상태에서 CTA 탭.
- 관측: 하단 error 토스트 노출.
- 기대(스펙 §4.1 no-building): "지도 상단에 인라인 안내".
- 파일: `js/views/home.js:199`
- 조치: [DEFER/SUGGESTION] 스펙 준수를 위해서는 지도 상단에 hint 슬롯을 추가해야 함. 현재도 shake + 토스트로 사용자 피드백은 있음. 우선순위 낮음.

### [INFO] `stats.js` empty state는 전체 데이터 기준
- 스펙 §4.2 `empty`가 "KPI 3칸 모두 0"으로 명시. 현 구현은 `!allReports.length` 시에만 empty 안내를 표시. 기간 필터 내에 데이터가 없어도 히트맵(빈 셀)이 렌더됨.
- 파일: `js/views/stats.js:54`
- 조치: [DEFER] 의도적 결정으로 판단 (프론트엔드 노트 DECISION#4의 KPI 스냅샷 정책과 정합). SUGGESTION: 기간 내 데이터가 0일 때는 히트맵 상단에 "선택한 기간에 신고가 없어요" 같은 안내 표시.

---

## Fixes Applied

1. `styles.css` — `.visually-hidden` 유틸리티 클래스 추가 (`.skip-link` 앞).
2. `js/data.js` — `stubReport`에 `note.slice(0, 200)` 적용해서 Firestore와 동작 일치.
3. `js/data.js` — `_devSeed`가 UTC 대신 로컬 자정 기반 YMD 생성.

수정 후 `node --check js/data.js` 재확인 pass.

---

## 배포 가능성 평가

- **BLOCKER 0**, MAJOR 0 → 배포 게이트 통과.
- 실브라우저에서의 SVG 좌표 검수(사용자 노트 QA 체크리스트 #1), 실기기 iOS Safari `showPicker` 등은 이 서브에이전트 환경에서 확인 불가하므로 배포 전 스테이징에서 최종 실측 권장.
- Firestore 실통신 미검증 → `firebase-config.js` 실키로 채운 뒤 콘솔에 `[firebase] Firestore ready` 로그와 첫 write 후 콘솔 규칙 시뮬레이터 검사 권장.

## STATUS: DONE (BLOCKER=0)
