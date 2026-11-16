import { expect, test } from '@playwright/test';

test('current snapshot, search, category filters, missing points and details', async ({
  page,
  isMobile,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Keep this suite offline; live OSM tiles are checked separately in browser QA.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
        'base64',
      ),
    }),
  );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Portugal, agora.' }),
  ).toBeVisible();
  await expect(
    page.getByLabel('Mapa interativo das ocorrências da ANEPC'),
  ).toBeVisible();
  if (isMobile) {
    await expect
      .poll(() =>
        page.evaluate(() => {
          const button = [...document.querySelectorAll('button')].find(
            (element) => element.textContent?.trim() === 'Todas',
          );
          return button
            ? getComputedStyle(button)
                .getPropertyValue('--astryx-hit-inset-bottom')
                .trim()
            : '';
        }),
      )
      .not.toBe('');
    const scrolling = await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find(
        (element) => element.textContent?.trim() === 'Todas',
      );
      let row = button?.parentElement ?? null;
      while (row && getComputedStyle(row).overflowX !== 'auto')
        row = row.parentElement;
      if (!row) return { vertical: -1, horizontal: 0 };
      row.scrollTop = 100;
      const vertical = row.scrollTop;
      row.scrollLeft = row.scrollWidth;
      const horizontal = row.scrollLeft;
      row.scrollLeft = 0;
      return { vertical, horizontal };
    });
    expect(scrolling.vertical).toBe(0);
    expect(scrolling.horizontal).toBeGreaterThan(0);
  }
  if (isMobile)
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
  const list = page.getByRole('complementary', {
    name: 'Lista de ocorrências',
  });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(
    list.getByText('1 sem localização no mapa', { exact: false }),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('evora');
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await list.getByRole('button', { name: /Évora/ }).click();
  await expect(
    page.getByText('Esta ocorrência não tem coordenadas publicadas.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Clear Pesquisar ocorrências' })
    .click();
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await page.getByRole('button', { name: 'Incêndios', exact: true }).click();
  await expect(list.getByRole('listitem')).toHaveCount(1);
  await list.getByRole('button', { name: /Santarém/ }).click();
  await expect(page.getByText('N.º 20260001', { exact: false })).toBeVisible();
  await expect(page).toHaveURL(/oc=fire-1/);
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  await page.getByRole('searchbox').fill('zzzz');
  await expect(
    page.getByRole('heading', { name: 'Nenhuma ocorrência encontrada' }),
  ).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  expect(errors).toEqual([]);
});
test('failed refresh retains the last snapshot', async ({ page, isMobile }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Atualizar', exact: true }),
  ).toBeVisible();
  if (isMobile)
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
  const list = page.getByRole('complementary', {
    name: 'Lista de ocorrências',
  });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await page.route('**/api/occurrences', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"fixture outage"}',
    }),
  );
  if (isMobile)
    await page.getByRole('button', { name: 'Atualizar', exact: true }).tap();
  else
    await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(
    page.getByText(
      'A atualização falhou. Mantivemos a última informação disponível.',
    ),
  ).toBeVisible();
  await expect(list.getByRole('listitem')).toHaveCount(3);
});
test('deep links select a current occurrence', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/?oc=accident-1');
  await expect(page.getByText('N.º 20260002', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await expect(page).not.toHaveURL(/oc=/);
});
