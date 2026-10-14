import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const chrome = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
});
try {
  for (const formFactor of ['desktop', 'mobile']) {
    const result = await lighthouse('http://127.0.0.1:3001', {
      port: chrome.port,
      onlyCategories: ['accessibility'],
      output: 'json',
      formFactor,
      screenEmulation:
        formFactor === 'desktop'
          ? { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }
          : { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false },
    });
    await writeFile(`artifacts/lighthouse-${formFactor}.json`, result.report);
    console.log(
      `${formFactor}: accessibility ${Math.round(result.lhr.categories.accessibility.score * 100)}`,
    );
    const failures = Object.values(result.lhr.audits).filter((a) => a.score === 0);
    console.log(failures.map((a) => ({ id: a.id, title: a.title })));
  }
} finally {
  await chrome.kill();
}
