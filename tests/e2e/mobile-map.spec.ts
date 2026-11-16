import { expect, test } from '@playwright/test';

for (const hasTouch of [false, true]) {
  test.describe(`mobile map with ${hasTouch ? 'coarse' : 'fine'} pointer`, () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch });

    test('map fills the page; filters stay in a sheet and survive view changes', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      );
      await page.goto('/');
      const map = page.getByLabel('Mapa interativo das ocorrências da ANEPC');
      await expect(map).toBeVisible();
      await expect(page.getByRole('searchbox')).toBeHidden();
      await expect(
        page.getByRole('button', { name: 'Todas', exact: true }),
      ).toBeHidden();

      for (const viewport of [
        { width: 390, height: 844 },
        { width: 320, height: 568 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(viewport);
        await expect
          .poll(() =>
            map.evaluate((element) => {
              const box = element.getBoundingClientRect();
              const main = document
                .querySelector('[role="main"]')!
                .getBoundingClientRect();
              const footer = document
                .querySelector('footer')!
                .getBoundingClientRect();
              return (
                Math.abs(box.top - main.top) < 1 &&
                Math.abs(box.bottom - footer.top) < 1
              );
            }),
          )
          .toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const opener = page.getByRole('button', {
        name: 'Pesquisar e filtrar',
        exact: true,
      });
      await opener.click();
      const sheet = page.getByRole('dialog', { name: 'Filtrar ocorrências' });
      await expect(sheet).toBeVisible();
      await sheet.getByRole('searchbox').fill('porto');
      await expect(
        sheet.getByRole('button', { name: 'Ver 1 ocorrência' }),
      ).toBeVisible();
      await sheet.getByRole('button', { name: 'Ver 1 ocorrência' }).click();
      await page.getByRole('button', { name: 'Lista', exact: true }).click();
      const list = page.getByRole('complementary', {
        name: 'Lista de ocorrências',
      });
      await expect(list.getByRole('listitem')).toHaveCount(1);
      await page.getByRole('button', { name: /Pesquisar/ }).click();
      await expect(sheet.getByRole('searchbox')).toHaveValue('porto');
      await sheet.getByRole('button', { name: 'Limpar filtros' }).click();
      await expect(
        sheet.getByRole('button', { name: 'Ver 3 ocorrências' }),
      ).toBeVisible();
      await sheet.getByRole('button', { name: 'Fechar filtros' }).click();
      await expect(
        page.getByRole('button', { name: 'Pesquisar e filtrar', exact: true }),
      ).toBeFocused();
      await page.getByRole('button', { name: 'Mapa', exact: true }).click();
      await expect(map).toBeVisible();
    });

    test('refresh, stale-data and tile warnings never shrink the map', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      );
      await page.goto('/');
      const map = page.getByLabel('Mapa interativo das ocorrências da ANEPC');
      await expect(map).toBeVisible();
      const before = await map.boundingBox();
      const snapshot = await (
        await page.request.get('/api/occurrences')
      ).json();
      await page.route('**/api/occurrences', (route) =>
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: '{"error":"test outage"}',
        }),
      );
      await page
        .getByRole('button', { name: 'Atualizar', exact: true })
        .click();
      await page.getByRole('button', { name: 'Avisos sobre os dados' }).click();
      const status = page.getByRole('dialog', {
        name: 'Avisos sobre os dados',
      });
      await expect(
        status.getByText(
          'A atualização falhou. Mantivemos a última informação disponível.',
        ),
      ).toBeVisible();
      await expect(
        status.getByText(/O fundo do mapa está indisponível/),
      ).toBeVisible();
      await status.getByRole('button', { name: 'Fechar aviso' }).click();
      await expect
        .poll(async () => (await map.boundingBox())?.height)
        .toBe(before!.height);

      await page.unroute('**/api/occurrences');
      await page.route('**/api/occurrences', (route) =>
        route.fulfill({
          json: { ...snapshot, sourceUpdatedAt: '2000-01-01T00:00:00Z' },
        }),
      );
      await page
        .getByRole('button', { name: 'Atualizar', exact: true })
        .click();
      await page.getByRole('button', { name: 'Avisos sobre os dados' }).click();
      await expect(
        status.getByText(/A fonte está desatualizada/),
      ).toBeVisible();
      await status.getByRole('button', { name: 'Fechar aviso' }).click();
      await expect
        .poll(async () => (await map.boundingBox())?.height)
        .toBe(before!.height);
      expect(
        await page.getByRole('main').evaluate((main) => {
          main.scrollTop = 100;
          return main.scrollTop;
        }),
      ).toBe(0);
    });
  });
}
