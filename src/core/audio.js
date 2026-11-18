// ============================================================================
// 音频核心：音效与 BGM 优先使用 assets/audio/*.wav（原创录制），
// 单文件版 file:// 下无法 fetch 时自动回退到 WebAudio 实时合成，保证处处有声。
// 由首个用户手势（点击/触摸）触发 init() 解锁音频上下文。
// ============================================================================
window.G = window.G || {};

G.Core = G.Core || {};

G.Core.audio = (function () {
  let ctx = null, master = null, sfxGain = null, musicGain = null;
  let muted = false, started = false;
  let buffers = {};        // 名称 -> AudioBuffer
  let musicTimer = null, step = 0, musicOn = false, bgmNode = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.85; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.30; musicGain.connect(master);
    started = true;
    loadWavs();
  }

  // 优先用单文件构建注入的 __AUDIO_DATA__（data URI）；常规部署走相对路径；失败静默回退合成
  function loadWavs() {
    ['bgm', 'click', 'crash', 'near', 'nitro', 'over', 'ui'].forEach(n => {
      const src = (window.__AUDIO_DATA__ && window.__AUDIO_DATA__[n]) || ('assets/audio/' + n + '.wav');
      fetch(src).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
        .then(ab => ctx.decodeAudioData(ab)).then(buf => { buffers[n] = buf; })
        .catch(() => {});
    });
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(freq, t0, dur, type, gain, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, gain, filterFreq, dest) {
    if (!ctx) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq || 1200; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = gain || 0.3;
    src.connect(f); f.connect(g); g.connect(dest || sfxGain); src.start(t0); src.stop(t0 + dur);
  }

  // —— 各音效合成配方（回退用）——
  const recipes = {
    ui()      { tone(660, now(), 0.07, 'sine', 0.2); },
    click()   { tone(520, now(), 0.08, 'triangle', 0.25); tone(820, now() + 0.02, 0.07, 'sine', 0.16); },
    near()    { const t = now(); tone(1200, t, 0.10, 'sine', 0.22); tone(1800, t + 0.04, 0.08, 'triangle', 0.14); },
    nitro()   { const t = now(); noise(t, 0.35, 0.22, 800); tone(220, t, 0.35, 'sawtooth', 0.16); tone(440, t + 0.05, 0.3, 'sawtooth', 0.12); },
    crash()   { const t = now(); noise(t, 0.5, 0.4, 360); tone(120, t, 0.5, 'sawtooth', 0.35); tone(80, t + 0.05, 0.45, 'square', 0.25); },
    over()    { const t = now(); [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.13, 0.34, 'sawtooth', 0.26)); },
    win()     { const t = now(); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.11, 0.3, 'triangle', 0.24)); noise(t, 0.25, 0.1, 2400); }
  };

  function play(name) {
    if (!started || muted) return;
    const buf = buffers[name];
    if (buf) {
      try {
        const src = ctx.createBufferSource(); src.buffer = buf;
        src.connect(sfxGain); src.start();
        if (name === 'bgm') { /* bgm 不作为音效循环 */ }
        return;
      } catch (e) {}
    }
    const fn = recipes[name];
    if (fn) { try { fn(); } catch (e) {} }
  }

  // —— BGM：轻快循环琶音（回退）；若 wav 存在则直接循环播放 ——
  const prog = [[220, 261.6, 329.6], [174.6, 220, 261.6], [261.6, 329.6, 392], [196, 246.9, 392]];
  const lead = [0, 2, 1, 2, 0, 1, 2, 1];
  const stepDur = 0.24;
  function scheduleStep() {
    if (!ctx || muted || !musicOn) return;
    const t = now() + 0.05;
    const bar = Math.floor(step / 8) % prog.length, chord = prog[bar];
    if (step % 8 === 0) chord.forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f / 2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 8);
      o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + stepDur * 8);
    });
    const f = chord[lead[step % lead.length]] * 2;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + stepDur * 0.9);
    o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + stepDur);
    if (step % 2 === 0) tone(chord[2] * 4, t, 0.08, 'sine', 0.04, musicGain);
    step++;
  }

  function startMusic() {
    if (!started) return;
    if (musicOn) return;
    musicOn = true;
    if (buffers.bgm) {
      const loop = () => {
        if (!musicOn) return;
        const src = ctx.createBufferSource(); src.buffer = buffers.bgm; src.loop = true;
        src.connect(musicGain); src.start(); bgmNode = src;
      };
      loop();
    } else {
      musicTimer = setInterval(scheduleStep, stepDur * 1000);
    }
  }
  function stopMusic() {
    musicOn = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (bgmNode) { try { bgmNode.stop(); } catch (e) {} bgmNode = null; }
  }

  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.value = muted ? 0 : 0.9;
    window.G.Core.storage.setMuted(muted);
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  return { init, play, startMusic, stopMusic, setMuted, toggleMute, isMuted, get started() { return started; }, get ctx() { return ctx; } };
})();
