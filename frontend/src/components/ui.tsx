import type { ButtonHTMLAttributes, ReactNode } from "react"

export type IconName = "arrow" | "bag" | "check" | "chevron" | "clock" | "copy" | "instagram" | "leaf" | "location" | "menu" | "minus" | "phone" | "plus" | "trash" | "warning" | "whatsapp" | "x"

export function Icon({
  name,
  className = "size-5",
}: {
  name: IconName
  className?: string
}) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6M4 12h11" />,
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
      </>
    ),
    instagram: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 4C11 4 5 8 5 15c0 2 1 4 3 5 6-1 10-6 12-16Z" />
        <path d="M4 21c2-5 6-8 11-11" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    minus: <path d="M5 12h14" />,
    phone: (
      <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-2-2 2c-4-1.5-6.5-4-8-8l2-2-2-4Z" />
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" />
        <path d="M10 11v6M14 11v6" />
      </>
    ),
    warning: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
    whatsapp: (
      <>
        <path d="M20 11.5A8 8 0 0 1 8.3 18.6L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z" />
        <path d="M9 8.5c.5 2 2 3.5 4 4l1-1 2 1v1.5c0 .6-.5 1-1 1-4 0-7-3-7-7 0-.5.4-1 1-1h1.5l1 2-1 1" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "text" | "icon"
  loading?: boolean
  icon?: IconName
}

export function Button({
  variant = "primary",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-terracotta text-white shadow-sm hover:bg-terracotta-dark active:translate-y-px",
    secondary:
      "border border-olive/25 bg-white text-olive-dark hover:border-olive hover:bg-cream-soft",
    text: "text-olive underline-offset-4 hover:underline",
    icon: "border border-sand/45 bg-white text-olive-dark hover:border-olive hover:bg-cream-soft",
  }
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${
        variant === "icon" ? "min-w-11 px-3" : ""
      } ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon ? (
        <Icon name={icon} className="size-[18px]" />
      ) : null}
      {children}
    </button>
  )
}

export function StockBadge({
  state,
  compact = false,
}: {
  state: "available" | "low" | "out"
  compact?: boolean
}) {
  const config = {
    available: { label: "Disponible", dot: "bg-olive" },
    low: { label: "Últimas unidades", dot: "bg-terracotta" },
    out: { label: "Sin stock", dot: "bg-charcoal/45" },
  }[state]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/90 font-semibold text-charcoal shadow-sm ring-1 ring-sand/20 ${
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      }`}
    >
      <span className={`size-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export function CategoryChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-bold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive ${
        active
          ? "border-olive bg-olive text-white"
          : "border-sand/45 bg-white text-charcoal hover:border-olive"
      }`}
    >
      {children}
    </button>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold tracking-[0.16em] text-terracotta uppercase">
      {children}
    </p>
  )
}

export function Toast({
  message,
  onClose,
}: {
  message: string
  onClose: () => void
}) {
  return (
    <div
      role="status"
      className="fixed right-4 bottom-24 left-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-card bg-olive-dark p-4 text-sm font-semibold text-white shadow-xl md:right-6 md:bottom-6 md:left-auto"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/15">
        <Icon name="check" className="size-4" />
      </span>
      <span className="flex-1">{message}</span>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={onClose}
        className="grid size-11 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
      >
        <Icon name="x" />
      </button>
    </div>
  )
}

export function FormField({
  id,
  label,
  value,
  onChange,
  error,
  help,
  type = "text",
  placeholder,
  autoComplete,
  multiline = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  help?: string
  type?: string
  placeholder?: string
  autoComplete?: string
  multiline?: boolean
}) {
  const describedBy = [error ? `${id}-error` : "", help ? `${id}-help` : ""]
    .filter(Boolean)
    .join(" ")
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-olive-dark"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          rows={3}
          className={`min-h-24 w-full resize-y rounded-control border bg-white px-4 py-3 text-base text-charcoal outline-none transition placeholder:text-sand focus:ring-3 ${
            error
              ? "border-terracotta focus:border-terracotta focus:ring-terracotta/15"
              : "border-sand/50 focus:border-olive focus:ring-olive/12"
          }`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          className={`min-h-12 w-full rounded-control border bg-white px-4 text-base text-charcoal outline-none transition placeholder:text-sand focus:ring-3 ${
            error
              ? "border-terracotta focus:border-terracotta focus:ring-terracotta/15"
              : "border-sand/50 focus:border-olive focus:ring-olive/12"
          }`}
        />
      )}
      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-terracotta-dark"
        >
          <Icon name="warning" className="size-4" />
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="mt-2 text-xs text-charcoal/65">
          {help}
        </p>
      ) : null}
    </div>
  )
}
