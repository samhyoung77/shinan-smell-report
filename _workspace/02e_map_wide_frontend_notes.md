# 지도 광역 개략도 + 줌/팬 구현 노트 — 2026-07-05

## 수정 파일
- `js/buildings.js` — BUILDINGS cx/cy/r 신규 좌표(스펙 표)로 교체, MAP_IMAGE naturalWidth/Height = 2039/1025. **id/name/complex 문자열 불변**(heatmap/exposure/data 계약 유지).
- `js/components/map-overlay.js` — 배경 재작도(신규 footprint·개울 path·문현로) + transform 기반 줌/팬 컨트롤러 신규. 오버레이(원/라벨/뱃지/aria/키보드/선택+localStorage) 로직 유지.
- `styles.css` — `.map-wrap`/`.map-inner` 줌/팬용 재정의, `.bg-water` stroke 155·`.bg-water-hi` 26/opacity .5, `.map-zoom*` 버튼 추가. `.b*`/`.bg-block` 등 회귀 없음.
- **불변:** data.js, firestore, heatmap.js, exposure-heatmap.js, trend-chart.js, stats.js, `assets/map.jpg`(롤백용 보존).

## 좌표계
- viewBox `0 0 2039 1025` (기존 2278×937 폐기). 배경 svg·오버레이 svg·클램프 계산 모두 공유.
- FOOTPRINTS(map-overlay.js)는 BUILDINGS와 **동일 인덱스 순서**로 len/dep/ang 보유(스펙 표 그대로). cx/cy는 두 곳 동일.

## 배경 렌더 구조 (`mapBackgroundSVG`)
- `bg-ground` 바탕(--surface-2) → 문현로 띠(ROAD_PATH, --hairline) + "문현로" 라벨 → 개울 리본(STREAM_PATH, --water w155) + 하이라이트(--water-hi w26 op.5) + 흐름 화살표 3개 + "개울" 라벨 → 건물 블록(회전 둥근 사각형, --surface-3/--hairline-strong).
- STREAM_PATH: `M 40 -30 Q 110 280 235 510 Q 380 720 720 850 Q 1060 955 1390 840 Q 1630 745 1710 480 Q 1780 250 1970 30` — 좌→하→우 3면 감쌈.
- 두 svg 모두 `preserveAspectRatio="xMidYMid slice"`로 통일 → 배경·오버레이 좌표 매핑 동일(정합 유지).

## 줌/팬 컨트롤러 (`setupZoomPan`)
- 구조: `.map-wrap`(overflow hidden, position relative, aspect 2039/1025, touch-action:none) > `.map-inner`(inset:0 → wrap을 100% 덮음, transform-origin 0 0, will-change:transform) > svg×2. 줌 버튼 `.map-zoom`은 `.map-wrap` 직속(줌 시 스케일 안 됨).
- 상태: `scale`(1~5), `tx`,`ty`(CSS px). transform = `translate(tx,ty) scale(scale)`. rAF로 1회/프레임 적용(`schedule`/`apply`).
- **클램프 공식**(inner가 wrap을 정확히 덮으므로 content = w·scale × h·scale):
  `tx ∈ [w(1-scale), 0]`, `ty ∈ [h(1-scale), 0]`. scale=1 → tx=ty=0(전체 조망, 여백 0).
- **커서 기준 줌** `zoomAt(px,py,factor)`: content점 `c=(p-t)/s` 고정 → `t' = p - c·s'`. 휠(±1.15), 버튼(±1.6), 더블클릭(×1.8), 핀치(거리비)에서 공용.
- **핀치**: 2포인터 거리비로 zoomAt(중점 기준) + 중점 이동만큼 팬. Pointer Events(`setPointerCapture`) 사용.
- 이벤트: wrap에 pointerdown/move/up/cancel + wheel(passive:false, preventDefault) + dblclick. window resize → 재클램프.

## 탭/드래그 구분 & 선택 정합
- 단일 포인터: pointerdown 시작점 기록. 총 이동량 `hypot > 6px`(TAP_THRESHOLD) 시 `dragging=true`(팬). 
- pointerup 시 `!dragging`이면 '탭' → `document.elementFromPoint(clientX,clientY).closest('.b')`로 대상 동 판정 → `handleSelect`(기존 onSelect/localStorage 유지). 드래그면 선택 안 함.
- 키보드 선택(원 focus + Enter/Space)은 svgEl keydown 핸들러로 그대로 유지.
- elementFromPoint가 정확히 동작하도록 .map-svg는 pointer-events auto(기본), 배경 .map-bg는 pointer-events:none 유지. .b-label/.b-badge는 pointer-events:none이라 하위 히트 시 .b-circle로 통과 → 정상.

## 초기 센터 (기존 scrollLeft 대체)
- 렌더 후 rAF: selectedId 있으면 `centerOn(b, 2.2)` — content점 `(b.cx/2039·w, b.cy/1025·h)`를 뷰포트 중앙에 놓고 scale 2.2, 클램프. 없으면 `reset()`(scale 1 전체 조망).

## 좌표 정합 확인
- 개울 centerline이 건물 클러스터(x505~1479, y253~554) 바깥(좌·하·우)으로 지나감 — path 최소 y가 클러스터 구간에서 y≈480~955로 하단, 좌측은 x<300, 우측은 x>1700 → 클러스터와 미겹침(스펙 검증값 반영).
- 화살표 3개: (235,510)/(720,850)/(1390,840) 물길 위 배치.

## 알려진 한계 / QA 대상
- **개울 STREAM_PATH는 시각 튜닝 대상**(스펙 명시). stroke-width 155 기준 리본 폭이 넓어 곡률 급한 구간에서 자기 겹침·클러스터 근접 가능 — QA에서 광역 캡쳐와 대조해 control point 미세 조정 권장.
- 오버레이 라벨/뱃지는 `.map-inner` 안이라 줌 시 함께 스케일됨. **라벨 가독 확인 지점:** scale 1(폰트 40px가 넓은 조망에서 다소 작게 보일 수 있음) ↔ scale 4~5(과대). 필요 시 counter-scale 없이 현 고정 크기 유지가 기본값(스펙 요구).
- 더블탭 확대는 dblclick 이벤트 의존(모바일에서 브라우저별 지원 편차 가능) — 핀치가 주 확대 수단.
- `max-height:62vh`+`min-height:240px`가 aspect-ratio를 덮어쓰는 극단 화면비에서 slice 크롭이 커질 수 있음(정합은 두 svg 동일 preserveAspectRatio로 유지).
- 라이트/다크·터치(핀치)/마우스(휠·드래그) 실측은 qa-verifier 단계에서 확인 필요.

STATUS: DONE
