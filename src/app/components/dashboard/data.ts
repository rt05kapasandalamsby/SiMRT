// ─── RT Information (static — identity data for RT 05 Kapasan Dalam) ─────────
export const rtInfo = {
  rt:           "05",
  rw:           "03",
  kelurahan:    "Kapasan",
  kecamatan:    "Simokerto",
  kota:         "Surabaya",
  provinsi:     "Jawa Timur",
  namaSystem:   "Sistem Informasi Manajemen RT 05 Kapasan Dalam",
  namaShort:    "SiMRT RT 05",
  ketua:        "Ibu Nanik Indahwati",
  namaKetua:    "Nanik Indahwati",
  sekretaris:   "Ibu Sumarni",
  bendahara:    "Bpk. Hartono",
  email:        "ketua@rt05kapasan.id",
  noHP:         "0812-3311-7755",
  alamatKantor: "Jl. Kapasan Dalam No. 5, Simokerto, Surabaya",
  // Default fallback — real value fetched from Firestore settings/iuran_default
  iuranPokok:   25000,
  tahunBerdiri: "2006",
};

// ─── Firestore collection names ───────────────────────────────────────────────
export const COLL = {
  users:      "users",
  iuran:      "iuran",
  pengumuman: "pengumuman",
  surat:      "surat",
  janjiTemu:  "janji_temu",
  transaksi:  "transaksi",
  aktivitas:  "aktivitas",
  notifikasi: "notifikasi",
  settings:   "settings",
  templates:  "templates",
  paymentOrders: "payment_orders",
} as const;

// ─── Firestore document IDs (settings) ────────────────────────────────────────
export const SETTINGS_DOC = {
  iuranDefault: "iuran_default",
} as const;

// ─── Page type (Admin) ────────────────────────────────────────────────────────
export type Page =
  | "dashboard"
  | "warga"
  | "approval"
  | "iuran"
  | "keuangan"
  | "surat"
  | "pengumuman"
  | "aktivitas"
  | "janji"
  | "notifikasi"
  | "pengaturan"
  | "template";

// ─── Shared Firestore Types ───────────────────────────────────────────────────

export interface WargaDoc {
  uid:        string;
  name:       string;
  email:      string;
  role:       "Admin" | "Warga";
  status:     "active" | "pending" | "rejected";
  phone:      string;
  address:    string;
  noKK?:      string;
  nik?:       string;
  pekerjaan?: string;
  agama?:     string;
  createdAt:  any;
}

export interface IuranDoc {
  id?:          string;
  userId?:      string;
  namaWarga:    string;
  bulan:        string;
  jumlah:       number;
  status:       "Lunas" | "Belum Bayar";
  tanggal:      string | null;
  paidAt?:      any;
  referenceId?: string;
  paymentMethod?: string;
  createdAt?:   any;
}

export interface PengumumanDoc {
  id?:       string;
  judul:     string;
  isi:       string;
  tanggal:   string;
  penulis:   string;
  status:    "Aktif" | "Nonaktif";
  prioritas: "Tinggi" | "Normal" | "Rendah";
  createdAt?: any;
}

export interface SuratDoc {
  id?:          string;
  noSurat:      string;
  pemohon:      string;
  userId?:      string;
  jenis:        string;
  tanggal:      string;
  status:       "Menunggu" | "Diproses" | "Selesai" | "Ditolak";
  catatan?:     string;
  downloadUrl?: string;   // Firebase Storage URL — set when admin uploads finalized surat
  createdAt?:   any;
}

export interface JanjiTemuDoc {
  id?:       string;
  nama:      string;
  userId?:   string;
  keperluan: string;
  tanggal:   string;
  jam:       string;
  status:    "Dikonfirmasi" | "Menunggu" | "Dibatalkan";
  noHP:      string;
  createdAt?: any;
}

export interface TransaksiDoc {
  id?:        string;
  tanggal:    string;
  keterangan: string;
  kategori:   "Pemasukan" | "Pengeluaran";
  jumlah:     number;
  createdAt?: any;
}

export interface AktivitasDoc {
  id?:      string;
  aksi:     string;
  pengguna: string;
  waktu:    string;
  ikon:     string;
  warna:    string;
  createdAt?: any;
}

/** Stored in Firestore: settings/iuran_default */
export interface SettingsDoc {
  nominalBulanan:    number;
  allowCustomNominal: boolean;
  updatedAt?:        any;
  updatedBy?:        string;
}

/** Stored in Firestore: templates/{id} */
export interface TemplateDoc {
  id?:               string;
  nama:              string;
  deskripsi:         string;
  kategori:          "Keterangan" | "Pengantar" | "Permohonan";
  namaFile:          string;
  downloadUrl:       string;   // Firebase Storage URL
  ukuran?:           string;
  aktif:             boolean;
  diunduh:           number;
  terakhirDiperbarui: string;
  createdAt?:        any;
}

/** Stored in Firestore: payment_orders/{orderId} */
export interface PaymentOrderDoc {
  iuranId:       string;
  namaWarga:     string;
  bulan:         string;
  amount:        number;
  email?:        string;
  status:        "pending" | "settlement" | "failed";
  snapToken?:    string;
  transactionId?: string;
  paymentType?:  string;
  createdAt?:    any;
  updatedAt?:    any;
}
