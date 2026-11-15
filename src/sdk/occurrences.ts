import { hc } from 'hono/client';
import type { Snapshot } from '../lib/occurrences';
import type { ProcivApi } from '../server/api';

const client = hc<ProcivApi>('/');
export async function loadSnapshot(signal?: AbortSignal): Promise<Snapshot[]> {
  const response = await client.api.occurrences.$get({}, { init: { signal } });
  if (!response.ok) throw new Error('Ocorrências indisponíveis');
  return [await response.json()];
}
