// === tools/probe.cjs ===
// 定位“橙色扁块”归属：对比玩家车/交通车屏幕包围盒与异常像素区域
const { chromium } = require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/playwright');
const EXE = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const URL = process.argv[2] || 'http://localhost:8123/';

(async () => {
  const browser = await chromium.launch({
    headless: true, executablePath: EXE,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, { timeout: 90000 });
  await page.waitForFunction(() => !document.getElementById('loading'), { timeout: 90000 });
  await page.evaluate(() => { window.__game.debugGod(); window.__game.play(); window.__game.debugScene(0, true); });
  await page.waitForTimeout(800);

  // A) 仅玩家车
  const a = await page.evaluate(() => window.__game.debugProbe());
  console.log('--- A) 仅玩家车 (god+street) ---');
  console.log('viewport W,H =', a.W, a.H);
  console.log('player box =', JSON.stringify(a.player));
  console.log('traffic 数 =', a.traffic.length);

  // B) 在 (4.2,-7) 生成一辆绿车（复现 verify 抓取条件）
  await page.evaluate(() => { window.__game.debugSpawn(4.2, -7, 'traffic_green'); });
  await page.waitForTimeout(200);
  const b = await page.evaluate(() => window.__game.debugProbe());
  console.log('--- B) 生成绿车后 ---');
  console.log('player box =', JSON.stringify(b.player));
  b.traffic.forEach((t, i) => console.log(`traffic[${i}] x=${t.x} z=${t.z} box=`, JSON.stringify(t.box)));

  // 异常像素区域参考（来自 crop_player 审计）
  const ref = { x0: 586, x1: 693, y0: 555, y1: 655 };
  console.log('--- 异常区域', JSON.stringify(ref), '被以下包围盒覆盖? ---');
  const inside = (bx) => bx && bx.minX <= ref.x1 && bx.maxX >= ref.x0 && bx.minY <= ref.y1 && bx.maxY >= ref.y0;
  console.log('player 覆盖异常区?', inside(a.player));
  b.traffic.forEach((t, i) => console.log(`traffic[${i}] 覆盖异常区?`, inside(t.box)));

  await browser.close();
  console.log('PROBE_DONE');
})().catch((e) => { console.error('PROBE_FAILED', e); process.exit(1); });
