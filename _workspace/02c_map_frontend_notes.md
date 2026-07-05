# 지도 개략도 프론트엔드 반영 노트 — 2026-07-05

입력 스펙: `_workspace/01c_map_schematic_spec.md` (좌표·각도·개울 물길·색 매핑 표).
구글맵 캡쳐(`assets/map.jpg`) 배경을 인라인 벡터 개략도(`.map-bg` SVG)로 교체.

## 수정/추가 파일
| 파일 | 변경 |
|------|------|
| `js/components/map-overlay.js` | `<img src=map.jpg>` → 인라인 `<svg class="map-bg">` 로 교체. 배경 렌더 헬퍼 `mapBackgroundSVG(W,H)` + 동 footprint 상수 `FOOTPRINTS` 추가. **오버레이(`.map-svg`) 마크업·이벤트·중앙정렬 스크롤 로직 전부 불변.** |
| `js/buildings.js` | `MAP_IMAGE.src` 제거(더 이상 로드 안 함). `naturalWidth/naturalHeight = 2278/937` 상수는 유지(오버레이·배경 SVG viewBox 좌표계). **BUILDINGS의 cx/cy/r 완전 불변.** |
| `styles.css` | 신규 물색 토큰 `--water`/`--water-hi`(다크 `:root` + 라이트 미디어쿼리). `.map-inner img` 블록 제거 → `.map-bg` 위치 스타일 + 배경 요소 스타일(`.bg-ground/.bg-block/.bg-road/.bg-road-label/.bg-water/.bg-water-hi/.bg-water-arrow/.bg-water-label`) 추가. 기존 `.map-wrap/.map-inner/.map-svg/.b*` 규칙 불변. |
| `assets/map.jpg` | **삭제하지 않음** — 롤백용 보존. |

## 배경 렌더 방식
- **인라인 SVG**로 렌더(외부 `<img>` SVG 아님). 이유: 외부 SVG는 문서의 CSS 커스텀 프로퍼티·다크/라이트 테마를 격리되어 못 받는다. 인라인이면 `fill:var(--surface-3)`, `stroke:var(--water)` 등 토큰이 그대로 적용되어 테마 자동 대응.
- 스택 구조: `.map-inner` 안에 `.map-bg`(배경, DOM 먼저) → `.map-svg`(오버레이, DOM 나중=위). 둘 다 `viewBox="0 0 2278 937"`, `position:absolute; inset:0; 100%×100%`.
- `.map-bg`는 `pointer-events:none` → 클릭/키보드는 위 오버레이(`.map-svg`)가 전담. 선택·뱃지·히트영역 회귀 없음.
- `.map-bg`에 `preserveAspectRatio="xMidYMid slice"` 지정 → 기존 `img{object-fit:cover}` 와 동일한 채움 거동 유지. 오버레이는 기본값(meet)이나 `.map-inner` 자체가 `aspect-ratio 2278/937` 로 정확한 비율이므로 slice/meet 차이 없음(정합 유지).

### 그린 요소
- **동 블록 12개**: 중심(cx,cy) 기준 회전 둥근 사각형. `<rect x=cx-length/2 y=cy-depth/2 width=length height=depth rx=14 transform="rotate(angle cx cy)">`. length/depth/angle 은 스펙 표 값 그대로. fill `--surface-3`, stroke `--hairline-strong`.
- **개울**: centerline `(-30,470)→(120,690)→(250,900)→(340,1000)` 을 Catmull-Rom→cubic bezier 로 부드러운 곡선화. 굵은 물길(stroke-width 80, `--water`) + 2~3px 하이라이트 라인(`--water-hi`) + 흐름 방향 화살표(polygon, flow≈55° 회전) + "개울" 라벨(`--water-hi`, canvas 헤일로). 좌하단 코너 대각선 흐름.
- **문현로**: 상단 얇은 곡선 띠 1개(stroke `--hairline`, width 34) + "문현로" 라벨 1회(`--ink-subtle`, 작게). 나머지 POI·도로명·상가 전부 제거.
- **ground**: 전면 `<rect fill=var(--surface-2)>` 로 캔버스와 구분되는 은은한 면.

## 좌표 정합 확인
- 배경 SVG viewBox = 오버레이 SVG viewBox = `0 0 2278 937` (동일). → 동 원/라벨/뱃지 위치 어긋남 없음.
- `FOOTPRINTS`의 각 (cx,cy)는 `buildings.js` BUILDINGS의 (cx,cy)와 1:1 일치(스펙 배치 검증표 기준). 블록 회전 사각형 중심 = 오버레이 원 중심 → 시각적으로 동 위에 정확히 얹힘.
- `node --check` : `js/components/map-overlay.js`, `js/buildings.js` 모두 통과.
- 잔여 참조 점검: 코드상 `MAP_IMAGE.src`·`.map-inner img` 참조 없음(README 문구/주석만 map.jpg 언급).

## 알려진 한계
- 개울 centerline y가 최대 1000까지 뻗어 viewBox 하단(937) 밖에서 clip → 의도된 "화면 밖으로 흘러나감" 효과(자연스러움).
- 동 footprint length/depth/angle 은 사진 추출 근사값(자기 집 방향감용). 실측 정밀도는 아님 — 필요 시 `FOOTPRINTS` 만 튜닝(오버레이 좌표엔 무영향).
- `--water` 파랑은 `--surface-2/3` 위에서 라이트/다크 모두 대비 확보하도록 다크(`#2b6fa8`)/라이트(`#4aa3e0`) 별도 값 사용. 실기기 라이트/다크 실측은 QA 단계 권장.
- data.js / Firestore 관련 코드 일절 변경 없음.

STATUS: DONE
