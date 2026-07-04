# 프론트엔드 구현 노트 (Phase 2 산출)

## 구현한 화면
- **홈 (`#home`)** — `js/views/home.js`
  - 지도 오버레이 + 오늘/이번 주 뷰 토글 + 상단 헤더 날짜 pill
  - 강도 3세그먼트 (라디오 그룹)
  - CTA "지금 냄새 남" (과거 날짜면 "M월 D일 신고하기" + "과거 날짜" 뱃지)
  - 마지막 신고 라인 (상대 시간 + 동)
- **통계 (`#stats`)** — `js/views/stats.js`
  - KPI 3칸 (오늘/이번 주/이번 달) — 전체 데이터 기준
  - 동별/단지별 뷰 토글 + 기간 selector (7일/30일/올해)
  - 히트맵 (12행 또는 2행 × N일)
  - 리포트 내보내기 버튼 → 바텀시트

## 구현한 컴포넌트
- `components/map-overlay.js` — 지도 이미지 + SVG viewBox 오버레이. 12개 `<g class="b">`(circle + text + badge). role=button + tabindex + Enter/Space 키보드 처리. 선택 상태 localStorage 저장.
- `components/date-picker.js` — 헤더 pill + hidden `<input type=date>` + `showPicker()` 우선, 실패 시 focus+click 폴백. min=오늘-30, max=오늘.
- `components/kpi.js` — 3칸 카드 (surface-1, hairline, headline 28/600, tabular-nums).
- `components/heatmap.js` — 12행 또는 2행 × N일 CSS grid. 왼쪽 라벨 sticky, 가로 스크롤. 셀 색상 lv-0/1/2/3 (다크: subtle/앰버tint/붉은tint). 범례 하단.
- `components/report-export.js` — 바텀시트 (기간 chip 3 + 형식 chip 2). CSV: UTF-8 BOM + Blob a[download]. 인쇄: 새 창에 요약 HTML 주입 + `window.print()`.
- `toast.js` — Surface-2 토스트, 3초 자동 소멸. success/error/info 3종.

## 라우팅
- 해시 라우터 (`js/router.js`). `#home`, `#stats` 두 개. 미매칭 시 home으로 폴백.
- 각 라우트 함수는 `setHeader()`로 헤더 타이틀·우측 슬롯을 세팅한 뒤 view를 `#view-root`에 그린다.

---

## data.js 스텁 함수 시그니처 (firestore-integrator가 몸통만 교체)

```js
// buildings.js는 그대로 사용 — Firestore 대상 아님
import { BUILDINGS } from './buildings.js';

export function listBuildings(): Array<Building>
// Building = { id, name, complex, cx, cy, r }

export async function reportSmell({ buildingId, intensity, clientDate, note? }): Promise<void>
// intensity: 1|2|3
// clientDate: 'YYYY-MM-DD' (사용자가 지정한 날짜, 오늘 아닐 수도 있음)
// ts: 서버에서 채움 (Firestore serverTimestamp)

export async function getReports({ from?, to? }): Promise<Array<Report>>
// Report = {
//   id: string,
//   buildingId: string,      // e.g. 'b103'
//   intensity: 1|2|3,
//   note: string,
//   ts: ISO string,          // serverTimestamp → ISO string으로 정규화 필요
//   clientDate: 'YYYY-MM-DD'
// }
```

### Firestore가 채워야 할 필드 shape

**컬렉션:** `reports` (단일 컬렉션. `complexes` 없음.)

```
reports/{autoId}
├── buildingId: string      // "b101" ~ "b207" (buildings.js와 매칭)
├── intensity: number       // 1|2|3
├── note: string            // 기본 ''
├── ts: Timestamp           // serverTimestamp()
└── clientDate: string      // 'YYYY-MM-DD' — 통계는 이 필드 기준
```

**뷰 코드는 `ts`를 ISO string으로 기대함.** Firestore integrator는 `getReports`에서 반환 전에 `r.ts.toDate().toISOString()`으로 변환해야 함.

**정렬/쿼리:**
- 홈: `getReports({})` — 전체. 뷰 코드에서 today/week 필터링. (Firestore 최적화 원할 시 `where('clientDate', '>=', today)` 옵션 추가 가능)
- 통계 히트맵: `getReports({ from, to })` — clientDate range.
- CSV/인쇄: `getReports({ from, to })` — 기간 내 전부.

