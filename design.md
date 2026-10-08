# Jastip Dashboard — Design

Web app (Vite + React + Hono + Turso) untuk tracking jasa titipan multi-client. Visual direction: **operational ledger** — padat data, hairline grid, tipografi tabular, warna dipakai hanya untuk status dan angka profit. Bukan dashboard pastel bulat-bulat; lebih mirip terminal keuangan yang bersih.

## Brand & Colors

CSS variables di `packages/web/src/web/styles.css` (light-only, dashboard dipakai siang hari di laptop/HP).

| Token | Value | Use |
|-------|-------|-----|
| background | #F4F2ED (warm paper) | Page background |
| card | #FFFFFF | Table surface, cards, modal |
| foreground | #14171A (ink) | Primary text, headings |
| mutedForeground | #6B7280 | Labels, meta |
| border | #E4E0D7 | Hairlines, table grid |
| primary | #14171A | Primary buttons, active state |
| accent (profit) | #0F7A5A emerald | Profit positive, "Done" |
| warning | #B4740F amber | "Sebagian", "DP", ongkir unpaid |
| destructive | #B3261E | Delete, "Not done", profit negatif |

Status pills: solid tint background (10% mix) + ink text, radius 4px, uppercase 10px letter-spaced label.

## Typography

- **Display/UI**: `Plus Jakarta Sans` (600/700) — heading, nav, tombol.
- **Numbers**: `JetBrains Mono` (500) dengan `tabular-nums` — semua kolom angka (qty, harga, kurs, profit) supaya rata kolom.
- Body text 13–14px, table cell 13px, label 10–11px uppercase tracking-wide.
- Google Fonts via `<link>` di `index.html`.

## Pages

- **Login** (`src/web/pages/login.tsx`) — kartu tengah di atas paper background, email + password, toggle "Masuk / Daftar akun tim".
- **Dashboard** (`src/web/pages/index.tsx`) — header dengan judul + user + logout; strip KPI (total profit, revenue, pesanan pending, payment pending, ongkir belum dibayar); toolbar (search, filter status pesanan/payment, tambah client, export CSV); daftar **grouped table**: satu blok per client (accordion) dengan summary row (jumlah barang, qty, total, profit, pending) dan tabel barang di dalamnya.
- **Item editor** (`src/web/components/item-dialog.tsx`) — modal form semua kolom: nama barang, status pembelian, qty, harga satuan, harga total (auto, bisa override), harga modal, kurs, total DP, profit (read-only, live), alamat, status payment, metode pengiriman, pembayaran ongkir + status ongkir, status pesanan, catatan.
- **Client editor** (`src/web/components/client-dialog.tsx`) — nama, no. HP, alamat default, catatan.

## Key Flows

1. Login → dashboard → semua client tampil collapsed dengan summary.
2. Tambah client → expand → "Tambah barang" → isi form → profit terhitung otomatis → baris masuk tabel client.
3. Ubah status inline lewat dropdown di sel tabel (status pembelian, payment, pengiriman, pesanan) — langsung tersimpan.
4. Filter/search mempersempit baris; group dengan 0 hasil disembunyikan. Export CSV mengikuti hasil filter.

## Architecture

- API oRPC: `clients` (list/create/update/remove), `items` (board/create/update/remove). Total harga modal = qty × harga modal × kurs; Profit = harga total − total harga modal, dihitung di server (`api/lib/calc.ts`), tidak disimpan.
- Auth: Better Auth email+password (bearer plugin), semua prosedur data pakai base `authed`; data dibagi satu workspace tim.
- Query/mutation options di `src/web/queries/`, optimistic-free tapi invalidate `items.board` setelah setiap mutasi.
