import { cn } from "@/lib/utils";
import { optionMeta, toneClass, type Tone } from "../../lib/jastip";

type Option<T extends string> = { value: T; label: string; tone: Tone };

/** Status pill yang sekaligus dropdown — edit langsung di dalam tabel. */
export function StatusSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string;
  options: Option<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  const meta = optionMeta(options, value);
  return (
    <div className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "label-xs pointer-events-none inline-flex h-6 items-center rounded border px-2 pr-5 whitespace-nowrap",
          toneClass[meta.tone],
          disabled && "opacity-60",
        )}
      >
        {meta.label}
        <svg
          viewBox="0 0 24 24"
          className="absolute right-1.5 size-3 opacity-60"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Ubah status"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-xs inline-flex h-6 items-center rounded border px-2 whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
