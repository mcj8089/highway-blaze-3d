// === tools/capture3d.cjs ===
// 用 Node Playwright + SwiftShader 无头录制 3D 赛车实机画面（WebGL 软件渲染）。
// 依次验证 4 个场景（真实街道/沙漠/市区/山路）的实际渲染效果。
// 用法：node tools/capture3d.cjs http://localhost:8080/
const { chromium } = require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8080/';
const EXE = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, '_frames');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: EXE,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__game, { timeout: 90000 });
  // 等待资源加载完成（loading 层被移除）
  await page.waitForFunction(() => !document.getElementById('loading'), { timeout: 90000 });

  // 直接开跑（无敌模式，保证采到 4 场景完整画面）
  await page.evaluate(() => { window.__game.play(); window.__game.debugGod(); });
  await page.waitForTimeout(600);

  const N = 96;               // 4 场景 × 24 帧
  const PER = 24;
  const shot = async (i) => {
    const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 720 } });
    fs.writeFileSync(path.join(OUT, `frame_${String(i).padStart(3, '0')}.png`), buf);
  };

  await page.keyboard.down('ArrowUp');
  for (let i = 0; i < N; i++) {
    // 每 6 帧左右摆动转向，呈现躲避车流动态
    if (i % 6 === 0) await page.keyboard.down(i % 12 === 0 ? 'ArrowLeft' : 'ArrowRight');
    if (i % 6 === 3) { await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight'); }
    // 每场景段首强制切换场景（street / desert / urban / mountain，锁定防自动推进）
    if (i % PER === 0) {
      const s = i / PER;
      await page.evaluate((idx) => window.__game.debugScene(idx, true), s);
      await page.waitForTimeout(120);
    }
    await shot(i);
    await page.waitForTimeout(110);
  }
  await page.keyboard.up('ArrowUp');
  await browser.close();

  if (errs.length) console.log('PAGE_ERRORS:', errs.slice(0, 6).join(' | '));
  else console.log('NO_ERRORS');
  console.log('CAPTURE_DONE', N);
})().catch((e) => { console.error('CAPTURE_FAILED', e); process.exit(1); });
