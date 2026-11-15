import { createServer } from 'node:http2';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { OccurrencesService } from '../../src/server/gen/prociv/v1/occurrences_pb';

const time = () => timestampFromDate(new Date());
const server = createServer(
  connectNodeAdapter({
    routes(router) {
      router.service(OccurrencesService, {
        ping: () => ({ message: 'fixture ready' }),
        listOccurrences: () => ({
          fetchedAt: time(),
          sourceUpdatedAt: time(),
          attribution: 'Fonte: ANEPC (test fixture)',
          occurrences: [
            {
              id: 'fire-1',
              number: '20260001',
              municipality: 'Santarém',
              locality: 'Alcanede',
              parish: 'Alcanede',
              natureCode: 3101,
              nature: '3101 - Mato',
              groupedStatus: 'Em Curso',
              status: 'Em Curso',
              latitude: 39.41,
              longitude: -8.79,
              region: 'Lisboa e Vale do Tejo',
              personnel: 0,
              groundVehicles: 0,
              aircraft: 0,
              startedAt: time(),
              sourceUpdatedAt: time(),
            },
            {
              id: 'accident-1',
              number: '20260002',
              municipality: 'Porto',
              locality: 'Campanhã',
              natureCode: 2407,
              nature: '2407 - Despiste',
              groupedStatus: 'Em Despacho',
              latitude: 41.15,
              longitude: -8.61,
              region: 'Norte',
              personnel: 12,
              groundVehicles: 4,
              startedAt: time(),
              sourceUpdatedAt: time(),
            },
            {
              id: 'missing-1',
              number: '20260003',
              municipality: 'Évora',
              natureCode: 9900,
              nature: '9900 - Outra',
              groupedStatus: 'Em Conclusão',
              region: 'Alentejo',
              startedAt: time(),
            },
          ],
        }),
      });
    },
  }),
);
server.listen(50111, '127.0.0.1', () => console.log('gRPC fixture ready'));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => server.close(() => process.exit(0)));
