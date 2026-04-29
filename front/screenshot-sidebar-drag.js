const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);
  await page.fill('input', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:3000/main');
  await page.waitForTimeout(3000);

  // Find toggle zone and drag it to the right
  const toggleZone = await page.locator('[role="presentation"]').first();
  const box = await toggleZone.boundingBox();
  if (box) {
    // Drag from current position to x+150 (expand)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'sidebar-drag.png', fullPage: false });
  console.log('Screenshot saved to sidebar-drag.png');

  await browser.close();
})();
