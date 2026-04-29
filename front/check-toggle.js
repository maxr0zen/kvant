const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('http://localhost:3000/login');
  await page.waitForTimeout(3000);
  await page.fill('input', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.goto('http://localhost:3000/main');
  await page.waitForTimeout(3000);

  // Inject console.log into toggle
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Свернуть меню"]');
    if (btn) {
      btn.addEventListener('click', () => console.log('BUTTON CLICKED'));
    }
  });

  await page.click('button[aria-label="Свернуть меню"]');
  await page.waitForTimeout(2000);

  await browser.close();
})();
