import * as React from "react";
import { Button } from "./ui/button";
import { Field, Input, Textarea } from "./ui/field";
import { Modal } from "./ui/modal";
import { useCreateClient, useUpdateClient, type BoardGroup } from "../queries/jastip";

export function ClientDialog({
  open,
  onClose,
  client,
}: {
  open: boolean;
  onClose: () => void;
  client?: BoardGroup["client"] | null;
}) {
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [form, setForm] = React.useState({ name: "", phone: "", address: "", notes: "" });
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
    });
  }, [open, client]);

  const pending = createClient.isPending || updateClient.isPending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama client wajib diisi.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (client) await updateClient.mutateAsync({ id: client.id, ...payload });
      else await createClient.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan client.");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={client ? "Edit client" : "Client baru"}
      subtitle="Alamat di sini dipakai sebagai default saat menambah barang."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" form="client-form" disabled={pending}>
            {pending ? "Menyimpan…" : client ? "Simpan perubahan" : "Tambah client"}
          </Button>
        </>
      }
    >
      <form id="client-form" onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Nama client" className="sm:col-span-1">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="cth. Rani Putri"
          />
        </Field>
        <Field label="No. WhatsApp">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="0812…"
          />
        </Field>
        <Field label="Alamat default" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Jalan, kota, kode pos"
          />
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Preferensi, reseller, dll."
          />
        </Field>
        {error && <p className="text-[12px] text-destructive sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  );
}
