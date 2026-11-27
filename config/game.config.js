// ============================================================================
// Highway Blaze 3D — 游戏核心参数（cinematic-real 影视级渲染 / 6 关）
// ============================================================================
window.G = window.G || {};
G.config = G.config || {};

G.config.game = {
  defaultLang: 'en',
  title: 'HIGHWAY BLAZE 3D',
  subtitle: 'Cinematic Highway Racing',

  design: { width: 1280, height: 720, orientation: 'landscape' },

  // ---- 道路 / 世界（米）----
  world: {
    laneWidth: 4.0,
    lanesPlayer: 4,          // 玩家方向车道数
    lanesOppose: 3,          // 对向车道数（two-way 关）
    roadLength: 900,
    decorFar: 420,
    spawnZ: -380,
    recycleZ: 26,
    groundSize: 2600
  },

  camera: {
    fov: 65, height: 4.6, back: 8.8, lookY: 1.1, lookAhead: 22,
    followX: 0.18, followY: 0.08,
    hoodFov: 74, hoodHeight: 1.15, hoodBack: 0.1
  },

  car: {
    width: 2.2, length: 4.4, yOffset: 0.12, z: 0,
    steerSpeed: 18, steerAccel: 95, steerDamp: 6.5,
    minSpeed: 12, maxSpeed: 75,     // m/s（75 m/s = 270 km/h）
    accel: 17.5, brake: 38, coast: 5,
    gripWet: 0.72,          // 雨天横移系数
    gripSnow: 0.62,         // 雪天横移系数
    bodyHeight: 1.05
  },

  nitro: { max: 100, drain: 30, regen: 9, boost: 24, minToFire: 25 },

  traffic: {
    baseSpeed: 16, speedVar: 7,      // m/s（58~83 km/h）
    minGapZ: 30, truckGapZ: 48,
    spawnIntervalStart: 1.2, spawnIntervalMin: 0.55, spawnRampPerSec: 0.00012,
    laneChangeChance: 0.18,   // 每次触发变道判定概率
    laneChangeLead: 0.8,      // 转向灯提前量（秒）
    spawnProtection: 1.2,
    palette: [0xc8ccd2, 0x8a2f2f, 0x2f4d6b, 0x3d6b3a, 0x6b4a8a, 0xd4a017, 0x30363d]
  },

  collision: { shrink: 0.30, nearMissDist: 3.3 },

  // ---- 计分（四通道，对应原作 distance/nearMiss/overspeed/opposite）----
  score: {
    perMeter: 0.5,
    nearMissBase: 120,
    comboWindow: 2.5,
    comboBonus: 0.25,
    highSpeedMin: 190,        // KM/H
    highSpeedPerSec: 30,
    wrongWayPerSec: 55,
    minScoreSpeed: 88
  },

  // ---- 特殊机制 ----
  bomb: { threshold: 110, drainPerSec: 12, refillPerSec: 7, start: 100 },
  checkpoint: { every: 360, addTime: 9, startTime: 36 },
  reviveMaxPerRun: 1,

  shake: { crash: 1.1, near: 0.08 },

  // ---- 影视级渲染档（cinematic-real 十项）----
  render: {
    tier: 'cinematic-real',
    engine3d: true,
    exposure: 1.12,
    maxPixelRatio: 1.75,
    fogDensity: 0.0026,
    shadowMapSize: 2048,
    dynRes: { checkMs: 1200, lowFps: 26, step: 0.75, minScale: 0.5 }
  },

  ads: { enabled: true, assists: { perRun: 3, refill: 2, maxRefillPerRun: 2 } },

  theme: {
    accent: '#f5a623', accentDeep: '#c77f14',
    danger: '#ff4d5e', cyan: '#46e6ff', magenta: '#ff5ed2',
    ink: '#141210', paper: '#f5efe4',
    good: '#5cff9d'
  }
};

window.GAME_CONFIG = G.config.game;
