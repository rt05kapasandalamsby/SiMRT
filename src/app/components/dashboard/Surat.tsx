/**
 * Surat — Admin letter management with:
 *  - Firebase Storage upload for finalized surat PDF
 *  - Download URL saved to Firestore
 *  - Download button for completed surat
 *  - Warga searchable for pemohon
 */
import { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText, Plus, Edit2, Trash2, X, Search, Loader2, AlertTriangle,
  CheckCircle2, Clock, XCircle, ChevronDown, Download, Upload,
  ExternalLink, AlertCircle, User,
} from "lucide-react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy, where,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase";
import { COLL, type SuratDoc, type WargaDoc } from "./data";
import { showToast } from "./ui";

type Item = SuratDoc & { id: string };
type WargaOption = Pick<WargaDoc, "name" | "address"> & { uid: string };

const JENIS_SURAT = [
  "Surat Keterangan Domisili",
  "Surat Pengantar KTP",
  "Surat Keterangan Tidak Mampu",
  "Surat Pengantar SKCK",
  "Surat Keterangan Usaha",
  "Surat Pengantar Kartu Keluarga",
  "Surat Pengantar Nikah",
  "Surat Keterangan Pindah",
  "Surat Keterangan Ahli Waris",
];

const statusColor = (s: string) =>
  s === "Selesai"  ? "bg-emerald-100 text-emerald-700" :
  s === "Diproses" ? "bg-blue-100    text-blue-700"    :
  s === "Menunggu" ? "bg-orange-100  text-orange-700"  :
                     "bg-red-100     text-red-700";

