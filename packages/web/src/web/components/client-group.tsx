import * as React from "react";
import {
  ChevronRight,
  FileText,
  Package,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Pill, StatusSelect } from "./ui/status-select";
import {
  formatCompactIDR,
  formatIDR,
  formatNumber,
  orderStatusOptions,
  paymentStatusOptions,
  purchaseStatusOptions,
  shippingMethodOptions,
  shippingPaidOptions,
} from "../lib/jastip";
import { useRemoveItem, useUpdateItem, type BoardGroup, type BoardItem } from "../queries/jastip";

const headers = [
  "Nama barang",
  "Status pembelian",
  "Qty",
  "Harga satuan",
  "Harga total",
  "Harga modal",
  "Kurs",
  "Total harga modal",
  "Profit",
  "Status payment",
  "Total DP",
  "Pengiriman",
  "Ongkir",
  "Status ongkir",
  "Status pesanan",
  "Alamat",
  "",
];

export function ClientGroup({
  group,
  items,
  expanded,
  onToggle,
  onAddItem,
  onEditItem,
  onEditClient,
  onDeleteClient,
}: {
  group: BoardGroup;
  items: BoardItem[];
  expanded: boolean;
  onToggle: () => void;
  onAddItem: () => void;
  onEditItem: (item: BoardItem) => void;
  onEditClient: () => void;
  onDeleteClient: () => void;
}) {
  const updateItem = useUpdateItem();
  const removeItem = useRemoveItem();

  const summary = React.useMemo(
    () => ({
      count: items.length,
      qty: items.reduce((s, i) => s + i.qty, 0),
      profit: items.reduce((s, i) => s + i.profit, 0),
      shipping: items.reduce((s, i) => s + i.shippingCost, 0),
      pendingOrders: items.filter((i) => i.orderStatus !== "done").length,
      pendingPayment: items.filter((i) => i.paymentStatus !== "full").length,
    }),
    [items],
  );

  const patch = (id: number, data: Record<string, string>) =>
    updateItem.mutate({ id, ...data } as never);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(20,23,26,0.04)]">
      <header
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 transition sm:px-4",
          expanded && "border-b border-border bg-muted/30",
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="-mx-1.5 flex w-full min-w-0 cursor-pointer sm:w-auto sm:flex-1 items-center gap-3 rounded-lg px-1.5 py-1 text-left transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none"
        >
          <ChevronRight
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold tracking-tight">
                {group.client.name}
              </span>
              <span className="num shrink-0 rounded bg-foreground/6 px-1.5 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
                {summary.count} barang
              </span>
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground">
              {group.client.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3" />
                  <span className="num">{group.client.phone}</span>
                </span>
              )}
              {group.client.address && (
                <span className="max-w-[320px] truncate">{group.client.address}</span>
              )}
            </span>
          </span>
        </button>

        <div className="flex flex-1 flex-wrap items-center gap-1.5 sm:flex-none">
          {summary.pendingOrders > 0 && <Pill tone="bad">{summary.pendingOrders} pesanan open</Pill>}
          {summary.pendingPayment > 0 && (
            <Pill tone="warn">{summary.pendingPayment} belum full</Pill>
          )}
          {summary.uninvoiced > 0 && (
            <Pill tone="neutral">{summary.uninvoiced} belum di-invoice</Pill>
          )}
          {summary.pendingOrders === 0 && summary.pendingPayment === 0 && summary.count > 0 && (
            <Pill tone="good">Semua clear</Pill>
          )}
          <div className="ml-auto text-right sm:ml-1">
            <div className="label-xs text-muted-foreground">Profit</div>
            <div
              className={cn(
                "num text-[15px] font-semibold",
                summary.profit < 0 ? "text-destructive" : "text-good",
              )}
            >
              {formatIDR(summary.profit)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/invoice/${group.client.id}`} title="Lihat & download invoice">
              <FileText className="size-3.5" /> Invoice
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={onAddItem}>
            <Plus className="size-3.5" /> Barang
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onEditClient}
            title="Edit client"
            aria-label={`Edit client ${group.client.name}`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDeleteClient}
            title="Hapus client"
            aria-label={`Hapus client ${group.client.name}`}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </header>

      {expanded && (
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Package className="size-5 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                Belum ada barang untuk client ini.
              </p>
              <Button size="sm" variant="outline" onClick={onAddItem}>
                <Plus className="size-3.5" /> Tambah barang
              </Button>
            </div>
          ) : (
            <table className="w-full min-w-[1760px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {headers.map((h, i) => (
                    <th
                      key={h + i}
                      className={cn(
                        "label-xs px-2.5 py-2 text-left font-semibold whitespace-nowrap text-muted-foreground",
                        ["Qty", "Harga satuan", "Harga total", "Harga modal", "Kurs", "Total harga modal", "Profit", "Total DP", "Ongkir"].includes(h) &&
                          "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="group border-b border-border/70 last:border-0 hover:bg-muted/30"
                  >
                    <td className="max-w-[260px] px-2.5 py-2">
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="block max-w-full truncate text-left font-semibold hover:underline"
                        title={item.itemName}
                      >
                        {item.itemName}
                      </button>
                      {item.notes && (
                        <div className="max-w-[240px] truncate text-[11px] text-muted-foreground">
                          {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusSelect
                        value={item.purchaseStatus}
                        options={purchaseStatusOptions}
                        onChange={(v) => patch(item.id, { purchaseStatus: v })}
                      />
                    </td>
                    <td className="num px-2.5 py-2 text-right">{item.qty}</td>
                    <td className="num px-2.5 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                    <td className="num px-2.5 py-2 text-right font-semibold">
                      {formatNumber(item.totalPrice)}
                    </td>
                    <td className="num px-2.5 py-2 text-right text-muted-foreground">
                      {formatNumber(item.modalPrice)}
                    </td>
                    <td className="num px-2.5 py-2 text-right text-muted-foreground">
                      {formatNumber(item.kurs)}
                    </td>
                    <td className="num px-2.5 py-2 text-right">{formatIDR(item.totalModal)}</td>
                    <td
                      className={cn(
                        "num px-2.5 py-2 text-right font-semibold",
                        item.profit < 0 ? "text-destructive" : "text-good",
                      )}
                      title={formatIDR(item.profit)}
                    >
                      {formatIDR(item.profit)}
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusSelect
                        value={item.paymentStatus}
                        options={paymentStatusOptions}
                        onChange={(v) => patch(item.id, { paymentStatus: v })}
                      />
                    </td>
                    <td className="num px-2.5 py-2 text-right">
                      {item.dpAmount ? formatIDR(item.dpAmount) : "—"}
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusSelect
                        value={item.shippingMethod}
                        options={shippingMethodOptions}
                        onChange={(v) => patch(item.id, { shippingMethod: v })}
                      />
                    </td>
                    <td className="num px-2.5 py-2 text-right">
                      {item.shippingCost ? formatIDR(item.shippingCost) : "—"}
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusSelect
                        value={item.shippingPaid}
                        options={shippingPaidOptions}
                        onChange={(v) => patch(item.id, { shippingPaid: v })}
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <StatusSelect
                        value={item.orderStatus}
                        options={orderStatusOptions}
                        onChange={(v) => patch(item.id, { orderStatus: v })}
                      />
                    </td>
                    <td
                      className="max-w-[220px] truncate px-2.5 py-2 text-[12px] text-muted-foreground"
                      title={item.address ?? ""}
                    >
                      {item.address || "—"}
                    </td>
                    <td className="px-2.5 py-2 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => onEditItem(item)}
                          title="Edit barang"
                          aria-label={`Edit ${item.itemName}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Hapus "${item.itemName}"?`)) removeItem.mutate({ id: item.id });
                          }}
                          title="Hapus barang"
                          aria-label={`Hapus ${item.itemName}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <td className="label-xs px-2.5 py-2 text-muted-foreground">Subtotal</td>
                  <td aria-hidden="true" />
                  <td className="num px-2.5 py-2 text-right font-semibold">{summary.qty}</td>
                  <td aria-hidden="true" />
                  <td className="num px-2.5 py-2 text-right font-semibold">
                    {formatNumber(items.reduce((s, i) => s + i.totalPrice, 0))}
                  </td>
                  <td className="num px-2.5 py-2 text-right text-muted-foreground">
                    {formatNumber(items.reduce((s, i) => s + i.modalPrice, 0))}
                  </td>
                  <td aria-hidden="true" />
                  <td className="num px-2.5 py-2 text-right font-semibold">
                    {formatIDR(items.reduce((s, i) => s + i.totalModal, 0))}
                  </td>
                  <td
                    className={cn(
                      "num px-2.5 py-2 text-right font-bold",
                      summary.profit < 0 ? "text-destructive" : "text-good",
                    )}
                  >
                    {formatIDR(summary.profit)}
                  </td>
                  <td aria-hidden="true" />
                  <td className="num px-2.5 py-2 text-right font-semibold">
                    {formatIDR(items.reduce((s, i) => s + i.dpAmount, 0))}
                  </td>
                  <td aria-hidden="true" />
                  <td className="num px-2.5 py-2 text-right font-semibold">
                    {summary.shipping ? formatCompactIDR(summary.shipping) : "—"}
                  </td>
                  <td colSpan={4} aria-hidden="true" />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
