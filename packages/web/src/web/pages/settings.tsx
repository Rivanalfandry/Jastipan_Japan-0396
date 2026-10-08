import * as React from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Field, Input, Textarea } from "../components/ui/field";
import { InvoiceDocument } from "../components/invoice-document";
import { uploadLogo, useInvoiceSettings, useUpdateInvoiceSettings } from "../queries/invoice";

const MAX_LOGO_BYTES = 3 * 1024 * 1024;

export default function SettingsPage() {
  const settings = useInvoiceSettings();
  const update = useUpdateInvoiceSettings();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = React.useState({
    jastipName: "",
    adminWa: "",
    bankDetails: "",
    footerNote: "",
  });
  const [logo, setLogo] = React.useState<{ key: string | null; preview: string | null }>({
    key: null,
    preview: null,
  });
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!settings.data) return;
    setForm({
      jastipName: settings.data.jastipName,
      adminWa: settings.data.adminWa,
      bankDetails: settings.data.bankDetails,
      footerNote: settings.data.footerNote ?? "",
    });
    setLogo({ key: settings.data.logoKey, preview: settings.data.logoUrl });
  }, [settings.data]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("File harus berupa gambar (PNG/JPG/SVG/WebP).");
    if (file.size > MAX_LOGO_BYTES) return setError("Ukuran logo maksimal 3 MB.");
    setUploading(true);
    try {
      const key = await uploadLogo(file);
      setLogo({ key, preview: URL.createObjectURL(file) });
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload logo gagal.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await update.mutateAsync({ ...form, logoKey: logo.key });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    }
  }

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setSaved(false);
  };

  const previewData = {
    id: 0,
    invoiceNumber: "INV-XXXX-CONTOH",
    createdAt: new Date(),
    client: {
      id: 0,
      name: "Nama Konsumen",
      phone: "0812-3456-7890",
      address: "Jl. Contoh No. 1, Kota",
      notes: null,
      invoiceNumber: null,
      createdAt: new Date(),
    },
    settings: {
      id: 1,
      ...form,
      footerNote: form.footerNote || null,
      logoKey: logo.key,
      logoUrl: logo.preview,
      updatedAt: new Date(),
    },
    items: [
      {
        id: 1,
        itemName: "Contoh barang titipan",
        qty: 2,
        unitPrice: 150000,
        lineTotal: 300000,
        shippingMethod: "ekspedisi",
        shippingCost: 20000,
        dpAmount: 100000,
        address: null,
        notes: null,
      },
    ],
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-3 sm:px-5">
          <Button asChild size="sm" variant="ghost">
            <Link href="/">
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
          </Button>
          <div>
            <div className="text-[14px] font-bold">Pengaturan Invoice</div>
            <div className="text-[11px] text-muted-foreground">
              Template ini otomatis dipakai di invoice semua konsumen.
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-3 py-5 sm:px-5 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={save}
          className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-[76px]"
        >
          <div className="grid gap-4">
            <Field label="Logo jastip">
              <div className="flex items-center gap-3">
                <div className="grid size-[72px] shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-input bg-muted/50">
                  {logo.preview ? (
                    <img src={logo.preview} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <ImagePlus className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ImagePlus className="size-3.5" />
                      )}
                      {logo.preview ? "Ganti logo" : "Upload logo"}
                    </Button>
                    {logo.preview && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setLogo({ key: null, preview: null });
                          setSaved(false);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Hapus
                      </Button>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground">PNG/JPG/SVG, maks. 3 MB.</span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickFile}
                  aria-label="Pilih file logo"
                />
              </div>
            </Field>

            <Field label="Nama jastip">
              <Input
                value={form.jastipName}
                onChange={(e) => set({ jastipName: e.target.value })}
                placeholder="cth. Jastip Tokyo by Dita"
              />
            </Field>
            <Field label="WA admin">
              <Input
                value={form.adminWa}
                onChange={(e) => set({ adminWa: e.target.value })}
                placeholder="cth. 0812-3456-7890"
              />
            </Field>
            <Field label="No. rekening" hint="Boleh lebih dari satu bank, satu per baris.">
              <Textarea
                rows={4}
                value={form.bankDetails}
                onChange={(e) => set({ bankDetails: e.target.value })}
                placeholder={"BCA 1234567890 a.n. Dita Asfrianti\nMandiri 0987654321 a.n. Dita Asfrianti"}
              />
            </Field>
            <Field label="Catatan kaki (opsional)">
              <Textarea
                rows={2}
                value={form.footerNote}
                onChange={(e) => set({ footerNote: e.target.value })}
                placeholder="cth. Pelunasan maksimal 3 hari setelah barang tiba."
              />
            </Field>

            {error && <p className="text-[12px] text-destructive">{error}</p>}

            <Button type="submit" disabled={update.isPending || uploading}>
              {update.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : saved ? (
                <Check className="size-3.5" />
              ) : null}
              {saved ? "Tersimpan" : "Simpan template"}
            </Button>
          </div>
        </form>

        <section className="min-w-0">
          <div className="label-xs mb-2 text-muted-foreground">Preview invoice</div>
          <PreviewFrame>
            <InvoiceDocument data={previewData} />
          </PreviewFrame>
        </section>
      </main>
    </div>
  );
}

function PreviewFrame({ children }: { children: React.ReactNode }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [height, setHeight] = React.useState(1123);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, wrap.clientWidth / 794));
      setHeight(inner.offsetHeight);
    });
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="w-full">
      <div
        className="mx-auto overflow-hidden rounded-md shadow-[0_20px_50px_-25px_rgba(20,23,26,0.45)] ring-1 ring-border"
        style={{ width: 794 * scale, height: height * scale }}
      >
        <div ref={innerRef} style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 794 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