const statusIcon = (s: string) =>
  s === "Selesai"  ? CheckCircle2 :
  s === "Diproses" ? Clock :
  s === "Menunggu" ? Clock : XCircle;

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Pemohon Searchable Select ────────────────────────────────────────────────
function PemohonSelect({
  value, onSelect, wargaList, loadingWarga, disabled,
}: {
  value: string;
  onSelect: (w: WargaOption | null, customName?: string) => void;
  wargaList: WargaOption[];
  loadingWarga: boolean;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open,   setOpen]   = useState(false);
  const ref2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref2.current && !ref2.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return wargaList.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.address ?? "").toLowerCase().includes(q),
    );
  }, [wargaList, search]);

  return (
    <div ref={ref2} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={open ? search : value}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); setSearch(""); }}
          disabled={disabled}
          placeholder="Cari nama warga atau ketik manual..."
          className="w-full pl-10 pr-10 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
        />
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
          {/* Manual input option */}
          {search.trim().length > 1 && !wargaList.some((w) => w.name.toLowerCase() === search.toLowerCase()) && (
            <button
              type="button"
              onClick={() => { onSelect(null, search.trim()); setOpen(false); setSearch(""); }}
              className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-slate-100"
            >
              <p className="text-sm font-semibold text-amber-700">Gunakan: "{search.trim()}"</p>
              <p className="text-xs text-amber-500 mt-0.5">Input manual (tidak dari daftar warga)</p>
            </button>
          )}
          {filtered.length === 0 && search.trim().length <= 1 && (
            <div className="px-4 py-5 text-center text-sm text-slate-400">
              {loadingWarga ? "Memuat…" : "Ketik nama warga untuk mencari"}
            </div>
          )}
          {filtered.map((w) => (
            <button
              key={w.uid}
              type="button"
              onClick={() => { onSelect(w); setOpen(false); setSearch(""); }}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <p className="text-sm font-semibold text-slate-800">{w.name}</p>
              {w.address && <p className="text-xs text-slate-400 truncate mt-0.5">{w.address}</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── File Upload for Finalized Surat ─────────────────────────────────────────
function SuratUpload({
  suratId, currentUrl, onUploaded,
}: {
  suratId: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/msword",                                                      // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.ms-excel",                                                // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",       // .xlsx
      "application/vnd.ms-powerpoint",                                           // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    ];
    const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf("."));

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      showToast("Jenis file tidak didukung. Hanya PDF, Word, Excel, atau PowerPoint yang diperbolehkan.", "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("Ukuran file maksimal 10 MB", "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const storageRef = ref(storage, `surat/${suratId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve,
        );
      });

      const url = await getDownloadURL(uploadTask.snapshot.ref);
      // Save URL to Firestore
      await updateDoc(doc(db, COLL.surat, suratId), { downloadUrl: url });
      onUploaded(url);
      showToast("File surat berhasil diunggah", "success");
    } catch (err) {
      if (import.meta.env.DEV) console.error(err);
      showToast("Gagal mengunggah file. Coba lagi.", "error");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-600">File Surat Final (PDF, Word, Excel, PPT)</label>

      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <Download className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate">File sudah tersedia — Klik untuk pratinjau</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
        </a>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        className="hidden"
        onChange={handleFileChange}
      />

      {uploading ? (
        <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1.5">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
            <span className="text-xs text-blue-700 font-medium">Mengunggah... {progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
        >
          <Upload className="w-4 h-4 flex-shrink-0" />
          {currentUrl ? "Ganti file (PDF, Word, Excel, PPT)" : "Upload file surat (PDF, Word, Excel, PPT)"}
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Surat() {
  const [items,        setItems]        = useState<Item[]>([]);
  const [wargaList,    setWargaList]    = useState<WargaOption[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [loadingWarga, setLoadingWarga] = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [modal,        setModal]        = useState<"add" | "edit" | "delete" | null>(null);
  const [selected,     setSelected]     = useState<Item | null>(null);
  const [form, setForm] = useState({
    pemohon:     "",
    userId:      "",
    jenis:       JENIS_SURAT[0],
    status:      "Menunggu" as SuratDoc["status"],
    catatan:     "",
    downloadUrl: "",
  });
  const [saving, setSaving] = useState(false);

  // ── Fetch surat ───────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, COLL.surat), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Item)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // ── Fetch active warga ────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, COLL.users),
      where("role",   "==", "Warga"),
      where("status", "==", "active"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setWargaList(snap.docs.map((d) => ({
        uid:     d.id,
        name:    d.data().name    ?? "",
        address: d.data().address ?? "",
      })));
      setLoadingWarga(false);
    }, () => setLoadingWarga(false));
    return () => unsub();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items;
    if (filterStatus !== "Semua") list = list.filter((i) => i.status === filterStatus);
    if (search) list = list.filter((i) =>
      i.pemohon.toLowerCase().includes(search.toLowerCase()) ||
      i.jenis.toLowerCase().includes(search.toLowerCase()),
    );
    return list;
  }, [items, search, filterStatus]);

  const genNoSurat = () => {
    const n   = items.length + 1;
    const d   = new Date();
    const rom = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][d.getMonth() + 1];
    return `S-${String(n).padStart(3, "0")}/RT05/${rom}/${d.getFullYear()}`;
  };

  const counts = {
    Semua:    items.length,
    Menunggu: items.filter((i) => i.status === "Menunggu").length,
    Diproses: items.filter((i) => i.status === "Diproses").length,
    Selesai:  items.filter((i) => i.status === "Selesai").length,
    Ditolak:  items.filter((i) => i.status === "Ditolak").length,
  };

  const openAdd = () => {
    setForm({ pemohon: "", userId: "", jenis: JENIS_SURAT[0], status: "Menunggu", catatan: "", downloadUrl: "" });
    setModal("add");
  };

  const openEdit = (item: Item) => {
    setSelected(item);
    setForm({
      pemohon:     item.pemohon,
      userId:      item.userId ?? "",
      jenis:       item.jenis,
      status:      item.status,
      catatan:     item.catatan ?? "",
      downloadUrl: item.downloadUrl ?? "",
    });
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.pemohon.trim()) { showToast("Nama pemohon wajib diisi", "error"); return; }
    setSaving(true);
    try {
      if (modal === "add") {
        await addDoc(collection(db, COLL.surat), {
          pemohon:     form.pemohon.trim(),
          userId:      form.userId || null,
          jenis:       form.jenis,
          status:      form.status,
          catatan:     form.catatan,
          downloadUrl: form.downloadUrl || null,
          noSurat:     genNoSurat(),
          tanggal:     new Date().toISOString().split("T")[0],
          createdAt:   serverTimestamp(),
        });
        showToast("Permohonan surat berhasil dibuat", "success");
      } else if (selected) {
        await updateDoc(doc(db, COLL.surat, selected.id), {
          pemohon:     form.pemohon.trim(),
          userId:      form.userId || selected.userId || null,
          jenis:       form.jenis,
          status:      form.status,
          catatan:     form.catatan,
          downloadUrl: form.downloadUrl || selected.downloadUrl || null,
        });
        showToast("Data surat diperbarui", "success");
      }
      setModal(null);
    } catch {
      showToast("Gagal menyimpan. Coba lagi.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, COLL.surat, selected.id));
      showToast("Data surat dihapus", "success");
      setModal(null);
    } catch {
      showToast("Gagal menghapus.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Surat Menyurat</h1>
          <p className="text-sm text-slate-400 mt-0.5">Administrasi surat RT 05 Kapasan Dalam</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Buat Surat
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["Semua", "Menunggu", "Diproses", "Selesai", "Ditolak"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterStatus === s ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            {s} <span className="ml-1 opacity-70">{counts[s as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama pemohon atau jenis surat..."
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Memuat data surat...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">{search ? "Tidak ditemukan" : "Belum ada data surat"}</p>
            {!search && (
              <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">
                Buat surat pertama
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["No. Surat", "Pemohon", "Jenis Surat", "Tanggal", "Status", "File", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item) => {
                  const StatusIcon = statusIcon(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{item.noSurat}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.pemohon}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.jenis}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.tanggal}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor(item.status)}`}>
                          <StatusIcon className="w-3 h-3" /> {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.downloadUrl ? (
                          <a
                            href={item.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelected(item); setModal("delete"); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal title={modal === "add" ? "Buat Surat Baru" : "Edit Data Surat"} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {/* Pemohon */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Nama Pemohon <span className="text-red-500">*</span>
              </label>
              {modal === "edit" ? (
                <input
                  value={form.pemohon}
                  onChange={(e) => setForm((f) => ({ ...f, pemohon: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              ) : (
                <PemohonSelect
                  value={form.pemohon}
                  wargaList={wargaList}
                  loadingWarga={loadingWarga}
                  onSelect={(w, customName) => {
                    if (w) {
                      setForm((f) => ({ ...f, pemohon: w.name, userId: w.uid }));
                    } else if (customName) {
                      setForm((f) => ({ ...f, pemohon: customName, userId: "" }));
                    }
                  }}
                />
              )}
            </div>

            {/* Jenis */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Jenis Surat</label>
              <select
                value={form.jenis}
                onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {JENIS_SURAT.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {["Menunggu", "Diproses", "Selesai", "Ditolak"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Catatan</label>
              <textarea
                value={form.catatan}
                onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                rows={3}
                placeholder="Catatan tambahan (opsional)"
              />
            </div>

            {/* File Upload — only for edit mode (need the doc ID) */}
            {modal === "edit" && selected && (
              <SuratUpload
                suratId={selected.id}
                currentUrl={form.downloadUrl || undefined}
                onUploaded={(url) => setForm((f) => ({ ...f, downloadUrl: url }))}
              />
            )}

            {/* Paste URL as alternative */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                URL Download (opsional — alternatif upload)
              </label>
              <input
                value={form.downloadUrl}
                onChange={(e) => setForm((f) => ({ ...f, downloadUrl: e.target.value }))}
                placeholder="https://drive.google.com/... atau Firebase Storage URL"
                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <p className="text-xs text-slate-400 mt-1">
                Paste URL Google Drive / Firebase Storage untuk link download surat
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {modal === "delete" && selected && (
        <Modal title="Hapus Data Surat" onClose={() => setModal(null)}>
          <div className="text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-700 mb-5">
              Hapus surat <strong>{selected.noSurat}</strong> untuk <strong>{selected.pemohon}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 text-sm">
                Batal
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Menghapus...</> : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
