const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);

  const usernameInput = await page.locator('input').first();
  const passwordInput = await page.locator('input[type="password"]').first();
  const submitButton = await page.locator('button[type="submit"]').first();

  await usernameInput.fill('admin');
  await passwordInput.fill('admin123');
  await submitButton.click();
  await page.waitForTimeout(3000);

  await page.goto('http://localhost:3000/main');
  await page.waitForTimeout(3000);

  // Get sidebar width before click
  const widthBefore = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    return sidebar ? sidebar.getBoundingClientRect().width : 0;
  });
  console.log('Width before:', widthBefore);

  // Click toggle button
  await page.click('button[aria-label="Свернуть меню"]');
  await page.waitForTimeout(2000);

  // Get sidebar width after click
  const widthAfter = await page.evaluate(() => {
    const sidebar = document.querySelector('aside');
    return sidebar ? sidebar.getBoundingClientRect().width : 0;
  });
  console.log('Width after:', widthAfter);

  await page.screenshot({ path: 'sidebar-debug.png', fullPage: false });
  console.log('Screenshot saved to sidebar-debug.png');

  await browser.close();
})();
