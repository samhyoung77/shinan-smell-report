// ============================================================================
// firebase.js — Firestore initialization with graceful stub fallback.
// ============================================================================
// Behavior:
//   - Attempts dynamic import of ./firebase-config.js
//   - If missing OR placeholder values → firestoreReady = false, app falls
//     back to localStorage stub in data.js (no crash).
//   - If real config → loads Firebase modular SDK from CDN, initializes.
//
// Exports:
//   firestoreReady : boolean — true only when Firestore is fully wired.
//   db             : Firestore | null
//   firestoreLib   : SDK namespace (collection, addDoc, ...) or null
//
// Top-level await propagates through the module graph so any consumer that
// imports firebase.js will see the resolved values.
// ============================================================================

const FIREBASE_VERSION = '10.13.2';
const APP_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`;
const FS_URL  = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`;

let firestoreReady = false;
let db = null;
let firestoreLib = null;

function isPlaceholderConfig(config) {
  if (!config || typeof config !== 'object') return true;
  const isBad = (v) => (
    typeof v !== 'string' ||
    v.length === 0 ||
    v === 'REPLACE_ME' ||
    v === 'YOUR_PROJECT_ID' ||
    v === 'YOUR_API_KEY' ||
    v.startsWith('REPLACE_ME')
  );
  return isBad(config.apiKey) || isBad(config.projectId) || isBad(config.appId);
}

async function loadUserConfig() {
  // Probe first so a missing file doesn't spam console with a 404.
  try {
    const probe = await fetch(new URL('./firebase-config.js', import.meta.url), { method: 'HEAD' });
    if (!probe.ok) return null;
  } catch {
    // fetch may fail on file:// or opaque origins — fall through and try import.
  }
  try {
    const mod = await import('./firebase-config.js');
    return mod.firebaseConfig || null;
  } catch {
    return null;
  }
}

async function init() {
  const config = await loadUserConfig();
  if (!config) {
    console.info('[firebase] firebase-config.js not found — running in localStorage stub mode');
    return;
  }
  if (isPlaceholderConfig(config)) {
    console.info('[firebase] firebase-config.js has placeholder values — running in localStorage stub mode');
    return;
  }
  try {
    const appMod = await import(APP_URL);
    const fsMod  = await import(FS_URL);
    const appInstance = appMod.initializeApp(config);
    db = fsMod.getFirestore(appInstance);
    firestoreLib = fsMod;
    firestoreReady = true;
    console.info('[firebase] Firestore ready (project:', config.projectId + ')');
  } catch (e) {
    console.warn('[firebase] SDK load or init failed — falling back to stub mode', e);
    firestoreReady = false;
    db = null;
    firestoreLib = null;
  }
}

// Top-level await: consumers see resolved values.
await init();

export { firestoreReady, db, firestoreLib };
