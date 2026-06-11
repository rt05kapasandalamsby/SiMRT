/**
 * seedAdmin.js — One-time script to create the Admin account in Firebase
 *
 * USAGE:
 *   1. Pastikan .env sudah diisi (terutama FIREBASE_SERVICE_ACCOUNT_PATH)
 *   2. Jalankan: node scripts/seedAdmin.js
 *
 * Script ini akan:
 *   - Membuat user di Firebase Authentication
 *   - Membuat dokumen di Firestore collection "users"
 *   - Melaporkan UID yang dibuat
 */

"use strict";

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const admin = require("firebase-admin");

// Init Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  } else {
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "../serviceAccountKey.json";
    const sa     = require(saPath);
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
} catch (err) {
  console.error("❌ Firebase init gagal:", err.message);
  process.exit(1);
}

const auth = admin.auth();
const db   = admin.firestore();

const ADMIN_DATA = {
  name:      "Nanik Indahwati",
  email:     "ketua@rt05kapasan.id",
  password:  "Admin@RT05!",
  role:      "Admin",
  status:    "active",
  phone:     "0812-3311-7755",
  address:   "Jl. Kapasan Dalam No. 5, RT 05/RW 03, Kapasan, Surabaya",
};

async function seedAdmin() {
  console.log("\n═══════════════════════════════════════");
  console.log("  SiMRT — Seed Admin Account");
  console.log("═══════════════════════════════════════\n");

  try {
    // Check if already exists
    let existingUser = null;
    try {
      existingUser = await auth.getUserByEmail(ADMIN_DATA.email);
    } catch {
      // User doesn't exist yet
    }

    let uid;

    if (existingUser) {
      uid = existingUser.uid;
      console.log(`⚠️  User sudah ada di Auth: ${ADMIN_DATA.email}`);
      console.log(`   UID: ${uid}`);
    } else {
      const userRecord = await auth.createUser({
        email:         ADMIN_DATA.email,
        password:      ADMIN_DATA.password,
        displayName:   ADMIN_DATA.name,
        emailVerified: true,
      });
      uid = userRecord.uid;
      console.log(`✅ Firebase Auth user dibuat: ${ADMIN_DATA.email}`);
      console.log(`   UID: ${uid}`);
    }

    // Create/update Firestore document
    await db.collection("users").doc(uid).set(
      {
        name:      ADMIN_DATA.name,
        email:     ADMIN_DATA.email,
        role:      ADMIN_DATA.role,
        status:    ADMIN_DATA.status,
        phone:     ADMIN_DATA.phone,
        address:   ADMIN_DATA.address,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Firestore document dibuat: users/${uid}`);
    console.log("\n── Login Credentials ───────────────────");
    console.log(`   Email    : ${ADMIN_DATA.email}`);
    console.log(`   Password : ${ADMIN_DATA.password}`);
    console.log("────────────────────────────────────────");
    console.log("\n✅ Admin berhasil dibuat. Selamat menggunakan SiMRT!\n");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedAdmin();
