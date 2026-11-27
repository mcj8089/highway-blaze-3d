// ============================================================================
// 多语言核心：读取 config/locales.js，提供 t(key) 翻译接口。
// 语言由 config/game.config.js 的 defaultLang 控制（默认英文），
// 支持 URL ?lang=zh|en 覆盖；游戏内不显示切换按钮。
// ============================================================================
window.G = window.G || {};

G.Core = G.Core || {};

G.Core.i18n = (function () {
  const cfg = (window.G.config && window.G.config.locales) || { en: {}, zh: {} };
  const fallback = cfg.en || {};

  // 决定初始语言：URL 参数 > 配置默认
  function resolveLang() {
    const params = new URLSearchParams(location.search);
    const q = params.get('lang');
    if (q === 'zh' || q === 'en') return q;
    return (window.G.config.game && window.G.config.game.defaultLang) || 'en';
  }

  let current = resolveLang();

  function t(key, vars) {
    const table = cfg[current] || fallback;
    let s = (table && table[key]) != null ? table[key] : (fallback[key] != null ? fallback[key] : key);
    if (vars) {
      for (const k in vars) s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
    }
    return s;
  }

  function lang() { return current; }
  function setLang(l) { if (l === 'zh' || l === 'en') current = l; }
  // 兼容中文界面：zh-CN 也可
  if (current !== 'zh' && current !== 'en') current = 'en';

  return { t, lang, setLang };
})();
