import type { BoardGroup, BoardItem } from "../queries/jastip";
import {
  optionMeta,
  orderStatusOptions,
  paymentStatusOptions,
  purchaseStatusOptions,
  shippingMethodOptions,
  shippingPaidOptions,
} from "./jastip";

const columns = [
  "Nama",
  "Nama barang",
  "Status pembelian",
  "Qty",
  "Harga satuan",
  "Harga total",
  "Harga modal",
  "Kurs",
  "Total harga modal",
  "Profit (Rp)",
  "Status payment",
  "Total DP",
  "Metode pengiriman",
  "Pembayaran ongkir",
  "Status ongkir",
  "Status pesanan",
  "Alamat",
  "Catatan",
];

function cell(value: string | number) {
  const text = String(value ?? "");
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV mengikuti baris yang sedang tampil (hasil filter), dikelompokkan per client. */
export function computeCsv(rows: { group: BoardGroup; items: BoardItem[] }[]) {
  const lines = [columns.join(",")];
  for (const { group, items } of rows) {
    for (const item of items) {
      lines.push(
        [
          group.client.name,
          item.itemName,
          optionMeta(purchaseStatusOptions, item.purchaseStatus).label,
          item.qty,
          item.unitPrice,
          item.totalPrice,
          item.modalPrice,
          item.kurs,
          Math.round(item.totalModal),
          Math.round(item.profit),
          optionMeta(paymentStatusOptions, item.paymentStatus).label,
          item.dpAmount,
          optionMeta(shippingMethodOptions, item.shippingMethod).label,
          item.shippingCost,
          optionMeta(shippingPaidOptions, item.shippingPaid).label,
          optionMeta(orderStatusOptions, item.orderStatus).label,
          item.address ?? "",
          item.notes ?? "",
        ]
          .map(cell)
          .join(","),
      );
    }
  }
  return lines.join("\n");
}
