export type PurchaseStatus = "done" | "partial";
export type PaymentStatus = "dp" | "full";
export type ShippingMethod = "ekspedisi" | "instant";
export type ShippingPaid = "paid" | "unpaid";
export type OrderStatus = "done" | "not_done";

type Option<T extends string> = { value: T; label: string; tone: Tone };
export type Tone = "good" | "warn" | "bad" | "neutral";

export const purchaseStatusOptions: Option<PurchaseStatus>[] = [
  { value: "done", label: "Done", tone: "good" },
  { value: "partial", label: "Sebagian", tone: "warn" },
];

export const paymentStatusOptions: Option<PaymentStatus>[] = [
  { value: "full", label: "Full Payment", tone: "good" },
  { value: "dp", label: "DP", tone: "warn" },
];

export const shippingMethodOptions: Option<ShippingMethod>[] = [
  { value: "ekspedisi", label: "Ekspedisi", tone: "neutral" },
  { value: "instant", label: "Instant", tone: "neutral" },
];

export const shippingPaidOptions: Option<ShippingPaid>[] = [
  { value: "paid", label: "Sudah dibayar", tone: "good" },
  { value: "unpaid", label: "Belum dibayar", tone: "bad" },
];

export const orderStatusOptions: Option<OrderStatus>[] = [
  { value: "done", label: "Done", tone: "good" },
  { value: "not_done", label: "Not Done", tone: "bad" },
];

export function optionMeta<T extends string>(options: Option<T>[], value: string) {
  return options.find((o) => o.value === value) ?? { value, label: value, tone: "neutral" as Tone };
}

export const toneClass: Record<Tone, string> = {
  good: "bg-good/12 text-good border-good/25",
  warn: "bg-warn/14 text-warn border-warn/30",
  bad: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-foreground/6 text-muted-foreground border-border",
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const plain = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function formatIDR(value: number) {
  return rupiah.format(Math.round(value || 0));
}

export function formatNumber(value: number) {
  return plain.format(value || 0);
}

export function formatCompactIDR(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}Rp ${plain.format(Number((abs / 1e9).toFixed(2)))} M`;
  if (abs >= 1_000_000) return `${sign}Rp ${plain.format(Number((abs / 1e6).toFixed(2)))} jt`;
  if (abs >= 1_000) return `${sign}Rp ${plain.format(Number((abs / 1e3).toFixed(1)))} rb`;
  return formatIDR(value);
}
