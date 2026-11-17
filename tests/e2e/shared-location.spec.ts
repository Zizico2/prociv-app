import { expect, type Page, test } from '@playwright/test';

async function openSharedLocation(page: Page, count = 2) {
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
  for (let index = 2; index < count; index++) {
    snapshot.occurrences.push({
      ...crash,
      id: `shared-${index}`,
      number: 20260100 + index,
    });
  }
  await page.route('**/api/occurrences', (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  return { crash, snapshot };
}

test('selecting another occurrence closes the shared-location chooser', async ({
  page,
}) => {
  const { snapshot } = await openSharedLocation(page);
  const other = snapshot.occurrences.find(
    (row: { id: string }) => row.id === 'missing-1',
  );
  Object.assign(other, { latitude: 41.15, longitude: -8.61 });
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  const map = page.getByLabel('Mapa interativo das ocorrências da ANEPC');
  const badge = map.getByRole('button', {
    name: '2 ocorrências neste local',
    exact: true,
  });
  const chooser = page.getByRole('region', {
    name: '2 ocorrências neste local',
  });
  const marker = map.getByRole('button', { name: 'Évora: Outra', exact: true });

  for (const activation of ['click', 'Enter', 'Space']) {
    await badge.click();
    await expect(chooser).toBeVisible();
    await expect(map.locator('.pulso-spider-leg')).toHaveCount(2);
    if (activation === 'click') await marker.click();
    else {
      await marker.focus();
      await page.keyboard.press(activation);
    }
    await expect(page.getByText(/N.º 20260003 · Fonte às/)).toBeVisible();
    await expect(chooser).toHaveCount(0);
    await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
    await expect(badge).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await expect(chooser).toHaveCount(0);
  }
  await badge.click();
  await expect(chooser).toBeVisible();
  await map.click({ position: { x: 5, y: 5 } });
  await expect(chooser).toHaveCount(0);
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
});

for (const count of [2, 12]) {
  test(`compact shared-location chooser with ${count} records stays clear of map controls and attribution`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 412, height: 839 });
    await openSharedLocation(page, count);
    const map = page.getByLabel('Mapa interativo das ocorrências da ANEPC');
    await map
      .getByRole('button', {
        name: `${count} ocorrências neste local`,
        exact: true,
      })
      .click();
    const chooser = page.getByRole('region', {
      name: `${count} ocorrências neste local`,
    });
    const controls = page
      .getByRole('button', {
        name: /^(Lista|Atualizar|Avisos sobre os dados|Pesquisar e filtrar|Enquadrar ocorrências|A minha localização|Zoom in|Zoom out)$/,
      })
      .or(map.locator('.leaflet-control-attribution'));

    for (const viewport of [
      { width: 412, height: 839 },
      { width: 390, height: 650 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(chooser).toBeVisible();
      for (const control of await controls.all()) {
        if (!(await control.isVisible())) continue;
        await expect
          .poll(
            async () => {
              const panel = (await chooser.boundingBox())!;
              const target = (await control.boundingBox())!;
              return (
                panel.x < target.x + target.width &&
                panel.x + panel.width > target.x &&
                panel.y < target.y + target.height &&
                panel.y + panel.height > target.y
              );
            },
            {
              message: `Chooser overlaps ${await control.textContent()} at ${viewport.width}×${viewport.height}`,
            },
          )
          .toBe(false);
      }
      const last = chooser.getByRole('button', { name: /Despiste/ }).last();
      await last.scrollIntoViewIfNeeded();
      // A visible row must also receive pointer input, including after scrolling.
      await last.click({ trial: true });
    }
    await chooser
      .getByRole('button', { name: /Despiste/ })
      .last()
      .click();
    await expect(
      page.getByRole('button', { name: 'Fechar detalhes' }),
    ).toBeVisible();
  });
}

test('shared coordinates stay discoverable at maximum zoom and each record is selectable', async ({
  page,
}) => {
  const { crash } = await openSharedLocation(page);
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
  await expect(chooser).toHaveCount(0);
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar detalhes' }).click();
  await badge.click();
  await expect(chooser).toBeVisible();
  await chooser
    .getByRole('button', { name: 'Fechar ocorrências neste local' })
    .click();
  await expect(chooser).toHaveCount(0);
  await expect(map.locator('.pulso-spider-leg')).toHaveCount(0);
  // Selection preserves the map view; explicitly center the maximum-zoom check.
  await page.getByRole('button', { name: 'Enquadrar ocorrências' }).click();
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
