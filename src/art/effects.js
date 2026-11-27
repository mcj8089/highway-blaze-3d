// ============================================================================
// effects.js — 雨/雪/氮气火焰/擦身飘分粒子（Points 与 sprite，禁全屏后处理）
// ============================================================================
window.G = window.G || {};
G.Art = G.Art || {};

G.Art.effects = (function () {
  const THREE = window.THREE;
  let rainPts, snowPts, speedLines, nitroFlames = [];

  function makePoints(count, color, size, spread, depth) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = -Math.random() * depth;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.75, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  function initRain() {
    if (!rainPts) { rainPts = makePoints(900, 0x9fc8e8, 0.14, 70, 380); rainPts.visible = false; G.Art.scene3d.scene.add(rainPts); }
    rainPts.visible = true;
  }
  function initSnow() {
    if (!snowPts) { snowPts = makePoints(1100, 0xffffff, 0.22, 80, 380); snowPts.visible = false; G.Art.scene3d.scene.add(snowPts); }
    snowPts.visible = true;
  }

  function clearWeather() {
    if (rainPts) rainPts.visible = false;
    if (snowPts) snowPts.visible = false;
  }

  function update(dt, playerSpeed) {
    const move = playerSpeed * dt;
    if (rainPts && rainPts.visible) {
      const p = rainPts.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 42;
        let z = p.getZ(i) + move;
        if (y < 0) { y = 22; }
        if (z > 20) z -= 380;
        p.setY(i, y); p.setZ(i, z);
      }
      p.needsUpdate = true;
    }
    if (snowPts && snowPts.visible) {
      const p = snowPts.geometry.attributes.position;
      const t = performance.now() / 1000;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) - dt * 3.2;
        let z = p.getZ(i) + move;
        let x = p.getX(i) + Math.sin(t + i) * dt * 1.2;
        if (y < 0) { y = 22; x = (Math.random() - 0.5) * 80; }
        if (z > 20) z -= 380;
        p.setY(i, y); p.setZ(i, z); p.setX(i, x);
      }
      p.needsUpdate = true;
    }
    // 氮气火焰跟随
    nitroFlames.forEach(f => {
      if (!f.parent) return;
      const s = 0.6 + Math.random() * 0.7;
      f.scale.set(s, s, s);
      f.material.opacity = 0.4 + Math.random() * 0.4;
    });
    // 速度线（高速时显示，成对平行短线随行进流动）
    if (speedLines) {
      const kmh = playerSpeed * 3.6;
      speedLines.visible = kmh > 110;
      if (speedLines.visible) {
        const p = speedLines.geometry.attributes.position;
        for (let i = 0; i < p.count; i += 2) {
          let z = p.getZ(i) + move * 1.35;
          if (z > 14) z -= 220;
          p.setZ(i, z);
          p.setZ(i + 1, z - lineLens[i >> 1]);
        }
        p.needsUpdate = true;
      }
    }
  }

  let lineLens = [];
  function initSpeedLines() {
    if (speedLines) return;
    const count = 90;   // 45 条线段（成对顶点）
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    lineLens = [];
    for (let i = 0; i < count; i += 2) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = side * (6.5 + Math.random() * 12);
      const y = 0.5 + Math.random() * 9;
      const z = -Math.random() * 220;
      const len = 6 + Math.random() * 6;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      pos[i * 3 + 3] = x; pos[i * 3 + 4] = y; pos[i * 3 + 5] = z - len;
      lineLens.push(len);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xd8e8f8, transparent: true, opacity: 0.28 });
    speedLines = new THREE.LineSegments(geo, mat);
    speedLines.visible = false;
    speedLines.frustumCulled = false;
    G.Art.scene3d.scene.add(speedLines);
  }

  function setNitroFlames(exhaustGroup, on) {
    if (!exhaustGroup) return;
    if (on && nitroFlames.length === 0) {
      for (let i = 0; i < 2; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.1, 7),
          new THREE.MeshBasicMaterial({ color: i === 0 ? 0x66c8ff : 0xffa03c, transparent: true, opacity: 0.7 }));
        f.rotation.x = Math.PI / 2;
        f.position.set(0, 0, -0.7);
        exhaustGroup.add(f);
        nitroFlames.push(f);
      }
    }
    nitroFlames.forEach(f => { f.visible = !!on; });
  }

  function reset() {
    nitroFlames = [];
    clearWeather();
    if (speedLines) speedLines.visible = false;
  }

  return { initRain, initSnow, clearWeather, update, initSpeedLines, setNitroFlames, reset };
})();
