import * as React from "react";
import { Link, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  FilePlus2,
  FileText,
  Loader2,
  Settings,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../components/ui/button";
import { InvoiceDocument } from "../components/invoice-document";
import { downloadInvoicePdf } from "../lib/invoice-pdf";
import { formatIDR } from "../lib/jastip";
import {
  useCreateInvoice,
  useInvoice,
  useInvoiceOverview,
  useRemoveInvoice,
} from "../queries/invoice";

const shortDate = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const overview = useInvoiceOverview(clientId);
  const createInvoice = useCreateInvoice();
  const removeInvoice = useRemoveInvoice();

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [picked, setPicked] = React.useState<Set<number>>(new Set());
  const invoicesList = overview.data?.invoices;
  const uninvoiced = overview.data?.uninvoiced;

  // Default: tampilkan invoice terbaru; kalau yang dipilih terhapus, pindah ke terbaru.
  const activeId =
    selectedId != null && invoicesList?.some((i) => i.id === selectedId)
      ? selectedId
      : (invoicesList?.[0]?.id ?? null);
  const invoice = useInvoice(activeId);

  // Semua barang belum di-invoice tercentang secara default.
  const uninvoicedKey = uninvoiced?.map((i) => i.id).join(",") ?? "";
  React.useEffect(() => {
    setPicked(new Set(uninvoicedKey ? uninvoicedKey.split(",").map(Number) : []));
  }, [uninvoicedKey]);

  const docRef = React.useRef<HTMLDivElement>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [scale, setScale] = React.useState(1);
  const [docHeight, setDocHeight] = React.useState(1123);

  // Skala preview supaya A4 muat di layar HP; PDF tetap dirender ukuran asli.
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / 794));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDocHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [invoice.data]);

  async function download() {
    if (!docRef.current || !invoice.data) return;
    setBusy(true);
    setError("");
    try {
      const safeName = invoice.data.client.name
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await downloadInvoicePdf(docRef.current, `${invoice.data.invoiceNumber}-${safeName}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat PDF.");
    } finally {
      setBusy(false);
    }
  }

  function togglePick(id: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    setError("");
    try {
      const inv = await createInvoice.mutateAsync({ clientId, itemIds: [...picked] });
      setSelectedId(inv.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat invoice.");
    }
  }

  async function handleRemove() {
    if (!invoice.data) return;
    if (
      !confirm(
        `Hapus invoice ${invoice.data.invoiceNumber}? Barangnya akan kembali ke daftar "belum di-invoice".`,
      )
    )
      return;
    await removeInvoice.mutateAsync({ id: invoice.data.id });
    setSelectedId(null);
  }

  const s = invoice.data?.settings;
  const incomplete = s && (!s.jastipName || !s.adminWa || !s.bankDetails || !s.logoUrl);
  const allPicked = !!uninvoiced?.length && picked.size === uninvoiced.length;
  const pickedTotal =
    uninvoiced?.filter((i) => picked.has(i.id)).reduce((a, i) => a + i.lineTotal + i.shippingCost, 0) ??
    0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-2 px-3 py-3 sm:px-5">
          <Button asChild size="sm" variant="ghost">
            <Link href="/">
              <ArrowLeft className="size-3.5" /> Dashboard
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold">
              Invoice {overview.data ? `· ${overview.data.client.name}` : ""}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {invoicesList ? `${invoicesList.length} invoice` : "Memuat…"}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/settings">
                <Settings className="size-3.5" /> Template
              </Link>
            </Button>
            {invoice.data && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleRemove}
                disabled={removeInvoice.isPending}
                title="Hapus invoice ini"
                aria-label="Hapus invoice ini"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
            <Button size="sm" onClick={download} disabled={busy || !invoice.data}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-5 px-3 py-5 sm:px-5 lg:grid-cols-[320px_1fr]">
        <aside className="flex flex-col gap-4">
          {/* Barang belum di-invoice */}
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="label-xs text-muted-foreground">
                Belum di-invoice ({uninvoiced?.length ?? 0})
              </h2>
              {!!uninvoiced?.length && (
                <button
                  type="button"
                  className="text-[11.5px] font-semibold text-foreground/70 hover:text-foreground"
                  onClick={() =>
                    setPicked(allPicked ? new Set() : new Set(uninvoiced.map((i) => i.id)))
                  }
                >
                  {allPicked ? "Kosongkan" : "Pilih semua"}
                </button>
              )}
            </div>

            {overview.isLoading ? (
              <div className="py-4 text-[12.5px] text-muted-foreground">Memuat…</div>
            ) : !uninvoiced?.length ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                Semua barang sudah masuk invoice. Barang baru yang ditambahkan untuk client ini akan
                muncul di sini untuk dibuatkan invoice berikutnya.
              </p>
            ) : (
              <>
                <ul className="-mx-1 flex max-h-72 flex-col overflow-y-auto">
                  {uninvoiced.map((item) => (
                    <li key={item.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1.5 hover:bg-muted/60">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-foreground"
                          aria-label={`Pilih ${item.itemName}`}
                          checked={picked.has(item.id)}
                          onChange={() => togglePick(item.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium">
                            {item.itemName}
                          </span>
                          <span className="num block text-[11px] text-muted-foreground">
                            {item.qty} × {formatIDR(item.unitPrice)} = {formatIDR(item.lineTotal)}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-3 w-full"
                  onClick={handleCreate}
                  disabled={picked.size === 0 || createInvoice.isPending}
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FilePlus2 className="size-3.5" />
                  )}
                  Buat invoice baru ({picked.size} barang)
                </Button>
                {picked.size > 0 && (
                  <p className="num mt-1.5 text-center text-[11px] text-muted-foreground">
                    Total {formatIDR(pickedTotal)} · nomor invoice baru dibuat otomatis
                  </p>
                )}
              </>
            )}
          </section>

          {/* Riwayat invoice */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="label-xs mb-2 text-muted-foreground">Riwayat invoice</h2>
            {!invoicesList?.length ? (
              <p className="text-[12.5px] text-muted-foreground">Belum ada invoice.</p>
            ) : (
              <ul className="-mx-1 flex flex-col gap-1">
                {invoicesList.map((inv) => (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(inv.id)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                        inv.id === activeId
                          ? "bg-foreground text-primary-foreground"
                          : "hover:bg-muted/60",
                      )}
                    >
                      <FileText className="mt-0.5 size-3.5 shrink-0 opacity-70" />
                      <span className="min-w-0 flex-1">
                        <span className="num block text-[12px] font-semibold">{inv.number}</span>
                        <span className="block text-[11px] opacity-70">
                          {shortDate.format(new Date(inv.createdAt))} · {inv.itemCount} barang
                        </span>
                      </span>
                      <span className="num text-[12px] font-semibold">{formatIDR(inv.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className="min-w-0">
          {incomplete && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-[12.5px] text-warn">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Template invoice belum lengkap (nama jastip, WA admin, rekening, atau logo).{" "}
                <Link href="/settings" className="font-semibold underline">
                  Lengkapi di Pengaturan Invoice
                </Link>
                .
              </span>
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-[12.5px] text-destructive">
              {error}
            </div>
          )}

          <div ref={wrapRef} className="w-full">
            {(overview.isLoading || invoice.isLoading) && (
              <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Memuat invoice…
              </div>
            )}
            {overview.isError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-[13px] text-destructive">
                Client tidak ditemukan.
              </div>
            )}
            {overview.data && !invoicesList?.length && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-20 text-center">
                <FileText className="size-6 text-muted-foreground" />
                <p className="text-[13.5px] font-semibold">Belum ada invoice untuk client ini</p>
                <p className="max-w-sm text-[12.5px] text-muted-foreground">
                  Pilih barang di panel "Belum di-invoice", lalu klik "Buat invoice baru". Setiap
                  invoice mendapat nomor unik sendiri.
                </p>
              </div>
            )}
            {invoice.data && (
              <div
                className="mx-auto overflow-hidden rounded-md shadow-[0_20px_50px_-25px_rgba(20,23,26,0.45)] ring-1 ring-border"
                style={{ width: 794 * scale, height: docHeight * scale }}
              >
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
                  <InvoiceDocument ref={docRef} data={invoice.data} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
