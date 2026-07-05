# QA Report — 일간 추세 그래프 (2026-07-05)

부분 재실행(통계 개선) QA. 로컬 서버(`python -m http.server 8899`) + Chrome 실측.

## Summary
- BLOCKER: 0
- MAJOR: 0
- MINOR: 0
- 결과: **PASS**

## 정적 검증
- `node --check`: `js/components/trend-chart.js`, `js/views/stats.js` 모두 PASS
- 경계 정합성: `renderTrend(container, { reports, dates })` export ↔ stats.js `renderTrend(trendSlot, { reports: scoped, dates })` 소비 일치
- 배치: 툴바 → `#trend-slot` → `#heatmap-slot` (스펙대로)

## 브라우저 실측 (localhost:8899)
| 항목 | 결과 |
|------|------|
| MODE A (7일) 강도 스택 막대 | ✅ 7/2·3·4에 막대, 총 4건 — 히트맵과 수치 일치 |
| MODE A (30일) | ✅ (동일 컴포넌트, 막대 폭 축소) |
| MODE B (올해) area-라인 | ✅ 라벤더 라인, 데이터 7월 집중 → 우측 스파이크로 정확 표시 |
| 부제 수치 mono | ✅ "최근 7일 · 총 4건 · 하루 평균 0.6건" |
| 다크 모드 | ✅ 강도색 막대·라벤더 강조 어두운 배경에서 가독 |
| 라이트 모드 | ✅ |
| hover readout | ✅ hit rect hover 시 상단 readout "6월 29일 · 없음"으로 갱신 |
| range/뷰 토글 연동 | ✅ 재렌더 정상 |

## 접근성
- `svg[role=img]` + 서술형 aria-label ("…총 4건, 하루 평균 0.6건, 가장 많은 날 7월 4일 2건.")
- visually-hidden `<table>` 대체표 (날짜 × 건수 × 약함/보통/심함)
- hit rect 7개 각각 `aria-label="M월 D일, N건/없음"`
- 색 단독 정보전달 없음 (범례 + 수치 병기)

## 콘솔
- 앱 오류 0. (감지된 EXCEPTION은 MetaMask 확장 `inpage.js` — 브라우저 확장 문제로 앱과 무관)

## 회귀
- KPI(mono+이번주 강조), 동별/단지별 히트맵, 리포트 내보내기, 뷰 토글, range 셀렉트 — 모두 정상.

STATUS: DONE
