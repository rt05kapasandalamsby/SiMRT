const LS_KEY = "simrt_public_stats";

export interface PublicStats {
  totalWarga: number;
  iuranLunas: number;
  iuranBulan: number;
  iuranTerkumpul: number;
  pengumumanAktif: number;
  bulan: string;
  updatedAt: string;
}

export function getPublicStats(): PublicStats | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicStats;
  } catch {
    return null;
  }
}

export function savePublicStats(stats: Omit<PublicStats, "updatedAt">): void {
  try {
    const full: PublicStats = { ...stats, updatedAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify(full));
  } catch {
    // ignore if storage unavailable
  }
}
