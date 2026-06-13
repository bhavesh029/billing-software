import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('API health when E2E_API_URL set', async ({ request }) => {
  const base = process.env.E2E_API_URL;
  if (!base) test.skip();
  const res = await request.get(`${base.replace(/\/$/, '')}/health`);
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { status?: string };
  expect(json.status).toBe('ok');
});