**단지 정보는 클라이언트 lookup:** buildings.js의 `findBuilding(buildingId).complex`.

---

## Firebase 없이 부팅 확인
- `data.js`는 localStorage 백엔드 스텁으로 동작. `firebase-config.js`가 없어도 앱은 정상 부팅.
- `firebase-config.example.js`는 placeholder이며 어떤 런타임 모듈도 import하지 않음.
- 개발용 헬퍼: 콘솔에서 `window.__shinan._devSeed(60)` 호출 시 랜덤 시드 60건 생성. `window.__shinan._clear()`로 초기화.

---

## DECISIONS (디자인 스펙과 상충하거나 스펙 미명시된 결정)

1. **강도 세그먼트 활성 색** — DESIGN.md 응용 규칙(§6.3)은 "선택된 것만 primary 취급"이라 표현했지만 v2 스펙 §6.3은 "배경을 강도 색으로 채우면 CTA와 시각적 우선순위 충돌 → 색은 텍스트에만"이라고 못박음. **v2 스펙(색은 텍스트에만) 채택**. 선택된 셀은 surface-2 배경 + 숫자만 강도 색.

2. **지도 최소 폭 600px + 가로 스크롤** — 원본 이미지가 2278×937(가로 세로 2.4:1)이라 모바일 폭 390px에 그대로 aspect-ratio 유지하면 세로 160px로 뭉개져 터치 영역 확보 불가. `min-width: 600px`로 강제 + wrap을 `overflow-x: auto`로 스와이프 허용. 선택된 동이 있으면 초기 스크롤을 그 위치로 센터링.

3. **동 원 라벨 폰트 크기 40px + 뱃지 30px** — SVG viewBox 좌표계(원본 픽셀) 기준. 축소되면서 화면에서 적절 크기로 렌더링. 뱃지는 fill=intensity-3, canvas stroke로 아웃라인.

4. **KPI 3칸은 항상 전체 데이터 기준** — 스펙 §4.2는 "기간 셀렉터"가 KPI도 재조회한다고 했으나, "오늘/이번 주/이번 달"이라는 라벨이 기간 셀렉터(7일/30일/올해)와 semantically 다름. **KPI는 스냅샷 지표(전체 데이터에서 계산)**, 히트맵만 기간 셀렉터 반영. 이렇게 하면 스펙의 KPI 라벨과 일치.

5. **인쇄용 요약을 새 창으로 오픈** — 현재 앱 컨텍스트에서 print CSS로 처리 시 히트맵 표가 유실될 수 있어 별도 window에 renderClean HTML 주입 후 window.print(). 팝업 차단되면 alert 노출.

6. **폰트: Google Fonts 링크 없음.** GitHub Pages 로딩 지연 우려 + 오프라인 대응. 시스템 폴백 스택 `Inter, system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR'`로 처리. Inter가 설치돼 있으면 자동 사용됨.

7. **히트맵 셀 크기 24×24 최소** — 스펙은 "12x12 최소"이나 터치 타겟 44 미달인 건 마찬가지고 24는 시각적 밀도 유지선. 셀 클릭은 부가 정보 확인용이라 44 필수는 아님 (본질 인터랙션 아님).

8. **소급 30일 초과 접근 시**: date-picker는 min attribute로 브라우저 레벨 차단만 하고 별도 토스트는 노출 안 함 (native picker는 애초에 min 밖 날짜를 선택 못 하게 함). 스펙 §6.2의 "URL 파라미터 등으로 초과 접근" 케이스는 현재 URL 파라미터 라우팅 없으므로 미구현.

---

## QA 체크리스트 (Phase 3 인계 사항)
- [ ] 각 동 좌표가 실제 지도 위치와 맞는가 (12개 눈 검수)
- [ ] iOS Safari에서 `<input type=date>` `showPicker()` 동작 확인 (16.4+ 필요)
- [ ] Android Chrome에서 CSV 다운로드 확인
- [ ] 인쇄창 팝업 차단 시 안내 확인
- [ ] `prefers-color-scheme: light` 자동 전환 확인 (셀 색 대비 검증)
- [ ] 200% 확대 시 지도 히트맵 스크롤 가능한지
- [ ] 강도 미선택 상태에서 CTA 탭 → shake + 힌트 나오는지
- [ ] 과거 날짜 선택 시 CTA 라벨/뱃지 변경 확인
- [ ] localStorage 클리어 후 empty state 문구 확인

## STATUS: DONE
