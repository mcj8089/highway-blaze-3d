// ============================================================================
// scene.js — cinematic-real 影视级渲染管线 + 六关独立世界
// 十项硬清单：ACES / sRGB / 大气雾 / Hemisphere+Directional 双光 / PCFSoft 软阴影 /
// PBR 材质 / PMREM IBL / 分辨率分档 / 动态分辨率 / 禁全屏后处理
// ============================================================================
window.G = window.G || {};
G.Art = G.Art || {};

G.Art.scene3d = (function () {
  const THREE = window.THREE;
  let renderer, scene, camera, pmrem;
  let hemi, key, rim, fog;
  let worldGroup, roadGroup, decorGroup;
  let envRT = null;
  const disposables = [];

  // ---------- 程序化贴图 ----------
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.anisotropy = 4;
    return t;
  }

  // 沥青：深灰底 + 颗粒 + 车道磨痕
  function asphaltTexture(laneCount) {
    return canvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#22252a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const v = 18 + Math.random() * 26;
        ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.5 + Math.random() * 0.5})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
      }
      // 纵向轮胎磨痕
      ctx.fillStyle = 'rgba(12,13,15,0.28)';
      ctx.fillRect(w * 0.22, 0, w * 0.07, h);
      ctx.fillRect(w * 0.71, 0, w * 0.07, h);
    }, [1, 14]);
  }

  function skyEquirect(top, mid, bottom, clouds) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top); g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    // 程序化云层（仅日景：传入 clouds=true 时绘制）
    if (clouds) {
      for (let i = 0; i < 26; i++) {
        const cx = Math.random() * 256, cy = 14 + Math.random() * 58;
        const rw = 16 + Math.random() * 34, rh = rw * (0.24 + Math.random() * 0.2);
        ctx.fillStyle = `rgba(255,255,255,${0.10 + Math.random() * 0.20})`;
        for (let b = 0; b < 5; b++) {
          ctx.beginPath();
          ctx.ellipse(cx + (Math.random() - 0.5) * rw, cy + (Math.random() - 0.5) * rh, rw * (0.3 + Math.random() * 0.4), rh * (0.5 + Math.random() * 0.5), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---------- 管线初始化（十项）----------
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;                 // 2
    renderer.toneMapping = THREE.ACESFilmicToneMapping;               // 1
    renderer.toneMappingExposure = G.config.game.render.exposure;
    renderer.shadowMap.enabled = true;                                // 5
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;                 // 5
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, G.config.game.render.maxPixelRatio)); // 9

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(G.config.game.camera.fov, 16 / 9, 0.5, 1600);
    pmrem = new THREE.PMREMGenerator(renderer);

    worldGroup = new THREE.Group(); scene.add(worldGroup);
    roadGroup = new THREE.Group(); worldGroup.add(roadGroup);
    decorGroup = new THREE.Group(); worldGroup.add(decorGroup);
    return { renderer, scene, camera };
  }

  function setPixelRatioScale(scale) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, G.config.game.render.maxPixelRatio) * scale);
  }

  function setCameraAspect(w, h) { if (camera) camera.aspect = w / h; camera.updateProjectionMatrix(); }

  // ---------- 光照/环境（每关重建）----------
  function buildLights(cfg) {
    if (hemi) { scene.remove(hemi); hemi.dispose && hemi.dispose(); }
    if (key) { scene.remove(key); key.dispose && key.dispose(); }
    if (rim) { scene.remove(rim); rim.dispose && rim.dispose(); }

    hemi = new THREE.HemisphereLight(cfg.skyCol, cfg.groundCol, cfg.hemiI);
    scene.add(hemi);

    key = new THREE.DirectionalLight(cfg.keyCol, cfg.keyI);
    key.position.set(cfg.keyPos[0], cfg.keyPos[1], cfg.keyPos[2]);
    key.castShadow = true;
    key.shadow.mapSize.set(G.config.game.render.shadowMapSize, G.config.game.render.shadowMapSize);
    key.shadow.camera.near = 10; key.shadow.camera.far = 420;
    key.shadow.camera.left = -60; key.shadow.camera.right = 60;
    key.shadow.camera.top = 80; key.shadow.camera.bottom = -160;
    key.shadow.bias = -0.0012; key.shadow.radius = 3;
    scene.add(key);
    scene.add(key.target);

    rim = new THREE.DirectionalLight(cfg.rimCol || 0x88aaff, cfg.rimI != null ? cfg.rimI : 0.25);
    rim.position.set(-40, 26, 60);
    scene.add(rim);

    if (fog) scene.remove(fog);
    fog = new THREE.FogExp2(cfg.fogCol, cfg.fogDensity != null ? cfg.fogDensity : G.config.game.render.fogDensity);
    scene.fog = fog;
    renderer.setClearColor(new THREE.Color(cfg.fogCol), 1);

    // IBL：程序化天顶→地平线渐变（日景带云）→ PMREM（不用低清插画当天空球）
    if (envRT) envRT.dispose();
    const sky = skyEquirect(cfg.skyTop, cfg.skyMid, cfg.skyBottom, cfg.clouds);
    envRT = pmrem.fromEquirectangular(sky);
    scene.environment = envRT.texture;                                 // 7
    sky.dispose();

    // 天空穹顶
    if (G.Art._skyDome) { scene.remove(G.Art._skyDome); G.Art._skyDome.geometry.dispose(); G.Art._skyDome.material.dispose(); }
    const domeGeo = new THREE.SphereGeometry(1100, 24, 16);
    const domeMat = new THREE.MeshBasicMaterial({ map: skyEquirect(cfg.skyTop, cfg.skyMid, cfg.skyBottom, cfg.clouds), side: THREE.BackSide, fog: false });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.name = 'skydome';
    G.Art._skyDome = dome;
    scene.add(dome);
  }

  // ---------- 道路 ----------
  function buildRoad(totalLanes, laneW, length) {
    clearGroup(roadGroup);
    const width = totalLanes * laneW;
    const tex = asphaltTexture(totalLanes);
    const geo = new THREE.PlaneGeometry(width, length);
    const mat = new THREE.MeshStandardMaterial({                     // PBR
      map: tex, roughness: 0.82, metalness: 0.08,
      color: 0xffffff, envMapIntensity: 0.35
    });
    const road = new THREE.Mesh(geo, mat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -length / 2 + 60);
    road.receiveShadow = true;
    road.name = 'road';
    roadGroup.add(road);
    roadGroup.userData.roadMesh = road;
    roadGroup.userData.laneLines = [];

    // 车道虚线（加密间距提升速度感知）
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c2 });
    for (let i = 1; i < totalLanes; i++) {
      const x = -width / 2 + i * laneW;
      for (let z = 0; z > -length; z -= 8) {
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 5), lineMat);
        seg.rotation.x = -Math.PI / 2;
        seg.position.set(x, 0.02, z);
        roadGroup.add(seg);
        roadGroup.userData.laneLines.push(seg);
      }
    }
    // 路缘实线
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xc9b98a });
    [-width / 2 + 0.25, width / 2 - 0.25].forEach(x => {
      const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.28, length), edgeMat);
      seg.rotation.x = -Math.PI / 2;
      seg.position.set(x, 0.02, -length / 2 + 60);
      roadGroup.add(seg);
    });
    roadGroup.userData.width = width;
    return roadGroup.userData;
  }

  function clearGroup(gr) {
    while (gr.children.length) {
      const c = gr.children[0];
      gr.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material && c.material.dispose && !c.material._shared) c.material.dispose();
    }
  }

  // ---------- 六个世界 ----------
  const builders = {
    'coast-golden-noon'(cfg, add) {
      // 海面（左侧）：波光纹理 + PBR 反射，延伸到雾界地平线
      const seaTex = canvasTex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#2f7fc4'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 150; i++) {
          ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.13})`;
          ctx.fillRect(Math.random() * w, Math.random() * h, 24 + Math.random() * 80, 1.2 + Math.random() * 1.8);
        }
      }, [6, 6]);
      const seaMat = new THREE.MeshStandardMaterial({ map: seaTex, color: 0x3f88c8, roughness: 0.45, metalness: 0.12, envMapIntensity: 0.5 });
      const sea = new THREE.Mesh(new THREE.PlaneGeometry(1350, 1500), seaMat);
      sea.rotation.x = -Math.PI / 2; sea.position.set(-715, -0.6, -380); sea.receiveShadow = false;
      add.decor(sea);
      // 沙滩（窄条，衔接路缘与海，让海面大面积进入视野）
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(40, 1500),
        new THREE.MeshStandardMaterial({ color: 0xd9c18a, roughness: 0.95 }));
      sand.rotation.x = -Math.PI / 2; sand.position.set(-12, -0.4, -380);
      add.decor(sand);
      // 右侧草坡大地（填补穹顶米色空腔，撑住画面下半）
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(700, 1500),
        new THREE.MeshStandardMaterial({ color: 0x7ba85c, roughness: 0.92, envMapIntensity: 0.5 }));
      grass.rotation.x = -Math.PI / 2; grass.position.set(360, -0.35, -380);
      add.decor(grass);
      // 右侧草坡 + 棕榈（加密间距强化掠过感）
      for (let z = -420; z < 80; z += 18) {
        add.palm(14.5 + Math.random() * 6, z, 0x2b6f4e);
        if (Math.random() < 0.7) add.palm(15.5 + Math.random() * 9, z - 9, 0x357f5c);
      }
      // 护栏
      add.guardrail(9.6, 0xffffff, 900);
    },

    'overpass-sunset-dual'(cfg, add) {
      // 中隔带护栏 + 远城剪影
      add.guardrail(9.8, 0xb8b8b8, 900);
      add.guardrail(-9.8 - (3 * 4.0), 0xb8b8b8, 900);
      for (let i = 0; i < 26; i++) {
        const x = 90 + Math.random() * 240, z = -500 + Math.random() * 560;
        add.silhouette(x, z, 30 + Math.random() * 60, 0x4a3850);
      }
      for (let z = -420; z < 80; z += 34) add.streetlight(10.4, z, 0xffc978, 1);
    },

    'downtown-rain-night'(cfg, add) {
      add.guardrail(9.6, 0x55606a, 900);
      // 两侧楼群 + 霓虹牌
      for (let z = -460; z < 60; z += 30) {
        add.building(-26 - Math.random() * 40, z, 24 + Math.random() * 44, ['#1c2a3a', '#22303f', '#2a1f33'][Math.floor(Math.random() * 3)]);
        add.building(26 + Math.random() * 40, z - 15, 20 + Math.random() * 50, ['#1a2436', '#28203a'][Math.floor(Math.random() * 2)]);
        if (Math.random() < 0.75) add.neon(-18 - Math.random() * 8, z, ['#ff5ed2', '#46e6ff', '#f5a623'][Math.floor(Math.random() * 3)]);
        if (Math.random() < 0.6) add.neon(18 + Math.random() * 8, z - 20, ['#ff5ed2', '#46e6ff'][Math.floor(Math.random() * 2)]);
        if (Math.random() < 0.8) add.streetlight(10.2, z, 0xbfd8ff, 1);
      }
      add.wetSheen();
    },

    'mountain-snow-dusk'(cfg, add) {
      add.guardrail(9.6, 0x9aa4b0, 900);
      for (let z = -560; z < 80; z += 44) {
        add.mountain(-90 - Math.random() * 160, z - 60, 90 + Math.random() * 130, 0x9fb2c8);
        add.mountain(90 + Math.random() * 160, z - 30, 80 + Math.random() * 150, 0x8fa3bf);
        add.pine(-14 - Math.random() * 10, z, 4 + Math.random() * 3, 0x3d5c4a);
        add.pine(14 + Math.random() * 10, z - 20, 4 + Math.random() * 3, 0x44604e);
      }
      add.snowGround();
    },

    'boulevard-bomb-neon'(cfg, add) {
      add.guardrail(9.6, 0x3a3f52, 900);
      for (let z = -480; z < 60; z += 36) {
        add.building(-30 - Math.random() * 36, z, 30 + Math.random() * 50, '#1a1030');
        add.building(30 + Math.random() * 36, z - 18, 26 + Math.random() * 52, '#20163a');
        add.neonArch(z, ['#ff5ed2', '#46e6ff', '#f5a623'][Math.floor(Math.random() * 3)]);
        if (Math.random() < 0.8) add.streetlight(10.2, z, 0xffd8f0, 1);
      }
      add.wetSheen();
    },

    'convoy-dawn-storm'(cfg, add) {
      add.guardrail(9.8, 0x8a8f96, 900);
      for (let z = -520; z < 60; z += 48) {
        add.bridgePylon(z);
        add.mountain(-110 - Math.random() * 120, z - 40, 70 + Math.random() * 100, 0x5a6a85);
        if (Math.random() < 0.6) add.pine(13 + Math.random() * 8, z - 10, 4, 0x2f4a3c);
      }
      // 车队（同向慢速车队 = 护送对象）
      add.convoy();
      add.wetSheen();
    }
  };

  function buildWorld(sceneId, level) {
    clearGroup(decorGroup);
    // 湿地反射层/车队这类每关特效物挂 decorGroup
    const add = {
      decor(m) { decorGroup.add(m); },
      palm(x, z, col) {
        const g = new THREE.Group();
        // 弯曲树干：三段圆柱递进倾斜
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 0.9 });
        const tilt = (Math.random() - 0.5) * 0.5;
        let ox = 0;
        for (let s = 0; s < 3; s++) {
          const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - s * 0.05, 0.32 - s * 0.05, 2.3, 6), trunkMat);
          ox += tilt * (s + 1) * 0.38;
          seg.position.set(ox, 1.1 + s * 2.1, 0);
          seg.rotation.z = tilt * (s + 1) * 0.4;
          seg.castShadow = true; g.add(seg);
        }
        // 树冠：下垂扁平叶片（绕顶点放射）
        const topX = ox, topY = 6.4;
        const leafMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.75, side: THREE.DoubleSide });
        for (let i = 0; i < 7; i++) {
          const pivot = new THREE.Group();
          pivot.position.set(topX, topY, 0);
          pivot.rotation.y = (i / 7) * Math.PI * 2 + Math.random() * 0.3;
          const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.42, 3.0, 4), leafMat);
          leaf.scale.set(1, 1, 0.3);
          leaf.rotation.z = -(Math.PI / 2 + 0.5);   // 尖朝外并下垂
          leaf.position.set(1.4, -0.2, 0);
          leaf.castShadow = true;
          pivot.add(leaf); g.add(pivot);
        }
        g.position.set(x, 0, z); decorGroup.add(g);
      },
      guardrail(x, col, len) {
        const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.7 });
        for (let z = 20; z > -len; z -= 4) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.14), mat);
          post.position.set(x, 0.45, z); decorGroup.add(post);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 4), mat);
          rail.position.set(x, 0.82, z - 2); rail.castShadow = true; decorGroup.add(rail);
        }
      },
      silhouette(x, z, h, col) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(26, h, 26),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
        b.position.set(x, h / 2 - 2, z); decorGroup.add(b);
      },
      building(x, z, h, col) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(16 + Math.random() * 14, h, 16 + Math.random() * 14),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.85, metalness: 0.15, envMapIntensity: 0.5 }));
        b.position.set(x, h / 2, z); b.castShadow = false; decorGroup.add(b);
        // 点窗灯
        const w = Math.floor(3 + Math.random() * 5);
        for (let i = 0; i < w; i++) {
          const wy = 4 + Math.random() * (h - 6);
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0),
            new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xffd8a0 : 0x9fd8ff }));
          win.position.set(x + (x < 0 ? 9 : -9), wy, z + (Math.random() * 10 - 5));
          win.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
          decorGroup.add(win);
        }
      },
      neon(x, z, col) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2),
          new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
        p.position.set(x, 6 + Math.random() * 6, z);
        p.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
        p.name = 'neon';
        decorGroup.add(p);
      },
      neonArch(z, col) {
        const mat = new THREE.MeshBasicMaterial({ color: col });
        const arch = new THREE.Group();
        const left = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), mat); left.position.set(-11, 4.25, 0);
        const right = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), mat); right.position.set(11, 4.25, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.5, 0.5), mat); top.position.set(0, 8.5, 0);
        arch.add(left, right, top);
        arch.position.set(0, 0, z); arch.name = 'neon';
        decorGroup.add(arch);
      },
      streetlight(x, z, col) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 6),
          new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.6 }));
        pole.position.set(x, 3.75, z); decorGroup.add(pole);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8),
          new THREE.MeshBasicMaterial({ color: col }));
        head.position.set(x - 0.9, 7.3, z); decorGroup.add(head);
        const glow = new THREE.PointLight(col, 34, 26, 2);
        glow.position.set(x - 0.9, 7.0, z);
        glow.name = 'lamp';
        decorGroup.add(glow);
      },
      mountain(x, z, size, col) {
        const m = new THREE.Mesh(new THREE.ConeGeometry(size * 0.62, size, 7),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, flatShading: true }));
        m.position.set(x, size / 2 - 6, z); decorGroup.add(m);
      },
      pine(x, z, h, col) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(h * 0.42, h, 6),
          new THREE.MeshStandardMaterial({ color: col, roughness: 0.9, flatShading: true }));
        t.position.set(x, h / 2, z); decorGroup.add(t);
      },
      snowGround() {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(2200, 1600),
          new THREE.MeshStandardMaterial({ color: 0xdfe8f2, roughness: 0.92, envMapIntensity: 0.7 }));
        g.rotation.x = -Math.PI / 2; g.position.set(0, -0.35, -420);
        decorGroup.add(g);
      },
      wetSheen() {
        // 湿地反光：薄透明层 + 高 envMapIntensity，不用 blur
        const w = new THREE.Mesh(new THREE.PlaneGeometry(60, 980),
          new THREE.MeshStandardMaterial({ color: 0x0c1218, roughness: 0.18, metalness: 0.55, transparent: true, opacity: 0.36, envMapIntensity: 2.2 }));
        w.rotation.x = -Math.PI / 2; w.position.set(0, 0.045, -420);
        w.name = 'wetsheen';
        decorGroup.add(w);
      },
      bridgePylon(z) {
        const p = new THREE.Mesh(new THREE.BoxGeometry(3.2, 26, 2.4),
          new THREE.MeshStandardMaterial({ color: 0x6a7078, roughness: 0.7, metalness: 0.3 }));
        p.position.set(0, 13, z); decorGroup.add(p);
      },
      convoy() {
        // 同向慢速护送车队（三辆面包车， Lane 2）
        G.Art._convoy = [];
        for (let i = 0; i < 3; i++) {
          const van = G.Art.vehicles.makeTraffic(0x4a5a7a, 'van');
          van.group.position.set(-1 * 4.0 + 2, 0, -70 - i * 26);
          van.speed = 12; van.kind = 'convoy';
          decorGroup.add(van.group);
          G.Art._convoy.push(van);
        }
      }
    };

    const w = G.config.game.world;
    const lanes = level.modifiers.twoWay ? G.config.game.world.lanesPlayer + G.config.game.world.lanesOppose : G.config.game.world.lanesPlayer;
    buildRoad(lanes, w.laneWidth, w.roadLength);
    if (builders[sceneId]) builders[sceneId](level, add);
  }

  function applyLevelLook(level) {
    const L = {
      'coast-golden-noon': {
        clouds: true,
        skyTop: '#3f8fd4', skyMid: '#9fd0ee', skyBottom: '#e8d9b8',
        fogCol: 0xbfd8e8, fogDensity: 0.0024,
        skyCol: 0xbfd8ff, groundCol: 0x8a7a5a, hemiI: 0.9,
        keyCol: 0xfff2d8, keyI: 2.6, keyPos: [-45, 55, -35], rimI: 0.35, rimCol: 0x9fd8ff
      },
      'overpass-sunset-dual': {
        skyTop: '#5b4a68', skyMid: '#ff8c42', skyBottom: '#ffd166',
        fogCol: 0xe8952f, fogDensity: 0.0030,
        skyCol: 0xe8a060, groundCol: 0x4a3850, hemiI: 0.6,
        keyCol: 0xffb060, keyI: 2.9, keyPos: [-55, 26, 10], rimI: 0.4, rimCol: 0xffd166
      },
      'downtown-rain-night': {
        skyTop: '#060a14', skyMid: '#0f1c2e', skyBottom: '#1b2b3a',
        fogCol: 0x0e1a28, fogDensity: 0.0075,
        skyCol: 0x22344a, groundCol: 0x0c1218, hemiI: 0.4,
        keyCol: 0x9fb8d8, keyI: 1.0, keyPos: [20, 55, -10], rimI: 0.55, rimCol: 0x46e6ff
      },
      'mountain-snow-dusk': {
        clouds: true,
        skyTop: '#5a6a8a', skyMid: '#c9d6e8', skyBottom: '#f0c890',
        fogCol: 0xc9d6e8, fogDensity: 0.0090,
        skyCol: 0xc9d6e8, groundCol: 0x8fa3bf, hemiI: 0.8,
        keyCol: 0xffd8a8, keyI: 1.6, keyPos: [-40, 30, 15], rimI: 0.3, rimCol: 0xaac0e0
      },
      'boulevard-bomb-neon': {
        skyTop: '#0a0620', skyMid: '#120a2a', skyBottom: '#2a1440',
        fogCol: 0x140a28, fogDensity: 0.0068,
        skyCol: 0x2a1f4a, groundCol: 0x120a2a, hemiI: 0.42,
        keyCol: 0xb0a0ff, keyI: 0.9, keyPos: [18, 58, -8], rimI: 0.7, rimCol: 0xff5ed2
      },
      'convoy-dawn-storm': {
        clouds: true,
        skyTop: '#4a5a7a', skyMid: '#ffb17a', skyBottom: '#ff8c5a',
        fogCol: 0xa08870, fogDensity: 0.0052,
        skyCol: 0xd8a880, groundCol: 0x3a4252, hemiI: 0.6,
        keyCol: 0xffc890, keyI: 2.2, keyPos: [-60, 18, -30], rimI: 0.5, rimCol: 0xff8c5a
      }
    }[level.scene];

    renderer.toneMappingExposure = level.scene === 'downtown-rain-night' ? 1.3 : G.config.game.render.exposure;
    buildLights(L);
    buildWorld(level.scene, level);
  }

  return { init, applyLevelLook, setCameraAspect, setPixelRatioScale, clearGroup,
    get renderer() { return renderer; }, get scene() { return scene; }, get camera() { return camera; },
    get roadGroup() { return roadGroup; }, get decorGroup() { return decorGroup; } };
})();
