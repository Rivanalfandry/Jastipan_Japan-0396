import type { RouterClient } from "@orpc/server";
import { createApp } from "./__core/app";
import { ping } from "./routes/ping";
import { clients } from "./routes/clients";
import { items } from "./routes/items";
import { invoice, getSettings } from "./routes/invoice";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "./lib/s3";
import { auth } from "./auth";

export const router = {
  ping,
  clients,
  items,
  invoice,
};

export type AppRouter = typeof router;
/** Typed client for the router — used by the web and mobile api clients. */
export type AppRouterClient = RouterClient<AppRouter>;

const app = createApp(router);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Logo invoice disajikan dari origin sendiri supaya bisa ikut dirender ke PDF tanpa masalah CORS.
app.get("/api/invoice-logo", async (c) => {
  const settings = await getSettings();
  if (!settings.logoKey) return c.body(null, 404);
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: settings.logoKey }));
    const bytes = await obj.Body!.transformToByteArray();
    return c.body(bytes, 200, {
      "Content-Type": obj.ContentType ?? "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
  } catch {
    return c.body(null, 404);
  }
});

export default app;
