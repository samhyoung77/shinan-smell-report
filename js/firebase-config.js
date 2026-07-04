// firebase-config.js
// -----------------------------------------------------------------------------
// Real Firebase project config for shinanAPT.
// apiKey is not a secret; access control lives in firestore.rules.
// -----------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey:            'AIzaSyCj9HWcv8yiWVNIkMZRBR20b7kJNVU_WjQ',
  authDomain:        'shinan-smell-report.firebaseapp.com',
  projectId:         'shinan-smell-report',
  storageBucket:     'shinan-smell-report.firebasestorage.app',
  messagingSenderId: '1010514986871',
  appId:             '1:1010514986871:web:045fc2f3cd764db8b7c372',
};

export const COLLECTIONS = {
  reports: 'reports',
};
