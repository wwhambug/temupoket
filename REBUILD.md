# TEMUPOKET Rebuild

Open `index.html` directly, or serve this directory with any static host. No dependencies, account, network API, installation, or build step is required. All game state runs locally.

## Play

Pick one of four starters to immediately enter battle. Select a move to resolve both combatants' actions in speed order. Victory grants EXP, 22% HP, 2 PP per move, and exactly one of three rewards. Every tenth stage is a boss; stages 10, 20, and 30 have distinct route difficulty. Bosses awaken below 45% HP and grant a legendary reward option. Runs continue after stage 30. Defeat shows stage, level, kills, upgrades, and retry.

- Mouse/touch: select starter, move, or reward directly.
- Arrow keys: move selection. Enter / Space / A: execute.
- 1–4: use a battle move immediately. B / Escape: settings or back from a move slot choice.
- Mobile: the entire 960×540 scene scales to screen width at the top. A separate directional pad and A/B controls appear below; the battle layout stays fixed.
- Settings: generated sound effects, faster combat, reduced effects. Settings, best stage, and the four available starters are stored under `temupoket-rebuild-v1` when localStorage is available.

The four starter traits are active mechanics, including Jiwoo's low-HP attack boost, Crumb's dodge chance, Nuke's special attack boost/recoil, and Martial Law's damage reduction. Combat has 39 moves, twelve types, multiplicative dual-type matchups, physical/special damage, PP, priority, critical hits, buffs, burn, poison, paralysis, sleep, slow, recovery, drain and recoil. Enemy AI considers damage, type effectiveness, healing and buffs. Progression introduces more enemy move slots, stronger defensive traits, and boss awakening.

## Graphics

Original `assets/enemies/` and `assets/players/` PNGs are preserved and loaded directly. All eight player views now exist. Missing back views fall back to mirrored front views. A few provided sprites had opaque pale checkerboard remnants despite having alpha channels. `js/sprite-clips.js` supplies vector silhouettes to clip border-connected remnants during rendering; it does not alter original PNGs or enclosed highlights.

The five full-bleed pixel backgrounds are in `assets/bg/`. To regenerate backgrounds or vector clips, install Pillow for Python 3 and run `tools/generate-backgrounds.py` or `tools/generate-sprite-clips.py`. These are optional asset authoring tools, not runtime or build dependencies.

## Validation

```sh
node --check js/data.js
node --check js/sprite-clips.js
node --check js/battle.js
node --check js/main.js
node tests/engine.cjs
node tests/ui-smoke.cjs
```

Engine tests cover real turns, PP fallback, type matchups, status damage and immunities, leveling, all thirteen reward implementations, unique three-choice rewards, boss generation, defeat and first-battle simulations. The dependency-free DOM harness executes all production scripts and interaction handlers through starter → battle → victory → rewards → next stage, boss transitions 10/20/30, settings/save, game over/retry and sprite fallback.

Browser verification was attempted with the installed Playwright/Chromium. This execution sandbox denies server socket creation and Chromium startup (`Operation not permitted`). Therefore screenshot inspection, actual browser console/network verification, and actual mobile rendering remain unverified. The DOM harness is not a browser substitute or a visual verification claim.
