# GoShawk Extension

**GoShawk Extension** is a browser extension for Chrome and Firefox that lets you capture Go (Weiqi/Baduk) board diagrams and convert them into SGF or HEN format or download [PIC+hen](https://play.goshawk.cc/pic-plus) files (i.e. PNG / GIF with embedded position metadata)  - all without leaving your browser.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?logo=google-chrome&logoColor=white)
![Firefox](https://img.shields.io/badge/Firefox-supported-FF7139?logo=firefox-browser&logoColor=white)

---

## Features

- **Visual capture** - Click the extension icon, drag to select any area of the page, and GoShawk will snapshot it instantly
- **SGF/HEN conversion** - The captured image is passed to a built-in converter that reconstructs the board position as an SGF or HEN file
- **Cross-browser** - Supports both Chrome (Manifest V3 service worker) and Firefox (≥ 115)
- **No upload needed** - Everything runs locally in the browser; no image is ever sent to an external server

---

## How It Works

1. Click the **GoShawk** toolbar icon on any page containing a Go diagram
2. The page dims and a crosshair cursor appears
3. Drag to draw a rectangle around the board image
4. GoShawk captures the selection, crops it using the Canvas API (respecting device pixel ratio), and opens a new tab with the **SGF/HEN from Image** tool pre-loaded with your screenshot
5. Use the converter to adjust intersections, mark stones, and export the position

Press **Esc** at any time to cancel the selection.

---

## SGF/HEN from Image

The `sgf_from_image` component included in this repository (`src/sgf_from_image/`) is derived from the original tool developed by [kaorahi](https://github.com/kaorahi) as part of the [LizGoban](https://github.com/kaorahi/lizgoban) project ([original source](https://github.com/kaorahi/lizgoban/tree/master/src/sgf_from_image)).

It has been adapted and modified in this repository to integrate with the GoShawk extension — most notably to accept an image passed programmatically from the extension rather than requiring manual file input.

The component is distributed under the **GNU General Public License v3.0**, consistent with the license of the upstream project. See [`src/sgf_from_image/LICENSE.txt`](src/sgf_from_image/LICENSE.txt).

You can also try the [online demo](http://kaorahi.github.io/lizgoban/src/sgf_from_image/sgf_from_image.html) of the original, unmodified tool.

---

## Dependencies

GoShawk Extension relies on **[hen-js](https://github.com/hemme/hen-js)**, a library for the HEN board format used by the SGF/HEN converter. It must be present in the `hen-js/` folder at the root of the repository before building.

```bash
# Clone hen-js alongside the extension
git clone https://github.com/hemme/hen-js.git hen-js
```

> [!IMPORTANT]
> Without `hen-js/`, the build script will warn and the SGF/HEN converter will fail to load at runtime.

---

## Building

Prerequisites: **Node.js** (any recent LTS).

```bash
# 1. Clone the dependency
git clone https://github.com/hemme/hen-js.git hen-js

# 2. Build for both Chrome and Firefox
node build.js
```

The build script produces two directories and two zip archives inside `build/`:

| Output | Contents |
|---|---|
| `build/chrome/` | Chrome-ready unpacked extension |
| `build/firefox/` | Firefox-ready unpacked extension |
| `build/goshawk-chrome-v<version>.zip` | Packaged for Chrome Web Store |
| `build/goshawk-firefox-v<version>.zip` | Packaged for Firefox Add-ons |

---

## Installation (Development)

### Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select `build/chrome/`

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select any file inside `build/firefox/` (e.g. `manifest.json`)

---

## Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Access the currently active tab to inject the selection overlay |
| `scripting` | Inject the content script programmatically when needed |
| `tabs` | Query the active tab and capture the visible area |
| `storage` | Pass the captured image from the background worker to the converter tab |
| `downloads` | (Reserved for future direct SGF download support) |
| `<all_urls>` | Allow the content script to run on any page where a Go diagram may appear |

---

## License

GoShawk Extension is released under the **GNU General Public License v3.0** - see [LICENSE](LICENSE) for the full text.

The `sgf_from_image` component is © kaorahi, originally developed as part of [LizGoban](https://github.com/kaorahi/lizgoban). It has been modified in this repository for use within the GoShawk extension and is redistributed under the **GNU General Public License v3.0** — see [`src/sgf_from_image/LICENSE.txt`](src/sgf_from_image/LICENSE.txt).
