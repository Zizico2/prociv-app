import 'server-only';
import type { Timestamp } from '@bufbuild/protobuf/wkt';
import { timestampDate } from '@bufbuild/protobuf/wkt';
import { createClient } from '@connectrpc/connect';
import { createGrpcTransport } from '@connectrpc/connect-node';
import type { Snapshot } from '../lib/occurrences';
import { OccurrencesService } from './gen/prociv/v1/occurrences_pb';

const iso = (value?: Timestamp) =>
  value ? timestampDate(value).toISOString() : null;
export async function getSnapshot(): Promise<Snapshot> {
  const url = process.env.PROCIV_GRPC_URL ?? 'http://127.0.0.1:50102';
  const client = createClient(
    OccurrencesService,
    createGrpcTransport({ baseUrl: url }),
  );
  const data = await client.listOccurrences({}, { timeoutMs: 20_000 });
  return {
    id: 'current',
    fetchedAt: iso(data.fetchedAt),
    sourceUpdatedAt: iso(data.sourceUpdatedAt),
    attribution: data.attribution,
    occurrences: data.occurrences.map((r) => ({
      id: r.id,
      number: r.number ?? null,
      status: r.status ?? null,
      groupedStatus: r.groupedStatus ?? null,
      natureCode: r.natureCode ?? null,
      nature: r.nature ?? null,
      region: r.region ?? null,
      subRegion: r.subRegion ?? null,
      municipality: r.municipality ?? null,
      parish: r.parish ?? null,
      locality: r.locality ?? null,
      address: r.address ?? null,
      latitude: r.latitude ?? null,
      longitude: r.longitude ?? null,
      personnel: r.personnel ?? null,
      groundVehicles: r.groundVehicles ?? null,
      aircraft: r.aircraft ?? null,
      startedAt: iso(r.startedAt),
      sourceUpdatedAt: iso(r.sourceUpdatedAt),
    })),
  };
}
