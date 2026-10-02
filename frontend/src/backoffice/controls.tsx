import type { ReactNode } from "react"

export const inputClass =
  "min-h-11 w-full min-w-0 rounded-control border border-sand/50 bg-white px-3 py-2 text-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:bg-cream-soft"
const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-control border px-4 py-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-50"
export const actionClass = `${buttonBase} border-sand/50 bg-white text-olive-dark hover:bg-cream-soft`
export const primaryClass = `${buttonBase} border-olive bg-olive text-white hover:bg-olive-dark`

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block min-w-0 text-sm font-semibold text-olive-dark">
      <span className="mb-2 block">{label}</span>
      {children}
      {hint && (
        <span className="mt-1 block text-xs font-normal text-charcoal/65">
          {hint}
        </span>
      )}
    </label>
  )
}

export function Notice({
  message,
  error = false,
}: {
  message: string
  error?: boolean
}) {
  return message ? (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-control p-4 text-sm ${
        error
          ? "bg-terracotta-soft text-terracotta-dark"
          : "bg-cream-soft text-olive-dark"
      }`}
    >
      {message}
    </p>
  ) : null
}

export function Check({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
      <input
        type="checkbox"
        className="size-5 accent-olive focus-visible:outline-3 focus-visible:outline-olive"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      {label}
    </label>
  )
}
