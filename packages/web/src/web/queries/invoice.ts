import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, orpc } from "../lib/api";

export type InvoiceData = Awaited<ReturnType<typeof client.invoice.get>>;
export type InvoiceOverview = Awaited<ReturnType<typeof client.invoice.overview>>;
export type InvoiceSettings = Awaited<ReturnType<typeof client.invoice.settings>>;

export function useInvoiceSettings() {
  return useQuery(orpc.invoice.settings.queryOptions());
}

export function useInvoiceOverview(clientId: number) {
  return useQuery(orpc.invoice.overview.queryOptions({ input: { clientId } }));
}

export function useInvoice(id: number | null) {
  return useQuery({
    ...orpc.invoice.get.queryOptions({ input: { id: id ?? 0 } }),
    enabled: id != null,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.invoice.create.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.invoice.key() }),
    }),
  );
}

export function useRemoveInvoice() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.invoice.remove.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.invoice.key() }),
    }),
  );
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient();
  return useMutation(
    orpc.invoice.updateSettings.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.invoice.key() }),
    }),
  );
}

/** Upload logo langsung ke storage via presigned URL, kembalikan key-nya. */
export async function uploadLogo(file: File) {
  const { url, key } = await client.invoice.presignLogo({
    filename: file.name,
    contentType: file.type,
  });
  const res = await fetch(url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("Upload logo gagal");
  return key;
}
