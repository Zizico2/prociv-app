import { collectionOptions, DbClient, Query } from '@tanstack/db';
import { QueryClient } from '@tanstack/query-core';
import { queryCollectionOptions } from '@tanstack/query-db-collection';
import type { Snapshot } from './occurrences';
export type Loader = (signal?: AbortSignal) => Promise<Snapshot[]>;
export const snapshotCollection = collectionOptions(
  'current-occurrences',
  (db) =>
    queryCollectionOptions({
      id: 'current-occurrences',
      queryClient: db.requireDependency<QueryClient>('queryClient'),
      queryKey: ['current-occurrences'],
      queryFn: ({ signal }) => db.requireDependency<Loader>('loader')(signal),
      getKey: (row: Snapshot) => row.id,
      staleTime: 60_000,
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
      retry: false,
    }),
);
export const snapshotQuery = () =>
  new Query().from({ snapshot: snapshotCollection });
export function createProcivDb(loader: Loader) {
  const queryClient = new QueryClient();
  return { db: new DbClient({ queryClient, loader }), queryClient };
}
