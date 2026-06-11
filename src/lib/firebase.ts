/**
 * ═══════════════════════════════════════════════════════════════
 *  Firebase Setup — SiMRT RT 05 Kapasan Dalam, Surabaya
 *  Project : sistem-informasi-manajemen-rt
 *  SDK     : Firebase v9+ Modular
 * ═══════════════════════════════════════════════════════════════
 *
 *  Firestore Collections:
 *  ─────────────────────
 *  users       → semua pengguna (Admin + Warga)
 *  iuran       → catatan iuran bulanan
 *  pengumuman  → pengumuman RT
 *  surat       → permohonan surat menyurat
 *  janji_temu  → jadwal janji temu warga
 *  transaksi   → catatan keuangan RT
 *  aktivitas   → log aktivitas admin
 *  notifikasi  → notifikasi sistem
 *
 *  Firestore Rules (pasang di Firebase Console → Firestore → Rules):
 *  ──────────────────────────────────────────────────────────────
 *  rules_version = '2';
 *  service cloud.firestore {
 *    match /databases/{database}/documents {
 *      match /users/{uid} {
 *        allow read, write: if request.auth != null;
 *      }
 *      match /{document=**} {
 *        allow read, write: if request.auth != null;
 *      }
 *    }
 *  }
 *
 *  Setup Admin (satu kali, via Firebase Console):
 *  ───────────────────────────────────────────────
 *  1. Firebase Console → Authentication → Users → Add User
 *     Email   : ketua@rt05kapasan.id
 *     Password: Admin@RT05!
 *  2. Copy UID yang dihasilkan
 *  3. Firestore → Collection "users" → Add Document
 *     Document ID  : (UID tadi)
 *     name         : "Nanik Indahwati"
 *     email        : "ketua@rt05kapasan.id"
 *     role         : "Admin"
 *     status       : "active"
 *     phone        : "0812-3311-7755"
 *     address      : "Jl. Kapasan Dalam No. 5, RT 05/RW 03"
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth,       type Auth }       from "firebase/auth";
import { getFirestore,  type Firestore }  from "firebase/firestore";
import { getStorage,    type FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// ─── Real Firebase Configuration ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyBgiBx73o4XoSo-RK_pRLNABtPuo2MvKbg",
  authDomain:        "sistem-informasi-manajemen-rt.firebaseapp.com",
  projectId:         "sistem-informasi-manajemen-rt",
  storageBucket:     "sistem-informasi-manajemen-rt.firebasestorage.app",
  messagingSenderId: "875734673364",
  appId:             "1:875734673364:web:eeca42f2d0edb0b0de5841",
  // measurementId not needed (Analytics disabled)
};

// ─── Initialize App (singleton guard) ────────────────────────────────────────
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ─── Service exports ──────────────────────────────────────────────────────────
export const auth:    Auth             = getAuth(app);
export const db:      Firestore        = getFirestore(app);
export const storage: FirebaseStorage  = getStorage(app);

// ─── Analytics (optional, auto-enabled in production) ────────────────────────
// Only initialize if supported (browser environment)
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported && !import.meta.env.DEV) {
      getAnalytics(app);
      if (import.meta.env.DEV) console.log('📊 Firebase Analytics enabled');
    }
  }).catch(() => {
    // Analytics not supported, silently continue
  });
}

export default app;