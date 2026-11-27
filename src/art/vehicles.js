// ============================================================================
// vehicles.js — PBR 车辆构建（玩家车 + 交通车族：sedan/pickup/truck/van/sport/gold）
// 材质走 MeshStandardMaterial（PBR），软阴影参与 cast/receive。
// ============================================================================
window.G = window.G || {};
G.Art = G.Art || {};

G.Art.vehicles = (function () {
  const THREE = window.THREE;

  function glassMat() {
    return new THREE.MeshPhysicalMaterial({ color: 0x07090e, roughness: 0.05, metalness: 0.9, envMapIntensity: 2.6, clearcoat: 1.0, clearcoatRoughness: 0.04 });
  }
  function trimMat(col) {
    return new THREE.MeshStandardMaterial({ color: col || 0x1a1d22, roughness: 0.5, metalness: 0.6 });
  }
  function wheelMat() {
    return new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.95, metalness: 0.02 });
  }
  function rimMat() {
    return new THREE.MeshStandardMaterial({ color: 0xd4d9e0, roughness: 0.14, metalness: 1.0, envMapIntensity: 2.2 });
  }
  // 电影级车漆：清漆层 + 适中金属度（过高会反射天空冲淡本色）
  function carPaint(col, opts) {
    const o = opts || {};
    return new THREE.MeshPhysicalMaterial({
      color: col, roughness: o.rough != null ? o.rough : 0.28, metalness: o.metal != null ? o.metal : 0.55,
      envMapIntensity: o.env != null ? o.env : 1.3,
      clearcoat: o.cc != null ? o.cc : 1.0, clearcoatRoughness: o.ccr != null ? o.ccr : 0.06
    });
  }

  function makeWheel(radius, width) {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 14), wheelMat());
    tire.rotation.z = Math.PI / 2; tire.castShadow = true;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 10), rimMat());
    rim.rotation.z = Math.PI / 2;
    g.add(tire, rim);
    return g;
  }

  function headlight(color) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: color || 0xfff6d8 }));
    return m;
  }

  // ---------- 玩家车（电影感肌肉轿跑）----------
  function makePlayer(bodyColor) {
    const g = new THREE.Group();
    // 深猩红 + 介电质车漆（低金属度防高光冲淡本色，清漆层出镜面感）
    const paint = carPaint(bodyColor || 0x8a1a10, { rough: 0.3, metal: 0.3, env: 1.2, cc: 1.0, ccr: 0.08 });
    const W = 2.0, LEN = 4.3;

    // 主车身（下）
    const lower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.62, LEN), paint);
    lower.position.y = 0.58; lower.castShadow = true; g.add(lower);
    // 车肩（上）
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.34, LEN * 0.9), paint);
    shoulder.position.set(0, 0.98, -0.12); shoulder.castShadow = true; g.add(shoulder);
    // 座舱
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.5, LEN * 0.42), glassMat());
    cabin.position.set(0, 1.32, 0.1); cabin.castShadow = true; g.add(cabin);
    // 车顶黑化面板（对比座舱玻璃，强化车顶轮廓）
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.05, LEN * 0.28), trimMat(0x101216));
    roof.position.set(0, 1.585, 0.08); g.add(roof);
    // 引擎盖线条
    const hood = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.06, LEN * 0.34), paint);
    hood.position.set(0, 1.02, 1.28); g.add(hood);
    // 前唇分流器（深色，贴地感）
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.1, 0.5), trimMat(0x14161a));
    splitter.position.set(0, 0.22, LEN / 2 - 0.1); g.add(splitter);
    // 侧裙
    [-1, 1].forEach(s => {
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, LEN * 0.6), trimMat(0x14161a));
      skirt.position.set(s * (W / 2 - 0.02), 0.26, -0.1); g.add(skirt);
    });
    // 尾翼
    const wing = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.07, 0.42), trimMat(0x14161a));
    wing.position.set(0, 1.28, -2.05); g.add(wing);
    [-0.7, 0.7].forEach(x => {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.1), trimMat());
      stand.position.set(x, 1.14, -2.0); g.add(stand);
    });
    // 前后灯
    const hl = [headlight(), headlight()];
    hl[0].position.set(-0.62, 0.72, LEN / 2 - 0.02); hl[1].position.set(0.62, 0.72, LEN / 2 - 0.02);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 0.1, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff2a30 }));
    tl.position.set(0, 0.85, -LEN / 2 - 0.01);
    g.add(hl[0], hl[1], tl);
    // 排气（氮气火焰挂点）
    const exhaust = new THREE.Group();
    [-0.55, 0.55].forEach(x => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 8), trimMat(0x30343a));
      pipe.rotation.x = Math.PI / 2; pipe.position.set(x, 0.38, -LEN / 2 - 0.08);
      exhaust.add(pipe);
    });
    g.add(exhaust);
    // 车轮
    const wheels = [];
    [[-0.95, 1.42], [0.95, 1.42], [-0.95, -1.42], [0.95, -1.42]].forEach(([x, z]) => {
      const w = makeWheel(0.42, 0.3);
      w.position.set(x, 0.42, z);
      g.add(w); wheels.push(w);
    });
    // 头灯真实光源（夜景关由 scene 控制强度）
    const lamp = new THREE.SpotLight(0xfff2cc, 0, 55, 0.6, 0.55, 1.6);
    lamp.position.set(0, 0.8, LEN / 2);
    const lampTarget = new THREE.Object3D();
    lampTarget.position.set(0, 0.4, 26);
    g.add(lampTarget); lamp.target = lampTarget; g.add(lamp);

    g.userData = { wheels, lamp, tail: tl, exhaust, bodyLen: LEN, bodyW: W };
    return g;
  }

  // ---------- 交通车 ----------
  // kind: sedan(默认) / pickup / truck / van / sport / gold
  function makeTraffic(paintColor, kind) {
    kind = kind || (Math.random() < 0.62 ? 'sedan' : Math.random() < 0.5 ? 'pickup' : Math.random() < 0.6 ? 'van' : 'truck');
    const g = new THREE.Group();
    const paint = carPaint(paintColor || 0xc8ccd2, { rough: 0.36, metal: 0.35, env: 0.9, cc: 0.5, ccr: 0.18 });
    let LEN = 4.4, W = 2.0, wheelR = 0.4;

    if (kind === 'truck') {
      LEN = 9.6; W = 2.5; wheelR = 0.5;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W, 2.3, 2.6), paint);
      cab.position.set(0, 1.55, LEN / 2 - 1.4); cab.castShadow = true; g.add(cab);
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(W, 2.7, LEN - 3.0),
        new THREE.MeshStandardMaterial({ color: 0xb8b8b0, roughness: 0.7, metalness: 0.25 }));
      cargo.position.set(0, 1.75, -1.2); cargo.castShadow = true; g.add(cargo);
      const gap = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.5, 0.4), trimMat());
      gap.position.set(0, 1.0, LEN / 2 - 2.9); g.add(gap);
    } else if (kind === 'van') {
      LEN = 5.2; W = 2.1;
      const body = new THREE.Mesh(new THREE.BoxGeometry(W, 1.7, LEN), paint);
      body.position.y = 1.0; body.castShadow = true; g.add(body);
      const cabWin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.85, 0.5, 1.1), glassMat());
      cabWin.position.set(0, 1.55, LEN / 2 - 0.9); g.add(cabWin);
    } else if (kind === 'pickup') {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.66, LEN), paint);
      lower.position.y = 0.62; lower.castShadow = true; g.add(lower);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.5, LEN * 0.36), paint);
      bed.position.set(0, 1.08, -LEN * 0.28); bed.castShadow = true; g.add(bed);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, 0.62, LEN * 0.3), glassMat());
      cab.position.set(0, 1.18, 0.35); g.add(cab);
    } else {
      const lower = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, LEN), paint);
      lower.position.y = 0.56; lower.castShadow = true; g.add(lower);
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 0.3, LEN * 0.88), paint);
      shoulder.position.y = 0.94; g.add(shoulder);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.78, 0.46, LEN * 0.4), glassMat());
      cabin.position.set(0, 1.22, -0.1); g.add(cabin);
    }

    const hl = [headlight(0xfff2cc), headlight(0xfff2cc)];
    hl[0].position.set(-W * 0.3, 0.6, LEN / 2 - 0.05);
    hl[1].position.set(W * 0.3, 0.6, LEN / 2 - 0.05);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(W * 0.72, 0.09, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xff3038 }));
    tl.position.set(0, 0.8, -LEN / 2 - 0.02);
    g.add(hl[0], hl[1], tl);

    const wheels = [];
    const wheelZ = kind === 'truck' ? [[-1.05, LEN / 2 - 1.0], [1.05, LEN / 2 - 1.0], [-1.05, -LEN / 2 + 1.6], [1.05, -LEN / 2 + 1.6], [-1.05, -LEN / 2 + 3.1], [1.05, -LEN / 2 + 3.1]]
      : [[-W / 2 + 0.12, LEN / 2 - 1.1], [W / 2 - 0.12, LEN / 2 - 1.1], [-W / 2 + 0.12, -LEN / 2 + 1.1], [W / 2 - 0.12, -LEN / 2 + 1.1]];
    wheelZ.forEach(([x, z]) => {
      const w = makeWheel(wheelR, 0.32);
      w.position.set(x, wheelR, z); g.add(w); wheels.push(w);
    });

    // 转向灯（左右侧小灯，laneSignals 时闪烁）
    const blinkMat = new THREE.MeshBasicMaterial({ color: 0xffa028 });
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), blinkMat.clone());
    bl.position.set(-W / 2 - 0.02, 0.72, LEN / 2 - 0.5);
    const br = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), blinkMat.clone());
    br.position.set(W / 2 + 0.02, 0.72, LEN / 2 - 0.5);
    g.add(bl, br);

    g.userData = { wheels, blinkL: bl, blinkR: br, tail: tl, kind, bodyLen: LEN, bodyW: W };
    return g;
  }

  // 检查点门（L4）
  function makeGate(width) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.4, metalness: 0.5, emissive: 0xf5a623, emissiveIntensity: 0.55 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), mat); p1.position.set(-width / 2, 3.6, 0);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), mat); p2.position.set(width / 2, 3.6, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.7, 0.6), mat); top.position.set(0, 7.0, 0);
    g.add(p1, p2, top);
    g.userData = { isGate: true, top };
    return g;
  }

  return { makePlayer, makeTraffic, makeGate };
})();
