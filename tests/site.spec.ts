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
  await expect(page.getByLabel('Experiment category')).toHaveValue('Electromagnetism');
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

test('mobile viewport has no material horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/index.html', '/notes.html', '/about.html', '/playground.html?experiment=wave', '/playground.html?experiment=electromagnetism']) {
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
  await expect(mobilePage.locator('.playground-shell')).toHaveScreenshot('playground-electromagnetism-mobile.png', { animations: 'disabled' });
  await mobileContext.close();
});

function captureErrors(page: Page, errors: string[]) {
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
}
