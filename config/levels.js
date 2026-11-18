// ============================================================================
// Highway Blaze 3D — 6 关卡卡（一关一世界；机制阶梯 axis：
// rule → space → enemy+rule → time → resource → combo）
// modifiers 键与 main.js 的机制开关一一对应。
// ============================================================================
window.G = window.G || {};
G.config.levels = [
  {
    id: 1, nameKey: 'levels.1.name', storyKey: 'levels.1.story', goalKey: 'levels.1.goal',
    scene: 'coast-golden-noon',
    theme: 'golden coast highway at noon, sea and palms',
    palette: ['#3fa9f5', '#f5d76e', '#e8952f', '#2b6f4e'],
    mechanic: 'nearMissCombo', mechanicKey: 'levels.1.mechanic',
    mechanicNote: '贴近交通车 3.3m 内通过且 ≥88km/h 才计入连击；早了没分，晚了撞上。',
    goal: 1500, goalDist: 1500,
    highlight: '金色轿车贴身掠过，阳光在引擎盖炸开一道光斑。',
    eggKey: 'levels.1.egg', egg: { at: 0.6, kind: 'goldcar', id: 'goldrush', bonus: 500 },
    tolerance: 'high', pacing: 'teach', difficulty: 1.8, tutorial: true,
    modifiers: { twoWay: false, wet: false, snow: false, checkpoint: false, bomb: false, laneSignals: false, spawnIntervalStart: 1.3, spawnIntervalMin: 0.72, timeOfDay: 'noon' }
  },
  {
    id: 2, nameKey: 'levels.2.name', storyKey: 'levels.2.story', goalKey: 'levels.2.goal',
    scene: 'overpass-sunset-dual',
    theme: 'sunset dual-carriageway overpass',
    palette: ['#ff8c42', '#ffd166', '#5b4a68', '#2b2622'],
    mechanic: 'wrongWay', mechanicKey: 'levels.2.mechanic',
    mechanicNote: '对向道有迎面车流，2× 相对速度；借道超车每秒 +55，但窗口以 0.5s 计。',
    goal: 2000, goalDist: 2000,
    highlight: '对向卡车群呼啸而过，WRONG WAY 红字随心跳闪烁。',
    eggKey: 'levels.2.egg', egg: { kind: 'ghostlane', need: 3, within: 10, bonus: 800 },
    tolerance: 'high', pacing: 'practice', difficulty: 3.0,
    modifiers: { twoWay: true, wet: false, snow: false, checkpoint: false, bomb: false, laneSignals: false, spawnIntervalStart: 1.18, spawnIntervalMin: 0.64, timeOfDay: 'sunset' }
  },
  {
    id: 3, nameKey: 'levels.3.name', storyKey: 'levels.3.story', goalKey: 'levels.3.goal',
    scene: 'downtown-rain-night',
    theme: 'rainy neon downtown night',
    palette: ['#0f1c2e', '#46e6ff', '#ff5ed2', '#1b2b3a'],
    mechanic: 'wetGrip', mechanicKey: 'levels.3.mechanic',
    mechanicNote: '湿地横移加速度 ×0.72、回稳阻尼 ×0.6，车尾会甩；交通车变道前 0.8s 打转向灯。',
    goal: 2400, goalDist: 2400,
    highlight: '转向灯亮起的瞬间从车尾 0.5m 缝隙穿过，水雾被撕成两半。',
    eggKey: 'levels.3.egg', egg: { kind: 'threaded', bonus: 750 },
    tolerance: 'mid', pacing: 'twist', difficulty: 4.5,
    modifiers: { twoWay: false, wet: true, snow: false, checkpoint: false, bomb: false, laneSignals: true, spawnIntervalStart: 1.1, spawnIntervalMin: 0.6, timeOfDay: 'night' }
  },
  {
    id: 4, nameKey: 'levels.4.name', storyKey: 'levels.4.story', goalKey: 'levels.4.goal',
    scene: 'mountain-snow-dusk',
    theme: 'snowy mountain pass at dusk',
    palette: ['#c9d6e8', '#8fa3bf', '#f5a623', '#e8eef5'],
    mechanic: 'checkpoint', mechanicKey: 'levels.4.mechanic',
    mechanicNote: '每 340m 一道时空门 +9s，起始 34s；雪地更滑，找门的路线本身就是谜题。',
    goal: 2600, goalDist: 2600,
    highlight: '雪雾中门框亮起金光，计时回涨。',
    eggKey: 'levels.4.egg', egg: { kind: 'perfectline', bonus: 1200 },
    tolerance: 'mid', pacing: 'breath', difficulty: 5.2,
    modifiers: { twoWay: false, wet: false, snow: true, checkpoint: true, bomb: false, laneSignals: false, spawnIntervalStart: 1.12, spawnIntervalMin: 0.62, timeOfDay: 'dusk' }
  },
  {
    id: 5, nameKey: 'levels.5.name', storyKey: 'levels.5.story', goalKey: 'levels.5.goal',
    scene: 'boulevard-bomb-neon',
    theme: 'neon boulevard with speed bomb',
    palette: ['#120a2a', '#ff5ed2', '#f5a623', '#46e6ff'],
    mechanic: 'speedBomb', mechanicKey: 'levels.5.mechanic',
    mechanicNote: '速度 <110km/h 引信点燃，每秒 -14；达标每秒 +9 回充。慢下来找缝就等于引爆。',
    goal: 3000, goalDist: 3000,
    highlight: '引信火星随速度计摇曳，110km/h 红线下炸弹灯急促闪烁。',
    eggKey: 'levels.5.egg', egg: { kind: 'nervesteel', need: 3, lowAt: 8, bonus: 1000 },
    tolerance: 'mid', pacing: 'test', difficulty: 6.6,
    modifiers: { twoWay: false, wet: false, snow: false, checkpoint: false, bomb: true, laneSignals: true, spawnIntervalStart: 1.0, spawnIntervalMin: 0.55, timeOfDay: 'night' }
  },
  {
    id: 6, nameKey: 'levels.6.name', storyKey: 'levels.6.story', goalKey: 'levels.6.goal',
    scene: 'convoy-dawn-storm',
    theme: 'dawn convoy through storm, two-way + bomb + wet road',
    palette: ['#ffb17a', '#4a5a7a', '#2b2622', '#ff6b6b'],
    mechanic: 'dawnCombo', mechanicKey: 'levels.6.mechanic',
    mechanicNote: '炸弹 + 对向车流 + 湿地三机制同时在线；安全道反而是逆行道。',
    goal: 3600, goalDist: 3600,
    highlight: '破晓逆光里同时躲炸弹、避对向、压水膜，三重警报齐鸣。',
    eggKey: 'levels.6.egg', egg: { kind: 'dawnlegend', needCombo: 8, bonus: 2000 },
    tolerance: 'low', pacing: 'twist', difficulty: 8.2,
    modifiers: { twoWay: true, wet: true, snow: false, checkpoint: false, bomb: true, laneSignals: true, spawnIntervalStart: 0.95, spawnIntervalMin: 0.52, timeOfDay: 'dawn' }
  }
];
