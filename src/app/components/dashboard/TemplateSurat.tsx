/**
 * TemplateSurat — Admin template management backed by Firestore + Firebase Storage
 *
 * Admin: Upload template files, manage metadata
 * Warga: Download templates via window.open(downloadUrl)
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Upload,
  Edit2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  X,
  FileText,
  Search,
  CheckCircle2,
  FolderOpen,
  Clock,
  DownloadCloud,
  File,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  increment,
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "../../../firebase";
import { COLL, type TemplateDoc } from "./data";
import {
  Button,
  Badge,
  AnimListItem,
  showToast,
  FilterTabs,
  ActionBtn,
  AnimModal,
  ConfirmDialog,
  Input,
  Textarea,
  Select,
  cn,
  EmptyState,
  Spinner,
} from "./ui";

type Template = TemplateDoc & { id: string };

const KATEGORI_OPTS = [
  { value: "Keterangan", label: "Surat Keterangan" },
  { value: "Pengantar", label: "Surat Pengantar" },
  { value: "Permohonan", label: "Surat Permohonan" },
];

const KAT_BADGE: Record<string, "blue" | "emerald" | "violet"> = {
  Keterangan: "blue",
  Pengantar: "emerald",
  Permohonan: "violet",
};

const KAT_BG: Record<string, string> = {
  Keterangan: "bg-blue-600",
  Pengantar: "bg-emerald-600",
  Permohonan: "bg-violet-600",
};

type FormState = {
  nama: string;
  deskripsi: string;
  kategori: string;
  namaFile: string;
  downloadUrl: string;
  ukuran: string;
};

const EMPTY_FORM: FormState = {
  nama: "",
  deskripsi: "",
  kategori: "Keterangan",
  namaFile: "",
  downloadUrl: "",
  ukuran: "",
};

// ─── PDF Icon ─────────────────────────────────────────────────────────────────
function PdfIcon({ kategori }: { kategori: string }) {
  const bg = KAT_BG[kategori] ?? "bg-red-600";
  return (
    <div
      className={cn(
        "relative w-16 h-20 rounded-xl flex flex-col items-center justify-center shadow-lg",
        bg,
      )}
    >
      <div className="absolute top-0 right-0 w-0 h-0 border-l-[14px] border-l-white/20 border-b-[14px] border-b-transparent" />
      <File className="w-7 h-7 text-white mb-1" />
      <span className="text-white text-[10px] font-black tracking-widest">
        PDF
      </span>
    </div>
  );
}

// ─── Upload progress ──────────────────────────────────────────────────────────
function UploadProgress({ progress }: { progress: number }) {
  return (
    <div className="px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-2 mb-1.5">
        <Loader2 className="w-4 h-4 text-blue-600 animate-spin flex-shrink-0" />
        <span className="text-xs text-blue-700 font-medium">
          Mengunggah... {progress}%
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-1.5">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Warga Card ───────────────────────────────────────────────────────────────
function WargaCard({
  template,
  onDownload,
  isDownloading,
}: {
  template: Template;
  onDownload: (t: Template) => void;
  isDownloading: boolean;
}) {
  const hasUrl = Boolean(template.downloadUrl);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(15,39,68,0.1)" }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col"
    >
      <div className="p-5 pb-4 flex items-start gap-4">
        <div className="flex-shrink-0">
          <PdfIcon kategori={template.kategori} />
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <Badge variant={KAT_BADGE[template.kategori] ?? "slate"}>
              {template.kategori}
            </Badge>
            <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
              <DownloadCloud className="w-3 h-3" />
              <span>{template.diunduh ?? 0}x</span>
            </div>
          </div>
          <h3 className="text-slate-800 font-bold leading-snug">
            {template.nama}
          </h3>
        </div>
      </div>

      <div className="px-5 pb-4 flex-1">
        <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
          {template.deskripsi}
        </p>
      </div>

      <div className="mx-5 mb-4 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 truncate">
            {template.namaFile || "dokumen.pdf"}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {template.ukuran ?? "—"} · Diperbarui {template.terakhirDiperbarui}
          </p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <motion.button
          whileHover={!isDownloading && hasUrl ? { scale: 1.02 } : {}}
          whileTap={!isDownloading && hasUrl ? { scale: 0.97 } : {}}
          onClick={() => hasUrl && !isDownloading && onDownload(template)}
          disabled={isDownloading || !hasUrl}
          className={cn(
            "w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm transition-all",
            isDownloading
              ? "bg-blue-400 text-white cursor-not-allowed"
              : hasUrl
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200 hover:shadow-md"
                : "bg-slate-100 text-slate-400 cursor-not-allowed",
          )}
        >
          {isDownloading ? (
            <>
              <Spinner size="sm" className="text-white" /> Membuka...
            </>
          ) : hasUrl ? (
            <>
              <Download className="w-5 h-5" /> Unduh Dokumen
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" /> Belum Tersedia
            </>
          )}
        </motion.button>
        {!hasUrl && (
          <p className="text-center text-xs text-slate-400 mt-2">
            Hubungi pengurus RT untuk mendapatkan template ini
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Admin Row ────────────────────────────────────────────────────────────────
function AdminRow({
  template,
  index,
  onEdit,
  onDelete,
  onToggle,
}: {
  template: Template;
  index: number;
  onEdit: (t: Template) => void;
  onDelete: (t: Template) => void;
  onToggle: (t: Template) => void;
}) {
  return (
    <AnimListItem index={index}>
      <motion.div
        layout
        className={cn(
          "bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
          template.aktif
            ? "border-slate-100"
            : "border-dashed border-slate-200 opacity-70",
        )}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <PdfIcon kategori={template.kategori} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={KAT_BADGE[template.kategori] ?? "slate"}>
                {template.kategori}
              </Badge>
              {!template.aktif && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  Nonaktif
                </span>
              )}
              {template.downloadUrl ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                  ✓ Ada File
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                  Belum Ada File
                </span>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 leading-snug truncate">
              {template.nama}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs text-slate-400">
                {template.namaFile || "—"}
              </span>
              {template.ukuran && (
                <>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    {template.ukuran}
                  </span>
                </>
              )}
              <span className="text-xs text-slate-300">·</span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <DownloadCloud className="w-3 h-3" />
                {template.diunduh ?? 0}x diunduh
              </span>
              <span className="text-xs text-slate-300">·</span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {template.terakhirDiperbarui}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(template)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all",
              template.aktif
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200",
            )}
          >
            {template.aktif ? (
              <>
                <Eye className="w-3.5 h-3.5" /> Aktif
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" /> Nonaktif
              </>
            )}
          </motion.button>
          <ActionBtn
            icon={Edit2}
            label="Edit template"
            variant="blue"
            onClick={() => onEdit(template)}
          />
          <ActionBtn
            icon={Trash2}
            label="Hapus template"
            variant="red"
            onClick={() => onDelete(template)}
          />
        </div>
      </motion.div>
    </AnimListItem>
  );
}

// ─── Template Form (Upload/Edit Modal Body) ───────────────────────────────────
function TemplateFormBody({
  form,
  setForm,
  editTarget,
  onFileUploaded,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  editTarget: Template | null;
  onFileUploaded: (url: string, name: string, size: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Ukuran file maksimal 10 MB", "error");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const path = `templates/${Date.now()}_${file.name.toLowerCase().replace(/\s+/g, "_")}`;
      const sRef = storageRef(storage, path);
      const task = uploadBytesResumable(sRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) =>
            setProgress(
              Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
            ),
          reject,
          resolve,
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      const size = `${Math.round(file.size / 1024)} KB`;
      onFileUploaded(url, file.name.toLowerCase().replace(/\s+/g, "_"), size);
      showToast("File berhasil diunggah", "success");
    } catch {
      showToast("Gagal mengunggah file. Coba lagi.", "error");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="p-5 space-y-4 overflow-y-auto flex-1">
      {/* File upload zone */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          File Dokumen (PDF)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileSelect}
        />

        {uploading ? (
          <UploadProgress progress={progress} />
        ) : form.downloadUrl ? (
          <div className="space-y-2">
            <a
              href={form.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">
                File tersedia — {form.namaFile || "lihat file"}
              </span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-xl text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all"
            >
              <Upload className="w-3 h-3" /> Ganti file
            </button>
          </div>
        ) : (
          <motion.div
            whileHover={{ borderColor: "#3b82f6" }}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">
              Klik untuk upload file
            </p>
            <p className="text-xs text-slate-400 mt-1">
              PDF, DOC, DOCX — maks 10 MB
            </p>
          </motion.div>
        )}
      </div>

      {/* Or paste URL */}
      <Input
        label="URL Download (opsional — alternatif upload)"
        placeholder="https://drive.google.com/... atau Firebase Storage URL"
        value={form.downloadUrl}
        onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
        helper="Paste URL Google Drive atau Firebase Storage sebagai alternatif upload langsung"
      />

      <Input
        label="Nama Template"
        required
        placeholder="cth: Surat Keterangan Domisili"
        value={form.nama}
        onChange={(e) => setForm({ ...form, nama: e.target.value })}
      />

      <Textarea
        label="Deskripsi Singkat"
        placeholder="Jelaskan kegunaan surat ini untuk warga..."
        value={form.deskripsi}
        onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
        rows={3}
        showCount
        maxLength={300}
      />

      <Select
        label="Kategori"
        value={form.kategori}
        onChange={(e) => setForm({ ...form, kategori: e.target.value })}
        options={KATEGORI_OPTS}
      />

      <Input
        label="Nama File"
        placeholder="cth: surat_domisili_rt05.pdf"
        value={form.namaFile}
        onChange={(e) => setForm({ ...form, namaFile: e.target.value })}
        helper="Gunakan huruf kecil dan garis bawah"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TemplateSurat() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"warga" | "admin">("warga");
  const [searchQ, setSearchQ] = useState("");
  const [filterKat, setFilterKat] = useState("Semua");
  const [downloading, setDownloading] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Template | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // ── Fetch from Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, COLL.templates),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTemplates(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Template),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtered = useMemo(
    () =>
      templates.filter((t) => {
        const q = searchQ.toLowerCase();
        const matchQ =
          t.nama.toLowerCase().includes(q) ||
          (t.namaFile ?? "").toLowerCase().includes(q);
        const matchK = filterKat === "Semua" || t.kategori === filterKat;
        const matchA = activeTab === "admin" || t.aktif;
        return matchQ && matchK && matchA;
      }),
    [templates, searchQ, filterKat, activeTab],
  );

  const totalAktif = templates.filter((t) => t.aktif).length;
  const totalUnduh = templates.reduce((s, t) => s + (t.diunduh ?? 0), 0);

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (t: Template) => {
    if (!t.downloadUrl) return;

    setDownloading(t.id);

    try {
      window.open(t.downloadUrl, "_blank", "noopener,noreferrer");

      showToast(`Template "${t.nama}" dibuka`, "success");

      try {
        await updateDoc(doc(db, COLL.templates, t.id), {
          diunduh: increment(1),
        });
      } catch (err) {
        console.warn("Gagal update jumlah download:", err);
      }
    } finally {
      setTimeout(() => setDownloading(null), 800);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (t: Template) => {
    try {
      await updateDoc(doc(db, COLL.templates, t.id), { aktif: !t.aktif });
      showToast(
        t.aktif ? "Template dinonaktifkan" : "Template diaktifkan",
        t.aktif ? "warning" : "success",
      );
    } catch {
      showToast("Gagal mengubah status.", "error");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, COLL.templates, deleteTarget.id));
      showToast(`Template "${deleteTarget.nama}" dihapus`, "success");
      setDeleteTarget(null);
    } catch {
      showToast("Gagal menghapus.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save (Add/Edit) ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nama.trim()) {
      showToast("Nama template wajib diisi", "error");
      return;
    }
    if (!form.downloadUrl.trim()) {
      showToast(
        "File template atau URL wajib diisi — upload file atau paste link",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString().split("T")[0];
      if (editTarget) {
        await updateDoc(doc(db, COLL.templates, editTarget.id), {
          nama: form.nama,
          deskripsi: form.deskripsi,
          kategori: form.kategori,
          namaFile: form.namaFile,
          downloadUrl: form.downloadUrl,
          ukuran: form.ukuran || editTarget.ukuran,
          terakhirDiperbarui: now,
        });
        showToast("Template diperbarui", "success");
        setEditTarget(null);
      } else {
        await addDoc(collection(db, COLL.templates), {
          nama: form.nama,
          deskripsi: form.deskripsi || "Dokumen resmi RT 05 Kapasan Dalam.",
          kategori: form.kategori,
          namaFile:
            form.namaFile ||
            `${form.nama.toLowerCase().replace(/\s+/g, "_")}.pdf`,
          downloadUrl: form.downloadUrl,
          ukuran: form.ukuran || "—",
          aktif: true,
          diunduh: 0,
          terakhirDiperbarui: now,
          createdAt: serverTimestamp(),
        });
        showToast("Template berhasil ditambahkan", "success");
        setUploadOpen(false);
      }
      setForm(EMPTY_FORM);
    } catch {
      showToast("Gagal menyimpan template.", "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (t: Template) => {
    setEditTarget(t);
    setForm({
      nama: t.nama,
      deskripsi: t.deskripsi,
      kategori: t.kategori,
      namaFile: t.namaFile ?? "",
      downloadUrl: t.downloadUrl ?? "",
      ukuran: t.ukuran ?? "",
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Template Surat RT 05
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {loading
              ? "Memuat…"
              : `${totalAktif} template tersedia · ${totalUnduh} total unduhan`}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <FilterTabs
            tabs={[
              { value: "warga", label: "👁 Tampilan Warga" },
              { value: "admin", label: "⚙ Kelola Template" },
            ]}
            active={activeTab}
            onChange={(v) => setActiveTab(v as "warga" | "admin")}
          />
          {activeTab === "admin" && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => {
                setForm(EMPTY_FORM);
                setUploadOpen(true);
              }}
            >
              Tambah Template
            </Button>
          )}
        </div>
      </div>

      {/* Warga info banner */}
      <AnimatePresence>
        {activeTab === "warga" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800">
                Dokumen Resmi RT 05 Kapasan Dalam
              </p>
              <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
                Unduh template surat yang Anda butuhkan. Isi data yang
                diperlukan dan bawa ke Ketua RT untuk ditandatangani. Hubungi{" "}
                <strong>Ibu Nanik Indahwati</strong> di 0812-3311-7755 jika ada
                pertanyaan.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin stats */}
      <AnimatePresence>
        {activeTab === "admin" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              {
                label: "Total",
                value: templates.length,
                color: "bg-blue-50 text-blue-700 border-blue-200",
              },
              {
                label: "Aktif",
                value: totalAktif,
                color: "bg-emerald-50 text-emerald-700 border-emerald-200",
              },
              {
                label: "Nonaktif",
                value: templates.length - totalAktif,
                color: "bg-slate-50 text-slate-600 border-slate-200",
              },
              {
                label: "Diunduh",
                value: `${totalUnduh}x`,
                color: "bg-purple-50 text-purple-700 border-purple-200",
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={cn("rounded-2xl p-4 border", s.color)}
              >
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs opacity-70 mt-0.5">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama template..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />
          {searchQ && (
            <button
              onClick={() => setSearchQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5 flex-shrink-0">
          {["Semua", "Keterangan", "Pengantar", "Permohonan"].map((k) => (
            <button
              key={k}
              onClick={() => setFilterKat(k)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                filterKat === k
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Memuat template...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            templates.length === 0
              ? "Belum ada template surat"
              : "Tidak ada template ditemukan"
          }
          description={
            templates.length === 0
              ? "Admin belum menambahkan template surat. Klik tombol di atas untuk menambahkan."
              : searchQ
                ? `Tidak ada hasil untuk "${searchQ}"`
                : "Tidak ada template yang cocok dengan filter."
          }
          action={
            activeTab === "admin" ? (
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setUploadOpen(true);
                }}
              >
                Tambah Template Pertama
              </Button>
            ) : (
              <p className="text-xs text-slate-400">
                Hubungi pengurus RT 05 di 0812-3311-7755
              </p>
            )
          }
        />
      ) : activeTab === "warga" ? (
        <motion.div layout className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((t) => (
              <WargaCard
                key={t.id}
                template={t}
                onDownload={handleDownload}
                isDownloading={downloading === t.id}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t, i) => (
            <AdminRow
              key={t.id}
              template={t}
              index={i}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <AnimModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        size="md"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 leading-none">
                Tambah Template Baru
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload dan kelola dokumen template
              </p>
            </div>
          </div>
          <button
            onClick={() => setUploadOpen(false)}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <TemplateFormBody
          form={form}
          setForm={setForm}
          editTarget={null}
          onFileUploaded={(url, name, size) =>
            setForm((f) => ({
              ...f,
              downloadUrl: url,
              namaFile: name,
              ukuran: size,
            }))
          }
        />
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={() => setUploadOpen(false)}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={saving ? undefined : Plus}
            loading={saving}
            disabled={!form.downloadUrl.trim()}
            onClick={handleSave}
            className="flex-1"
          >
            Simpan Template
          </Button>
        </div>
      </AnimModal>

      {/* Edit Modal */}
      <AnimModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        size="md"
      >
        {editTarget && (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 leading-none">
                    Edit Template
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                    {editTarget.nama}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <TemplateFormBody
              form={form}
              setForm={setForm}
              editTarget={editTarget}
              onFileUploaded={(url, name, size) =>
                setForm((f) => ({
                  ...f,
                  downloadUrl: url,
                  namaFile: name,
                  ukuran: size,
                }))
              }
            />
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
              <Button
                variant="outline"
                size="md"
                onClick={() => setEditTarget(null)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={saving ? undefined : CheckCircle2}
                loading={saving}
                disabled={!form.downloadUrl.trim()}
                onClick={handleSave}
                className="flex-1"
              >
                Simpan Perubahan
              </Button>
            </div>
          </>
        )}
      </AnimModal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Template"
        description={`Hapus template "${deleteTarget?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
        icon={AlertTriangle}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
