import { describe, expect, it } from 'vitest';
import {
  category,
  filterOccurrences,
  type Occurrence,
  resourceTotal,
} from '../../src/lib/occurrences';

const row = (values: Partial<Occurrence>): Occurrence => ({
  id: 'x',
  number: null,
  status: null,
  groupedStatus: null,
  natureCode: null,
  nature: null,
  region: null,
  subRegion: null,
  municipality: null,
  parish: null,
  locality: null,
  address: null,
  latitude: null,
  longitude: null,
  personnel: null,
  groundVehicles: null,
  aircraft: null,
  startedAt: null,
  sourceUpdatedAt: null,
  ...values,
});
describe('display semantics', () => {
  it('searches accents, municipality, nature and number together', () => {
    const r = row({ municipality: 'Évora', nature: 'Despiste', number: '123' });
    expect(filterOccurrences([r], 'evora 123', 'all', '', '')).toEqual([r]);
    expect(filterOccurrences([r], 'Lisboa', 'all', '', '')).toEqual([]);
  });
  it('keeps rural and urban fires together but accidents separate', () => {
    for (const n of [2101, 2201, 2301, 3101, 3111, 4335])
      expect(category(row({ natureCode: n }))).toBe('fire');
    expect(category(row({ natureCode: 2407 }))).toBe('accident');
    expect(category(row({ natureCode: 9999 }))).toBe('other');
  });
  it('distinguishes missing resource counts, zero, and partial totals', () => {
    expect(resourceTotal([row({})], 'personnel')).toBe('—');
    expect(resourceTotal([row({ personnel: 0 })], 'personnel')).toBe('0');
    expect(resourceTotal([row({ personnel: 2 }), row({})], 'personnel')).toBe(
      '2+',
    );
  });
});
