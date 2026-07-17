import { expect, test, type Page } from '@playwright/test';

const legacyRoutes = ['/', '/index.html', '/notes.html', '/about.html', '/playground.html', '/posts/atomic-physics-ch2.html', '/posts/sturm-liouville.html'];

test('legacy routes and primary navigation remain available', async ({ page }) => {
  for (const route of legacyRoutes) {
    const response = await page.goto(route);
    expect(response?.ok(), route).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  }
  await page.goto('/index.html');
  await page.getByRole('link', { name: 'Notes', exact: true }).click(); await expect(page).toHaveURL(/notes\.html$/);
  await page.getByRole('link', { name: 'About', exact: true }).click(); await expect(page).toHaveURL(/about\.html$/);
  await page.getByRole('link', { name: 'Playground', exact: true }).click(); await expect(page).toHaveURL(/playground\.html$/);
});

test('foundation experiments switch and expose their core actions', async ({ page }) => {
  await page.goto('/playground.html?seed=123');
  await expect(page.getByRole('button', { name: 'Launch' })).toBeVisible();
  await page.getByRole('tab', { name: /Double pendulum/ }).click();
  await expect(page.locator('#experiment-name')).toHaveText('Double pendulum chaos');
  await expect(page.getByRole('button', { name: 'Nearby initial state' })).toBeVisible();
  await page.getByRole('tab', { name: /Wave lab/ }).click();
  await expect(page.locator('#experiment-name')).toHaveText('Wave & interference lab');
  await expect(page.getByLabel('Wave sources')).toBeVisible();
  await page.getByRole('tab', { name: /Projectile/ }).click();
  await expect(page.locator('#experiment-name')).toHaveText('Projectile target');
});

test('electromagnetism atlas exposes all field views and recomputes after drag', async ({ page }) => {
  await page.goto('/playground.html?experiment=electromagnetism');
  await expect(page.getByLabel('Experiment category')).toHaveValue('Electromagnetism / 电磁学');
  await expect(page.locator('#experiment-name')).toHaveText('Electric field & potential atlas');
  await expect(page.getByLabel('Charge preset')).toHaveValue('dipole');
  await page.getByLabel('Source mobility').selectOption('fixed');
  await expect(page.locator('#physics-data')).toContainText('Fixed');
  await page.getByLabel('Source mobility').selectOption('movable');
  const rendering = page.getByLabel('Rendering mode');
  for (const mode of ['arrows', 'lines', 'contours', 'magnitude', 'tracers', 'flux']) {
    await rendering.selectOption(mode);
    await expect(page.locator('#physics-data')).toContainText(mode === 'flux' ? '2-D line flux' : 'Rendering');
  }
  await page.getByLabel('Charge preset').selectOption('quadrupole');
  await expect(page.locator('#physics-data')).not.toContainText('NaN');
  const canvas = page.locator('#physics-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await rendering.selectOption('arrows');
  await canvas.click({ position: { x: box!.width * .56, y: box!.height * .64 } });
  await expect(page.locator('#experiment-status')).toContainText('High-precision field recomputed');
  await expect(page.locator('#experiment-details')).toContainText('singular exclusion region');
});

test('continuous-charge atlas compares all seven distributions without non-finite output', async ({ page }) => {
  await page.goto('/playground.html?experiment=electromagnetism-continuous-charge');
  await expect(page.locator('#experiment-name')).toHaveText('Continuous charge distributions');
  const distribution = page.locator('[data-control="distribution"]');
  for (const kind of ['rod', 'ring', 'disk', 'infinite-line', 'infinite-plane', 'spherical-shell', 'uniform-sphere']) {
    await test.step(kind, async () => {
      await distribution.selectOption(kind, { timeout: 5_000 });
      await expect(page.locator('#physics-data')).toContainText('Relative error');
      await expect(page.locator('#physics-data')).not.toContainText(/NaN|Infinity/);
    });
  }
  await distribution.selectOption('ring');
  await page.getByRole('button', { name: 'Move probe off axis' }).click();
  await expect(page.locator('#physics-data')).toContainText('axis-only formula');
  await expect(page.locator('#experiment-details')).toContainText('Seven distributions');
});

test('Gauss-law atlas separates universal flux from symmetry and 2-D diagnostics', async ({ page }) => {
  await page.goto('/playground.html?experiment=electromagnetism-gauss-law');
  await expect(page.locator('#experiment-name')).toHaveText('Gauss law & symmetry');
  await expect(page.locator('#physics-data')).toContainText('Can extract E by symmetry?Yes');
  await page.getByRole('button', { name: 'Wrong surface preset' }).click();
  await expect(page.locator('#physics-data')).toContainText('Can extract E by symmetry?No');
  await expect(page.locator('#physics-data')).toContainText('Gauss law still holds');
  await page.getByLabel('Charge scenario').selectOption('plane');
  await expect(page.getByLabel('Integration surface')).toHaveValue('pillbox');
  await expect(page.locator('#physics-data')).not.toContainText(/NaN|Infinity/);
  await page.getByLabel('Integration surface').selectOption('curve-2d');
  await expect(page.locator('#physics-data')).toContainText('not a Gaussian surface');
  await expect(page.locator('#physics-data')).toContainText('not inferred from 2-D line flux');
});

test('projectile launches and resets', async ({ page }) => {
  await page.goto('/playground.html?seed=42&experiment=projectile');
  await page.getByRole('button', { name: 'Launch', exact: true }).click();
  await expect(page.locator('#experiment-status')).toContainText('launched');
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('#experiment-status')).toContainText('reset');
  await expect(page.locator('#physics-data')).toContainText('0.00 s');
});

