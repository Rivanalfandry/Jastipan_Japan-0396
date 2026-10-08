import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

const clientInput = z.object({
  name: z.string().min(1, "Nama client wajib diisi"),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  notes: z.string().nullish(),
});

export const clients = {
  list: authed.handler(() => db.select().from(schema.clients).orderBy(asc(schema.clients.name))),

  create: authed.input(clientInput).handler(async ({ input }) => {
    const [row] = await db
      .insert(schema.clients)
      .values({
        name: input.name.trim(),
        phone: input.phone ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return row;
  }),

  update: authed
    .input(clientInput.partial().extend({ id: z.number() }))
    .handler(async ({ input }) => {
      const { id, ...rest } = input;
      const [row] = await db
        .update(schema.clients)
        .set({
          ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
          ...(rest.phone !== undefined ? { phone: rest.phone ?? null } : {}),
          ...(rest.address !== undefined ? { address: rest.address ?? null } : {}),
          ...(rest.notes !== undefined ? { notes: rest.notes ?? null } : {}),
        })
        .where(eq(schema.clients.id, id))
        .returning();
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Client tidak ditemukan" });
      return row;
    }),

  remove: authed.input(z.object({ id: z.number() })).handler(async ({ input }) => {
    await db.delete(schema.orderItems).where(eq(schema.orderItems.clientId, input.id));
    await db.delete(schema.clients).where(eq(schema.clients.id, input.id));
    return { ok: true };
  }),
};
