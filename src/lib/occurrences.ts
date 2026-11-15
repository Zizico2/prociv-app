export type Category = 'all' | 'fire' | 'accident' | 'assistance' | 'other';
export interface Occurrence {
  id: string;
  number: string | null;
  status: string | null;
  groupedStatus: string | null;
  natureCode: number | null;
  nature: string | null;
  region: string | null;
  subRegion: string | null;
  municipality: string | null;
  parish: string | null;
  locality: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  personnel: number | null;
  groundVehicles: number | null;
  aircraft: number | null;
  startedAt: string | null;
  sourceUpdatedAt: string | null;
}
export interface Snapshot {
  id: 'current';
  occurrences: Occurrence[];
  fetchedAt: string | null;
  sourceUpdatedAt: string | null;
  attribution: string;
}
export function category(row: Occurrence): Exclude<Category, 'all'> {
  const n = row.natureCode;
  if (
    n != null &&
    ((n >= 2100 && n < 2400) || (n >= 3100 && n < 3200) || n === 4335)
  )
    return 'fire';
  if (n != null && n >= 2400 && n < 2600) return 'accident';
  if (n != null && n >= 4000 && n < 4400) return 'assistance';
  return 'other';
}
export const categoryLabels = {
  all: 'Todas',
  fire: 'Incêndios',
  accident: 'Acidentes',
  assistance: 'Assistência',
  other: 'Outras',
};
export function natureLabel(row: Occurrence) {
  return row.nature?.replace(/^\d+\s*-\s*/, '') || 'Natureza não indicada';
}
export function normalized(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}
export function filterOccurrences(
  rows: Occurrence[],
  search: string,
  kind: Category,
  region: string,
  status: string,
) {
  const words = normalized(search).trim().split(/\s+/);
  return rows
    .filter(
      (row) =>
        (kind === 'all' || category(row) === kind) &&
        (!region || row.region === region) &&
        (!status || row.groupedStatus === status) &&
        words.every((word) =>
          normalized(
            [
              row.municipality,
              row.locality,
              row.parish,
              row.nature,
              row.number,
            ].join(' '),
          ).includes(word),
        ),
    )
    .toSorted(
      (a, b) =>
        (b.startedAt ?? '').localeCompare(a.startedAt ?? '') ||
        a.id.localeCompare(b.id),
    );
}
export function hasPoint(
  row: Occurrence,
): row is Occurrence & { latitude: number; longitude: number } {
  return (
    row.latitude != null &&
    row.longitude != null &&
    Number.isFinite(row.latitude) &&
    Number.isFinite(row.longitude) &&
    Math.abs(row.latitude) <= 90 &&
    Math.abs(row.longitude) <= 180
  );
}
export function dateTime(value: string | null, date = false) {
  if (!value) return 'Não indicado';
  return new Intl.DateTimeFormat('pt-PT', {
    ...(date ? ({ day: '2-digit', month: 'short' } as const) : {}),
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(value));
}
export function resourceTotal(
  rows: Occurrence[],
  key: 'personnel' | 'groundVehicles' | 'aircraft',
) {
  if (!rows.length) return '0';
  const available = rows.filter((r) => r[key] != null);
  if (!available.length) return '—';
  return `${available.reduce((n, r) => n + (r[key] ?? 0), 0).toLocaleString('pt-PT')}${available.length < rows.length ? '+' : ''}`;
}
