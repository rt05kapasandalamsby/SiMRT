/**
 * SiMRT Authentication — Firebase Auth + Firestore
 * Supports: Admin (fixed, pre-seeded) + Warga (register → pending → approve)
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  role: "Admin" | "Warga";
  status: "active" | "pending" | "rejected";
  phone: string;
  address: string;
  createdAt?: string;
}

const SESSION_KEY = "simrt_session";

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginUser(
  email: string,
  password: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password,
    );
    const uid = credential.user.uid;

    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      await signOut(auth);
      return { success: false, error: "Data pengguna tidak ditemukan di sistem." };
    }

    const data = snap.data();

    if (data.status === "pending") {
      await signOut(auth);
      return {
        success: false,
        error:
          "Akun Anda sedang menunggu persetujuan admin. Silakan hubungi pengurus RT 05.",
      };
    }
    if (data.status === "rejected") {
      await signOut(auth);
      return {
        success: false,
        error: "Akun Anda telah ditolak. Silakan hubungi pengurus RT 05.",
      };
    }

    const user: AuthUser = {
      uid,
      name:    data.name      ?? "",
      email:   data.email     ?? email,
      role:    data.role      ?? "Warga",
      status:  data.status    ?? "pending",
      phone:   data.phone     ?? "",
      address: data.address   ?? "",
      createdAt:
        typeof data.createdAt?.toDate === "function"
          ? data.createdAt.toDate().toISOString()
          : data.createdAt ?? "",
    };

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, user };
  } catch (err: any) {
    const code: string = err?.code ?? "";
    if (
      code === "auth/user-not-found" ||
      code === "auth/wrong-password" ||
      code === "auth/invalid-credential" ||
      code === "auth/invalid-email"
    ) {
      return { success: false, error: "Email atau kata sandi tidak benar." };
    }
    if (code === "auth/too-many-requests") {
      return {
        success: false,
        error: "Terlalu banyak percobaan login. Coba lagi beberapa saat.",
      };
    }
    if (code.includes("api-key") || code.includes("invalid-api-key")) {
      return {
        success: false,
        error: "Konfigurasi Firebase belum diatur. Hubungi developer.",
      };
    }
    return {
      success: false,
      error: `Terjadi kesalahan (${code || "unknown"}). Silakan coba lagi.`,
    };
  }
}

// ─── Register (Warga Only — status: pending) ──────────────────────────────────
export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      data.email.trim().toLowerCase(),
      data.password,
    );
    const uid = credential.user.uid;

    await setDoc(doc(db, "users", uid), {
      name:      data.name.trim(),
      email:     data.email.trim().toLowerCase(),
      role:      "Warga",
      status:    "pending",
      phone:     data.phone.trim(),
      address:   data.address.trim(),
      noKK:      "",
      nik:       "",
      pekerjaan: "",
      createdAt: serverTimestamp(),
    });

    // Sign out immediately — they need Admin approval first
    await signOut(auth);
    return { success: true };
  } catch (err: any) {
    const code: string = err?.code ?? "";
    if (code === "auth/email-already-in-use") {
      return { success: false, error: "Email sudah terdaftar. Gunakan email lain." };
    }
    if (code === "auth/weak-password") {
      return { success: false, error: "Kata sandi terlalu lemah. Minimal 6 karakter." };
    }
    if (code.includes("api-key") || code.includes("invalid-api-key")) {
      return {
        success: false,
        error: "Konfigurasi Firebase belum diatur. Hubungi developer.",
      };
    }
    return { success: false, error: "Pendaftaran gagal. Silakan coba lagi." };
  }
}

// ─── Session helpers ──────────────────────────────────────────────────────────
export function getSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function updateSession(updates: Partial<AuthUser>): void {
  const current = getSession();
  if (current) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...current, ...updates }));
  }
}

export function logoutUser(): void {
  localStorage.removeItem(SESSION_KEY);
  signOut(auth).catch(console.error);
}