import * as React from "react";
import { useLocation } from "wouter";
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Download,
  Loader2,
  LogOut,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  UserPlus,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input, Select } from "../components/ui/field";
import { ClientGroup } from "../components/client-group";
import { ClientDialog } from "../components/client-dialog";
import { ItemDialog } from "../components/item-dialog";
import { KpiStrip } from "../components/kpi-strip";
import { authClient, clearToken } from "../lib/auth";
import { computeCsv } from "../lib/export";
import { useBoard, useRemoveClient, type BoardGroup, type BoardItem } from "../queries/jastip";

function Dashboard() {
  const [, navigate] = useLocation();
  const board = useBoard();
  const removeClient = useRemoveClient();
  const { data: session } = authClient.useSession();

  const [search, setSearch] = React.useState("");
  const [orderFilter, setOrderFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [purchaseFilter, setPurchaseFilter] = React.useState("all");
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});
  const [clientDialog, setClientDialog] = React.useState<{
    open: boolean;
    client: BoardGroup["client"] | null;
  }>({ open: false, client: null });
  const [itemDialog, setItemDialog] = React.useState<{
    open: boolean;
    group: BoardGroup | null;
    item: BoardItem | null;
  }>({ open: false, group: null, item: null });

  const groups = React.useMemo(() => board.data?.groups ?? [], [board.data]);
  const clients = React.useMemo(() => groups.map((g) => g.client), [groups]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (orderFilter !== "all" && item.orderStatus !== orderFilter) return false;
          if (paymentFilter !== "all" && item.paymentStatus !== paymentFilter) return false;
          if (purchaseFilter !== "all" && item.purchaseStatus !== purchaseFilter) return false;
          if (!q) return true;
          return (
            item.itemName.toLowerCase().includes(q) ||
            (item.notes ?? "").toLowerCase().includes(q) ||
            (item.address ?? "").toLowerCase().includes(q) ||
            group.client.name.toLowerCase().includes(q)
          );
        });
        return { group, items };
      })
      .filter(({ group, items }) => {
        const filtering =
          q !== "" || orderFilter !== "all" || paymentFilter !== "all" || purchaseFilter !== "all";
        if (!filtering) return true;
        if (items.length > 0) return true;
        // saat hanya search teks, client yang namanya cocok tetap tampil
        return q !== "" && group.client.name.toLowerCase().includes(q) && group.items.length === 0;
      });
  }, [groups, search, orderFilter, paymentFilter, purchaseFilter]);

  const visibleItems = filtered.flatMap((f) => f.items);
  const totals = React.useMemo(
    () => ({
      clients: filtered.length,
      items: visibleItems.length,
      profit: visibleItems.reduce((s, i) => s + i.profit, 0),
      revenue: visibleItems.reduce((s, i) => s + i.totalPrice, 0),
      dpAmount: visibleItems.reduce((s, i) => s + i.dpAmount, 0),
      pendingOrders: visibleItems.filter((i) => i.orderStatus !== "done").length,
      pendingPayment: visibleItems.filter((i) => i.paymentStatus !== "full").length,
      shippingUnpaid: visibleItems.filter((i) => i.shippingPaid === "unpaid").length,
    }),
    [filtered, visibleItems],
  );

  const allExpanded =
    filtered.length > 0 && filtered.every(({ group }) => expanded[group.client.id]);

  function toggleAll() {
    if (allExpanded) return setExpanded({});
    const next: Record<number, boolean> = {};
    for (const { group } of filtered) next[group.client.id] = true;
    setExpanded(next);
  }

  function exportCsv() {
    const csv = computeCsv(filtered);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `jastip-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function signOut() {
    await authClient.signOut();
    clearToken();
    navigate("/login", { replace: true });
  }

  const hasFilters =
    search !== "" || orderFilter !== "all" || paymentFilter !== "all" || purchaseFilter !== "all";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-3 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-foreground text-primary-foreground">
              <PackageCheck className="size-4" />
            </div>
            <div>
              <h1 className="text-[15px] leading-tight font-extrabold tracking-tight">
                Jastip Dashboard
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {board.data?.totals.clients ?? 0} client · {board.data?.totals.items ?? 0} barang
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-[12px] text-muted-foreground sm:block">
              {session?.user.email}
            </span>
            <Button size="sm" variant="outline" onClick={() => navigate("/settings")} title="Pengaturan invoice">
              <Settings2 className="size-3.5" /> <span className="hidden sm:inline">Pengaturan Invoice</span>
            </Button>
            <Button size="sm" variant="ghost" onClick={signOut} title="Keluar">
              <LogOut className="size-3.5" /> Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-5 sm:py-6">
        <KpiStrip {...totals} />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:flex-1 sm:max-w-xs">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari client, barang, alamat…"
              className="pl-8"
            />
          </div>
          <Select
            value={purchaseFilter}
            onChange={(e) => setPurchaseFilter(e.target.value)}
            className="w-auto min-w-[150px] flex-1 sm:flex-none"
          >
            <option value="all">Pembelian: semua</option>
            <option value="done">Pembelian: done</option>
            <option value="partial">Pembelian: sebagian</option>
          </Select>
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-auto min-w-[150px] flex-1 sm:flex-none"
          >
            <option value="all">Payment: semua</option>
            <option value="full">Payment: full</option>
            <option value="dp">Payment: DP</option>
          </Select>
          <Select
            value={orderFilter}
            onChange={(e) => setOrderFilter(e.target.value)}
            className="w-auto min-w-[150px] flex-1 sm:flex-none"
          >
            <option value="all">Pesanan: semua</option>
            <option value="done">Pesanan: done</option>
            <option value="not_done">Pesanan: not done</option>
          </Select>
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch("");
                setOrderFilter("all");
                setPaymentFilter("all");
                setPurchaseFilter("all");
              }}
            >
              Reset
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <Button size="sm" variant="outline" onClick={toggleAll}>
              {allExpanded ? (
                <ChevronsDownUp className="size-3.5" />
              ) : (
                <ChevronsUpDown className="size-3.5" />
              )}
              {allExpanded ? "Tutup semua" : "Buka semua"}
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!visibleItems.length}>
              <Download className="size-3.5" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!clients.length}
              onClick={() => setItemDialog({ open: true, group: null, item: null })}
            >
              <Plus className="size-3.5" /> Barang
            </Button>
            <Button size="sm" onClick={() => setClientDialog({ open: true, client: null })}>
              <UserPlus className="size-3.5" /> Client
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5">
          {board.isLoading && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-[13px]">Memuat data…</span>
            </div>
          )}

          {board.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-[13px] text-destructive">
              Gagal memuat data. Coba refresh halaman.
            </div>
          )}

          {!board.isLoading && !board.isError && groups.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-card/60 px-4 py-16 text-center">
              <div className="grid size-10 place-items-center rounded-full bg-muted">
                <UserPlus className="size-4.5 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold">Belum ada client</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Tambah client dulu, lalu isi barang titipannya.
                </p>
              </div>
              <Button size="sm" onClick={() => setClientDialog({ open: true, client: null })}>
                <UserPlus className="size-3.5" /> Tambah client
              </Button>
            </div>
          )}

          {!board.isLoading && groups.length > 0 && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-input bg-card/60 px-4 py-14 text-center text-[13px] text-muted-foreground">
              Tidak ada baris yang cocok dengan filter.
            </div>
          )}

          {filtered.map(({ group, items }) => (
            <ClientGroup
              key={group.client.id}
              group={group}
              items={items}
              expanded={!!expanded[group.client.id]}
              onToggle={() =>
                setExpanded((prev) => ({ ...prev, [group.client.id]: !prev[group.client.id] }))
              }
              onAddItem={() => {
                setExpanded((prev) => ({ ...prev, [group.client.id]: true }));
                setItemDialog({ open: true, group, item: null });
              }}
              onEditItem={(item) => setItemDialog({ open: true, group, item })}
              onEditClient={() => setClientDialog({ open: true, client: group.client })}
              onDeleteClient={() => {
                if (
                  confirm(
                    `Hapus client "${group.client.name}" beserta ${group.items.length} barangnya?`,
                  )
                )
                  removeClient.mutate({ id: group.client.id });
              }}
            />
          ))}
        </div>
      </main>

      <ClientDialog
        open={clientDialog.open}
        client={clientDialog.client}
        onClose={() => setClientDialog({ open: false, client: null })}
      />
      <ItemDialog
        open={itemDialog.open}
        group={itemDialog.group}
        item={itemDialog.item}
        clients={clients}
        onClose={() => setItemDialog({ open: false, group: null, item: null })}
      />
    </div>
  );
}

export default Dashboard;
