import { expect, test } from '@playwright/test';

test('deployed app and native gRPC boundary are available', async ({
  page,
  request,
  isMobile,
}) => {
  const response = await request.get('/api/occurrences');
  expect(response.ok()).toBeTruthy();
  const snapshot = await response.json();
  expect(snapshot.id).toBe('current');
  expect(Array.isArray(snapshot.occurrences)).toBeTruthy();
  await page.goto('/');
  if (isMobile)
    await expect(
      page.getByRole('heading', { name: 'Portugal, agora.' }),
    ).toBeAttached();
  else
    await expect(
      page.getByRole('heading', { name: 'Portugal, agora.' }),
    ).toBeVisible();
  await expect(
    page.getByLabel('Mapa interativo das ocorrências da ANEPC'),
  ).toBeVisible();
  if (isMobile)
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Ocorrências', exact: true }),
  ).toBeVisible();
});
