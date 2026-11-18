# Highway Blaze 3D

![Highway Blaze 3D](poster.jpg)

> **Cinematic 3D highway racer** — push a 270 km/h supercar through six hand-built worlds. Thread the traffic, chain near-miss combos, fire the nitro, and survive the speed bomb. Free in your browser, no download, no install, no sign-up.

**▶ Play now:** [https://pipygames.com/games/highway-blaze-3d-i78y](https://pipygames.com/games/highway-blaze-3d-i78y)
**More free games:** [https://pipygames.com](https://pipygames.com) · [Racing category](https://pipygames.com/category/racing) · [New releases](https://pipygames.com/new)

---

## SEO Keywords

`highway blaze 3d`, `3d racing game`, `browser racing game`, `free racing game online`, `car driving game`, `highway racer`, `traffic racer`, `endless racer`, `near-miss combo`, `nitro boost`, `wrong-way driving`, `neon racing`, `three.js game`, `webgl racing`, `arcade racing`, `html5 game`, `no download racing game`, `desktop and mobile`, `single player`, `free online game`, `pipygames`

## About

Highway Blaze 3D is an original single-player 3D highway racing game built with **Three.js** (shipped locally in `lib/`, no CDN dependency). You drive a supercar on a looping multi-lane highway and score through four channels at once: **distance**, **near-miss combos**, **overspeed** and **wrong-way**. Six stages each open a new world and a new mechanic, from a tutorial combo coast to a final convoy where the bomb, oncoming traffic and wet road are all live at once.

All art, levels, UI and audio are original to this project. The game runs on desktop and mobile, with keyboard and touch controls.

### Highlights

- **Six hand-built stages** — Golden Coast, Sunset Overpass, Neon Rain District, Whiteout Pass, Bomb Boulevard, Dawn Convoy
- **Four-channel scoring** — distance, near-miss combo, overspeed bonus, wrong-way bonus
- **Nitro system** — 100-unit tank, drains while boosting, regen over time; needs 25 to fire
- **Mechanic ladder** — wet grip, snowy pass, checkpoint gates, speed bomb, two-way traffic, signals
- **Cinematic-real rendering** — 2048 shadow maps, tuned fog and exposure, dynamic resolution that drops scale when FPS dips
- **Offline-capable** — Three.js and audio are bundled locally; the pipygames SDK loads online first and falls back to the local copy
- **Local best score** saved in-browser; one revive and three assists per run

## How to play

The car rolls forward on its own. Steer through traffic, graze cars for combo points, manage your nitro, and reach the stage distance before you wreck, run out of time or let the bomb blow.

| Action | Keyboard | Touch |
| --- | --- | --- |
| Steer left | `←` / `A` | Drag left on the canvas |
| Steer right | `→` / `D` | Drag right on the canvas |
| Brake | `↓` / `S` | Brake pedal |
| Nitro | `Shift` | Nitro button |
| Camera (chase / hood) | `C` | Camera button |
| Pause / resume | `P` / `Esc` | Pause button |

### Scoring

- **Distance** — 0.5 points per meter driven.
- **Near-miss** — base 120 points for passing a car within 3.3 m at 88 km/h or faster. Combo window 2.5 s; each chained near-miss adds a 25% combo bonus.
- **Overspeed** — 30 points per second above 190 km/h.
- **Wrong-way** — 55 points per second driving against traffic.

### Stages

| # | Stage | Mechanic | Goal |
| --- | --- | --- | --- |
| 1 | Golden Coast | Near-miss combo tutorial; gold car hidden bonus | 1500 m |
| 2 | Sunset Overpass | Two-way traffic, wrong-way bonus | 2000 m |
| 3 | Neon Rain District | Wet grip ×0.72, traffic turn signals | 2400 m |
| 4 | Whiteout Pass | Checkpoint gates every 360 m (+9 s), snowy grip ×0.62 | 2600 m |
| 5 | Bomb Boulevard | Speed bomb — drop below 110 km/h and the fuse lights | 3000 m |
| 6 | Dawn Convoy | Bomb + oncoming traffic + wet road combined | 3600 m |

## Run locally

This build uses native ES modules, so it must be served over HTTP — don't double-click `index.html` (`file://` blocks module and audio loading).

```bash
# Option 1: one-click launcher (Windows)
双击 一键启动.bat

# Option 2: manual local server
python tools/start.py 8231
# then open http://localhost:8231/
```

## Repository layout

```
index.html            Page skeleton: menu, HUD, pause / over / clear panels, touch controls
styles.css            Cinematic UI theme
config/               All tunable values
  game.config.js      Car, traffic, nitro, scoring, bomb, checkpoint, render tier
  levels.js           Six stages: scene, palette, mechanic, modifiers, goal, hidden egg
  locales.js          en / zh copy (English default; ?lang=zh for debugging)
  domains.config.js   Domain lock whitelist + redirect
  ads.config.js       Rewarded placements (revive / double coins / nitro refill)
src/
  game/main.js         State machine, main loop, four-channel scoring, combo, eggs
  art/                 Scene, vehicles, effects
  core/                Audio, storage, domain lock, ads, i18n, share
  sdk/                 Local pipygames SDK fallback + SDK config
assets/audio/         BGM and SFX WAV files
lib/three.module.js   Locally bundled Three.js (offline playable)
tools/                 Local server, capture / probe / verify scripts
poster.jpg            Cover / social thumbnail
seo.txt               Public listing title, tags and descriptions
```

## Platform notes

- **Domain lock** — only `localhost`, `127.0.0.1` and `pipygames.com` (plus subdomains) run the game; any other host finishes loading, waits 3 s, then redirects to [https://pipygames.com](https://pipygames.com). Edit `config/domains.config.js` to change the whitelist.
- **Ads** — only the pipygames SDK is wired in. When the SDK isn't ready, every rewarded button stays hidden and no reward is handed out for free.
- **Numbers** — all gameplay values live in `config/`; `src/` does not hard-code tuning numbers.

---

## 中文说明

**Highway Blaze 3D（烈焰公路 3D）** 是一款原创 3D 公路竞速浏览器游戏，Three.js 本地内置、离线可跑。驾驶跑车在循环多车道高速上穿行，通过里程、擦身连击、超速、逆行四条通道同时得分；六关六个世界，机制从擦身教学一路叠加到炸弹 + 对向车流 + 湿地同时在线的终局护航。

- 线上游玩：[https://pipygames.com/games/highway-blaze-3d-i78y](https://pipygames.com/games/highway-blaze-3d-i78y)
- 更多免费小游戏：[https://pipygames.com](https://pipygames.com)
- 本地运行：双击 `一键启动.bat`，或 `python tools/start.py 8231` 后打开 `http://localhost:8231/`（ES Module 必须走 HTTP）。

---

<div align="center">
  <b>🎮 <a href="https://pipygames.com">Pipygames.com</a></b> — free online HTML5 games, no download, no install, no sign-up.<br>
  Click, play, done — on desktop and mobile.
</div>
