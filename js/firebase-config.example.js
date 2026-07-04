// firebase-config.example.js
// -----------------------------------------------------------------------------
// TEMPLATE — copy this file to `firebase-config.js` and fill in your project's
// values. See FIREBASE_SETUP.md at the repo root for the full walkthrough.
//
// When `firebase-config.js` is absent OR any REPLACE_ME values remain, the app
// automatically falls back to the localStorage stub in data.js — no crash.
//
// firebaseConfig apiKey is NOT a secret (Firebase exposes it to clients by
// design); real access control lives in `firestore.rules`. `firebase-config.js`
// is still gitignored to prevent accidental fork-and-abuse of your project.
// -----------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey:            'REPLACE_ME',
  authDomain:        'REPLACE_ME.firebaseapp.com',
  projectId:         'REPLACE_ME',
  storageBucket:     'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId:             'REPLACE_ME',
};

// Collection names — aligned with firestore.rules.
// Only `reports` exists; buildings are hardcoded in js/buildings.js.
export const COLLECTIONS = {
  reports: 'reports',
};
