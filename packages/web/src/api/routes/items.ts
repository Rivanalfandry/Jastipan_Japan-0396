import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";
import { computeProfit, computeTotal, computeTotalModal } from "../lib/calc";

const purchaseStatus = z.enum(["done", "partial"]);
const paymentStatus = z.enum(["dp", "full"]);
const shippingMethod = z.enum(["ekspedisi", "instant"]);
const shippingPaid = z.enum(["paid", "unpaid"]);
const orderStatus = z.enum(["done", "not_done"]);

const itemFields = z.object({
  itemName: z.string().min(1, "Nama barang wajib diisi"),
  purchaseStatus,
  qty: z.number().int().min(0),
  unitPrice: z.number().min(0),
  /** Kosongkan agar dihitung otomatis dari qty x harga satuan. */
  totalPrice: z.number().min(0).nullish(),
  modalPrice: z.number().min(0),
  kurs: z.number().min(0),
  dpAmount: z.number().min(0).default(0),
  address: z.string().nullish(),
  paymentStatus,
  shippingMethod,
  shippingCost: z.number().min(0),
  shippingPaid,
  orderStatus,
  notes: z.string().nullish(),
});

export const items = {
  list: authed.handler(() =>
    db.select().from(schema.orderItems).orderBy(asc(schema.orderItems.id)),
  ),

  create: authed
    .input(itemFields.extend({ clientId: z.number() }))
    .handler(async ({ input }) => {
      const [client] = await db
        .select()
        .from(schema.clients)
        .where(eq(schema.clients.id, input.clientId));
      if (!client) throw new ORPCError("NOT_FOUND", { message: "Client tidak ditemukan" });

      const totalPrice = computeTotal(input.qty, input.unitPrice, input.totalPrice);
      const [row] = await db
        .insert(schema.orderItems)
        .values({
          clientId: input.clientId,
          itemName: input.itemName.trim(),
          purchaseStatus: input.purchaseStatus,
          qty: input.qty,
          unitPrice: input.unitPrice,
          totalPrice,
          modalPrice: input.modalPrice,
          kurs: input.kurs,
          dpAmount: input.dpAmount,
          address: input.address ?? client.address ?? null,
          paymentStatus: input.paymentStatus,
          shippingMethod: input.shippingMethod,
          shippingCost: input.shippingCost,
          shippingPaid: input.shippingPaid,
          orderStatus: input.orderStatus,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .returning();
      return row;
    }),

  update: authed
    .input(itemFields.partial().extend({ id: z.number(), clientId: z.number().optional() }))
    .handler(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(schema.orderItems)
        .where(eq(schema.orderItems.id, input.id));
      if (!existing) throw new ORPCError("NOT_FOUND", { message: "Barang tidak ditemukan" });

      const qty = input.qty ?? existing.qty;
      const unitPrice = input.unitPrice ?? existing.unitPrice;
      const explicitTotal =
        input.totalPrice === undefined || input.totalPrice === null ? undefined : input.totalPrice;
      const totalPrice =
        explicitTotal !== undefined
          ? explicitTotal
          : input.qty !== undefined || input.unitPrice !== undefined
            ? computeTotal(qty, unitPrice, null)
            : existing.totalPrice;

      const [row] = await db
        .update(schema.orderItems)
        .set({
          ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
          ...(input.itemName !== undefined ? { itemName: input.itemName.trim() } : {}),
          ...(input.purchaseStatus !== undefined ? { purchaseStatus: input.purchaseStatus } : {}),
          qty,
          unitPrice,
          totalPrice,
          ...(input.modalPrice !== undefined ? { modalPrice: input.modalPrice } : {}),
          ...(input.kurs !== undefined ? { kurs: input.kurs } : {}),
          ...(input.dpAmount !== undefined ? { dpAmount: input.dpAmount } : {}),
          ...(input.address !== undefined ? { address: input.address ?? null } : {}),
          ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
          ...(input.shippingMethod !== undefined ? { shippingMethod: input.shippingMethod } : {}),
          ...(input.shippingCost !== undefined ? { shippingCost: input.shippingCost } : {}),
          ...(input.shippingPaid !== undefined ? { shippingPaid: input.shippingPaid } : {}),
          ...(input.orderStatus !== undefined ? { orderStatus: input.orderStatus } : {}),
          ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(schema.orderItems.id, input.id))
        .returning();
      return row;
    }),

  remove: authed.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(schema.orderItems).where(eq(schema.orderItems.id, input.id));
    return { ok: true };
  }),

  /** Client + barangnya + agregat per client, untuk tampilan grouped table. */
  board: authed.handler(async () => {
    const [clientRows, itemRows] = await Promise.all([
      db.select().from(schema.clients).orderBy(asc(schema.clients.name)),
      db.select().from(schema.orderItems).orderBy(asc(schema.orderItems.id)),
    ]);

    const groups = clientRows.map((client) => {
      const rows = itemRows
        .filter((item) => item.clientId === client.id)
        .map((item) => ({
          ...item,
          totalModal: computeTotalModal(item),
          profit: computeProfit(item),
        }));

      return {
        client,
        items: rows,
        summary: {
          itemCount: rows.length,
          qty: rows.reduce((sum, r) => sum + r.qty, 0),
          totalPrice: rows.reduce((sum, r) => sum + r.totalPrice, 0),
          modalPrice: rows.reduce((sum, r) => sum + r.modalPrice, 0),
          profit: rows.reduce((sum, r) => sum + r.profit, 0),
          dpAmount: rows.reduce((sum, r) => sum + r.dpAmount, 0),
          totalModal: rows.reduce((sum, r) => sum + r.totalModal, 0),
          shippingCost: rows.reduce((sum, r) => sum + r.shippingCost, 0),
          shippingUnpaid: rows.filter((r) => r.shippingPaid === "unpaid").length,
          pendingOrders: rows.filter((r) => r.orderStatus !== "done").length,
          pendingPurchase: rows.filter((r) => r.purchaseStatus !== "done").length,
          pendingPayment: rows.filter((r) => r.paymentStatus !== "full").length,
          uninvoiced: rows.filter((r) => r.invoiceId == null).length,
        },
      };
    });

    const allItems = groups.flatMap((g) => g.items);
    return {
      groups,
      totals: {
        clients: clientRows.length,
        items: allItems.length,
        profit: allItems.reduce((sum, r) => sum + r.profit, 0),
        revenue: allItems.reduce((sum, r) => sum + r.totalPrice, 0),
        dpAmount: allItems.reduce((sum, r) => sum + r.dpAmount, 0),
        pendingOrders: allItems.filter((r) => r.orderStatus !== "done").length,
        pendingPayment: allItems.filter((r) => r.paymentStatus !== "full").length,
        shippingUnpaid: allItems.filter((r) => r.shippingPaid === "unpaid").length,
      },
    };
  }),
};
