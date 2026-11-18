// ============================================================================
// 本地存档：最佳分数、静音设置、昵称、分享统计。
// 使用 localStorage，带容错（隐私模式 / 禁用时降级为内存）。
// ============================================================================
window.G = window.G || {};

G.Core = G.Core || {};

G.Core.storage = (function () {
  const KEY = 'pipy:highway-blaze-3d';
  let mem = {};
  let ok = true;
  try {
    const t = '__t__'; localStorage.setItem(t, t); localStorage.removeItem(t);
  } catch (e) { ok = false; }

  function readAll() {
    if (!ok) return Object.assign({}, mem);
    try { return Object.assign({}, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return Object.assign({}, mem); }
  }
  function writeAll(obj) {
    mem = obj;
    if (!ok) return;
    try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {}
  }

  return {
    get(key, def) {
      const all = readAll();
      return all[key] !== undefined ? all[key] : def;
    },
    set(key, val) {
      const all = readAll();
      all[key] = val;
      writeAll(all);
    },
    getBest() { return readAll().best || 0; },
    setBest(v) {
      const all = readAll();
      if (v > (all.best || 0)) { all.best = v; writeAll(all); return true; }
      return false;
    },
    getBestFor(level) { return (readAll().bests || {})[level] || 0; },
    setBestFor(level, v) {
      const all = readAll();
      all.bests = all.bests || {};
      if (v > (all.bests[level] || 0)) { all.bests[level] = v; writeAll(all); return true; }
      return false;
    },
    getCleared() { return readAll().cleared || 0; },
    setCleared(level) {
      const all = readAll();
      if (level > (all.cleared || 0)) { all.cleared = level; writeAll(all); }
    },
    getCoins() { return readAll().coins || 0; },
    addCoins(n) { const all = readAll(); all.coins = (all.coins || 0) + n; writeAll(all); return all.coins; },
    getMuted() { return !!readAll().muted; },
    setMuted(v) { this.set('muted', !!v); },
    getNick() { return readAll().nick || ''; },
    setNick(v) { this.set('nick', (v || '').slice(0, 16)); }
  };
})();
