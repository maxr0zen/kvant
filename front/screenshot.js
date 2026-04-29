const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Set dark theme before navigation
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
  });

  // Login
  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);

  const usernameInput = await page.locator('input').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  const submitButton = await page.locator('button[type="submit"]').first();

  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await submitButton.click();
  await page.waitForTimeout(3000);

  // Go to lecture
  await page.goto('http://localhost:3000/main/6bc95bb2fe40/lesson/3fd50834921c');
  await page.waitForTimeout(5000);

  // Screenshot
  await page.screenshot({ path: 'web-lecture-dark.png', fullPage: true });
  console.log('Screenshot saved to web-lecture-dark.png');

  await browser.close();
})();
