# 똥냄새 피해현황 — 효천마을 신안인스빌

집 앞 개울가에서 나는 악취를 익명으로 등록하고, 단지·동별로 언제 어디서 냄새가 발생했는지를 통계로 비교해 볼 수 있는 모바일 웹앱.

**공개 URL:** https://apt.samsamsam.org/

## 사용법

1. 위 URL을 폰 브라우저에서 열기 (로그인 필요 없음)
2. 지도에서 자기 동 원을 탭 (한 번 고르면 다음부터 자동 선택)
3. 강도 1(약함)/2(보통)/3(심함) 중 선택
4. **"지금 냄새 남"** 버튼 → 끝
5. 하단 **통계** 탭에서 KPI, 히트맵, 리포트 내보내기 확인

## 특징

- **완전 익명** — 로그인·회원가입·개인정보 수집 없음
- **원터치 등록** — 지도 탭 + 강도 선택 + 버튼 하나
- **날짜 지정 가능** — 헤더의 달력 아이콘으로 최근 30일 내 다른 날짜 등록
- **24시간 내 취소** — 실수 등록는 24시간 안에 스스로 취소 가능
- **동/단지 뷰 전환** — 통계에서 12개 동별 또는 1·2단지 요약으로 비교
- **리포트 내보내기** — CSV 다운로드 또는 인쇄용 페이지 (구청 민원 자료 활용)
- **다크/라이트 자동** — OS 테마 자동 감지

## 대상 아파트

**효천마을 신안인스빌**
- **1단지:** 101, 102, 103, 104, 105동
- **2단지:** 201, 202, 203, 204, 205, 206, 207동

지도 좌하단 대각선으로 흐르는 개울이 냄새 발생원. 개울에 가까운 동에서 상대적으로 자주 발생하는지 데이터로 확인하는 것이 이 앱의 목표.

## 기술 스택

- **프론트엔드:** 정적 HTML/CSS/Vanilla JavaScript. 빌드 도구 없음.
- **디자인:** [Linear Design System](https://linear.app) 기반 다크 미니멀 (참고: [awesome-design-md](https://github.com/voltagent/awesome-design-md))
- **폰트:** Jua (Google Fonts)
- **백엔드:** Firebase Firestore (완전 익명, 서버리스)
- **호스팅:** Firebase Hosting (커스텀 도메인 `apt.samsamsam.org`)
- **아키텍처:** [Harness](https://github.com/revfactory/harness) 에이전트 팀 파이프라인(디자인→프론트엔드→Firestore→QA)으로 구축

## 데이터 & 보안

- `reports` 컬렉션 하나만 사용. 12개 동은 클라이언트에 하드코딩.
- Firestore 규칙: `buildingId` 화이트리스트 12개, `intensity` 1~3 정수, 서버 시각 강제, 스키마 필드 엄격 검증
- 삭제는 24시간 이내 본인 등록만 (localStorage에 자기 report ID 보관)
- Firebase apiKey는 클라이언트 노출용 (Firebase 정책상 정상). 실 접근제어는 Firestore 규칙이 담당

## 로컬 개발

```bash
# 프로젝트 루트에서
python -m http.server 8080
# 브라우저에서 http://localhost:8080 접속
```

`js/firebase-config.js`가 없거나 placeholder 값이면 자동으로 localStorage 스텁 모드로 동작. Firestore 연동은 [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) 참고.

## 라이선스

MIT (예정) — 이웃 단지에서 복제해서 자기 동네에 적용하고 싶으면 `assets/map.jpg`, `js/buildings.js`, README의 아파트명만 교체하면 됩니다.
