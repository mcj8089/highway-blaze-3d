// ============================================================================
// 广告配置：三个真实奖励位 revive / doubleCoins / nitroRefill（assist 类）
// SDK 层（src/sdk/pipysdk.js）未就绪时按钮隐藏，流程可完整通关，绝不白送奖励。
// ============================================================================
window.G = window.G || {};
G.config.ads = {
  enabled: true,
  frequency: { perSessionMax: 0, minGapSec: 25 },
  placements: {
    revive:      { type: 'rewarded', enabled: true },
    doubleCoins: { type: 'rewarded', enabled: true },
    nitroRefill: { type: 'rewarded', enabled: true }
  }
};

// SDK 侧 placements 覆盖（mergeDeep 会并入默认 revive/doubleCoins 之外的新奖励位）
if (window.G.SDK_CONFIG) {
  window.G.SDK_CONFIG.appId = 'highway-blaze-3d';
  window.G.SDK_CONFIG.placements = Object.assign({}, window.G.SDK_CONFIG.placements, {
    nitroRefill: { format: 'rewarded', id: '', enabled: true, maxPerRun: 2, cooldownMs: 0, sdk: '' }
  });
}
