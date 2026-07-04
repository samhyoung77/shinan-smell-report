---
name: firestore-anonymous-setup
description: Firebase Firestore를 완전 익명(로그인 없이) 공개 읽기·쓰기용으로 구성한다. CDN modular SDK 로딩, 스키마 검증 보안 규칙, 클라이언트 rate limit, 오프라인 큐잉, 설정 가이드 산출. Firestore, Firebase, 익명 신고, 실시간 데이터 저장, 서버리스 백엔드 요청 시 반드시 이 스킬을 사용하라.
---

# Firestore 익명 셋업

## 언제 사용하는가
- 로그인 없이 URL만으로 다수 사용자가 데이터를 읽고 쓰는 웹앱
- 서버·백엔드 코드 없이 정적 프론트만으로 실시간 데이터 저장
- Firebase Auth를 굳이 넣지 않아도 되는 커뮤니티/피드백/신고 형태 앱

## SDK 로딩 (CDN modular)

```html
<!-- index.html에는 SDK를 넣지 않는다. js/firebase.js에서 import. -->
```

```js
// js/firebase.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp };
```

버전 고정. 최신 CDN은 캐시가 다르게 잡혀 로딩 순서 이슈가 있어 특정 버전 명시 권장.

## config 파일 분리

```js
// js/firebase-config.example.js (커밋됨)
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "0",
  appId: "1:0:web:0"
};
```

```js
// js/firebase-config.js (.gitignore, 실제 값)
export const firebaseConfig = { ... };
```

**주의:** Firebase의 apiKey는 비밀이 아니다 (프론트에 노출되도록 설계됨). 실제 보안은 보안 규칙에서 처리한다. 그럼에도 config를 gitignore하는 이유는:
- 프로젝트 오남용 방지 (다른 사람이 그대로 복제해서 쓰지 못하도록)
- Firebase 콘솔에서 도메인 화이트리스트 설정 유도

## data.js 실 구현

```js
import { db, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from './firebase.js';

const OUTBOX_KEY = 'shinanAPT_outbox';

// 오프라인 큐잉
function outboxPush(op) {
  const q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  q.push(op);
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(q));
}
async function outboxFlush() {
  const q = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  if (!q.length) return;
  const rest = [];
  for (const op of q) {
    try {
      if (op.type === 'report') await realReport(op.payload);
      else if (op.type === 'complex') await realAddComplex(op.payload);
    } catch { rest.push(op); }
  }
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(rest));
}
window.addEventListener('online', outboxFlush);
outboxFlush();

export async function listComplexes() {
  const snap = await getDocs(query(collection(db, 'complexes'), orderBy('name')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function realAddComplex({name, region}) {
  const ref = await addDoc(collection(db, 'complexes'), {
    name: name.trim().slice(0, 40),
    region: (region || '').trim().slice(0, 40),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
export async function addComplex(payload) {
  try { return await realAddComplex(payload); }
  catch (e) { outboxPush({type: 'complex', payload}); throw e; }
}

async function realReport({complexId, intensity, note}) {
  const now = new Date();
  const clientDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  await addDoc(collection(db, 'reports'), {
    complexId,
    intensity: Number(intensity),
    note: (note || '').slice(0, 200),
    ts: serverTimestamp(),
    clientDate,
  });
}
export async function reportSmell(payload) {
  try { await realReport(payload); }
  catch (e) { outboxPush({type: 'report', payload}); throw e; }
}

export async function getReports({from, to} = {}) {
  let q = collection(db, 'reports');
  const clauses = [];
  if (from) clauses.push(where('clientDate', '>=', from));
  if (to) clauses.push(where('clientDate', '<=', to));
  clauses.push(orderBy('clientDate', 'desc'));
  const snap = await getDocs(query(q, ...clauses));
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      ts: data.ts instanceof Timestamp ? data.ts.toDate().toISOString() : data.ts,
    };
  });
}
```

핵심:
- `serverTimestamp()`로 클라이언트 시계 조작 방지
- 반환 시 `Timestamp` → ISO string 정규화 → 뷰 코드는 스텁과 동일하게 소비
- 로컬 outbox로 오프라인 관대

## 보안 규칙

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /complexes/{id} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['name','region','createdAt']) &&
        request.resource.data.name is string &&
        request.resource.data.name.size() >= 1 &&
        request.resource.data.name.size() <= 40 &&
        (!('region' in request.resource.data) || (request.resource.data.region is string && request.resource.data.region.size() <= 40)) &&
        request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }

    match /reports/{id} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['complexId','intensity','note','ts','clientDate']) &&
        request.resource.data.complexId is string &&
        request.resource.data.complexId.size() > 0 &&
        request.resource.data.intensity is int &&
        request.resource.data.intensity >= 1 && request.resource.data.intensity <= 3 &&
        (!('note' in request.resource.data) || (request.resource.data.note is string && request.resource.data.note.size() <= 200)) &&
        request.resource.data.ts == request.time &&
        request.resource.data.clientDate is string &&
        request.resource.data.clientDate.matches('^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
      allow update, delete: if false;
    }
  }
}
```

- `keys().hasOnly(...)`로 스키마 강제
- `request.time`으로 서버 시간 강제 (스팸 시각 위조 방지)
- update/delete는 금지 → 신고 취소 필요하면 별도 collection으로 설계
- 규칙 자체에는 rate limit이 없다. 남용 시 App Check 도입 검토.

## 사용자 셋업 가이드 (`FIREBASE_SETUP.md`)
가이드에 포함할 최소 스텝:
1. Firebase Console → 새 프로젝트 → Firestore 활성화 (프로덕션 모드)
2. 프로젝트 설정 → 웹 앱 추가 → config 복사
3. `js/firebase-config.example.js`를 `js/firebase-config.js`로 복사, config 값 채우기
4. `firestore.rules` 파일 내용을 Firebase Console → Firestore → 규칙 탭에 붙여넣고 게시
5. 도메인 승인 목록에 GitHub Pages 도메인 추가 (Authentication 사용 안 하므로 필수는 아님, 하지만 오남용 방지)

## 자주 하는 실수
- 규칙을 "테스트 모드"로 두고 배포 → 30일 후 만료되면 앱 죽음
- `serverTimestamp()`를 뷰에서 Date로 착각 → `Timestamp.toDate()` 호출 필수
- 규칙에 `keys().hasOnly` 빼먹음 → 임의 필드 삽입으로 스팸/오염
- update/delete를 열어둠 → 익명 앱에서는 사실상 데이터 파괴 가능

## 통합 후 정합성 체크리스트
- `data.js`가 export하는 함수 4개 시그니처가 스텁 버전과 동일
- 반환값의 `ts`는 항상 ISO string (Timestamp 객체 아님)
- `clientDate`는 항상 `YYYY-MM-DD`
- 오프라인 시나리오에서 addDoc 실패 → outbox 저장 → 재접속 시 자동 flush 동작
