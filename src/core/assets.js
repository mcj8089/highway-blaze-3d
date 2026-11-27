// ============================================================================
// 资源加载：把 PNG 美术预加载为 HTMLImage，并包装成 THREE 纹理（供精灵 / 装饰 / 地面使用）。
// 全部为已生成的原创美术（cars / trees / lamps / 场景装饰 / 道路 / UI）。
// ============================================================================
import * as THREE from 'three';

window.G = window.G || {};
G.Core = G.Core || {};

G.Core.assets = (function () {
  const NAMES = [
    'player_car', 'player2_car',
    'traffic_red', 'traffic_green', 'traffic_yellow', 'traffic_purple',
    'tree', 'lamp', 'explosion', 'smoke', 'spark', 'nitro_flame',
    'logo_badge', 'button', 'gauge',
    'road', 'grass', 'ground', 'bg_title',
    'cactus', 'rock', 'building', 'mountains'
  ];
  const images = {};   // name -> HTMLImageElement
  const texs = {};      // name -> THREE.Texture

  function loadImage(name) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { images[name] = img; resolve(img); };
      img.onerror = () => { images[name] = null; resolve(null); };
      // 单文件构建会注入 __ASSET_DATA__（data URI）；常规部署走相对路径
      img.src = (window.__ASSET_DATA__ && window.__ASSET_DATA__[name]) || ('assets/images/' + name + '.png');
    });
  }

  function texOf(name, repeat) {
    if (texs[name]) return texs[name];
    const img = images[name];
    if (!img) return null;
    const t = new THREE.Texture(img);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    t.needsUpdate = true;
    texs[name] = t;
    return t;
  }

  function loadAll(onProgress) {
    let done = 0;
    const total = NAMES.length;
    const tasks = NAMES.map(n => loadImage(n).then(() => {
      done++;
      if (onProgress) onProgress(done / total, n);
    }));
    return Promise.all(tasks).then(() => {
      // 预创建常用纹理
      texOf('road', [1, 18]);
      ['grass', 'bg_title'].forEach(n => texOf(n));
      return true;
    });
  }

  function get(name) { return images[name]; }
  function texture(name, repeat) { return texOf(name, repeat); }
  function list() { return NAMES.slice(); }

  return { loadAll, get, texture, list };
})();
