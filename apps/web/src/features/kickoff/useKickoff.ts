import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { KickoffItemData, KickoffKind } from "@frckickoff/shared";
import { useTRPC } from "../../lib/trpc";

/** Everyone on kickoff day edits the same board from their own phone/laptop — poll so changes show up. */
export const POLL_MS = 4000;

export interface Item<K extends KickoffKind = KickoffKind> {
  id: string;
  data: Extract<KickoffItemData, { kind: K }>;
}

export function useKickoff(workspace: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const itemsKey = trpc.kickoff.items.queryKey({ workspace });

  const itemsQuery = useQuery({ ...trpc.kickoff.items.queryOptions({ workspace }), refetchInterval: POLL_MS });
  const items = itemsQuery.data ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: itemsKey });
  const createMutation = useMutation(trpc.kickoff.create.mutationOptions({ onSuccess: invalidate }));
  const deleteMutation = useMutation(trpc.kickoff.delete.mutationOptions({ onSuccess: invalidate }));
  const updateMutation = useMutation(
    trpc.kickoff.update.mutationOptions({
      // Apply edits locally right away so the 4s poll can't briefly flash the old value back.
      onMutate: async (vars) => {
        await queryClient.cancelQueries({ queryKey: itemsKey });
        queryClient.setQueryData(itemsKey, (old) => old?.map((it) => (it.id === vars.id ? { ...it, data: vars.data } : it)));
      },
      onSettled: invalidate,
    }),
  );

  function of<K extends KickoffKind>(kind: K): Item<K>[] {
    return items.filter((it): it is typeof it & { data: Extract<KickoffItemData, { kind: K }> } => it.data.kind === kind);
  }

  const error = itemsQuery.error ?? createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  return {
    loading: itemsQuery.isLoading,
    error,
    isEmpty: itemsQuery.isSuccess && items.length === 0,
    of,
    create: (data: KickoffItemData) => createMutation.mutate({ workspace, data }),
    update: <K extends KickoffKind>(item: Item<K>, patch: Partial<Extract<KickoffItemData, { kind: K }>>) =>
      updateMutation.mutate({ id: item.id, data: { ...item.data, ...patch } }),
    remove: (id: string) => deleteMutation.mutate({ id }),
  };
}

export type KickoffApi = ReturnType<typeof useKickoff>;
