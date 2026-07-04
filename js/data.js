// ============================================================================
// data.js — dual-mode backend. Firestore when configured, localStorage stub
// otherwise. Function signatures are stable across both modes.
// ============================================================================
// Public API (imported by views/components):
//   listBuildings()                                     → Array<Building>   (sync, buildings.js)
//   reportSmell({buildingId, intensity, clientDate, note?}) → Promise<void>
//   getReports({from?, to?})                            → Promise<Array<Report>>
//   withBuildingMeta(report)                            → report + buildingName + complex
//
// Report shape (identical in both modes):
//   { id, buildingId, intensity: 1|2|3, note: string,
//     ts: ISO string, clientDate: 'YYYY-MM-DD' }
//
// Firestore-mode extras:
//   - Failed writes queued in localStorage outbox, flushed on `online`.
//   - Successful getReports cached; on failure, cached filtered result returned.
//
// Dev helpers exposed on window.__shinan:
//   _devSeed(count)  — seeds via reportSmell (routes to whichever backend)
//   _clear()         — clears local stub + cache + outbox (never touches Firestore)
// ============================================================================

import { BUILDINGS, findBuilding } from './buildings.js';
import { firestoreReady, db, firestoreLib } from './firebase.js';

const STUB_KEY   = 'shinanAPT.v1';             // localStorage stub state
const CACHE_KEY  = 'shinanAPT.cache.reports';  // last-successful Firestore read
const OUTBOX_KEY = 'shinanAPT.outbox';         // failed writes awaiting retry
const MY_KEY     = 'shinanAPT.myReports';      // {id, buildingId, intensity, clientDate, ts}[]

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;  // 24h

// ---- localStorage helpers ------------------------------------------------
function loadStub() {
  try { return JSON.parse(localStorage.getItem(STUB_KEY) || '{"reports":[]}'); }
  catch { return { reports: [] }; }
}
function saveStub(state) {
  try { localStorage.setItem(STUB_KEY, JSON.stringify(state)); } catch {}
}
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); }
  catch { return []; }
}
function saveCache(reports) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(reports)); } catch {}
}
function loadOutbox() {
  try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]'); }
  catch { return []; }
}
function saveOutbox(q) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(q)); } catch {}
}
function loadMy() {
  try { return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); }
  catch { return []; }
}
function saveMy(rows) {
  try { localStorage.setItem(MY_KEY, JSON.stringify(rows)); } catch {}
}
function pruneMy(rows) {
  // Drop entries past the cancel window; the server rule will reject them anyway.
  const cutoff = Date.now() - CANCEL_WINDOW_MS;
  return rows.filter(r => new Date(r.ts).getTime() > cutoff);
}

// ---- Validation ----------------------------------------------------------
function validate({ buildingId, intensity, clientDate }) {
  if (!buildingId || typeof buildingId !== 'string') {
    throw new Error('buildingId required');
  }
  if (![1, 2, 3].includes(Number(intensity))) {
    throw new Error('intensity 1|2|3 required');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clientDate || '')) {
    throw new Error('clientDate YYYY-MM-DD required');
  }
}

// ---- Outbox --------------------------------------------------------------
function outboxPush(op) {
  const q = loadOutbox();
  q.push(op);
  saveOutbox(q);
}

async function outboxFlush() {
  if (!firestoreReady) return;
  const q = loadOutbox();
  if (!q.length) return;
  const rest = [];
  for (const op of q) {
    try {
      if (op.type === 'report') await firestoreReport(op.payload);
      else rest.push(op); // unknown ops preserved rather than dropped
    } catch {
      rest.push(op);
    }
  }
  saveOutbox(rest);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { outboxFlush().catch(() => {}); });
  // Best-effort initial flush (in case connectivity was already up).
  if (firestoreReady) Promise.resolve().then(outboxFlush).catch(() => {});
}

// ---- Public: listBuildings ----------------------------------------------
/** Buildings are hardcoded in buildings.js — no network. */
export function listBuildings() {
  return BUILDINGS;
}

// ---- Public: reportSmell -------------------------------------------------
/**
 * Records a smell report. Firestore mode uses serverTimestamp for ts and
 * queues on failure; stub mode writes to localStorage.
 * On success, records the id locally so the user can cancel within 24h.
 */
export async function reportSmell(payload) {
  validate(payload);
  const written = !firestoreReady
    ? stubReport(payload)
    : await (async () => {
        try { return await firestoreReport(payload); }
        catch (e) { outboxPush({ type: 'report', payload }); throw e; }
      })();
  // written = { id, ts (ISO string) }
  rememberMine({ ...written, ...payload });
}

function rememberMine({ id, ts, buildingId, intensity, clientDate }) {
  const rows = pruneMy(loadMy());
  rows.push({ id, buildingId, intensity: Number(intensity), clientDate, ts });
  saveMy(rows);
}

