// ============================================================================
// ui.js — DOM 覆盖层：菜单 / HUD / 暂停 / 结算 / 失败 / 引导 / Toast
// 双层材质面板 + 内联 SVG 图标 + design tokens（styles.css）
// ============================================================================
window.G = window.G || {};

G.UI = (function () {
  const $ = s => document.querySelector(s);
  const T = (k, v) => G.Core.i18n.t(k, v);
  let opts = {}, hudEls = {}, menuBuilt = false;

  // —— 内联 SVG 图标（禁 emoji / 几何字符）——
  const ICON = {
    flag: '<svg viewBox="0 0 24 24"><path d="M6 3v18M6 4h11l-2.5 3.5L17 11H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    combo: '<svg viewBox="0 0 24 24"><path d="M13 2 5 13h5l-1.5 9L19 10h-5l1-8z" fill="currentColor"/></svg>',
    bomb: '<svg viewBox="0 0 24 24"><circle cx="11" cy="14" r="7" fill="currentColor"/><path d="M15.5 8.5 18 6m1.5-1.5L21 3m-2 3 1.5.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    time: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l3 2M9 2h6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
    gauge: '<svg viewBox="0 0 24 24"><path d="M4 17a8.5 8.5 0 1 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 13 16 8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="13" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 11l5-3v9l-5-3z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5v9M9.5 10c0-1.4 1-2.2 2.5-2.2s2.5.7 2.5 2c0 2.6-5 1.9-5 4.3 0 1.3 1 2.1 2.5 2.1s2.5-.8 2.5-2.2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    nitro: '<svg viewBox="0 0 24 24"><path d="M13 2 5 13h5l-1.5 9L19 10h-5l1-8z" fill="currentColor"/></svg>',
    road: '<svg viewBox="0 0 24 24"><path d="M7 21 10 3h4l3 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 6v2.4M12 11.4v2.4M12 16.8v2.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5 10 18 19.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 0 1 0 7M18.8 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    ad: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.5 9.2v5.6l5-2.8z" fill="currentColor"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 17h4M9 20h6M12 13v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>'
  };

  function el(id) { return document.getElementById(id); }

  function init(o) {
    opts = o;
    hudEls = {
      hud: $('#hud'), kmh: $('#hud-kmh'), kmhUnit: $('#hud-kmh-unit'),
      score: $('#hud-score'), dist: $('#hud-dist'),
      combo: $('#hud-combo'), comboV: $('#hud-combo-v'),
      flags: $('#hud-flags'), wrong: $('#flag-wrong'), high: $('#flag-high'),
      bombWrap: $('#hud-bomb'), bombBar: $('#hud-bomb-bar'), bombLamp: $('#hud-bomb-lamp'),
      timeWrap: $('#hud-time'), timeV: $('#hud-time-v'),
      nitroBar: $('#hud-nitro-bar'), nitroWrap: $('#hud-nitro'),
      goal: $('#hud-goal')
    };
    $('#btn-pause').innerHTML = ICON.pause + '<span>' + T('hud.pause') + '</span>';
    $('#btn-camera').innerHTML = ICON.camera + '<span>' + T('hud.camera') + '</span>';
    $('#btn-nitro').innerHTML = ICON.nitro + '<span>' + T('hud.nitro') + '</span>';
    $('#btn-pause').addEventListener('click', () => { G.Core.audio.play('click'); window.PipyGame.debug.pause(); });
    $('#btn-camera').addEventListener('click', () => { G.Core.audio.play('click'); window.PipyGame.debug.toggleCamera(); });
    $('#btn-nitro').addEventListener('pointerdown', e => { e.preventDefault(); window.G.Nitro && window.G.Nitro(); });
    // 静态 data-i18n 文案
    document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = T(n.dataset.i18n); });
    const ab = el('btn-assist');
    ab.addEventListener('click', async () => {
      const S = window.__HB_STATE || {};
      if (!(window.__HB_NITRO_LOW === true) || S.assistLeft <= 0) return;
      const ok = await G.SDK.ads.showRewarded('nitroRefill');
      if (ok === true) {
        S.assistLeft--;
        S.nitro = 100;
        G.Core.audio.play('nitro');
        toast(T('hud.nitro') + ' OK');
      }
    });
  }

  // ---------- 菜单 ----------
  function showMenu() {
    hideAll(); $('#menu').classList.add('show');
    if (!menuBuilt) { buildMenu(); menuBuilt = true; }
    refreshMenu();
  }

  function buildMenu() {
    const list = el('level-list');
    const storage = opts.storage;
    G.config.levels.forEach((lv, i) => {
      const card = document.createElement('button');
      card.className = 'lv-card';
      card.dataset.idx = i;
      card.innerHTML =
        '<div class="lv-no">' + String(lv.id).padStart(2, '0') + '</div>' +
        '<div class="lv-main"><div class="lv-name" data-k="levels.' + lv.id + '.name"></div>' +
        '<div class="lv-mech" data-k="levels.' + lv.id + '.mechanic"></div></div>' +
        '<div class="lv-side"><span class="lv-best-label">' + T('menu.best') + '</span>' +
        '<span class="lv-best" data-best="' + lv.id + '">0</span></div>' +
        '<span class="lv-state" data-state="' + lv.id + '"></span>';
      card.addEventListener('click', () => {
        const cleared = storage.getCleared();
        if (i > cleared) { G.Core.audio.play('ui'); card.classList.add('deny'); setTimeout(() => card.classList.remove('deny'), 350); return; }
        G.Core.audio.play('click');
        opts.onPlay(i);
      });
      list.appendChild(card);
    });
    // i18n 填充
    document.querySelectorAll('[data-k]').forEach(n => { n.textContent = T(n.dataset.k); });
    // 声音开关
    const sb = el('btn-sound');
    sb.innerHTML = ICON.sound + '<span>' + T('menu.sound') + '</span>';
    updateSoundBtn();
    sb.addEventListener('click', () => { const m = G.Core.audio.toggleMute(); updateSoundBtn(m); G.Core.audio.play('click'); });
  }

  function updateSoundBtn(muted) {
    const sb = el('btn-sound');
    const m = muted != null ? muted : G.Core.audio.isMuted();
    sb.classList.toggle('is-muted', m);
  }

  function refreshMenu() {
    const storage = opts.storage;
    const cleared = storage.getCleared();
    document.querySelectorAll('.lv-card').forEach(card => {
      const i = +card.dataset.idx, lv = G.config.levels[i];
      card.querySelector('[data-best]').textContent = storage.getBestFor(lv.id);
      const st = card.querySelector('[data-state]');
      const locked = i > cleared;
      card.classList.toggle('locked', locked);
      card.classList.toggle('done', i < cleared);
      st.innerHTML = locked ? ICON.lock : (i < cleared ? ICON.check : ICON.play);
    });
    el('menu-coins-v').textContent = storage.getCoins();
  }

  // ---------- HUD ----------
  function showGame() {
    hideAll(); $('#hud').classList.add('show');
    el('hud-bomb-wrap') && null;
    hudEls.bombWrap.classList.toggle('hidden', !(S().level && S().level.modifiers.bomb));
    hudEls.timeWrap.classList.toggle('hidden', !(S().level && S().level.modifiers.checkpoint));
  }
  function S() { return window.__HB_STATE || {}; }

  function updateHUD(d) {
    hudEls.kmh.textContent = Math.round(d.kmh);
    hudEls.score.textContent = d.score;
    hudEls.dist.textContent = d.distance + ' / ' + d.goal + ' m';
    hudEls.combo.classList.toggle('show', d.combo >= 2);
    hudEls.comboV.textContent = 'x' + d.combo;
    hudEls.wrong.classList.toggle('show', d.wrongWay);
    hudEls.high.classList.toggle('show', d.highSpeed);
    if (d.bomb != null) {
      hudEls.bombBar.style.width = d.bomb + '%';
      hudEls.bombWrap.classList.toggle('danger', d.bombDanger || d.bomb < 35);
    }
    if (d.time != null) {
      hudEls.timeV.textContent = Math.max(0, Math.ceil(d.time));
      hudEls.timeWrap.classList.toggle('danger', d.time < 10);
    }
    hudEls.nitroBar.style.width = d.nitro + '%';
    hudEls.nitroWrap.classList.toggle('on', d.nitroOn);
    window.__HB_NITRO_LOW = d.nitro < 25 && d.assistLeft > 0;
    updateAssistBtn(d.assistLeft);
  }

  function updateAssistBtn(left) {
    const b = el('btn-assist');
    if (!b) return;
    const can = left > 0 && window.PipyGame.ads.canShow('nitroRefill') && (window.__HB_NITRO_LOW === true);
    b.classList.toggle('show', can);
    if (can) b.innerHTML = ICON.ad + '<span>' + T('ad.assist', { n: left }) + '</span>';
  }

  function popNearMiss(dx, pts, combo) {
    const layer = el('pop-layer');
    const n = document.createElement('div');
    n.className = 'nearmiss-pop' + (dx < 0 ? ' left' : ' right');
    n.innerHTML = '<b>' + T('hud.nearmiss') + '</b><span>+' + pts + '</span>' + (combo >= 2 ? '<i>COMBO x' + combo + '</i>' : '');
    n.style.setProperty('--dx', (dx * 14) + 'px');
    layer.appendChild(n);
    setTimeout(() => n.remove(), 900);
  }

  function showTutorial(lines) {
    const t = el('tutorial');
    t.innerHTML = lines.map(l => '<p>' + l + '</p>').join('');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 5200);
  }

  // ---------- 面板 ----------
  function showPause(onResume, onRestart, onMenu) {
    hideAll(); $('#hud').classList.add('show');
    const p = $('#panel-pause'); p.classList.add('show');
    bindBtn('#p-resume', onResume); bindBtn('#p-restart', onRestart); bindBtn('#p-menu', onMenu);
  }

  function showOver(d) {
    hideAll();
    const p = $('#panel-over'); p.classList.add('show');
    const titles = { crash: 'over.crashed', bomb: 'over.bomb', timeout: 'over.timeout' };
    el('over-title').textContent = T(titles[d.kind] || 'over.crashed');
    el('over-score').textContent = d.score;
    el('over-best').textContent = d.best;
    el('over-nearmiss').textContent = d.nearMiss + '  ·  x' + d.maxCombo;
    const rv = el('over-revive');
    const canShow = d.canRevive && window.PipyGame.ads.canShow('revive');
    rv.classList.toggle('show', canShow);
    rv.classList.toggle('hidden', !canShow);
    if (canShow) { rv.innerHTML = ICON.ad + '<span>' + T('over.revive') + '</span>'; }
    bindBtn('#over-revive', d.onRevive);
    bindBtn('#over-restart', d.onRestart);
    bindBtn('#over-menu', d.onMenu);
  }

  function showClear(d) {
    hideAll();
    const p = $('#panel-clear'); p.classList.add('show');
    el('clear-score').textContent = d.score;
    el('clear-best').textContent = d.best;
    el('clear-coins').textContent = '+' + d.coins;
    const dbl = el('clear-double');
    const can = d.canDouble && window.PipyGame.ads.canShow('doubleCoins');
    dbl.classList.toggle('hidden', !can);
    if (can) dbl.innerHTML = ICON.ad + '<span>' + T('clear.double') + '</span>';
    bindBtn('#clear-double', d.onDouble);
    bindBtn('#clear-next', d.onNext);
    el('clear-next').classList.toggle('hidden', !d.hasNext);
    bindBtn('#clear-replay', d.onReplay);
    bindBtn('#clear-menu', d.onMenu);
  }

  function bindBtn(sel, fn) {
    const b = $(sel);
    if (!b) return;
    b.onclick = () => { G.Core.audio.play('click'); fn && fn(); };
  }

  function hideAll() {
    ['#menu', '#panel-pause', '#panel-over', '#panel-clear'].forEach(s => $(s).classList.remove('show'));
    $('#hud').classList.remove('show');
  }

  function toast(text) {
    const t = el('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function flashGate() {
    const g = el('gate-flash');
    g.classList.add('show');
    setTimeout(() => g.classList.remove('show'), 500);
  }

  return { init, showMenu, showGame, updateHUD, popNearMiss, showTutorial, showPause, showOver, showClear, toast, flashGate, hideAll, ICON };
})();
