import { Hono } from 'hono';
import { getSnapshot } from './occurrences';
export const api = new Hono()
  .basePath('/api')
  .get('/occurrences', async (c) => c.json(await getSnapshot()))
  .onError((error, c) => {
    console.error('Current ANEPC snapshot unavailable', error);
    return c.json(
      { error: 'Não foi possível atualizar as ocorrências. Tente novamente.' },
      503,
    );
  });
export type ProcivApi = typeof api;
