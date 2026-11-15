import { Heading } from '@astryxdesign/core/Heading';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Dashboard, HydratedDashboard } from '../components/dashboard';
import { createProcivDb, snapshotQuery } from '../lib/collections';
import { getSnapshot } from '../server/occurrences';

async function CurrentData() {
  await connection();
  try {
    const initial = await getSnapshot();
    const { db, queryClient } = createProcivDb(async () => [initial]);
    try {
      await db.preloadLiveQuery({ query: snapshotQuery() });
      return (
        <HydratedDashboard
          initial={initial}
          state={db.dehydrate({ shouldDehydrateCollection: () => false })}
        />
      );
    } finally {
      await db.cleanup();
      queryClient.clear();
    }
  } catch {
    return <Dashboard initial={null} />;
  }
}
export default function Page() {
  return (
    <Suspense
      fallback={
        <Stack padding={6} gap={3}>
          <Heading level={1}>Portugal, agora.</Heading>
          <Text>A consultar as ocorrências da ANEPC…</Text>
        </Stack>
      }
    >
      <CurrentData />
    </Suspense>
  );
}
