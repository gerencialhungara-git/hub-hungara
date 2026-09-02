import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-brand-red text-brand-cream hover:bg-brand-red-dark shadow-sm",
  secondary: "bg-brand-brown text-brand-cream hover:bg-brand-brown-soft",
  ghost: "bg-transparent text-brand-brown hover:bg-brand-cream-3 border border-brand-cream-3",
  danger: "bg-white text-brand-red border border-brand-red/40 hover:bg-brand-red hover:text-brand-cream",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-label uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      {...rest}
      className={cx(
        "h-11 w-full rounded-xl border border-brand-cream-3 bg-white px-4 text-brand-brown placeholder:text-brand-brown/40 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20",
        className,
      )}
    />
  );
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        "h-11 w-full rounded-xl border border-brand-cream-3 bg-white px-3 text-brand-brown outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(
        "min-h-20 w-full rounded-xl border border-brand-cream-3 bg-white px-4 py-2 text-brand-brown outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20",
        className,
      )}
    />
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="label text-brand-brown-soft">{label}</span>
      {children}
      {error ? <span className="block text-xs text-brand-red">{error}</span> : hint ? <span className="block text-xs text-brand-brown/60">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-card bg-white p-6 shadow-card", className)}>{children}</div>;
}

export function Badge({ children, tone = "brown", className }: { children: ReactNode; tone?: "brown" | "red" | "green" | "blue" | "yellow" | "gray"; className?: string }) {
  const tones = {
    brown: "bg-brand-brown/10 text-brand-brown",
    red: "bg-brand-red/10 text-brand-red",
    green: "bg-success/15 text-success-dark",
    blue: "bg-info/15 text-[#0e7a92]",
    yellow: "bg-brand-yellow/25 text-[#7a5a00]",
    gray: "bg-brand-brown/5 text-brand-brown/60",
  };
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 font-label text-[11px] uppercase tracking-wider", tones[tone], className)}>{children}</span>;
}

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-brand-brown/70">
      <Loader2 className="size-5 animate-spin text-brand-red" />
      <span className="font-label uppercase tracking-wider text-xs">{label}</span>
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border-2 border-dashed border-brand-cream-3 bg-white/60 p-10 text-center">
      <img src="/brand/logo-hungara.png" alt="" className="h-16 opacity-80" />
      <h3 className="text-xl text-brand-red">{title}</h3>
      {text && <p className="max-w-md text-sm text-brand-brown/70">{text}</p>}
      {action}
    </div>
  );
}

export function Alert({ tone = "red", children }: { tone?: "red" | "green" | "yellow"; children: ReactNode }) {
  const tones = {
    red: "border-brand-red/30 bg-brand-red/5 text-brand-red",
    green: "border-success/40 bg-success/10 text-success-dark",
    yellow: "border-brand-yellow bg-brand-yellow/15 text-[#7a5a00]",
  };
  return <div className={cx("rounded-xl border px-4 py-3 text-sm", tones[tone])}>{children}</div>;
}

export function Dialog({ open, title, onClose, children, wide }: { open: boolean; title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-brown/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={cx("max-h-[90vh] w-full overflow-y-auto rounded-card bg-brand-cream p-6 shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl text-brand-red">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-brand-brown/60 hover:bg-brand-cream-3" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export { cx };
