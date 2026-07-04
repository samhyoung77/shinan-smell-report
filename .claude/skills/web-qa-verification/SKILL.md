---
name: web-qa-verification
description: 정적 웹앱을 로컬 서버로 띄우고 브라우저에서 실제 구동하여 검증한다. 경계면 정합성(프론트 소비 shape ↔ 데이터 반환 shape), 모바일 반응형, 신고 흐름, Firestore 연동 상태를 실측. 웹앱 QA, 검증, 테스트, 버그 리포트, 통합 확인 요청 시 반드시 이 스킬을 사용하라.
---

# 웹 QA 검증

## 언제 사용하는가
- 정적 웹앱(HTML/CSS/JS)이 배포 전 실측 검증을 필요로 할 때
- 프론트-백엔드 통합 후 정합성 점검
- QA 리포트 작성 및 자체 수정이 요구되는 경우

## 검증 방법론: 경계면 우선

파일이 존재하고 문법이 맞다는 확인은 최소한이다. **경계면 교차 비교**가 핵심:

| 경계면 | 검증 방법 |
|--------|---------|
| `data.js` 반환 shape ↔ `views/*.js` 소비 shape | 두 파일을 동시에 열고 필드명·타입 대조 |
| Firestore 저장 shape ↔ `data.js` 파싱 | 실제 addDoc 후 콘솔에서 확인 |
| 이벤트 payload ↔ 핸들러 인자 | 이벤트 발신부 + 리스너부 동시에 |
| CSS 클래스 이름 ↔ JS querySelector | 오타 하나로 통째로 무동작 |

## 로컬 실행

```powershell
# Python이 있으면
python -m http.server 8080

# 또는 Node
npx serve -l 8080
```

브라우저에서 `http://localhost:8080` → 콘솔 열고 에러 감시.

## 브라우저 자동화 (claude-in-chrome MCP 있을 때)

핵심 스텝:
1. `tabs_create_mcp` 로 `http://localhost:8080` 새 탭
2. `resize_window` 로 모바일 크기 (390x844)
3. `computer` 또는 `find` 로 UI 요소 확인
4. `read_console_messages` 로 에러 감시
5. 신고 흐름 재현: 단지 추가 → 강도 선택 → 신고 → 통계에서 확인
6. `gif_creator` 로 흐름 녹화 (선택)

없으면 리포트에 수동 재현 스크립트 상세 기술.

## 체크리스트

### A. 초기 로드
- [ ] 콘솔 에러 0
- [ ] 첫 화면(홈)이 즉시 렌더
- [ ] `firebase-config.js` 없을 때 앱이 크래시하지 않고 친절한 메시지
- [ ] 다크 모드 자동 감지 (OS 설정 변경)

### B. 경계면
- [ ] `listComplexes()` 반환값에 `id`, `name`, `region` 필드 존재
- [ ] `getReports()` 반환의 `ts`는 문자열 (Timestamp 객체 X)
- [ ] `getReports()` 반환의 `clientDate` 형식 `YYYY-MM-DD`
- [ ] 히트맵이 쓰는 `intensity`가 1~3 정수
- [ ] `reportSmell` 인자 키 `complexId/intensity/note`가 UI에서 넘기는 이름과 일치

### C. 신고 흐름
- [ ] 단지 미등록 상태: 홈에서 "단지를 먼저 추가하세요" 안내
- [ ] 단지 추가 → 즉시 홈 드롭다운에 반영
- [ ] 강도 1/2/3 각각 클릭 시 시각적 선택 상태
- [ ] 신고 완료 후 토스트/피드백
- [ ] 새로고침 후에도 신고가 통계에 남음

### D. 통계
- [ ] 데이터 없을 때 빈 상태 UI
- [ ] 여러 단지 신고 후 히트맵 셀 채워짐
- [ ] 같은 날 여러 단지 신고 → 같은 컬럼에 여러 셀
- [ ] 셀 hover/터치 시 상세 (건수, 평균 강도)

### E. 반응형
- [ ] 360x640, 390x844, 430x932 각각에서 가로 스크롤 없음
- [ ] 히트맵은 가로 스크롤 컨테이너 안에서만
- [ ] 1024px+에서 `max-width` 중앙 정렬

### F. 접근성
- [ ] `<button>` 요소 (div 아님)
- [ ] 강도 라디오그룹에 `role`, `aria-label`
- [ ] `:focus-visible` 스타일 있음
- [ ] 색만이 아닌 라벨 병기

### G. 오프라인
- [ ] 네트워크 끊고 신고 → outbox 저장
- [ ] 온라인 복귀 시 outbox flush

## 리포트 형식 (`_workspace/04_qa_report.md`)

```markdown
# QA Report

## Summary
- BLOCKER: {n}
- MAJOR: {n}
- MINOR: {n}
- INFO: {n}

## Issues

### [BLOCKER] {제목}
- **재현:**
  1. ...
  2. ...
- **관측:** 실제 무엇이 일어나는가
- **기대:** 무엇이 일어나야 하는가
- **원인 추정:** 어느 파일/라인/이유
- **조치:** [FIXED] 파일:라인 요약 / [DEFER] 이유

### [MAJOR] ...

## STATUS: DONE (BLOCKER=0)
```

## 자체 수정 범위

즉시 고쳐도 되는 것:
- 오타·경로 오류
- 명백한 shape mismatch (한쪽만 이름 통일)
- 누락된 aria/label
- CSS 대비비 부족

리포트로 남기고 상위에 위임하는 것:
- 아키텍처 변경 (스키마, 라우팅 구조)
- 새 화면 추가
- 디자인 결정 변경

## Firebase 미셋업 상태 처리

`firebase-config.js` 없거나 dummy 값이면:
- Firestore 실통신 불가
- 로컬 스텁으로 fallback 하도록 코드 되어 있는지 확인
- 확인 사항에 `[FIREBASE_UNVERIFIED]` 태그로 표시하고 스텁 흐름은 정상 완료된 것으로 처리

## 자주 놓치는 것
- localStorage에 이전 세션 데이터가 남아 재현이 왜곡됨 → QA 전 `localStorage.clear()`
- 캐시로 인해 파일 변경이 반영 안 됨 → 강제 새로고침(Ctrl+Shift+R)
- iOS Safari 특이 사항: `100vh`가 주소창 포함, 100dvh로 수정 확인
