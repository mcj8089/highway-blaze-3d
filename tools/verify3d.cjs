// === tools/verify3d.cjs ===
// 验证：① 无 JS 错误 ② 碰撞修复（god 关闭时撞车会触发 crash/gameover）③ 四场景渲染（3D 车+路边花）截图
const { chromium } = require('C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:8123/';
const EXE = 'C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe';
const OUT = path.join(__dirname, '_verify');

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: true, executablePath: EXE,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await page.goto(URL, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => !!window.__game, { timeout: 90000 });
  } catch (e) {
    const dbg = await page.evaluate(() => ({
      hasGame: typeof window.__game,
      loading: !!document.getElementById('loading'),
      loadingText: (document.getElementById('load-label') || {}).textContent || null
    }));
    console.log('DIAG:', JSON.stringify(dbg));
    console.log('PAGE_ERRORS:', errs.length ? errs.slice(0, 10).join(' | ') : 'NONE');
    await browser.close();
    process.exit(2);
  }
  await page.waitForFunction(() => !document.getElementById('loading'), { timeout: 90000 });

  // —— ① 碰撞修复验证：不开启 god，生成一辆静止车在正前方车道，应当触发 crash ——
  await page.evaluate(() => { window.__game.play(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__game.debugSpawn(0, -3, 'traffic_red'); });
  let collided = false;
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => window.__game.state);
    if (st === 'crash' || st === 'gameover') { collided = true; break; }
    await page.waitForTimeout(100);
  }
  console.log('COLLISION_TEST:', collided ? 'PASS (crashed)' : 'FAIL (no crash)');

  // —— ② 视觉验证：god 模式下逐场景截图，确认 3D 车 + 路边花渲染 ——
  await page.evaluate(() => { window.__game.debugGod(); window.__game.play(); window.__game.debugScene(0, true); });
  await page.keyboard.down('ArrowUp');
  const names = ['street', 'desert', 'urban', 'mountain'];
  for (let s = 0; s < 4; s++) {
    await page.evaluate((idx) => window.__game.debugScene(idx, true), s);
    await page.waitForTimeout(1200); // 等场景过渡 + 车流/装饰流动
    for (let k = 0; k < 4; k++) {
      const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 720 } });
      fs.writeFileSync(path.join(OUT, `scene_${s}_${names[s]}_${k}.png`), buf);
      await page.waitForTimeout(350);
    }
  }
  await page.keyboard.up('ArrowUp');

  // —— ③ 单独验证：正前方生成一辆来车，确认其呈现 3D 盒体（非纸片）——
  await page.evaluate(() => { window.__game.debugScene(0, true); window.__game.debugSpawn(4.2, -7, 'traffic_green'); });
  await page.waitForTimeout(90);
  const onb = await page.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 720 } });
  fs.writeFileSync(path.join(OUT, 'oncoming.png'), onb);

  // —— ④ 局部裁切：玩家车底部 + 道路右侧，定位“棕色矩形/白色虚线”异常 ——
  const cropPlayer = await page.screenshot({ clip: { x: 500, y: 555, width: 340, height: 170 } });
  fs.writeFileSync(path.join(OUT, 'crop_player.png'), cropPlayer);
  const cropRight = await page.screenshot({ clip: { x: 860, y: 280, width: 420, height: 320 } });
  fs.writeFileSync(path.join(OUT, 'crop_right.png'), cropRight);

  console.log('PAGE_ERRORS:', errs.length ? errs.slice(0, 8).join(' | ') : 'NONE');
  await browser.close();
  console.log('VERIFY_DONE');
})().catch((e) => { console.error('VERIFY_FAILED', e); process.exit(1); });
