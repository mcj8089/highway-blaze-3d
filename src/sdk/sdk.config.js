// ============================================================================
// 公共 SDK 配置（pipygames 平台）
// 线上 SDK：https://pipygames.com/sdk/pipysdk.min.js
// 本工程内置同源实现（src/sdk/pipysdk.js），离线可用、无外部依赖。
// ============================================================================
window.G = window.G || {};
G.SDK_CONFIG = {
  appId: 'speed-racing-3d',
  site: 'https://pipygames.com',
  sdkUrl: 'https://pipygames.com/sdk/pipysdk.min.js',
  trackEndpoint: 'https://pipygames.com/api/track', // 示例端点；本环境仅做本地埋点队列
  version: '1.0.0'
};
