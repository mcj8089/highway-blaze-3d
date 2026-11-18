// ============================================================================
// 社媒分享核心：
//  ① 移动端：优先 navigator.share（系统分享面板，覆盖所有已装 App）
//  ② 桌面端：点击平台按钮打开官方分享 URL（新标签页，自动带入链接与文案）
//  ③ TikTok / Instagram / YouTube 无通用网页接口：生成“分享卡片 + 复制链接”
// 分享卡片：实时截取游戏画面，叠加昵称、logo、站点网址，导出 PNG。
// 每次分享触发 window.G.SDK.track('share', {...}) 埋点。
// ============================================================================
window.G = window.G || {};

G.Core = G.Core || {};

G.Core.share = (function () {
  const SITE = 'https://pipygames.com';

  function shareUrl() {
    const host = (location.host || '').split(':')[0].toLowerCase();
    if (host === 'pipygames.com') return location.href;
    return SITE; // 本地 / 其他域名统一指向站点
  }

  function inviteText(nick) {
    const i18n = window.G.Core.i18n;
    const base = i18n.t('share.invite');
    return nick ? ('@' + nick + ' ' + base) : base;
  }
  function scoreText(score) {
    const i18n = window.G.Core.i18n;
    return i18n.t('share.text', { score: score });
  }

  // ① 系统分享
  function webShare(nick, score) {
    const url = shareUrl();
    const text = (nick ? ('@' + nick + ' ') : '') + scoreText(score);
    if (navigator.share) {
      navigator.share({ title: 'NEON DRIVE 3D', text: text, url: url })
        .then(() => track('system', true))
        .catch(() => track('system', false));
      return true;
    }
    return false;
  }

  // ② 平台分享链接
  function openPlatform(platform, nick, score) {
    const url = encodeURIComponent(shareUrl());
    const text = encodeURIComponent((nick ? ('@' + nick + ' ') : '') + scoreText(score));
    let link = null;
    switch (platform) {
      case 'facebook': link = 'https://www.facebook.com/sharer/sharer.php?u=' + url; break;
      case 'x':        link = 'https://twitter.com/intent/tweet?url=' + url + '&text=' + text; break;
      case 'reddit':   link = 'https://www.reddit.com/submit?url=' + url + '&title=' + text; break;
      case 'whatsapp': link = 'https://api.whatsapp.com/send?text=' + text + '%20' + url; break;
      case 'telegram': link = 'https://t.me/share/url?url=' + url + '&text=' + text; break;
      case 'linkedin': link = 'https://www.linkedin.com/sharing/share-offsite/?url=' + url; break;
      case 'youtube':  link = 'https://www.youtube.com/'; break;
      default: break;
    }
    if (link) {
      window.open(link, '_blank', 'noopener');
      track(platform, true);
    }
    return link;
  }

  // ③ 分享卡片：snapshotCanvas 为游戏画面；返回 dataURL(PNG)
  function makeCard(snapshotCanvas, nick, score) {
    const W = 600, H = 800;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');

    // 背景：梦幻渐变 + 星点
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2a1170'); g.addColorStop(0.5, '#3a1c7a'); g.addColorStop(1, '#0a0620');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.save();
    for (let i = 0; i < 60; i++) {
      x.globalAlpha = 0.15 + Math.random() * 0.5;
      x.fillStyle = i % 3 === 0 ? '#46e6ff' : (i % 3 === 1 ? '#ff5ed2' : '#ffd166');
      x.beginPath(); x.arc(Math.random() * W, Math.random() * H, Math.random() * 2 + 0.5, 0, 7); x.fill();
    }
    x.restore();

    // 顶部品牌
    x.fillStyle = '#fff'; x.textAlign = 'center';
    x.font = '700 40px "Trebuchet MS", system-ui, sans-serif';
    x.shadowColor = '#46e6ff'; x.shadowBlur = 18;
    x.fillText('NEON DRIVE 3D', W / 2, 70);
    x.shadowBlur = 0;
    x.font = '500 18px "Trebuchet MS", system-ui, sans-serif';
    x.fillStyle = '#bfeaff';
    x.fillText(window.G.Core.i18n.t('game.subtitle'), W / 2, 98);

    // 中部游戏截图（圆角）
    const sx = 40, sy = 130, sw = W - 80, sh = 380;
    x.save();
    roundRect(x, sx, sy, sw, sh, 22); x.clip();
    if (snapshotCanvas) {
      x.drawImage(snapshotCanvas, sx, sy, sw, sh);
    } else {
      x.fillStyle = '#120a35'; x.fillRect(sx, sy, sw, sh);
    }
    x.restore();
    x.strokeStyle = 'rgba(120,220,255,0.6)'; x.lineWidth = 3;
    roundRect(x, sx, sy, sw, sh, 22); x.stroke();

    // 分数
    x.fillStyle = '#ffd166'; x.font = '700 30px "Trebuchet MS", system-ui, sans-serif';
    x.fillText('SCORE  ' + (score || 0), W / 2, sy + sh + 60);

    // 昵称 / 邀请语
    x.fillStyle = '#fff'; x.font = '600 22px "Trebuchet MS", system-ui, sans-serif';
    x.fillText(inviteText(nick || ''), W / 2, sy + sh + 105);

    // 站点网址
    x.fillStyle = '#9bf3ff'; x.font = '600 22px "Trebuchet MS", system-ui, sans-serif';
    x.fillText('pipygames.com', W / 2, H - 40);

    return c.toDataURL('image/png');
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function copyLink(nick, score) {
    const text = (nick ? ('@' + nick + ' ') : '') + scoreText(score) + ' ' + shareUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => track('copy', true)).catch(() => track('copy', false));
      return true;
    }
    return false;
  }

  function track(platform, ok) {
    if (window.G.SDK && window.G.SDK.track) window.G.SDK.track('share', { platform: platform, result: ok ? 'ok' : 'cancel' });
  }

  return { shareUrl, webShare, openPlatform, makeCard, copyLink, inviteText };
})();
