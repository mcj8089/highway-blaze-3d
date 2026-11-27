// ============================================================================
// 广告核心（SDK 占位）：读取 config/ads.config.js。
// enabled=false 时完全静默（不插入任何广告 UI，流程降级）。
// 接入账号后：填 channels.*.enabled=true 与对应 ID，即可在 placements 时机展示。
// 真实广告由 src/sdk/pipysdk.js 适配层调用；此处仅做调度与频率控制。
// ============================================================================
window.G = window.G || {};

G.Core = G.Core || {};

G.Core.ads = (function () {
  const cfg = () => (window.G.config && window.G.config.ads) || { enabled: false, frequency: {} };
  let shownThisSession = 0;
  let lastShownAt = 0;

  function enabled() { return !!cfg().enabled; }

  function canShow(placement) {
    if (!enabled()) return false;
    const f = cfg().frequency || {};
    const now = performance.now() / 1000;
    if (f.perSessionMax && shownThisSession >= f.perSessionMax) return false;
    if (f.minGapSec && now - lastShownAt < f.minGapSec) return false;
    return true;
  }

  // 通用展示入口；onReward 仅对 rewarded 类型有意义
  function show(placementId, onReward, onClose) {
    if (!canShow(placementId)) { if (onClose) onClose(false); return false; }
    const placements = cfg().placements || {};
    const p = placements[placementId];
    if (!p) { if (onClose) onClose(false); return false; }

    shownThisSession++;
    lastShownAt = performance.now() / 1000;

    // 真实环境此处调用渠道 SDK（y8bridge / custom）。演示中回调成功。
    // 这里提供一个可被 SDK 层覆盖的 hook。
    if (window.G.SDK && window.G.SDK.showAd) {
      return window.G.SDK.showAd(p, onReward, onClose);
    }
    // 无 SDK 时直接回调（保证流程不卡死）
    if (onReward && p.type === 'rewarded') onReward(true);
    if (onClose) onClose(true);
    return true;
  }

  return { enabled, canShow, show };
})();
