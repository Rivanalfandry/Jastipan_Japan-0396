import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orpc } from "../lib/api";

export type Board = Awaited<ReturnType<typeof orpc.items.board.call>>;
export type BoardGroup = Board["groups"][number];
export type BoardItem = BoardGroup["items"][number];

export function useBoard() {
  return useQuery(orpc.items.board.queryOptions());
}

function useInvalidateBoard() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: orpc.items.key() });
    void queryClient.invalidateQueries({ queryKey: orpc.clients.key() });
  };
}

export function useCreateClient() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.clients.create.mutationOptions({ onSuccess: invalidate }));
}

export function useUpdateClient() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.clients.update.mutationOptions({ onSuccess: invalidate }));
}

export function useRemoveClient() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.clients.remove.mutationOptions({ onSuccess: invalidate }));
}

export function useCreateItem() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.items.create.mutationOptions({ onSuccess: invalidate }));
}

export function useUpdateItem() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.items.update.mutationOptions({ onSuccess: invalidate }));
}

export function useRemoveItem() {
  const invalidate = useInvalidateBoard();
  return useMutation(orpc.items.remove.mutationOptions({ onSuccess: invalidate }));
}
