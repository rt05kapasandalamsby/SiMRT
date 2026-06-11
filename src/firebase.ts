/**
 * /src/firebase.ts — Compatibility re-export
 *
 * All existing component imports (../../../firebase, ../../firebase, etc.)
 * continue to work without any changes.
 * The real Firebase config lives in /src/lib/firebase.ts.
 */
export { auth, db, storage } from "./lib/firebase";
export { default as firebaseApp } from "./lib/firebase";

/** Always true — real Firebase config is active */
export function isFirebaseConfigured(): boolean {
  return true;
}