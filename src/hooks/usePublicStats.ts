import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { COLL, SETTINGS_DOC } from "../app/components/dashboard/data";

export interface PublicStats {
  totalWarga: number;
  iuranLunas: number;
  iuranBulan: number;
  iuranTerkumpul: number;
  pengumumanAktif: number;
  bulan: string;
  updatedAt: string;
}

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    let totalWarga = 0;
    let pengumumanAktif = 0;
    let iuranLunas = 0;
    let iuranTerkumpul = 0;
    let iuranBulan = 25000;
    let loadedItems = 0;
    const requiredItems = 4;

    const checkComplete = () => {
      if (loadedItems === requiredItems) {
        const bulan = new Date().toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        });
        setStats({
          totalWarga,
          iuranLunas,
          iuranBulan,
          iuranTerkumpul,
          pengumumanAktif,
          bulan,
          updatedAt: new Date().toISOString(),
        });
        setLoading(false);
      }
    };

    // 1. Total Warga Aktif
    const q1 = query(
      collection(db, COLL.users),
      where("role", "==", "Warga"),
      where("status", "==", "active")
    );
    unsubscribers.push(
      onSnapshot(q1, (snap) => {
        totalWarga = snap.size;
        if (loadedItems < 4) loadedItems++;
        checkComplete();
      })
    );

    // 2. Pengumuman Aktif
    const q2 = query(
      collection(db, COLL.pengumuman),
      where("status", "==", "Aktif")
    );
    unsubscribers.push(
      onSnapshot(q2, (snap) => {
        pengumumanAktif = snap.size;
        if (loadedItems < 4) loadedItems++;
        checkComplete();
      })
    );

    // 3. Iuran Bulan Ini (Lunas)
    const bulanIni = new Date().toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    const q3 = query(
      collection(db, COLL.iuran),
      where("bulan", "==", bulanIni)
    );
    unsubscribers.push(
      onSnapshot(q3, (snap) => {
        iuranLunas = snap.docs.filter((d) => d.data().status === "Lunas").length;
        iuranTerkumpul = snap.docs
          .filter((d) => d.data().status === "Lunas")
          .reduce((sum, d) => sum + (d.data().jumlah ?? 0), 0);
        if (loadedItems < 4) loadedItems++;
        checkComplete();
      })
    );

    // 4. Default Iuran dari Settings (one-time fetch)
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, COLL.settings, SETTINGS_DOC.iuranDefault);
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          iuranBulan = settingsSnap.data().jumlah ?? 25000;
        }
      } catch (err) {
        console.error("Error fetching iuran settings:", err);
      } finally {
        if (loadedItems < 4) loadedItems++;
        checkComplete();
      }
    };
    fetchSettings();

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return { stats, loading };
}
