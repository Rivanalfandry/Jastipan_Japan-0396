import * as React from "react";
import { Button } from "./ui/button";
import { Field, Input, Select, Textarea } from "./ui/field";
import { Modal } from "./ui/modal";
import {
  formatIDR,
  orderStatusOptions,
  paymentStatusOptions,
  purchaseStatusOptions,
  shippingMethodOptions,
  shippingPaidOptions,
} from "../lib/jastip";
import { useCreateItem, useUpdateItem, type BoardGroup, type BoardItem } from "../queries/jastip";

type FormState = {
  itemName: string;
  purchaseStatus: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  totalManual: boolean;
  modalPrice: string;
  kurs: string;
  dpAmount: string;
  address: string;
  paymentStatus: string;
  shippingMethod: string;
  shippingCost: string;
  shippingPaid: string;
  orderStatus: string;
  notes: string;
};

const empty: FormState = {
  itemName: "",
  purchaseStatus: "partial",
  qty: "1",
  unitPrice: "",
  totalPrice: "",
  totalManual: false,
  modalPrice: "",
  kurs: "1",
  dpAmount: "",
  address: "",
  paymentStatus: "dp",
  shippingMethod: "ekspedisi",
  shippingCost: "",
  shippingPaid: "unpaid",
  orderStatus: "not_done",
  notes: "",
};