test('double pendulum pauses, restarts, and stays finite', async ({ page }) => {
  await page.goto('/playground.html?experiment=pendulum');
  await page.getByRole('button', { name: 'Pause / Resume' }).click();
  await expect(page.locator('#experiment-status')).toContainText('paused');
  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(page.locator('#physics-data')).toContainText('Total energy');
  await expect(page.locator('#physics-data')).not.toContainText('NaN');
});

test('wave lab switches source mode, display, and single-steps', async ({ page }) => {
  await page.goto('/playground.html?experiment=wave');
  await page.getByLabel('Wave sources').selectOption('single');
  await expect(page.locator('#physics-data')).toContainText('Single source');
  await page.getByLabel('Display mode').selectOption('intensity');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('#experiment-status')).toContainText('Advanced');
});

test('all Classical Mechanics Atlas experiments mount with shared teaching controls', async ({ page }) => {
  const errors: string[] = [];
  captureErrors(page, errors);
  await page.goto('/playground.html?experiment=mechanics-kinematics-1d');

  for (const [category, expectedCount] of [
    ['Classical Mechanics / 经典力学 · Atlas I', 10],
    ['Classical Mechanics / 经典力学 · Atlas II', 16],
  ] as const) {
    await page.getByLabel('Experiment category').selectOption(category);
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(expectedCount);
    for (let index = 0; index < expectedCount; index += 1) {
      await tabs.nth(index).click();
      await expect(page.locator('#experiment-status')).not.toContainText('could not start');
      await expect(page.getByLabel('Typical preset')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pause / Continue' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeVisible();
      await expect(page.locator('#experiment-details')).toContainText('Formula & model');
      await expect(page.locator('#physics-data')).not.toContainText(/NaN|Infinity/);
    }
  }
  expect(errors).toEqual([]);
});

test('mobile viewport has no material horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/index.html', '/notes.html', '/about.html', '/playground.html?experiment=wave', '/playground.html?experiment=mechanics-effective-potential', '/playground.html?experiment=electromagnetism', '/playground.html?experiment=electromagnetism-continuous-charge', '/playground.html?experiment=electromagnetism-gauss-law']) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});

test('reduced motion removes nonessential home animation and pauses waves', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto('/index.html');
  await expect(page.locator('[data-research-canvas]')).toHaveClass(/is-static/);
  const duration = await page.locator('.marquee-track').evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
  await page.goto('/playground.html?experiment=wave');
  await expect(page.locator('#experiment-status')).toContainText('Reduced motion');
  await context.close();
});

test('representative pages produce no severe console errors', async ({ page }) => {
  const errors: string[] = [];
  captureErrors(page, errors);
  for (const route of ['/index.html', '/notes.html', '/posts/atomic-physics-ch2.html', '/playground.html?seed=4']) {
    await page.goto(route);
    await page.waitForTimeout(120);
  }
  expect(errors).toEqual([]);
});

test('deterministic visual surfaces remain stable', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto('/index.html');
  await expect(page.locator('.hero')).toHaveScreenshot('home-hero.png', { animations: 'disabled' });
  await page.goto('/playground.html?seed=123&experiment=projectile');
  await expect(page.locator('.playground-shell')).toHaveScreenshot('playground-projectile.png', { animations: 'disabled' });
  await page.goto('/playground.html?experiment=electromagnetism');
  await expect(page.locator('.playground-shell')).toHaveScreenshot('playground-electromagnetism.png', { animations: 'disabled' });
  await context.close();
  const mobileContext = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('/playground.html?experiment=electromagnetism');
  await expect(mobilePage).toHaveScreenshot('playground-electromagnetism-mobile.png', {
    animations: 'disabled',
    fullPage: false,
    maxDiffPixels: 16_000,
  });
  await mobileContext.close();
});

function captureErrors(page: Page, errors: string[]) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
}
