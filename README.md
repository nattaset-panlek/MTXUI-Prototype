# Muay Thai Xtreme (MTX) — Controller Flow UX Prototype

Interactive game UI prototype optimized for 10-foot gamepad & keyboard controller navigation, responsive 16:9 / 21:9 ultra-wide displays, and Figma-to-code design system inspection.

## Quick Start
- Open `index.html` directly in any modern browser (Chrome, Edge, Firefox), or serve via local web server.
- **Local Web Server**:
  - URL: http://localhost:8080/p/mtx-controller-flow/
  - LAN: http://192.168.1.120:8080/p/mtx-controller-flow/

## Controls
- **Gamepad (Xbox / PlayStation)**:
  - Left Stick / D-Pad: Navigate elements / Cursor crosshair in Skill Tree
  - A / Cross: Confirm / Select / Open details
  - B / Circle: Back / Cancel
  - X / Square: Secondary action / Reset
  - Y / Triangle: Hold to Simulate Day (Career / Management)
  - LT / RT (L1 / R1): Mode pager / Gate jump
- **Keyboard**:
  - WASD / Arrow Keys: Move / Aim (+)
  - Space / Enter: Confirm
  - Escape / Backspace: Back
  - Y: Hold to Simulate Day
  - Q / E: Mode pager / Gate jump
  - Backquote (`): Toggle Dev Tools
  - H: Toggle HUD & Toolbars

## Directory Structure
- `index.html` — Main stage and prototype entry point
- `mtx/`
  - `css/` — Stylesheets (`base.css`, `components.css`, `screens.css`)
  - `js/`
    - `app.js` — Core input loop, gamepad mapping, responsive scaling, dev tools
    - `skilltree-data.js` — Phranakhon skill tree node data & linkages
    - `screens/` — Modular screen controllers:
      - `screen-main.js` — Quick Fight / Training mode pager
      - `screen-career.js` — Rank Mode / Casual Mode toggle & fight dispatch
      - `screen-tactical.js` — Style selection carousel & color themes
      - `screen-skilltree.js` — Mastery tree with (+) crosshair cursor aim
      - `screen-manager.js` — Management screen (manager & sponsor cards), simulate day (run from Career) & event modals
      - `screen-quests.js` — Daily & seasonal quest cards
      - `screen-rewards.js` — Battle pass & reward track
      - `screen-attributes.js` — Fighter stat allocation
      - `screen-media.js` — Social feed, followers & reputation
  - `assets/`
    - `img/` — WebP character, manager, sponsor, and event artwork
    - `svg/` — Vector icons, logos, badges, and emblems
    - `fonts/` — Typography assets
