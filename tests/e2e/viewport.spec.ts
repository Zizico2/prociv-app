import { expect, test } from '@playwright/test';

for (const hasTouch of [false, true]) {
  test.describe(`viewport with ${hasTouch ? 'coarse' : 'fine'} pointer`, () => {
    test.use({ hasTouch });

    test('dashboard fits below the header and keeps attribution on one line', async ({
      page,
    }) => {
      await page.route('https://tile.openstreetmap.org/**', (route) =>
        route.abort(),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await expect(
        page.getByLabel('Mapa interativo das ocorrências da ANEPC'),
      ).toBeVisible();

      // Resize the live page as browser chrome expands/contracts, then rotate.
      for (const viewport of [
        { width: 390, height: 844 },
        { width: 390, height: 650 },
        { width: 320, height: 568 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(viewport);
        for (const view of ['Mapa', 'Lista']) {
          const toggle = page.getByRole('button', { name: view, exact: true });
          if (await toggle.isVisible()) await toggle.click();
          await expect
            .poll(() =>
              page.getByRole('main').evaluate((main) => {
                main.scrollTop = 100;
                document.documentElement.scrollTop = 100;
                const footer = main
                  .querySelector('footer')!
                  .getBoundingClientRect();
                return {
                  mainScroll: main.scrollTop,
                  pageScroll: window.scrollY,
                  overflow: main.scrollHeight - main.clientHeight,
                  footerFits: footer.bottom <= window.innerHeight + 1,
                };
              }),
            )
            .toEqual({
              mainScroll: 0,
              pageScroll: 0,
              overflow: 0,
              footerFits: true,
            });
        }

        const source = page.getByRole('link', { name: /Fonte ANEPC/ });
        await expect(source).toHaveAttribute('target', '_blank');
        const alignment = await source.evaluate((link) => {
          const label = link.firstElementChild!.getBoundingClientRect();
          const icon = link.querySelector('svg')!.getBoundingClientRect();
          return {
            sameLine:
              Math.abs(
                (label.top + label.bottom - icon.top - icon.bottom) / 2,
              ) < 2,
            withinViewport: link.getBoundingClientRect().right <= innerWidth,
          };
        });
        expect(alignment).toEqual({ sameLine: true, withinViewport: true });
      }
    });
  });
}
