import * as React from "react";
import { formatIDR, optionMeta, shippingMethodOptions } from "../lib/jastip";
import type { InvoiceData } from "../queries/invoice";

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Dokumen invoice ukuran A4 (794px ≈ 210mm @96dpi). Dipakai untuk preview dan PDF. */
export const InvoiceDocument = React.forwardRef<
  HTMLDivElement,
  { data: InvoiceData; date?: Date }
>(function InvoiceDocument({ data, date }, ref) {
  const { settings, client, items, invoiceNumber } = data;
  const invoiceDate = date ?? new Date(data.createdAt);

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const shipping = items.reduce((s, i) => s + i.shippingCost, 0);
  const dp = items.reduce((s, i) => s + i.dpAmount, 0);
  const grandTotal = subtotal + shipping;
  const remaining = grandTotal - dp;

  const methods = Array.from(new Set(items.map((i) => i.shippingMethod))).map(
    (m) => optionMeta(shippingMethodOptions, m).label,
  );
  const address = client.address || items.find((i) => i.address)?.address || "—";

  return (
    <div
      ref={ref}
      className="relative flex w-[794px] flex-col bg-white text-[#14171a]"
      style={{ minHeight: 1123, fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif' }}
    >
      <div className="h-2 w-full bg-[#14171a]" />

      <div className="flex flex-1 flex-col px-14 pt-10 pb-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="max-h-[72px] max-w-[140px] object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="grid size-[64px] place-items-center rounded-lg border border-dashed border-[#d8d3c7] text-[10px] text-[#9ca3af]">
                LOGO
              </div>
            )}
            <div className="pt-1">
              <div className="text-[20px] leading-tight font-extrabold tracking-tight">
                {settings.jastipName || "Nama Jastip"}
              </div>
              <div className="mt-1 text-[12px] text-[#6b7280]">
                WA Admin:{" "}
                <span className="font-semibold text-[#14171a]">{settings.adminWa || "—"}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[30px] leading-none font-extrabold tracking-[0.12em]">INVOICE</div>
            <table className="mt-3 ml-auto text-[12px]">
              <tbody>
                <tr>
                  <td className="pr-3 text-right text-[#6b7280]">No. Invoice</td>
                  <td
                    className="text-right font-semibold"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {invoiceNumber}
                  </td>
                </tr>
                <tr>
                  <td className="pt-1 pr-3 text-right text-[#6b7280]">Tanggal</td>
                  <td className="pt-1 text-right font-semibold">{dateFmt.format(invoiceDate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer + shipping */}
        <div className="mt-9 grid grid-cols-[1.4fr_1fr] gap-6 rounded-lg border border-[#e0dcd2] bg-[#f8f7f4] px-5 py-4">
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#6b7280] uppercase">
              Ditagihkan kepada
            </div>
            <div className="mt-1.5 text-[15px] font-bold">{client.name}</div>
            {client.phone && <div className="mt-0.5 text-[12px]">WA: {client.phone}</div>}
            <div className="mt-1 text-[12px] leading-relaxed whitespace-pre-line text-[#374151]">
              {address}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#6b7280] uppercase">
              Metode pengiriman
            </div>
            <div className="mt-1.5 text-[14px] font-bold">
              {methods.length ? methods.join(" + ") : "—"}
            </div>
          </div>
        </div>

        {/* Items */}
        <table className="mt-7 w-full border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b-2 border-[#14171a] text-left">
              <th className="w-10 py-2 text-[10px] font-bold tracking-[0.1em] uppercase">No</th>
              <th className="py-2 text-[10px] font-bold tracking-[0.1em] uppercase">Detail item</th>
              <th className="w-14 py-2 text-right text-[10px] font-bold tracking-[0.1em] uppercase">
                Qty
              </th>
              <th className="w-32 py-2 text-right text-[10px] font-bold tracking-[0.1em] uppercase">
                Harga barang
              </th>
              <th className="w-36 py-2 text-right text-[10px] font-bold tracking-[0.1em] uppercase">
                Total harga
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[#9ca3af]">
                  Belum ada item.
                </td>
              </tr>
            )}
            {items.map((item, idx) => (
              <tr key={item.id} className="border-b border-[#e7e3da] align-top">
                <td className="py-2.5 text-[#6b7280]">{idx + 1}</td>
                <td className="py-2.5 pr-4">
                  <div className="font-semibold break-all">{item.itemName}</div>
                  {item.notes && (
                    <div className="mt-0.5 text-[11px] text-[#6b7280]">{item.notes}</div>
                  )}
                </td>
                <td className="py-2.5 text-right tabular-nums">{item.qty}</td>
                <td className="py-2.5 text-right tabular-nums">{formatIDR(item.unitPrice)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">
                  {formatIDR(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 ml-auto w-[300px] text-[12.5px]">
          <Row label="Subtotal" value={formatIDR(subtotal)} />
          {shipping > 0 && <Row label="Ongkir" value={formatIDR(shipping)} />}
          <div className="mt-1.5 flex items-center justify-between border-t-2 border-[#14171a] pt-2">
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase">Total</span>
            <span className="text-[16px] font-extrabold tabular-nums">{formatIDR(grandTotal)}</span>
          </div>
          {dp > 0 && (
            <>
              <Row label="DP dibayarkan" value={`− ${formatIDR(dp)}`} />
              <div className="mt-1.5 flex items-center justify-between rounded-md bg-[#14171a] px-3 py-2 text-white">
                <span className="text-[11px] font-bold tracking-[0.1em] uppercase">
                  Sisa pembayaran
                </span>
                <span className="text-[15px] font-extrabold tabular-nums">
                  {formatIDR(remaining)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex-1" />

        {/* Payment details */}
        <div className="mt-10 grid grid-cols-[1fr_auto] items-end gap-6 border-t border-[#e0dcd2] pt-5">
          <div>
            <div className="text-[10px] font-bold tracking-[0.12em] text-[#6b7280] uppercase">
              Detail rekening pembayaran
            </div>
            <div className="mt-1.5 text-[13px] leading-relaxed font-semibold whitespace-pre-line">
              {settings.bankDetails || "Belum diisi di Pengaturan Invoice."}
            </div>
            {settings.footerNote && (
              <div className="mt-3 max-w-[460px] text-[11px] leading-relaxed whitespace-pre-line text-[#6b7280]">
                {settings.footerNote}
              </div>
            )}
          </div>
          <div className="text-right text-[11px] text-[#6b7280]">
            Konfirmasi pembayaran ke
            <div className="text-[13px] font-bold text-[#14171a]">{settings.adminWa || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[#6b7280]">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