async function firestoreReport({ buildingId, intensity, clientDate, note }) {
  const { collection, addDoc, serverTimestamp } = firestoreLib;
  const ref = await addDoc(collection(db, 'reports'), {
    buildingId,
    intensity: Number(intensity),
    note: (note || '').slice(0, 200),
    ts: serverTimestamp(),
    clientDate,
  });
  return { id: ref.id, ts: new Date().toISOString() };
}

function stubReport({ buildingId, intensity, clientDate, note }) {
  const state = loadStub();
  const nowIso = new Date().toISOString();
  const id = (crypto && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `r${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  state.reports.push({
    id,
    buildingId,
    intensity: Number(intensity),
    note: (note || '').slice(0, 200),
    ts: nowIso,
    clientDate,
  });
  saveStub(state);
  return { id, ts: nowIso };
}

// ---- Public: getReports --------------------------------------------------
/**
 * Fetches reports optionally filtered by clientDate range.
 * Return shape is identical between modes: ts is always ISO string.
 */
export async function getReports({ from, to } = {}) {
  if (!firestoreReady) return stubGetReports({ from, to });

  try {
    const { collection, getDocs, query, where, orderBy } = firestoreLib;
    const clauses = [];
    if (from) clauses.push(where('clientDate', '>=', from));
    if (to)   clauses.push(where('clientDate', '<=', to));
    clauses.push(orderBy('clientDate', 'desc'));
    const snap = await getDocs(query(collection(db, 'reports'), ...clauses));
    const rows = snap.docs.map(docToReport);
    saveCache(rows);
    return rows;
  } catch (e) {
    console.warn('[data] getReports failed — returning cached snapshot', e);
    return loadCache().filter(r =>
      (!from || r.clientDate >= from) && (!to || r.clientDate <= to)
    );
  }
}

function docToReport(d) {
  const data = d.data();
  let ts;
  if (data.ts && typeof data.ts.toDate === 'function') {
    ts = data.ts.toDate().toISOString();
  } else if (data.ts instanceof Date) {
    ts = data.ts.toISOString();
  } else if (typeof data.ts === 'string') {
    ts = data.ts;
  } else {
    // Pending server timestamp (write not yet committed) — use now as best effort.
    ts = new Date().toISOString();
  }
  return {
    id: d.id,
    buildingId: data.buildingId,
    intensity: Number(data.intensity),
    note: data.note || '',
    ts,
    clientDate: data.clientDate,
  };
}

function stubGetReports({ from, to } = {}) {
  const all = loadStub().reports;
  return all.filter(r =>
    (!from || r.clientDate >= from) && (!to || r.clientDate <= to)
  );
}

// ---- Public: myReports (locally-remembered) -----------------------------
/**
 * Reports the current browser has authored within the last 24h.
 * Only these are eligible for user-initiated cancellation.
 * Sorted newest first.
 */
export function myReports() {
  const rows = pruneMy(loadMy());
  saveMy(rows); // persist the prune
  return rows.slice().sort((a, b) => b.ts.localeCompare(a.ts));
}

// ---- Public: deleteReport ------------------------------------------------
/**
 * Cancel a report the user created. Rejects if the id isn't in the local
 * "mine" set OR if past the cancel window. Firestore rule enforces the
 * 24h window server-side as a second gate.
 */
export async function deleteReport(id) {
  if (!id) throw new Error('id required');
  const mine = pruneMy(loadMy());
  const entry = mine.find(r => r.id === id);
  if (!entry) throw new Error('그 등록는 이 기기에서 작성한 게 아니에요.');

  if (!firestoreReady) {
    const state = loadStub();
    state.reports = state.reports.filter(r => r.id !== id);
    saveStub(state);
  } else {
    const { doc, deleteDoc } = firestoreLib;
    await deleteDoc(doc(db, 'reports', id));
    // Best-effort: refresh cache so subsequent stats reads exclude it too.
    saveCache(loadCache().filter(r => r.id !== id));
  }

  saveMy(mine.filter(r => r.id !== id));
}

// ---- Public: withBuildingMeta -------------------------------------------
/** Attach building name + complex to a report. Views use this for display. */
export function withBuildingMeta(report) {
  const b = findBuilding(report.buildingId);
  return {
    ...report,
    buildingName: b ? b.name : report.buildingId,
    complex:      b ? b.complex : '',
  };
}

// ---- Dev helpers ---------------------------------------------------------
export async function _devSeed(count = 60) {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 14);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    // Use local YMD (matches todayYMD()); toISOString would drift by TZ.
    const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const b = BUILDINGS[Math.floor(Math.random() * BUILDINGS.length)];
    const intensity = 1 + Math.floor(Math.random() * 3);
    try {
      await reportSmell({ buildingId: b.id, intensity, clientDate: ymd, note: '' });
    } catch {
      // Outbox catches Firestore-mode failures; stub mode can't fail meaningfully.
    }
  }
}

function _clear() {
  localStorage.removeItem(STUB_KEY);
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(OUTBOX_KEY);
}

if (typeof window !== 'undefined') {
  window.__shinan = { _devSeed, _clear, firestoreReady };
}
