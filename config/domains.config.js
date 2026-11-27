// ============================================================================
// 域名锁（唯一配置来源）：仅 localhost / pipygames.com 可运行；
// 其他域名加载完成 3 秒后跳转 redirect。
// ============================================================================
window.G = window.G || {};
G.config.domains = {
  allowed: ['pipygames.com', 'localhost', '127.0.0.1'],
  redirect: 'https://pipygames.com/',
  delayMs: 3000,
  allowSubdomains: true,
  debugBypass: false
};
