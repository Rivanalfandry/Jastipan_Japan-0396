import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

/** Client (pemesan jastip). Grouping utama di dashboard. */
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  /** @deprecated Dulu nomor invoice per client; sekarang pakai tabel `invoices`. */
  invoiceNumber: text("invoice_number").unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Template invoice — satu baris (id = 1), berlaku untuk semua client. */
export const invoiceSettings = sqliteTable("invoice_settings", {
  id: integer("id").primaryKey(),
  jastipName: text("jastip_name").notNull().default(""),
  adminWa: text("admin_wa").notNull().default(""),
  /** Detail rekening, bebas multi-baris (bank, no rek, atas nama). */
  bankDetails: text("bank_details").notNull().default(""),
  /** Key objek logo di storage. */
  logoKey: text("logo_key"),
  footerNote: text("footer_note"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Invoice per transaksi: satu client bisa punya banyak invoice, tiap barang masuk ke satu invoice. */
export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    number: text("number").notNull().unique(),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("invoices_client_idx").on(table.clientId)],
);

/** Baris barang titipan milik satu client. */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** Nama barang */
    itemName: text("item_name").notNull(),
    /** Status pembelian: done | partial (sebagian) */
    purchaseStatus: text("purchase_status").notNull().default("partial"),
    qty: integer("qty").notNull().default(1),
    /** Harga satuan (mata uang asal) */
    unitPrice: real("unit_price").notNull().default(0),
    /** Harga total — auto qty x satuan, bisa dioverride */
    totalPrice: real("total_price").notNull().default(0),
    /** Harga modal */
    modalPrice: real("modal_price").notNull().default(0),
    /** Kurs pengali ke rupiah */
    kurs: real("kurs").notNull().default(1),
    /** Total DP yang sudah dibayarkan (Rp) */
    dpAmount: real("dp_amount").notNull().default(0),
    /** Alamat kirim */
    address: text("address"),
    /** Status payment: dp | full */
    paymentStatus: text("payment_status").notNull().default("dp"),
    /** Metode pengiriman: ekspedisi | instant */
    shippingMethod: text("shipping_method").notNull().default("ekspedisi"),
    /** Pembayaran ongkir (Rp) */
    shippingCost: real("shipping_cost").notNull().default(0),
    /** Status ongkir: paid | unpaid */
    shippingPaid: text("shipping_paid").notNull().default("unpaid"),
    /** Status pesanan: done | not_done */
    orderStatus: text("order_status").notNull().default("not_done"),
    notes: text("notes"),
    /** Invoice tempat barang ini ditagihkan (null = belum di-invoice). */
    invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("order_items_client_idx").on(table.clientId)],
);

export type Client = typeof clients.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
