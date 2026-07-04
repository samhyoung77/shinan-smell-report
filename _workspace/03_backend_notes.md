# 백엔드 통합 노트 (Phase 3 산출)

프론트가 정의한 함수 시그니처(`_workspace/02_frontend_notes.md`)를 유지한 채, `js/data.js`의 몸통만 Firestore + 스텁 이중화로 교체.

## 산출 파일
- **`js/firebase.js`** (신규) — Firebase modular SDK 초기화, config 부재/placeholder 감지, `firestoreReady` boolean export.
- **`js/data.js`** (교체) — Firestore 경로 + localStorage 스텁 fallback. 뷰가 부르는 시그니처 유지.
- **`js/firebase-config.example.js`** (개선) — 사용자 템플릿. 코멘트 재정리.
- **`firestore.rules`** (신규) — 프로젝트 루트, 콘솔에 붙여넣기용.
- **`.gitignore`** (신규) — `js/firebase-config.js` 커밋 방지.
- **`FIREBASE_SETUP.md`** (신규) — 사용자용 5분 셋업 가이드.

## 교체된 함수
| 함수 | 스텁 | Firestore 모드 |
|---|---|---|
| `listBuildings()` | `BUILDINGS` 반환 (동일) | 그대로 (통신 없음) |
| `reportSmell({buildingId, intensity, clientDate, note?})` | localStorage push | `addDoc(collection(db,'reports'), {…, ts: serverTimestamp()})`. 실패 시 outbox 큐잉. |
| `getReports({from?, to?})` | localStorage filter | `where('clientDate','>=',from) + where('<=',to) + orderBy('clientDate','desc')`. `ts` → ISO string 정규화. 성공 시 localStorage 캐시, 실패 시 캐시 반환. |
| `withBuildingMeta(report)` | 그대로 | 그대로 |
| `_devSeed(count)` | localStorage에 랜덤 데이터 | `reportSmell` 경유 → 활성 backend에 반영 |
| `_clear()` | localStorage 전체 초기화 | 로컬 스텁 + 캐시 + outbox만 삭제 (Firestore 원본 보호) |

## 스텁 판별 로직
`js/firebase.js`에서 최상위 `await init()` 안에서 다음 순서로 판정:
1. `fetch(new URL('./firebase-config.js', import.meta.url), {method: 'HEAD'})` — 404면 스텁 모드.
2. 그 다음 `import('./firebase-config.js')` 시도, 모듈 없거나 파싱 실패면 스텁.
3. `firebaseConfig.apiKey/projectId/appId` 중 하나라도 빈 값·`REPLACE_ME`·`YOUR_PROJECT_ID`·`YOUR_API_KEY`·`REPLACE_ME*` prefix면 스텁.
4. CDN에서 `firebase-app.js` + `firebase-firestore.js` 로드 → `initializeApp` → `getFirestore`. 예외 발생 시 스텁으로 강등.

이후 `data.js`는 `firestoreReady`만 보고 분기. 뷰 코드는 두 모드를 구분하지 않음.

## 스키마 & 규칙 결정 사유
- **`reports` 단일 컬렉션.** `complexes`/`buildings` 컬렉션 없음. 12개 동이 하드코딩이라 서버에 저장할 이유가 전무 (변경되면 코드 배포로 처리).
- **`buildingId` 화이트리스트 규칙.** 정규식 `^b(1[0-5][0-9]|2[0-7][0-9])$`는 실제 존재하지 않는 `b103`~`b159`, `b208`~`b279`도 통과시켜 스팸 벡터가 됨. 12개 값 명시적 화이트리스트가 안전.
- **`keys().hasOnly([...])`로 스키마 강제.** 임의 필드 삽입 방어. `note`만 optional로 취급 (`!('note' in ...)` 분기).
- **`ts == request.time`.** 클라이언트가 서버 시각을 위조하지 못하도록 강제 (`serverTimestamp()`가 만들어내는 값과 일치).
- **`update/delete: false`.** 익명 앱에서 데이터 파괴 방지. 모더레이션이 필요하면 Admin SDK/콘솔에서 out-of-band 처리.
- **캐치올 deny.** 정의되지 않은 컬렉션에 대한 접근을 명시적으로 차단 (기본 deny지만 명시).

## 오프라인 처리
- `reportSmell` 실패 → `localStorage[shinanAPT.outbox]`에 `{type:'report', payload}` push.
- `window.online` 이벤트에서 `outboxFlush()` 자동 실행. 항목별로 재시도하고 실패한 것만 남김.
- 모듈 로드 직후 1회 flush 시도 (초기 연결 회복 케이스).
- `getReports`는 큐잉하지 않음 (실시간성이 중요). 실패 시 `localStorage[shinanAPT.cache.reports]`에서 필터링해 반환. 캐시가 비면 빈 배열.

## 알려진 제약
- **App Check 미도입.** 봇/스크립트 스팸 방어 없음. 남용 발견 시 App Check(리캡차) 추가 검토.
- **Rate limit은 규칙 밖.** Firestore rules는 클라이언트 IP·시간창 기반 제한이 표현 불가. 필요하면 Cloud Function으로 전면 대체.
- **Firestore SDK CDN 의존.** 네트워크 실패 시 `firebase-app.js` 로드 실패 → 자동 스텁으로 강등. 이 세션에서만 로컬 저장 (기존 Firestore 원본은 손대지 않음).
- **`clientDate`는 시간대 기반 로컬 문자열.** 크로스-타임존 사용자가 섞이면 통계 버킷이 하루 어긋날 수 있음 (스펙상 국지적 앱이라 감내).
- **캐시-일관성 없음.** getReports 캐시는 최신 fetch만 저장. 정교한 stale-while-revalidate 아님.

## 뷰-계약 정합성 체크 (자체 검증)
- [x] `listBuildings()`는 어떤 모드든 `BUILDINGS` 그대로 반환. 통신 없음.
- [x] `getReports()` 반환값 `ts`는 항상 ISO string (Firestore Timestamp의 경우 `.toDate().toISOString()`).
- [x] `clientDate`는 항상 `YYYY-MM-DD` 문자열.
- [x] Firestore 미설정 시 앱 크래시하지 않음 (스텁으로 동작).
- [x] 뷰가 import하는 3개(`getReports`, `reportSmell`, `listBuildings`)는 시그니처 그대로 유지.
- [x] `window.__shinan._devSeed / _clear`은 두 모드 모두 동작 (dev 헬퍼).

## STATUS: DONE
