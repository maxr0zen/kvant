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
  const style = await page.evaluate(() => {
    const aside = document.querySelector('aside');
    return aside ? aside.style.cssText : 'not found';
  });
  console.log('Inline style:', style);
  await browser.close();
})();
