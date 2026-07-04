---
name: smell-report-orchestrator
description: 아파트 개울가 냄새 신고 모바일 웹앱을 파이프라인으로 빌드/수정/재실행한다. "냄새 앱", "신고 웹앱", "shinanAPT", "개울가", "smell report" 관련 요청 — 초기 구축, 기능 추가, 디자인 수정, 통계 개선, 재실행, 부분 업데이트, 배포 재점검 등 어떤 형태든 이 스킬을 사용하라. 파이프라인 단계 중 특정 단계만 다시 실행하는 부분 수정 요청("디자인만 다시", "통계 화면만 개선")에도 반드시 트리거한다.
---

# 냄새 신고 웹앱 오케스트레이터

## 목적
아파트 개울가 냄새 신고 모바일 웹앱을 **디자인 → 프론트엔드 → Firestore 연동 → QA** 순서의 파이프라인으로 구축·유지보수한다.

## 실행 모드
**서브 에이전트 (순차 파이프라인).** 각 단계는 이전 단계의 산출물 파일을 입력으로 받아 다음 단계 파일을 산출한다. 팀 통신 오버헤드가 불필요하므로 `Agent` 도구를 순차 호출.

## Phase 0: 컨텍스트 확인 (필수)

시작 전에 `_workspace/` 상태와 사용자 요청을 조합해 실행 모드를 결정한다.

| 상태 | 사용자 요청 | 실행 모드 |
|------|-----------|---------|
| `_workspace/` 없음 | (모든 요청) | **초기 실행** — Phase 1부터 전체 실행 |
| `_workspace/` 있음 | "처음부터 다시" 명시 | **재실행** — 기존을 `_workspace_prev/`로 이동 후 초기 실행 |
| `_workspace/` 있음 | "디자인만/통계만/…부분 수정" | **부분 재실행** — 해당 에이전트만 호출, 이후 단계는 diff 반영 |
| `_workspace/` 있음 | 명시 없음 (일반 개선 요청) | **증분 실행** — 사용자 피드백을 `_workspace/00_user_feedback.md`에 기록하고 관련 에이전트만 재호출 |

부분 재실행 시에도 최소한 QA는 다시 실행하여 리그레션을 잡는다.

## Phase 1: 디자인
**에이전트:** `ui-designer`
**입력:** `_workspace/00_user_feedback.md` (있으면)
**출력:** `_workspace/01_design_spec.md`

Agent 도구 호출 시 반드시 `model: "opus"`, `subagent_type: "general-purpose"`, prompt에는 `.claude/agents/ui-designer.md` 파일 경로를 읽으라는 지시를 포함.

## Phase 2: 프론트엔드 구현
**에이전트:** `frontend-builder`
**입력:** `_workspace/01_design_spec.md`
**출력:** 프로젝트 루트에 웹앱 파일들 + `_workspace/02_frontend_notes.md`

## Phase 3: Firestore 연동
**에이전트:** `firestore-integrator`
**입력:** `_workspace/02_frontend_notes.md` + `js/data.js` 스텁
**출력:** `js/data.js` 실 구현 + `firestore.rules` + `FIREBASE_SETUP.md` + `_workspace/03_backend_notes.md`

## Phase 4: QA 검증
**에이전트:** `qa-verifier`
**입력:** 전체 프로젝트 + `02_frontend_notes.md` + `03_backend_notes.md`
**출력:** `_workspace/04_qa_report.md` (+ 즉시 수정)

BLOCKER 발견 시:
- 원인이 Phase 2 소관이면 `frontend-builder`를 재호출
- 원인이 Phase 3 소관이면 `firestore-integrator`를 재호출
- 재호출 후 다시 Phase 4

## 데이터 전달 프로토콜
- **파일 기반.** 모든 에이전트는 `프로젝트/_workspace/{phase}_{agent}_{artifact}.md` 규칙으로 산출물 저장.
- 최종 앱 파일은 프로젝트 루트에, 중간 산출물은 `_workspace/`에 보존 (감사·재실행용).
- 사용자 피드백은 `_workspace/00_user_feedback.md`에 프리텍스트로 기록.

## 에러 핸들링
| 상황 | 대응 |
|------|------|
| 에이전트가 산출물 STATUS: DONE 미기재 | 1회 재호출, 이후에도 실패 시 최종 보고서에 명시 |
| 프론트-백엔드 shape mismatch | QA 리포트 기준으로 어긋난 쪽 재호출 (기본은 프론트 우선) |
| 브라우저 자동화 불가 (claude-in-chrome 없음) | QA는 정적 리뷰 + 수동 재현 가이드로 대체하고 그 사실을 리포트에 명시 |
| `_workspace/` 파일이 부분만 있음 | 누락 파일 생성을 먼저 시도, 그래도 안 되면 초기 실행으로 폴백 |

## 최종 보고

파이프라인 종료 후 사용자에게:
1. 완성된 파일 목록
2. `FIREBASE_SETUP.md`에 따라 Firebase 프로젝트 만들라는 안내
3. GitHub 저장소 만들고 Pages 배포하는 단계 (별도 태스크로 이관)
4. QA 리포트 요약 (BLOCKER 0개인지)
5. 피드백 요청 — "개선하고 싶은 부분 있으신가요?"

## 테스트 시나리오

### 정상 흐름
1. 사용자: "냄새 신고 웹앱 만들어줘"
2. 오케스트레이터: Phase 0 → 초기 실행 판단 → Phase 1~4 순차 실행
3. 결과: 프로젝트 루트에 웹앱, `_workspace/`에 4개 산출물, QA 리포트 BLOCKER 0

### 부분 재실행
1. 사용자: "통계 화면 색상 좀 더 톤다운 해줘"
2. 오케스트레이터: Phase 0 → 부분 재실행 → `_workspace/00_user_feedback.md` 기록 → `ui-designer` 호출 → `frontend-builder` 호출(관련 파일만 Edit) → `qa-verifier` 재검증
3. Firestore 미변경 시 Phase 3 건너뜀

### 에러 흐름
1. Phase 3에서 스키마 변경 후 Phase 4에서 shape mismatch 발견
2. QA가 `frontend-builder` 재호출 요청 → 프론트 소비부 갱신 → QA 재실행 → 통과

## 변경 이력
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-07-04 | 초기 구성 | 전체 | 아파트 개울가 냄새 신고 웹앱 하네스 신규 구축 |
