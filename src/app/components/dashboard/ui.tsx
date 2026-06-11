/**
 * SiMRT Shared UI Component Library
 * Reusable, animated, accessible components for the dashboard.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, AlertCircle, Info, X, AlertTriangle,
  Loader2, Search, ChevronDown, TrendingUp, TrendingDown,
} from "lucide-react";

// ─── Utility ──────────────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const s = { sm: "w-3.5 h-3.5", md: "w-4 h-4", lg: "w-5 h-5" }[size];
  return <Loader2 className={cn(s, "animate-spin flex-shrink-0", className)} />;
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success" | "warning";
type BtnSize = "xs" | "sm" | "md" | "lg";

const BTN_V: Record<BtnVariant, string> = {
  primary:   "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
  secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  ghost:     "text-slate-600 hover:bg-slate-100",
  danger:    "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  outline:   "border border-slate-200 text-slate-700 hover:bg-slate-50",
  success:   "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  warning:   "bg-amber-500 text-white hover:bg-amber-600 shadow-sm",
};

const BTN_S: Record<BtnSize, string> = {
  xs: "px-2.5 py-1 text-[11px] rounded-lg gap-1",
  sm: "px-3.5 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-5 py-3 text-sm rounded-2xl gap-2.5",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: React.ElementType;
  iconRight?: React.ElementType;
}

export function Button({
  variant = "primary", size = "md", loading = false,
  disabled, icon: Icon, iconRight: IconRight,
  children, className, onClick, ...props
}: ButtonProps) {
  const off = disabled || loading;
  return (
    <motion.button
      whileHover={!off ? { scale: 1.02 } : {}}
      whileTap={!off ? { scale: 0.97 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      disabled={off}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors",
        BTN_V[variant], BTN_S[size],
        off && "opacity-50 cursor-not-allowed",
        className
      )}
      {...(props as any)}
    >
      {loading
        ? <Spinner size="sm" className="mr-1" />
        : Icon ? <Icon className="w-4 h-4 flex-shrink-0" /> : null}
      {children}
      {!loading && IconRight && <IconRight className="w-4 h-4 flex-shrink-0" />}
    </motion.button>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = "emerald" | "amber" | "red" | "blue" | "slate" | "violet" | "orange" | "rose";

const BADGE_V: Record<BadgeVariant, { wrap: string; dot: string }> = {
  emerald: { wrap: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  amber:   { wrap: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400"   },
  red:     { wrap: "bg-red-50 text-red-600 border-red-200",             dot: "bg-red-400"     },
  blue:    { wrap: "bg-blue-50 text-blue-700 border-blue-200",          dot: "bg-blue-500"    },
  slate:   { wrap: "bg-slate-100 text-slate-600 border-slate-200",      dot: "bg-slate-400"   },
  violet:  { wrap: "bg-violet-50 text-violet-700 border-violet-200",    dot: "bg-violet-500"  },
  orange:  { wrap: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500"  },
  rose:    { wrap: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500"    },
};

export function Badge({
  variant = "slate", pulse = false, children, className,
}: { variant?: BadgeVariant; pulse?: boolean; children: React.ReactNode; className?: string }) {
  const v = BADGE_V[variant];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border", v.wrap, className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", v.dot, pulse && "animate-pulse")} />
      {children}
    </span>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children, className, hover = false, padding = "none", onClick, delay = 0,
}: {
  children: React.ReactNode; className?: string; hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg"; onClick?: () => void; delay?: number;
}) {
  const pads = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
      whileHover={hover ? { y: -3, boxShadow: "0 12px 28px rgba(15,39,68,0.09)" } : {}}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden",
        hover && "cursor-pointer transition-colors hover:border-slate-200",
        pads[padding], className
      )}
    >
      {children}
    </motion.div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-slate-100", className)}>
      <motion.div
        animate={{ x: ["-100%", "100%"] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
      />
    </div>
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array(lines).fill(0).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-slate-100 p-5 space-y-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
      <SkeletonText />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-8 w-20 rounded-xl" />
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="bg-slate-50 px-5 py-3.5 flex gap-6 border-b border-slate-100">
        {[60, 120, 100, 80, 60].map((w, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: w }} />
        ))}
      </div>
      {Array(rows).fill(0).map((_, i) => (
        <div key={i} className="px-5 py-4 flex items-center gap-4 border-b border-slate-50 last:border-0">
          <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-24 ml-auto hidden md:block" />
          <Skeleton className="h-7 w-20 rounded-full" />
          <div className="flex gap-1">
            <Skeleton className="w-7 h-7 rounded-lg" />
            <Skeleton className="w-7 h-7 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(`grid grid-cols-2 gap-3`, count >= 4 ? "xl:grid-cols-4" : `lg:grid-cols-${count}`, className)}>
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="w-5 h-5 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon = Search, title = "Tidak ada data",
  description, action, className, size = "md",
}: {
  icon?: React.ElementType; title?: string; description?: string;
  action?: React.ReactNode; className?: string; size?: "sm" | "md" | "lg";
}) {
  const s = {
    sm: { wrap: "py-10", box: "w-12 h-12", icon: "w-6 h-6", title: "text-sm" },
    md: { wrap: "py-16", box: "w-16 h-16", icon: "w-8 h-8", title: "text-base" },
    lg: { wrap: "py-20", box: "w-20 h-20", icon: "w-10 h-10", title: "text-lg" },
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("flex flex-col items-center justify-center text-center", s.wrap, className)}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className={cn("rounded-2xl bg-slate-100 flex items-center justify-center mb-4", s.box)}
      >
        <Icon className={cn(s.icon, "text-slate-300")} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className={cn("font-semibold text-slate-600 mb-1", s.title)}>{title}</h3>
        {description && <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{description}</p>}
        {action && <div className="mt-4">{action}</div>}
      </motion.div>
    </motion.div>
  );
}

// ─── Global Toast System ──────────────────────────────────────────────────────
type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem { id: number; message: string; type: ToastType; }

let _addToast: ((m: string, t?: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  _addToast?.(message, type);
}

const TOAST_CFG: Record<ToastType, { bg: string; icon: React.ElementType }> = {
  success: { bg: "bg-emerald-600 border-emerald-500", icon: CheckCircle2 },
  error:   { bg: "bg-red-600 border-red-500",         icon: AlertCircle  },
  warning: { bg: "bg-amber-500 border-amber-400",     icon: AlertTriangle },
  info:    { bg: "bg-blue-600 border-blue-500",       icon: Info         },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    _addToast = (message, type = "success") => {
      const id = Date.now();
      setToasts((p) => [...p, { id, message, type }]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
    };
    return () => { _addToast = null; };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(({ id, message, type }) => {
          const { bg, icon: Icon } = TOAST_CFG[type];
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: 64, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 64, scale: 0.88, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-white text-sm font-medium min-w-[260px] max-w-xs pointer-events-auto",
                bg
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 leading-snug">{message}</span>
              <button
                onClick={() => setToasts((p) => p.filter((t) => t.id !== id))}
                className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ─── Page Transition ──────────────────────────────────────────────────────────
export function PageTransition({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, sub, icon: Icon, color = "bg-slate-50 border-slate-200 text-slate-700",
  delay = 0, trend, onClick, active,
}: {
  label: string; value: string | number; sub?: string; icon?: React.ElementType;
  color?: string; delay?: number; trend?: { value: number; label: string };
  onClick?: () => void; active?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      whileHover={{ y: -3, boxShadow: "0 8px 24px rgba(15,39,68,0.09)", transition: { duration: 0.2 } }}
      whileTap={onClick ? { scale: 0.97 } : {}}
      onClick={onClick}
      className={cn(
        "rounded-2xl p-4 border transition-all",
        color,
        onClick && "cursor-pointer",
        active && "ring-2 ring-offset-1 ring-current shadow-md"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs opacity-70">{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-40" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-0.5 opacity-60">{sub}</div>}
      {trend && (
        <div className={cn("text-xs mt-2 font-medium flex items-center gap-1", trend.value >= 0 ? "text-emerald-600" : "text-red-500")}>
          {trend.value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend.value)}% {trend.label}
        </div>
      )}
    </motion.div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500", "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500", "from-rose-400 to-pink-500",
  "from-amber-400 to-orange-500", "from-cyan-400 to-sky-500",
];

function nameToGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

export function Avatar({
  name, size = "md", className,
}: { name: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const gradient = nameToGradient(name);
  const sizes = {
    xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-[10px]",
    md: "w-9 h-9 text-xs",    lg: "w-11 h-11 text-sm", xl: "w-14 h-14 text-base",
  };
  return (
    <div className={cn(`bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center flex-shrink-0`, sizes[size], className)}>
      <span className="text-white font-bold">{initials}</span>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label, error, helper, icon: Icon, iconRight: IconRight, onIconRightClick, className, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string; error?: string; helper?: string;
  icon?: React.ElementType; iconRight?: React.ElementType; onIconRightClick?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}{props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />}
        <input
          {...props}
          className={cn(
            "w-full py-2.5 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2",
            Icon ? "pl-10 pr-4" : "px-4",
            IconRight ? "pr-10" : "",
            error
              ? "border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-400"
              : "border-slate-200 bg-slate-50 focus:ring-blue-200 focus:border-blue-400 hover:border-slate-300",
            className
          )}
        />
        {IconRight && (
          <button type="button" onClick={onIconRightClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
            <IconRight className="w-4 h-4" />
          </button>
        )}
      </div>
      {error
        ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
        : helper && <p className="text-xs text-slate-400">{helper}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({
  label, error, helper, showCount, className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string; error?: string; helper?: string; showCount?: boolean;
}) {
  const len = typeof props.value === "string" ? props.value.length : 0;
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}{props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        {...props}
        className={cn(
          "w-full px-4 py-2.5 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2 resize-none",
          error
            ? "border-red-300 bg-red-50 focus:ring-red-200"
            : "border-slate-200 bg-slate-50 focus:ring-blue-200 focus:border-blue-400 hover:border-slate-300",
          className
        )}
      />
      <div className="flex items-center justify-between">
        {error
          ? <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>
          : helper ? <p className="text-xs text-slate-400">{helper}</p> : <span />}
        {showCount && props.maxLength && (
          <span className={cn("text-xs", len >= (props.maxLength as number) * 0.9 ? "text-amber-500" : "text-slate-400")}>
            {len}/{props.maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({
  label, error, options, placeholder, className, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string; error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-slate-700">
          {label}{props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          {...props}
          className={cn(
            "w-full px-4 py-2.5 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2 appearance-none pr-9 bg-slate-50",
            error ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-blue-200 focus:border-blue-400 hover:border-slate-300",
            className
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  );
}

// ─── Filter Tabs ──────────────────────────────────────────────────────────────
export function FilterTabs({
  tabs, active, onChange, className,
}: {
  tabs: Array<{ value: string; label: string; count?: number; activeClass?: string }>;
  active: string; onChange: (v: string) => void; className?: string;
}) {
  return (
    <div className={cn("flex bg-slate-100 rounded-xl p-1 gap-0.5", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
            active === tab.value
              ? tab.activeClass || "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {active === tab.value && (
            <motion.div
              layoutId={`ftab-${tabs.map(t=>t.value).join("")}`}
              className={cn("absolute inset-0 rounded-lg", tab.activeClass || "bg-white shadow-sm")}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
          {tab.count !== undefined && (
            <span className={cn(
              "relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              active === tab.value ? "bg-slate-100 text-slate-600" : "bg-slate-200/80 text-slate-400"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title, description, action, className,
}: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3", className)}>
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {description && <p className="text-sm text-slate-400 mt-0.5">{description}</p>}
      </div>
      {action && <div className="self-start sm:self-auto">{action}</div>}
    </div>
  );
}

// ─── Action Icon Button ───────────────────────────────────────────────────────
const ACT_V = {
  blue:  "text-blue-500 hover:bg-blue-50 hover:text-blue-700",
  red:   "text-red-400 hover:bg-red-50 hover:text-red-600",
  green: "text-emerald-500 hover:bg-emerald-50",
  slate: "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
  amber: "text-amber-500 hover:bg-amber-50",
};

export function ActionBtn({
  icon: Icon, label, variant = "slate", onClick, disabled,
}: { icon: React.ElementType; label?: string; variant?: keyof typeof ACT_V; onClick?: (e: React.MouseEvent) => void; disabled?: boolean }) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.12 } : {}}
      whileTap={!disabled ? { scale: 0.88 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      onClick={!disabled ? onClick : undefined}
      title={label}
      disabled={disabled}
      className={cn("p-1.5 rounded-xl transition-colors", ACT_V[variant], disabled && "opacity-30 cursor-not-allowed")}
    >
      <Icon className="w-4 h-4" />
    </motion.button>
  );
}

// ─── Animated List Item ───────────────────────────────────────────────────────
export function AnimListItem({
  children, index = 0, className,
}: { children: React.ReactNode; index?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.045, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-64">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-14 h-14">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Loader2 className="w-6 h-6 text-white" />
            </motion.div>
          </div>
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
            className="absolute inset-0 bg-blue-400 rounded-2xl -z-10"
          />
        </div>
        <p className="text-sm text-slate-400 font-medium">Memuat data...</p>
      </motion.div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({
  open, title, description, confirmLabel = "Konfirmasi",
  confirmVariant = "danger", icon: Icon = AlertTriangle,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; description: string;
  confirmLabel?: string; confirmVariant?: BtnVariant;
  icon?: React.ElementType; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="fixed inset-0 m-auto z-50 w-full max-w-sm h-fit bg-white rounded-2xl shadow-2xl p-6"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, delay: 0.1 }}
                className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4"
              >
                <Icon className="w-6 h-6 text-red-600" />
              </motion.div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6">{description}</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" size="md" onClick={onCancel} className="flex-1">Batal</Button>
                <Button variant={confirmVariant} size="md" onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Animated Modal ───────────────────────────────────────────────────────────
export function AnimModal({
  open, onClose, children, size = "md", bottomSheet = false,
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl"; bottomSheet?: boolean;
}) {
  const maxW = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" }[size];
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }} onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          <motion.div
            initial={bottomSheet ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 18 }}
            animate={bottomSheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={bottomSheet ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 18 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col",
              bottomSheet
                ? "bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]"
                : cn("inset-0 m-auto rounded-2xl", maxW, "max-h-[90vh]")
            )}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Loading Rows (table placeholder inside existing table body) ───────────────
export function LoadingRows({ cols = 5, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array(rows).fill(0).map((_, i) => (
        <tr key={i}>
          {Array(cols).fill(0).map((__, j) => (
            <td key={j} className="px-5 py-4">
              <Skeleton className={cn("h-3.5 rounded", j === 0 ? "w-8 h-8 rounded-xl" : j === 1 ? "w-32" : "w-20")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
