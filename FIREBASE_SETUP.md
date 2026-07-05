# Firebase 셋업 가이드 (5분)

이 앱은 Firebase Firestore를 백엔드로 사용합니다. **로그인 없이** 익명으로 누구나 냄새 신고를 작성/조회할 수 있는 구조입니다.

> Firebase 설정 없이도 앱은 정상 부팅됩니다. `firebase-config.js`가 없거나 `REPLACE_ME` 값이 남아 있으면 자동으로 브라우저 `localStorage` 스텁 모드로 동작합니다 (해당 브라우저에서만 데이터가 유지됨). Firebase를 붙이면 여러 사용자가 같은 데이터를 공유하는 실운영 모드가 됩니다.

---

## 1. Firebase 프로젝트 만들기

1. [Firebase Console](https://console.firebase.google.com/)에서 **프로젝트 추가**.
2. 프로젝트 이름은 자유 (예: `shinan-smell-report`). Analytics는 켜지 않아도 됩니다.

## 2. Firestore 데이터베이스 활성화

1. 좌측 사이드바에서 **Build → Firestore Database → 데이터베이스 만들기**.
2. **프로덕션 모드로 시작**을 선택 (테스트 모드는 30일 후 만료되므로 피하세요).
3. 리전: **`asia-northeast3` (서울)** 권장. 한국 사용자 지연이 가장 낮음.

## 3. 보안 규칙 배포

1. Firestore 콘솔의 **규칙** 탭으로 이동.
2. 프로젝트 루트의 [`firestore.rules`](./firestore.rules) 파일 내용을 **전체 복사**해서 붙여넣기.
3. **게시** 클릭.

이 규칙은 다음을 강제합니다:
- 모든 사용자가 신고를 읽을 수 있음 (공개)
- 신고 생성은 스키마 검증 통과 시만 (`buildingId` 화이트리스트 12개, `intensity` 1–3, `note` ≤ 200자, `ts`는 서버 시각으로 고정)
- 수정/삭제 불가 (익명 앱에서 실수·악의로 인한 데이터 파괴 방지)

## 4. 웹 앱 등록 & Config 복사

1. Firebase 콘솔 좌상단 **⚙️ 프로젝트 설정 → 일반**으로 이동.
2. **내 앱** 섹션 → **웹 앱 추가** (`</>` 아이콘).
3. 앱 별명 입력 (예: `shinan-web`). "이 앱에 Firebase Hosting 설정" 체크박스는 **해제**해도 됩니다.
4. 표시되는 `firebaseConfig` 객체를 그대로 복사.

## 5. 로컬 설정 파일 채우기

1. `js/firebase-config.example.js`를 복사해 **`js/firebase-config.js`**로 파일명 변경.
2. 4단계에서 복사한 값으로 `firebaseConfig` 객체 값들을 교체.
3. `js/firebase-config.js`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다.

예시:
```js
// js/firebase-config.js
export const firebaseConfig = {
  apiKey:            'AIzaSyD...실제값...',
  authDomain:        'shinan-smell-report.firebaseapp.com',
  projectId:         'shinan-smell-report',
  storageBucket:     'shinan-smell-report.appspot.com',
  messagingSenderId: '123456789012',
  appId:             '1:123456789012:web:abcdef...',
};
```

## 6. (선택) 인증된 도메인 관리

콘솔 → **Authentication → Settings → 승인된 도메인**에 배포 도메인(예: `apt.samsamsam.org`)이 이미 목록에 있는지 확인. 이 앱은 Auth를 쓰지 않으므로 필수는 아니지만, 오남용 방지 목적으로 화이트리스트 관리를 권장합니다.

## 7. 로컬 테스트

Firestore SDK는 CDN에서 로드되며 ES 모듈을 사용합니다. `file://`로 직접 열면 CORS 문제가 생기니 로컬 서버로 띄우세요.

```bash
# 프로젝트 루트에서
python -m http.server 8080
# 또는
npx serve .
```

브라우저에서 <http://localhost:8080> 접속. 개발자 도구 콘솔에 다음이 뜨면 성공:
```
[firebase] Firestore ready (project: your-project-id)
```

`[firebase] ... running in localStorage stub mode` 메시지가 뜨면 config가 없거나 placeholder가 남아있는 상태입니다.

## 8. 배포 (Firebase Hosting)

이 저장소는 Firebase Hosting으로 서빙합니다 (커스텀 도메인 `apt.samsamsam.org`). 프로젝트 루트에서:

```bash
firebase deploy --only hosting
```

`firebase.json`의 `public`이 `.`이고 문서/작업 파일은 `ignore` 목록으로 제외됩니다. `js/firebase-config.js`는 gitignore되어 있으나 Hosting 배포 산출물에는 포함되어야 하므로 배포 시점에 로컬에 존재해야 합니다. `apiKey`는 비밀이 아니지만, Firestore 규칙과 도메인 화이트리스트로 남용을 억제합니다.

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 콘솔에 `firebase-config.js not found` | 파일이 아직 없음 | 5단계 재확인 |
| 콘솔에 `placeholder values` | `REPLACE_ME` 값이 남아 있음 | 5단계에서 실제 값으로 교체 |
| Firestore write 시 `permission-denied` | 규칙 미배포 또는 스키마 불일치 | 3단계 재확인. 콘솔 규칙 시뮬레이터에서 요청 검사 |
| 로컬에서 CORS 오류 | `file://`로 열음 | 7단계처럼 로컬 HTTP 서버 사용 |
| 신고가 안 올라가는데 에러도 없음 | 오프라인 → 로컬 outbox 대기 중 | 네트워크 복구 시 `online` 이벤트에서 자동 재시도 |

## 알려진 한계
- **App Check 미도입.** 프로덕션 남용 우려 시 App Check(리캡차)를 추가하면 봇 스팸 감소.
- **Rate limit 없음.** 보안 규칙 문법상 클라이언트 단위 rate limit은 어렵습니다. 필요 시 Cloud Function에서 카운트 후 rejects 하도록 확장.
- **데이터 수정/삭제 불가.** 규칙에서 update/delete를 막았으므로, 모더레이션이 필요하면 Admin SDK 또는 콘솔에서 직접 처리.
