import { expect, test } from '@playwright/test';

test('shared coordinates stay discoverable at maximum zoom and each record is selectable', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  const snapshot = await (await page.request.get('/api/occurrences')).json();
  const fire = snapshot.occurrences.find(
    (row: { id: string }) => row.id === 'fire-1',
  );
  const crash = snapshot.occurrences.find(
    (row: { id: string }) => row.id === 'accident-1',
  );
  Object.assign(crash, { latitude: fire.latitude, longitude: fire.longitude });
  await page.route('**/api/occurrences', (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  const map = page.getByLabel('Mapa interativo das ocorrências da ANEPC');
  const badge = map.getByRole('button', {
    name: '2 ocorrências neste local',
    exact: true,
  });
  await expect(badge).toBeVisible();
  await expect(badge.locator('.pulso-shared-count')).toHaveText('2');
  await expect(badge.locator('.pulso-cluster')).toHaveCount(0);
  await expect(badge).toHaveAttribute('title', 'Ver 2 ocorrências neste local');
  await badge.focus();
  await page.keyboard.press('Enter');
  const chooser = page.getByRole('region', {
    name: '2 ocorrências neste local',
  });
  await expect(chooser).toBeVisible();
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(2);
  await expect(map.getByRole('button', { name: /Santarém/ })).toBeVisible();
  await expect(map.getByRole('button', { name: /Porto/ })).toBeVisible();
  await expect(chooser.getByRole('button', { name: /Mato/ })).toContainText(
    'Em Curso',
  );
  await expect(chooser.getByRole('button', { name: /Despiste/ })).toContainText(
    'Em Despacho',
  );
  await chooser.getByRole('button', { name: /Despiste/ }).click();
  await expect(page.getByText(/N.º 20260002 · Fonte às/)).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await expect(chooser).toBeVisible();
  await map.getByRole('button', { name: /Santarém/ }).click();
  await expect(page.getByText(/N.º 20260001 · Fonte às/)).toBeVisible();
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await chooser
    .getByRole('button', { name: 'Fechar ocorrências neste local' })
    .click();
  await expect(chooser).toHaveCount(0);
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
  for (let i = 0; i < 20; i++) {
    const zoom = map.getByRole('button', { name: 'Zoom in' });
    if ((await zoom.getAttribute('aria-disabled')) === 'true') break;
    const proxy = map.locator('.leaflet-proxy');
    const before = await proxy.getAttribute('style');
    await zoom.click();
    await expect(proxy).not.toHaveAttribute('style', before!);
    await expect(map.locator('.leaflet-map-pane')).not.toHaveClass(
      /leaflet-zoom-anim/,
    );
    await expect(badge).toBeVisible();
  }
  await expect(map.getByRole('button', { name: 'Zoom in' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await badge.click();
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(2);
  await expect(chooser).toBeVisible();
  await chooser.getByRole('button', { name: /Mato/ }).focus();
  await page.keyboard.press('Escape');
  await expect(chooser).toHaveCount(0);
  // A refreshed snapshot must not leave a stale chooser or displaced markers.
  await badge.click();
  crash.longitude += 1;
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(chooser).toHaveCount(0);
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
  await expect(badge).toHaveCount(0);
});