const num = (v: string) => {
  const parsed = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function ItemDialog({
  open,
  onClose,
  group,
  item,
  clients,
}: {
  open: boolean;
  onClose: () => void;
  group: BoardGroup | null;
  item?: BoardItem | null;
  clients: BoardGroup["client"][];
}) {
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const [clientId, setClientId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<FormState>(empty);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setError("");
    setClientId(item?.clientId ?? group?.client.id ?? clients[0]?.id ?? null);
    if (item) {
      setForm({
        itemName: item.itemName,
        purchaseStatus: item.purchaseStatus,
        qty: String(item.qty),
        unitPrice: String(item.unitPrice),
        totalPrice: String(item.totalPrice),
        totalManual: item.totalPrice !== item.qty * item.unitPrice,
        modalPrice: String(item.modalPrice),
        kurs: String(item.kurs),
        dpAmount: String(item.dpAmount),
        address: item.address ?? "",
        paymentStatus: item.paymentStatus,
        shippingMethod: item.shippingMethod,
        shippingCost: String(item.shippingCost),
        shippingPaid: item.shippingPaid,
        orderStatus: item.orderStatus,
        notes: item.notes ?? "",
      });
    } else {
      setForm({ ...empty, address: group?.client.address ?? "" });
    }
  }, [open, item, group, clients]);

  const qty = num(form.qty);
  const unitPrice = num(form.unitPrice);
  const autoTotal = qty * unitPrice;
  const totalPrice = form.totalManual ? num(form.totalPrice) : autoTotal;
  const modalPrice = num(form.modalPrice);
  const kurs = num(form.kurs) || 1;
  const totalModal = qty * modalPrice * kurs;
  const profit = totalPrice - totalModal;
  const pending = createItem.isPending || updateItem.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemName.trim()) return setError("Nama barang wajib diisi.");
    if (!clientId) return setError("Pilih client dulu.");

    const payload = {
      itemName: form.itemName.trim(),
      purchaseStatus: form.purchaseStatus as "done" | "partial",
      qty: Math.max(0, Math.round(qty)),
      unitPrice,
      totalPrice: form.totalManual ? totalPrice : null,
      modalPrice,
      kurs,
      dpAmount: num(form.dpAmount),
      address: form.address.trim() || null,
      paymentStatus: form.paymentStatus as "dp" | "full",
      shippingMethod: form.shippingMethod as "ekspedisi" | "instant",
      shippingCost: num(form.shippingCost),
      shippingPaid: form.shippingPaid as "paid" | "unpaid",
      orderStatus: form.orderStatus as "done" | "not_done",
      notes: form.notes.trim() || null,
    };

    try {
      if (item) await updateItem.mutateAsync({ id: item.id, clientId, ...payload });
      else await createItem.mutateAsync({ clientId, ...payload });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan barang.");
    }
  }

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title={item ? "Edit barang" : "Tambah barang"}
      subtitle={
        item ? `${item.itemName} · ID #${item.id}` : "Profit dihitung otomatis dari total, modal, dan kurs."
      }
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="item-form" disabled={pending}>
            {pending ? "Menyimpan…" : item ? "Simpan perubahan" : "Tambah barang"}
          </Button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="grid gap-3.5 sm:grid-cols-3">
        <Field label="Client">
          <Select
            value={clientId ?? ""}
            onChange={(e) => setClientId(Number(e.target.value))}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nama barang" className="sm:col-span-2">
          <Input
            value={form.itemName}
            onChange={(e) => set({ itemName: e.target.value })}
            placeholder="cth. Uniqlo AIRism tee (L, navy)"
          />
        </Field>

        <Field label="Status pembelian">
          <Select
            value={form.purchaseStatus}
            onChange={(e) => set({ purchaseStatus: e.target.value })}
          >
            {purchaseStatusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Qty">
          <Input
            className="num"
            inputMode="numeric"
            value={form.qty}
            onChange={(e) => set({ qty: e.target.value })}
          />
        </Field>
        <Field label="Harga satuan">
          <Input
            className="num"
            inputMode="decimal"
            value={form.unitPrice}
            onChange={(e) => set({ unitPrice: e.target.value })}
            placeholder="0"
          />
        </Field>

        <Field
          label="Harga total"
          hint={form.totalManual ? "Manual — tombol di bawah untuk kembali otomatis" : "Otomatis qty × harga satuan"}
        >
          <div className="flex gap-1.5">
            <Input
              className="num"
              inputMode="decimal"
              value={form.totalManual ? form.totalPrice : String(autoTotal)}
              onChange={(e) => set({ totalPrice: e.target.value, totalManual: true })}
            />
            {form.totalManual && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => set({ totalManual: false, totalPrice: "" })}
              >
                Auto
              </Button>
            )}
          </div>
        </Field>
        <Field label="Harga modal">
          <Input
            className="num"
            inputMode="decimal"
            value={form.modalPrice}
            onChange={(e) => set({ modalPrice: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Kurs" hint="Isi 1 kalau modal sudah rupiah.">
          <Input
            className="num"
            inputMode="decimal"
            value={form.kurs}
            onChange={(e) => set({ kurs: e.target.value })}
          />
        </Field>

        <Field label="Total harga modal" hint="Otomatis qty × harga modal × kurs">
          <Input className="num bg-muted/60" readOnly tabIndex={-1} value={formatIDR(totalModal)} />
        </Field>

        <div className="rounded-lg border border-border bg-muted/60 px-3 py-2.5 sm:col-span-2 sm:self-start sm:mt-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
            <span className="label-xs text-muted-foreground">
              Profit = harga total − total harga modal
            </span>
            <span
              className={`num text-[17px] font-semibold ${profit < 0 ? "text-destructive" : "text-good"}`}
            >
              {formatIDR(profit)}
            </span>
          </div>
        </div>

        <Field label="Status payment">
          <Select
            value={form.paymentStatus}
            onChange={(e) => set({ paymentStatus: e.target.value })}
          >
            {paymentStatusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Total DP dibayarkan (Rp)">
          <Input
            className="num"
            inputMode="decimal"
            value={form.dpAmount}
            onChange={(e) => set({ dpAmount: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Metode pengiriman">
          <Select
            value={form.shippingMethod}
            onChange={(e) => set({ shippingMethod: e.target.value })}
          >
            {shippingMethodOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status pesanan">
          <Select value={form.orderStatus} onChange={(e) => set({ orderStatus: e.target.value })}>
            {orderStatusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Pembayaran ongkir (Rp)">
          <Input
            className="num"
            inputMode="decimal"
            value={form.shippingCost}
            onChange={(e) => set({ shippingCost: e.target.value })}
            placeholder="0"
          />
        </Field>
        <Field label="Status ongkir">
          <Select value={form.shippingPaid} onChange={(e) => set({ shippingPaid: e.target.value })}>
            {shippingPaidOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Catatan" className="sm:col-span-3">
          <Input
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="No. resi, varian, dll."
          />
        </Field>

        <Field label="Alamat pengiriman" className="sm:col-span-3">
          <Textarea
            rows={2}
            value={form.address}
            onChange={(e) => set({ address: e.target.value })}
            placeholder="Alamat tujuan"
          />
        </Field>

        {error && <p className="text-[12px] text-destructive sm:col-span-3">{error}</p>}
      </form>
    </Modal>
  );
}
