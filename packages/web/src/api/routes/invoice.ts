import { z } from "zod";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { s3, S3_BUCKET } from "../lib/s3";

const SETTINGS_ID = 1;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function getSettings() {
  const [row] = await db
    .select()
    .from(schema.invoiceSettings)
    .where(eq(schema.invoiceSettings.id, SETTINGS_ID));
  if (row) return row;
  const [created] = await db
    .insert(schema.invoiceSettings)
    .values({ id: SETTINGS_ID, updatedAt: new Date() })
    .returning();
  return created;
}

function withLogoUrl<T extends { logoKey: string | null; updatedAt: Date }>(settings: T) {
  return {
    ...settings,
    logoUrl: settings.logoKey
      ? `/api/invoice-logo?v=${encodeURIComponent(settings.logoKey)}`
      : null,
  };
}

function randomCode(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Nomor invoice unik per transaksi: INV-YYMM-XXXXXX. */
async function generateInvoiceNumber() {
  const now = new Date();
  const prefix = `INV-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${prefix}-${randomCode(6)}`;
    const [taken] = await db
      .select({ id: schema.invoices.id })
      .from(schema.invoices)
      .where(eq(schema.invoices.number, candidate));
    if (!taken) return candidate;
  }
  throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Gagal membuat nomor invoice" });
}

async function getClient(clientId: number) {
  const [client] = await db.select().from(schema.clients).where(eq(schema.clients.id, clientId));
  if (!client) throw new ORPCError("NOT_FOUND", { message: "Client tidak ditemukan" });
  return client;
}

function toLine(item: schema.OrderItem) {
  return {
    id: item.id,
    itemName: item.itemName,
    qty: item.qty,
    unitPrice: item.unitPrice,
    lineTotal: item.qty * item.unitPrice,
    shippingMethod: item.shippingMethod,
    shippingCost: item.shippingCost,
    dpAmount: item.dpAmount,
    address: item.address,
    notes: item.notes,
  };
}

function sumLines(lines: ReturnType<typeof toLine>[]) {
  return lines.reduce((acc, l) => acc + l.lineTotal + l.shippingCost, 0);
}

const settingsInput = z.object({
  jastipName: z.string().max(120),
  adminWa: z.string().max(40),
  bankDetails: z.string().max(1000),
  footerNote: z.string().max(500).nullish(),
  logoKey: z.string().nullish(),
});

export const invoice = {
  settings: authed.handler(async () => withLogoUrl(await getSettings())),

  updateSettings: authed.input(settingsInput).handler(async ({ input }) => {
    await getSettings();
    const [row] = await db
      .update(schema.invoiceSettings)
      .set({
        jastipName: input.jastipName.trim(),
        adminWa: input.adminWa.trim(),
        bankDetails: input.bankDetails.trim(),
        footerNote: input.footerNote?.trim() || null,
        ...(input.logoKey !== undefined ? { logoKey: input.logoKey } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.invoiceSettings.id, SETTINGS_ID))
      .returning();
    return withLogoUrl(row);
  }),

  /** Presigned PUT untuk upload logo langsung ke storage. */
  presignLogo: authed
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string().regex(/^image\//, "File harus berupa gambar"),
      }),
    )
    .handler(async ({ input }) => {
      const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
      const key = `invoice-logo/${Date.now()}-${safe}`;
      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: input.contentType }),
        { expiresIn: 600 },
      );
      return { url, key };
    }),

  /** Riwayat invoice satu client + barang yang belum masuk invoice mana pun. */
  overview: authed.input(z.object({ clientId: z.number() })).handler(async ({ input }) => {
    const client = await getClient(input.clientId);
    const [list, items] = await Promise.all([
      db
        .select()
        .from(schema.invoices)
        .where(eq(schema.invoices.clientId, client.id))
        .orderBy(desc(schema.invoices.createdAt), desc(schema.invoices.id)),
      db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.clientId, client.id))
        .orderBy(asc(schema.orderItems.id)),
    ]);
    return {
      client,
      invoices: list.map((inv) => {
        const lines = items.filter((i) => i.invoiceId === inv.id).map(toLine);
        return { ...inv, itemCount: lines.length, total: sumLines(lines) };
      }),
      uninvoiced: items.filter((i) => i.invoiceId == null).map(toLine),
    };
  }),

  /** Buat invoice baru (nomor baru) dari barang terpilih yang belum di-invoice. */
  create: authed
    .input(z.object({ clientId: z.number(), itemIds: z.array(z.number()).min(1, "Pilih minimal 1 barang") }))
    .handler(async ({ input }) => {
      await getClient(input.clientId);
      const eligible = await db
        .select({ id: schema.orderItems.id })
        .from(schema.orderItems)
        .where(
          and(
            eq(schema.orderItems.clientId, input.clientId),
            inArray(schema.orderItems.id, input.itemIds),
            isNull(schema.orderItems.invoiceId),
          ),
        );
      if (eligible.length === 0) {
        throw new ORPCError("BAD_REQUEST", { message: "Barang terpilih sudah masuk invoice lain" });
      }
      const number = await generateInvoiceNumber();
      const [inv] = await db
        .insert(schema.invoices)
        .values({ number, clientId: input.clientId, createdAt: new Date() })
        .returning();
      await db
        .update(schema.orderItems)
        .set({ invoiceId: inv.id })
        .where(inArray(schema.orderItems.id, eligible.map((e) => e.id)));
      return inv;
    }),

  /** Hapus invoice; barangnya kembali ke status "belum di-invoice". */
  remove: authed.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db
      .update(schema.orderItems)
      .set({ invoiceId: null })
      .where(eq(schema.orderItems.invoiceId, input.id));
    await db.delete(schema.invoices).where(eq(schema.invoices.id, input.id));
    return { ok: true };
  }),

  /** Data lengkap satu invoice: template + client + barang. */
  get: authed.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    const [inv] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, input.id));
    if (!inv) throw new ORPCError("NOT_FOUND", { message: "Invoice tidak ditemukan" });
    const [client, settings, items] = await Promise.all([
      getClient(inv.clientId),
      getSettings(),
      db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.invoiceId, inv.id))
        .orderBy(asc(schema.orderItems.id)),
    ]);
    return {
      id: inv.id,
      invoiceNumber: inv.number,
      createdAt: inv.createdAt,
      client,
      settings: withLogoUrl(settings),
      items: items.map(toLine),
    };
  }),
};
