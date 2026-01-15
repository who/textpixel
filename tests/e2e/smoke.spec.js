// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('TextPixel Smoke Tests', () => {
    test('page loads successfully', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/TextPixel/i);
    });

    test('encoder section is visible', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('#text-input')).toBeVisible();
        await expect(page.locator('#generate-btn')).toBeVisible();
    });

    test('decoder section is visible', async ({ page }) => {
        await page.goto('/');
        // File input may be hidden for styling, check it exists
        await expect(page.locator('#decode-file-input')).toBeAttached();
        await expect(page.locator('#decode-output')).toBeVisible();
    });
});
