import { cn } from "@/lib/utils";
import { formatCompactIDR } from "../lib/jastip";

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
};

const toneText = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-destructive",
  neutral: "text-foreground",
};

export function KpiStrip({
  clients,
  items,
  profit,
  revenue,
  dpAmount,
  pendingOrders,
  pendingPayment,
  shippingUnpaid,
}: {
  clients: number;
  items: number;
  profit: number;
  revenue: number;
  dpAmount: number;
  pendingOrders: number;
  pendingPayment: number;
  shippingUnpaid: number;
}) {
  const kpis: Kpi[] = [
    {
      label: "Total profit",
      value: formatCompactIDR(profit),
      hint: "total − total harga modal",
      tone: profit < 0 ? "bad" : "good",
    },
    { label: "Nilai pesanan", value: formatCompactIDR(revenue), hint: "jumlah harga total" },
    { label: "Total DP masuk", value: formatCompactIDR(dpAmount), hint: "DP dibayarkan" },
    { label: "Client", value: String(clients), hint: `${items} barang` },
    {
      label: "Pesanan open",
      value: String(pendingOrders),
      hint: "status not done",
      tone: pendingOrders ? "bad" : "good",
    },
    {
      label: "Belum full payment",
      value: String(pendingPayment),
      hint: "masih DP",
      tone: pendingPayment ? "warn" : "good",
    },
    {
      label: "Ongkir belum dibayar",
      value: String(shippingUnpaid),
      tone: shippingUnpaid ? "warn" : "good",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-7">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="bg-card px-3.5 py-3">
          <div className="label-xs text-muted-foreground">{kpi.label}</div>
          <div
            className={cn(
              "num mt-1 text-[19px] leading-none font-semibold",
              toneText[kpi.tone ?? "neutral"],
            )}
          >
            {kpi.value}
          </div>
          {kpi.hint && (
            <div className="mt-1 text-[11px] text-muted-foreground/80">{kpi.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}
