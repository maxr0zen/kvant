const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);

  const usernameInput = await page.locator('input').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  const submitButton = await page.locator('button[type="submit"]').first();

  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await submitButton.click();
  await page.waitForTimeout(3000);

  // Go to a puzzle page
  await page.goto('http://localhost:3000/puzzles/69f156fd0a00f477e3a282d9');
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'puzzle-dark.png', fullPage: true });
  console.log('Screenshot saved to puzzle-dark.png');

  await browser.close();
})();
