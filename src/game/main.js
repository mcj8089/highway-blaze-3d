// ============================================================================
// main.js — Highway Blaze 3D 玩法主循环
// 状态机 boot/menu/play/pause/over/clear；四通道计分；NearMiss 连击；
// 逆行奖分；湿地/雪地操控；时空门；速度炸弹；六彩蛋；三奖励位广告。
// ============================================================================
window.G = window.G || {};

(function () {
  const THREE = window.THREE;
  const CFG = () => window.G.config.game;
  const T = (k, v) => G.Core.i18n.t(k, v);

  const S = {
    state: 'boot', levelIndex: 0, level: null,
    score: 0, coins: 0, distance: 0, goal: 0,
    nearMiss: 0, combo: 0, maxCombo: 0, comboTimer: 0,
    highSpeedTime: 0, wrongWayTime: 0, wrongWayActive: false,
    bombLevel: 100, bombFired: false, timeLeft: 0, nextGateDist: 0,
    speed: 0, nitro: 100, nitroOn: false,
    playerX: 0, steerV: 0, brakeUsed: false, crashed: false,
    eggDone: {}, goldCar: null, goldSpawned: false,
    nervesteelCount: 0, ghostList: [],
    assistLeft: 0, reviveLeft: 1, revivedThisRun: false,
    cameraMode: 'chase', engineOsc: null, running: false
  };
  const trafficPool = [];
  let lastFrame = 0, fpsAcc = 0, fpsN = 0, fpsTimer = 0, resScale = 1;
  let shakeT = 0, shakeAmp = 0, slowmoT = 0;
  let input = { left: false, right: false, brake: false, pointerX: null, pointerDownX: null };

  // ---------- 车道几何 ----------
  function laneCenters() {
    const lw = CFG().world.laneWidth;
    const L = S.level;
    if (L.modifiers.twoWay) {
      const p = [], o = [];
      for (let i = 0; i < 4; i++) p.push(2 + i * 4);
      for (let i = 0; i < 3; i++) o.push(-2 - i * 4);
      return { player: p, oppose: o, half: (p.length + o.length) * lw / 2 };
    }
    const p = [];
    for (let i = 0; i < 4; i++) p.push(-6 + i * 4);
    return { player: p, oppose: [], half: 8 };
  }

  // ---------- 引擎声 ----------
  function engineStart() {
    if (S.engineOsc || !G.Core.audio.started) return;
    const ctx = G.Core.audio.ctx; if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 60;
    f.type = 'lowpass'; f.frequency.value = 320;
    g.gain.value = 0.05;
    o.connect(f); f.connect(g); g.connect(ctx.destination);
    o.start();
    S.engineOsc = { o, g, f };
  }
  function engineUpdate() {
    if (!S.engineOsc) return;
    const kmh = S.speed * 3.6;
    S.engineOsc.o.frequency.value = 48 + kmh * 0.85;
    S.engineOsc.g.gain.value = S.state === 'play' ? 0.045 : 0;
  }
  function engineStop() {
    if (!S.engineOsc) return;
    try { S.engineOsc.o.stop(); } catch (e) {}
    S.engineOsc = null;
  }

  // ---------- 交通 ----------
  function spawnTraffic() {
    const L = S.level, lc = laneCenters(), cfg = CFG();
    const twoWay = L.modifiers.twoWay;
    const useOppose = twoWay && Math.random() < 0.42;
    const lanes = useOppose ? lc.oppose : lc.player;
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    // 同车道近生成点防重叠
    for (const t of trafficPool) {
      if (!t.active || t.laneX !== lane) continue;
      if (t.z < cfg.world.spawnZ + (t.group.userData.kind === 'truck' ? cfg.traffic.truckGapZ : cfg.traffic.minGapZ)) return;
    }
    const paint = cfg.traffic.palette[Math.floor(Math.random() * cfg.traffic.palette.length)];
    const car = acquireTraffic(paint);
    car.active = true; car.laneX = lane; car.x = lane; car.z = cfg.world.spawnZ;
    car.oppose = useOppose;
    car.speed = cfg.traffic.baseSpeed + Math.random() * cfg.traffic.speedVar;
    car.counted = false; car.blink = 0; car.changing = false; car.changeFrom = 0; car.changeTo = 0;
    car.changeTimer = 4 + Math.random() * 10;
    car.protect = CFG().traffic.spawnProtection;
    car.group.position.set(car.x, 0, car.z);
    car.group.visible = true;
    if (useOppose) car.group.rotation.y = Math.PI;
  }

  function acquireTraffic(paint) {
    for (const t of trafficPool) {
      if (!t.active) { return t; }
    }
    const group = G.Art.vehicles.makeTraffic(paint);
    G.Art.scene3d.scene.add(group);
    const t = { group, active: false, z: 0, x: 0, speed: 0, oppose: false, counted: false };
    trafficPool.push(t);
    return t;
  }

  function releaseTraffic(t) {
    t.active = false; t.group.visible = false;
  }

  function clearTraffic() {
    trafficPool.forEach(releaseTraffic);
    if (S.goldCar) { releaseTraffic(S.goldCar.ref); S.goldCar = null; S.goldSpawned = false; }
  }

  // ---------- 开局 ----------
  function startRun(levelIndex) {
    const levels = G.config.levels;
    S.levelIndex = Math.max(0, Math.min(levels.length - 1, levelIndex));
    S.level = levels[S.levelIndex];
    const M = S.level.modifiers;

    S.state = 'play'; S.score = 0; S.distance = 0; S.goal = S.level.goalDist;
    S.nearMiss = 0; S.combo = 0; S.maxCombo = 0; S.comboTimer = 0;
    S.highSpeedTime = 0; S.wrongWayTime = 0; S.wrongWayActive = false;
    S.bombLevel = CFG().bomb.start; S.bombFired = false;
    S.timeLeft = CFG().checkpoint.startTime; S.nextGateDist = CFG().checkpoint.every;
    S.speed = CFG().car.minSpeed * 0.7; S.nitro = 100; S.nitroOn = false;
    S.playerX = laneCenters().player[2]; S.steerV = 0; S.brakeUsed = false; S.crashed = false;
    S.eggDone = {}; S.nervesteelCount = 0; S.ghostList = [];
    S.assistLeft = CFG().ads.assists.perRun; S.reviveLeft = CFG().reviveMaxPerRun; S.revivedThisRun = false;
    window.__HB_NITRO_LOW = false;

    G.Art.scene3d.applyLevelLook(S.level);
    G.Art.effects.reset();
    if (M.wet) G.Art.effects.initRain();
    if (M.snow) G.Art.effects.initSnow();
    G.Art.effects.initSpeedLines();

    if (!G.playerMesh) {
      G.playerMesh = G.Art.vehicles.makePlayer();
      G.Art.scene3d.scene.add(G.playerMesh);
    }
    G.playerMesh.visible = true;
    G.playerMesh.position.set(S.playerX, 0, 0);

    clearTraffic();
    spawnTraffic();

    S.running = true;
    G.UI.showGame();
    G.Core.audio.startMusic();
    engineStart();
    if (S.level.tutorial) G.UI.showTutorial([T('tut.move'), T('tut.near'), T('tut.nitro')]);
    G.SDK.trackStart({ level: S.level.id });
  }

  function toMenu() {
    S.state = 'menu'; S.running = false;
    clearTraffic();
    if (G.playerMesh) G.playerMesh.visible = true;
    engineStop();
    G.UI.showMenu();
  }

  function pause() {
    if (S.state !== 'play') return;
    S.state = 'pause';
    if (S.engineOsc) S.engineOsc.g.gain.value = 0;
    G.UI.showPause(() => { S.state = 'play'; G.UI.showGame(); }, () => startRun(S.levelIndex), toMenu);
  }
  function resume() { if (S.state === 'pause') { S.state = 'play'; G.UI.showGame(); } }

  // ---------- 结算 ----------
  function gameOver(kind) {
    if (S.state !== 'play') return;
    S.state = 'over'; S.running = false;
    shakeT = 0.7; shakeAmp = CFG().shake.crash;
    slowmoT = 0.6;
    G.Core.audio.play(kind === 'bomb' ? 'over' : 'crash');
    setTimeout(() => G.Core.audio.play('over'), 500);
    engineStop();
    const score = Math.floor(S.score);
    const isNew = G.Core.storage.setBestFor(S.level.id, score);
    G.SDK.trackFail({ level: S.level.id, score, kind });
    G.UI.showOver({
      kind, score, best: G.Core.storage.getBestFor(S.level.id), isNew,
      nearMiss: S.nearMiss, maxCombo: S.maxCombo,
      canRevive: S.reviveLeft > 0,
      onRevive: doRevive,
      onRestart: () => startRun(S.levelIndex),
      onMenu: toMenu
    });
  }

  async function doRevive() {
    if (S.reviveLeft <= 0) return;
    const ok = await G.SDK.ads.showRewarded('revive');
    if (ok !== true) { G.UI.toast(T('ad.unavailable') || 'AD NOT AVAILABLE'); return; }
    S.reviveLeft--; S.revivedThisRun = true;
    // 清空玩家周围交通，恢复状态
    clearTraffic();
    spawnTraffic();
    if (S.level.modifiers.bomb) S.bombLevel = Math.max(S.bombLevel, 60);
    if (S.level.modifiers.checkpoint) S.timeLeft = Math.max(S.timeLeft, 20);
    S.speed = CFG().car.minSpeed; S.crashed = false;
    S.state = 'play'; S.running = true;
    engineStart();
    G.UI.showGame();
    G.UI.toast(T('revived'));
    G.SDK.trackRevive({ level: S.level.id });
    G.Core.audio.play('nitro');
  }

  function levelClear() {
    if (S.state !== 'play') return;
    S.state = 'clear'; S.running = false;
    engineStop();
    const score = Math.floor(S.score);
    G.Core.storage.setBestFor(S.level.id, score);
    G.Core.storage.setCleared(S.level.id + 1);
    // 彩蛋：dawnlegend
    if (S.level.egg.kind === 'dawnlegend' && !S.eggDone.dawnlegend &&
        S.crashed === false && S.maxCombo >= S.level.egg.needCombo) {
      S.eggDone.dawnlegend = true;
      S.score += S.level.egg.bonus;
      G.UI.toast(T('egg.dawnlegend'));
    }
    let coins = Math.floor(S.score / 60) + 50;
    if (S.level.egg.kind === 'perfectline' && !S.brakeUsed && !S.eggDone.perfectline) {
      S.eggDone.perfectline = true;
      coins = Math.floor(coins * 1.2);
      G.UI.toast(T('egg.perfectline'));
    }
    const finalCoins = coins;
    G.Core.storage.addCoins(finalCoins);
    G.SDK.trackWin({ level: S.level.id, score });
    G.Core.audio.play('win') || G.Core.audio.play('nitro');
    G.UI.showClear({
      level: S.level.id, score: Math.floor(S.score), coins: finalCoins,
      best: G.Core.storage.getBestFor(S.level.id),
      hasNext: S.levelIndex + 1 < G.config.levels.length,
      onNext: () => startRun(S.levelIndex + 1),
      onReplay: () => startRun(S.levelIndex),
      onMenu: toMenu,
      onDouble: async () => {
        const ok = await G.SDK.ads.showRewarded('doubleCoins');
        if (ok === true) { G.Core.storage.addCoins(finalCoins); G.UI.toast(T('clear.coins', { n: finalCoins })); }
      },
      canDouble: true
    });
  }

  // ---------- 输入 ----------
  function bindInput() {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': input.left = true; break;
        case 'ArrowRight': case 'KeyD': input.right = true; break;
        case 'ArrowDown': case 'KeyS': input.brake = true; S.brakeUsed = true; break;
        case 'ShiftLeft': case 'ShiftRight': tryNitro(); break;
        case 'KeyC': toggleCamera(); break;
        case 'KeyP': case 'Escape': S.state === 'play' ? pause() : (S.state === 'pause' && resume()); break;
      }
    });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': input.left = false; break;
        case 'ArrowRight': case 'KeyD': input.right = false; break;
        case 'ArrowDown': case 'KeyS': input.brake = false; break;
      }
    });
    // 触屏/鼠标：按住后相对拖拽横移（拖多远移多远，松手回正）
    const el = document.getElementById('game-canvas') || document.body;
    el.addEventListener('pointerdown', e => { input.pointerX = e.clientX; input.pointerDownX = e.clientX; el.setPointerCapture && el.setPointerCapture(e.pointerId); }, { passive: true });
    el.addEventListener('pointermove', e => { if (input.pointerX != null) input.pointerX = e.clientX; }, { passive: true });
    el.addEventListener('pointerup', () => { input.pointerX = null; }, { passive: true });
    el.addEventListener('pointercancel', () => { input.pointerX = null; }, { passive: true });
    window.addEventListener('blur', () => { if (S.state === 'play') pause(); });
  }

  function pointerSteer() {
    if (input.pointerX == null || input.pointerDownX == null) return 0;
    // 相对拖拽量 → -1..1（拖动 18% 屏宽 = 满舵）
    let ndc = (input.pointerX - input.pointerDownX) / (window.innerWidth * 0.18);
    ndc = Math.max(-1, Math.min(1, ndc));
    if (Math.abs(ndc) < 0.12) return 0;
    return ndc;
  }

  function tryNitro() {
    if (S.state !== 'play') return;
    if (S.nitro >= CFG().nitro.minToFire && !S.nitroOn) {
      S.nitroOn = true;
      G.Core.audio.play('nitro');
      G.Art.effects.setNitroFlames(G.playerMesh.userData.exhaust, true);
    }
  }
  function stopNitro() {
    S.nitroOn = false;
    G.Art.effects.setNitroFlames(G.playerMesh && G.playerMesh.userData.exhaust, false);
  }
  function toggleCamera() {
    S.cameraMode = S.cameraMode === 'chase' ? 'hood' : 'chase';
    G.Core.audio.play('ui');
  }

  // ---------- 彩蛋 ----------
  function checkEggs(ctx) {
    const L = S.level, egg = L.egg;
    if (!egg || S.eggDone[L.id + '_' + (egg.id || egg.kind)]) return;
    switch (egg.kind) {
      case 'goldcar':
        if (!S.goldSpawned && S.distance > S.goal * egg.at) {
          S.goldSpawned = true;
          const ref = acquireTraffic(0xd4a017);
          ref.active = true; ref.laneX = laneCenters().player[Math.floor(Math.random() * 4)];
          ref.x = ref.laneX; ref.z = CFG().world.spawnZ; ref.oppose = false;
          ref.speed = CFG().traffic.baseSpeed * 0.9; ref.counted = false;
          ref.blink = 0; ref.changing = false; ref.protect = 0; ref.isGold = true;
          ref.group.position.set(ref.x, 0, ref.z); ref.group.visible = true;
          ref.group.traverse(o => { if (o.material && o.material.color && o.material.isMeshStandardMaterial) o.material = o.material.clone(); });
          ref.group.traverse(o => { if (o.material && o.material.isMeshStandardMaterial) o.material.color.set(0xf5c842); });
          S.goldCar = { ref };
        }
        break;
    }
  }

  function fireEgg(id, key, bonus) {
    if (S.eggDone[key]) return;
    S.eggDone[key] = true;
    S.score += bonus;
    G.UI.toast(T(key === 'goldrush' ? 'egg.goldrush' : key === 'ghostlane' ? 'egg.ghostlane' : key === 'threaded' ? 'egg.threaded' : key === 'nervesteel' ? 'egg.nervesteel' : 'egg.dawnlegend'));
    G.Core.audio.play('near');
    G.SDK.trackCustom('egg', { id: key, level: S.level.id });
  }

  // ---------- 每帧玩法 ----------
  function update(dt) {
    const cfg = CFG(), L = S.level, M = L.modifiers, car = cfg.car;
    // —— 输入 ——
    let steerIn = 0;
    if (input.left) steerIn -= 1;
    if (input.right) steerIn += 1;
    const ps = pointerSteer();
    if (ps !== 0) steerIn = ps;

    const grip = M.wet ? car.gripWet : M.snow ? car.gripSnow : 1;
    const accel = car.steerAccel * grip;
    if (steerIn !== 0) S.steerV += steerIn * accel * dt;
    else S.steerV -= S.steerV * Math.min(1, car.steerDamp * grip * dt);
    S.steerV = Math.max(-car.steerSpeed, Math.min(car.steerSpeed, S.steerV));
    S.playerX += S.steerV * dt;
    // 路缘约束
    const lc = laneCenters();
    const minX = lc.oppose.length ? -lc.oppose.length * cfg.world.laneWidth + 1.2 : -6.6;
    const maxX = lc.player[lc.player.length - 1] + 1.8;
    if (S.playerX < minX || S.playerX > maxX) {
      S.playerX = Math.max(minX, Math.min(maxX, S.playerX));
      S.steerV *= -0.25;
      shakeT = 0.12; shakeAmp = 0.2;
    }

    // —— 速度 ——
    const braking = input.brake;
    if (braking) { S.brakeUsed = true; S.speed -= car.brake * dt; }
    else S.speed += car.accel * dt * (0.85 + Math.random() * 0.3);
    S.speed -= car.coast * dt * (S.nitroOn ? 0 : 1);
    if (M.wet || M.snow) S.speed -= car.coast * 0.6 * dt;
    if (S.nitroOn) {
      S.speed += cfg.nitro.boost * dt;
      S.nitro -= cfg.nitro.drain * dt;
      if (S.nitro <= 0) { S.nitro = 0; stopNitro(); }
    } else S.nitro = Math.min(cfg.nitro.max, S.nitro + cfg.nitro.regen * dt);
    S.speed = Math.max(5, Math.min(car.maxSpeed + (S.nitroOn ? cfg.nitro.boost * 0.4 : 0), S.speed));

    // —— 位移 / 计分 ——
    const kmh = S.speed * 3.6;
    S.distance += S.speed * dt;
    const sc = cfg.score;
    if (kmh >= sc.minScoreSpeed) S.score += S.speed * dt * sc.perMeter;
    if (kmh >= sc.highSpeedMin) { S.highSpeedTime += dt; S.score += sc.highSpeedPerSec * dt; }
    else S.highSpeedTime = 0;

    // 逆行奖分
    const onOppose = lc.oppose.length && S.playerX < -0.5;
    S.wrongWayActive = !!(onOppose && kmh >= sc.minScoreSpeed);
    if (S.wrongWayActive) { S.wrongWayTime += dt; S.score += sc.wrongWayPerSec * dt; }

    // —— 炸弹 ——
    if (M.bomb) {
      if (kmh < cfg.bomb.threshold) {
        S.bombLevel -= cfg.bomb.drainPerSec * dt;
        if (S.bombLevel <= 8 && !S.bombFired) { S.nervesteelLow = true; }
      } else {
        S.bombLevel += cfg.bomb.refillPerSec * dt;
        if (S.bombFired && S.bombLevel > 30) S.bombFired = false;
        if (S.nervesteelLow && S.bombLevel > 30) {
          S.nervesteelLow = false;
          S.nervesteelCount++;
          if (S.nervesteelCount === L.egg.need && !S.eggDone.nervesteel) fireEgg(L.id, 'nervesteel', L.egg.bonus);
        }
      }
      S.bombLevel = Math.max(0, Math.min(100, S.bombLevel));
      if (S.bombLevel <= 0) return gameOver('bomb');
    }

    // —— 时空门 ——
    if (M.checkpoint) {
      S.timeLeft -= dt;
      if (S.timeLeft <= 0) return gameOver('timeout');
      if (S.distance >= S.nextGateDist) {
        S.timeLeft += cfg.checkpoint.addTime;
        S.nextGateDist += cfg.checkpoint.every;
        G.Core.audio.play('click');
        G.UI.flashGate();
      }
    }

    // —— 交通推进 ——
    let spawnInt = Math.max(M.spawnIntervalMin, M.spawnIntervalStart - S.distance * cfg.traffic.spawnRampPerSec);
    S.spawnAcc = (S.spawnAcc || 0) + dt;
    if (S.spawnAcc > spawnInt) { S.spawnAcc = 0; spawnTraffic(); }

    for (const t of trafficPool) {
      if (!t.active) continue;
      if (t.protect > 0) t.protect -= dt;
      const rel = t.oppose ? (S.speed + t.speed) : (S.speed - t.speed);
      t.z += rel * dt;
      // 变道 AI
      if (M.laneSignals && !t.oppose && !t.changing) {
        t.changeTimer -= dt;
        if (t.changeTimer <= 0) {
          t.changeTimer = 6 + Math.random() * 10;
          if (Math.random() < cfg.traffic.laneChangeChance) {
            const lanes = lc.player;
            const idx = lanes.indexOf(t.laneX);
            if (idx >= 0 && idx < lanes.length - 1 && Math.random() < 0.7 || idx > 0) {
              const dir = idx < lanes.length - 1 && Math.random() < 0.5 ? 1 : (idx > 0 ? -1 : 1);
              const target = lanes[idx + dir];
              if (target != null) {
                t.changing = true; t.changeFrom = t.laneX; t.changeTo = target;
                t.blink = cfg.traffic.laneChangeLead;
                t.blinkDir = dir;
                t.changeDelay = cfg.traffic.laneChangeLead;
              }
            }
          }
        }
      }
      if (t.changing) {
        if (t.blink > 0) {
          t.blink -= dt;
          const on = Math.floor(t.blink * 6) % 2 === 0;
          const bl = t.blinkDir > 0 ? t.group.userData.blinkR : t.group.userData.blinkL;
          const other = t.blinkDir > 0 ? t.group.userData.blinkL : t.group.userData.blinkR;
          bl.visible = on; other.visible = true;
          if (t.blink <= 0) {
            bl.visible = true; t.changeDelay = 1.2; t.laneX = t.changeTo;
            t.group.userData.blinkL.visible = true; t.group.userData.blinkR.visible = true;
          }
        } else {
          t.changeDelay -= dt;
          const k = Math.min(1, 1 - t.changeDelay / 1.2);
          t.x = t.changeFrom + (t.changeTo - t.changeFrom) * Math.max(0, k);
          if (t.changeDelay <= 0) { t.changing = false; t.x = t.changeTo; }
        }
      }
      if (t.z > cfg.world.recycleZ || (t.oppose && t.z > 40)) { releaseTraffic(t); continue; }
      t.group.position.set(t.x, 0, t.z);
      t.group.position.y = 0;

      // —— 碰撞 ——
      const pw = cfg.car.width * (1 - cfg.collision.shrink) * 0.5;
      const pl = cfg.car.length * (1 - cfg.collision.shrink) * 0.5;
      const tw = t.group.userData.bodyW * (1 - cfg.collision.shrink) * 0.5;
      const tl = t.group.userData.bodyLen * (1 - cfg.collision.shrink) * 0.5;
      const hitX = Math.abs(t.x - S.playerX) < (pw + tw);
      const hitZ = Math.abs(t.z - cfg.car.z) < (pl + tl);
      if (hitX && hitZ && t.protect <= 0) {
        S.crashed = true;
        return gameOver('crash');
      }

      // —— NearMiss ——
      if (!t.counted && t.z > cfg.car.z + pl + tl * 0.4) {
        t.counted = true;
        const gap = Math.abs(t.x - S.playerX) - (pw + tw);
        if (gap <= cfg.collision.nearMissDist && kmh >= sc.minScoreSpeed) {
          S.nearMiss++;
          S.combo = (S.comboTimer > 0) ? S.combo + 1 : 1;
          S.maxCombo = Math.max(S.maxCombo, S.combo);
          S.comboTimer = sc.comboWindow;
          const pts = Math.floor(sc.nearMissBase * (1 + sc.comboBonus * (S.combo - 1)));
          S.score += pts;
          G.UI.popNearMiss(t.x - S.playerX, pts, S.combo);
          G.Core.audio.play('near');
          shakeT = 0.1; shakeAmp = cfg.shake.near;
          // 彩蛋触发
          if (t.isGold) fireEgg(L.id, 'goldrush', L.egg.bonus);
          if (t.changing) fireEgg(L.id, 'threaded', L.egg.bonus);
          if (onOppose) {
            S.ghostList.push(performance.now());
            S.ghostList = S.ghostList.filter(ts => performance.now() - ts < (L.egg.within || 10) * 1000);
            if (L.egg.kind === 'ghostlane' && S.ghostList.length >= L.egg.need) fireEgg(L.id, 'ghostlane', L.egg.bonus);
          }
        }
      }
    }

    // 连击窗口衰减
    if (S.comboTimer > 0) { S.comboTimer -= dt; if (S.comboTimer <= 0) S.combo = 0; }

    checkEggs();
    if (S.goldCar && S.goldCar.ref.z > cfg.world.recycleZ) { releaseTraffic(S.goldCar.ref); S.goldCar = null; }

    // —— 玩家车呈现 ——
    const pm = G.playerMesh;
    pm.position.x = S.playerX;
    pm.rotation.z = -S.steerV * 0.02;          // 侧倾
    pm.rotation.y = -S.steerV * 0.018;         // 车头指向
    pm.position.y = Math.sin(performance.now() / 120) * 0.012;
    pm.userData.wheels.forEach(w => { w.rotation.x -= S.speed * dt * 2.2; });

    // —— 场景推进（路面/虚线回收循环）——
    const road = G.Art.scene3d.roadGroup;
    if (road) {
      const shift = S.speed * dt;
      road.position.z += shift;
      if (road.position.z > 12) road.position.z -= 12;
      G.Art.scene3d.decorGroup.position.z += shift;
      if (G.Art.scene3d.decorGroup.position.z > 480) G.Art.scene3d.decorGroup.position.z -= 480;
      // 时空门
      if (M.checkpoint && G.gateMesh) {
        G.gateMesh.position.z += shift;
        G.gateMesh.position.x = lc.player[1] + 2;
      }
      // 护送车队
      if (G.Art._convoy) {
        G.Art._convoy.forEach(v => {
          v.group.position.z += (S.speed - v.speed) * dt;
          if (v.group.position.z > 30) v.group.position.z = -380 - Math.random() * 60;
        });
      }
    }

    // —— 相机 ——
    const cam = G.Art.scene3d.camera, cc = cfg.camera;
    let camTargetX, camTargetY, camTargetZ, lookY, fov;
    if (S.cameraMode === 'hood') {
      camTargetX = S.playerX; camTargetY = cc.hoodHeight; camTargetZ = cc.hoodBack;
      lookY = 1.2; fov = cc.hoodFov;
    } else {
      camTargetX = S.playerX * 0.86; camTargetY = cc.height; camTargetZ = cc.back + Math.max(0, (kmh - 130) * 0.014);
      lookY = cc.lookY; fov = cc.fov + (S.nitroOn ? 7 : 0) + Math.max(0, (kmh - 120) * 0.022);
    }
    cam.position.x += (camTargetX - cam.position.x) * Math.min(1, cc.followX * dt * 60);
    cam.position.y += (camTargetY - cam.position.y) * Math.min(1, cc.followY * dt * 60);
    cam.position.z += (camTargetZ - cam.position.z) * Math.min(1, 0.2 * dt * 60);
    if (shakeT > 0) {
      shakeT -= dt;
      cam.position.x += (Math.random() - 0.5) * shakeAmp * 2 * shakeT;
      cam.position.y += (Math.random() - 0.5) * shakeAmp * 2 * shakeT;
    }
    cam.lookAt(S.playerX * 0.9, lookY, cfg.car.z - (S.cameraMode === 'hood' ? 40 : cc.lookAhead));
    cam.fov += (fov - cam.fov) * Math.min(1, 4 * dt);
    cam.updateProjectionMatrix();

    // —— 目标 ——
    if (S.distance >= S.goal) return levelClear();

    // —— HUD ——
    G.UI.updateHUD({
      kmh, score: Math.floor(S.score), distance: Math.floor(S.distance), goal: S.goal,
      combo: S.combo, nearMiss: S.nearMiss,
      wrongWay: S.wrongWayActive, highSpeed: S.highSpeedTime > 0.4,
      bomb: M.bomb ? S.bombLevel : null, bombDanger: M.bomb && kmh < cfg.bomb.threshold,
      time: M.checkpoint ? S.timeLeft : null,
      nitro: S.nitro, nitroOn: S.nitroOn, assistLeft: S.assistLeft
    });

    // —— 特效 ——
    G.Art.effects.update(dt, S.speed);
    engineUpdate();
  }

  // ---------- 主循环 ----------
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016);
    lastFrame = now;

    // 动态分辨率（3D 用 fps 判）
    fpsAcc += dt; fpsN++;
    fpsTimer += dt;
    if (fpsTimer > CFG().render.dynRes.checkMs / 1000) {
      const fps = fpsN / fpsAcc;
      if (fps < CFG().render.dynRes.lowFps && resScale > CFG().render.dynRes.minScale) {
        resScale = Math.max(CFG().render.dynRes.minScale, resScale * CFG().render.dynRes.step);
        G.Art.scene3d.setPixelRatioScale(resScale);
      }
      fpsAcc = 0; fpsN = 0; fpsTimer = 0;
    }

    if (S.state === 'play' && S.level) {
      if (slowmoT > 0) { slowmoT -= dt; update(dt * 0.4); }
      else update(dt);
    } else if (S.state === 'menu') {
      // 菜单慢速巡航展示
      menuDrift(dt);
    }

    if (G.Art.scene3d.renderer && S.level) G.Art.scene3d.renderer.render(G.Art.scene3d.scene, G.Art.scene3d.camera);
  }

  function menuDrift(dt) {
    const cam = G.Art.scene3d.camera, cfg = CFG();
    const t = performance.now() / 1000;
    S.speed = cfg.car.minSpeed * 0.55;
    const shift = S.speed * dt;
    const road = G.Art.scene3d.roadGroup;
    if (road) {
      road.position.z += shift;
      if (road.position.z > 12) road.position.z -= 12;
      G.Art.scene3d.decorGroup.position.z += shift;
      if (G.Art.scene3d.decorGroup.position.z > 480) G.Art.scene3d.decorGroup.position.z -= 480;
    }
    cam.position.set(Math.sin(t * 0.3) * 3, cfg.camera.height * 1.1, cfg.camera.back + 2);
    cam.lookAt(0, 1.4, cfg.car.z - cc_look());
    G.Art.effects.update(dt, S.speed);
  }
  function cc_look() { return CFG().camera.lookAhead; }

  // ---------- 门（时空门实体）----------
  function ensureGate() {
    if (!G.gateMesh) {
      G.gateMesh = G.Art.vehicles.makeGate(16);
      G.Art.scene3d.scene.add(G.gateMesh);
    }
    G.gateMesh.visible = !!(S.level && S.level.modifiers.checkpoint);
    if (G.gateMesh.visible) G.gateMesh.position.z = -CFG().checkpoint.every;
  }

  // ---------- 调试契约 ----------
  function snapshot() {
    return {
      state: S.state, levelIndex: S.levelIndex, level: S.level ? S.level.id : null,
      score: Math.floor(S.score), distance: Math.floor(S.distance), goal: S.goal,
      kmh: Math.round(S.speed * 3.6), nearMiss: S.nearMiss, combo: S.combo, maxCombo: S.maxCombo,
      lives: S.reviveLeft, coins: G.Core.storage.getCoins(),
      nitro: S.nitro, bomb: S.level && S.level.modifiers.bomb ? S.bombLevel : null,
      time: S.level && S.level.modifiers.checkpoint ? S.timeLeft : null,
      player: { x: S.playerX, y: 0 }, items: trafficPool.filter(t => t.active).slice(0, 8).map(t => ({ x: t.x, z: Math.round(t.z), oppose: t.oppose }))
    };
  }

  window.PipyGame = {
    api: 1,
    ads: { ready: () => !!(window.G.SDK && window.G.SDK.ads), canShow: n => { try { return G.SDK.ads.canShow(n); } catch (e) { return false; } } },
    debug: {
      start: (lv) => startRun(lv || 0),
      snapshot,
      pause: () => pause(),
      resume: () => resume(),
      perf: () => ({ medianMs: Math.round((fpsN ? fpsAcc / fpsN * 1000 : 0) * 10) / 10, frames: fpsN, resScale }),
      kill: () => gameOver('crash'),                       // 负向自证：直接判失败
      stopTraffic: () => { trafficPool.forEach(releaseTraffic); },  // 负向自证：停交通
      forceClear: () => levelClear(),
      setSpeed: (kmh) => { S.speed = kmh / 3.6; },
      toggleCamera
    }
  };

  // ---------- 启动 ----------
  function boot() {
    // SDK 初始化（先于业务模块使用）
    if (G.SDK && G.SDK.init) { try { G.SDK.init(); } catch (e) { console.warn('SDK init', e); } }
    window.__HB_STATE = S;
    window.G.Nitro = tryNitro;
    const canvas = document.getElementById('game-canvas');
    G.Art.scene3d.init(canvas);
    bindInput();

    // 默认第一关做菜单背景
    S.level = G.config.levels[0];
    G.Art.scene3d.applyLevelLook(S.level);
    G.playerMesh = G.Art.vehicles.makePlayer();
    G.Art.scene3d.scene.add(G.playerMesh);
    G.Art.effects.initSpeedLines();
    resize();

    // 广告回调：暂停 + 静音
    if (G.SDK && G.SDK.ads) {
      G.SDK.ads.onAdStart = () => { if (S.state === 'play') { S._adPaused = true; pause(); } G.Core.audio.setMuted(true); };
      G.SDK.ads.onAdEnd = () => { G.Core.audio.setMuted(G.Core.storage.getMuted()); };
    }

    G.Core.audio.init();
    G.UI.init({ onPlay: (lv) => { S.level = G.config.levels[lv]; ensureGate(); startRun(lv); }, storage: G.Core.storage });
    G.UI.showMenu();
    S.state = 'menu';

    window.addEventListener('resize', resize);
    requestAnimationFrame(t => { lastFrame = t; requestAnimationFrame(tick); });
    if (window.__bootDone) window.__bootDone();   // 开屏真进度收尾
  }

  function resize() {
    const c = G.Art.scene3d.renderer.domElement;
    const w = window.innerWidth, h = window.innerHeight;
    G.Art.scene3d.renderer.setSize(w, h, false);
    G.Art.scene3d.setCameraAspect(w, h);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
