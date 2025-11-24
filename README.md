# UFCIM Front 3D

Interactive 3D viewer for the IAUD campus built with Vite and Three.js. The app loads modular GLB files per building/floor, renders them with custom post-processing, exposes a public viewer API, and overlays clickable pins that open rich popups backed by data converted from Excel spreadsheets.

## Highlights
- **Three.js scene orchestration** (`src/App.js`, `World.js`, `CameraManager.js`) with OrbitControls, tweened camera motions, stats overlays, and a gradient ground plane.
- **Building/floor management** via a manifest-driven `ModelManager` that streams GLB assets from `public/assets/models/IAUD`, tracks bounding boxes, and controls visibility per floor.
- **Interactive pins & popups** created by `PinFactory` / `InteractionManager`; metadata is loaded from `public/assets/pins_db_popup.json` and rendered through `PopupManager` with camera focus + UI dimming.
- **Custom rendering passes** (`src/postprocessing/CustomOutlinePass.js`, `FindSurfaces.js`) to highlight meshes on a dedicated outline layer.
- **UI toolkit** (`UIManager.js`) that provides building filters, floor selectors, and placeholder controls for search/date blocks, all styled by `public/styles.css`.
- **Viewer API** (`UFCIMAPI.js`, exposed via `window.UFCIM` from `main.js`) for focusing pins/floors/buildings, resetting camera, and changing pin colors; also reachable through `postMessage`.

## Getting Started
| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies (Node.js 18+ recommended). |
| `npm run dev` | Start the Vite dev server on all interfaces (`vite --host`). |
| `npm run build:manifest` | Scan GLB folders and regenerate `public/assets/models/IAUD/manifest.json`. |
| `npm run build:pins` | Convert `data/qt.Ativos.xlsx` into `public/assets/pins_db_popup.json`. |
| `npm run build` | Run the manifest task and produce a production bundle in `dist/`. |

The default entry point is `index.html`, which mounts a `<canvas class="webgl">` and loads `src/main.js`.

## Data & Asset Workflow
### 3D models
- Place GLB files under `public/assets/models/IAUD/<BuildingID>/floor<N>.glb`.
- Run `npm run build:manifest` (wrapper around `tools/modelManifest.js`).
  - Parses every building directory, computes bounding boxes, extracts pin placeholders (`Pin_*` nodes), and writes a structured `manifest.json`.
  - The manifest stores pretty building/floor names, bounding boxes, and optional pin metadata that `ModelManager` rehydrates into `THREE.Vector3` instances.

### Pin popup database
- Source Excel: `data/qt.Ativos.xlsx`.
- `npm run build:pins` calls `tools/xlsxToPopupDB.js`, which:
  - Looks up header columns (`Nome da Zona Relacionada`, `Nome de Item de Biblioteca`, `Quantidade`).
  - Aggregates furniture/AC/projector counts per room.
  - Emits `{ rooms: [...] }` as `public/assets/pins_db_popup.json`.
- `PopupManager` fetches the JSON at runtime and merges it into the popup template whenever a pin is clicked.

Ensure both the manifest and popup DB are regenerated after adding/changing models or source data; `npm run build` runs the manifest step automatically, but you must call `npm run build:pins` manually whenever the spreadsheet changes.

## Pins by building and floor (manifest.json)
Table derived from `public/assets/models/IAUD/manifest.json`; floors without entries are marked as "Nenhum pin listado". Includes the API ID (`buildingId` for `focusOnBuilding`/`focusOnFloor`).

| ID (API) | Bloco | Andar | Pins |
| --- | --- | --- | --- |
| bloco1 | Bloco 01 | Terreo (0) | Sala de Leitura (Biblioteca); LEAU; Administra��o; LABCAD; Atelier Digital; Acervo (Bibilioteca); Administrativo (Biblioteca) |
| bloco1 | Bloco 01 | 1º Pavimento (1) | Nenhum pin listado |
| bloco2 | Bloco 02 | Terreo (0) | Sala 01; Audit�rio; Sala 03; Lehab; Loja 01 |
| bloco2 | Bloco 02 | 1º Pavimento (1) | Nenhum pin listado |
| bloco3 | Bloco 03 | Terreo (0) | Sala 05; Sala 06; Sala 07; Sala 08; Centro Acad�mico |
| bloco3 | Bloco 03 | 1º Pavimento (1) | Sala 12 (manuten��o); Sala 11; Sala 10; Sala 09 |
| bloco3 | Bloco 03 | 2º Pavimento (2) | Nenhum pin listado |
| bloco4 | Bloco 04 | Terreo (0) | Cantina; BHO Masculino; BHO Feminino; Sala Professores |
| bloco4 | Bloco 04 | 1º Pavimento (1) | Nenhum pin listado |
| pavilhao | Pavilhão | Terreo (0) | LED; Sala 13; Oficina Digital |
| pavilhao | Pavilhão | 1º Pavimento (1) | Atelier digital 1 |
| pavilhao | Pavilhão | 2º Pavimento (2) | Nenhum pin listado |
| entorno | Entorno | Terreo (0) | Nenhum pin listado |

## Project Structure
```
.
|-- index.html                    # App shell served by Vite
|-- public/
|   |-- styles.css                # UI + popup styling
|   `-- assets/
|       |-- pin.png               # Sprite used by PinFactory
|       |-- pins_db_popup.json    # Generated metadata for popups
|       `-- models/IAUD/          # GLB hierarchy + manifest.json
|-- src/
|   |-- main.js                   # DOM bootstrapper
|   |-- App.js                    # Wires scene, managers, and loop
|   |-- UFCIMAPI.js               # Public API surface (focus, reset, pin colors)
|   |-- config.js                 # Camera/UI constants
|   |-- CameraManager.js          # Camera tweens, fit-to-box, focus-on-pin
|   |-- InteractionManager.js     # Raycasting, pin filtering, events
|   |-- ModelManager.js           # Manifest loader, GLB lifecycle, pins
|   |-- UIManager.js              # Building/floor controls & placeholders
|   |-- PopUpManager.js           # Popup lifecycle + data binding
|   |-- PinFactory.js             # Creates pin + label sprites
|   |-- postprocessing/           # Custom outline & surface utilities
|   `-- World.js                  # Lighting and ground plane setup
|-- tools/
|   |-- modelManifest.js          # GLB manifest generator (Commander CLI)
|   `-- xlsxToPopupDB.js          # Excel -> popup DB converter
`-- data/qt.Ativos.xlsx           # Source spreadsheet for room metadata
```

## Architecture Notes
- `App` composes all managers, owns the Three.js renderer/composer, and toggles Stats panels + debug UI.
- `ModelManager` exposes hooks (`onPinsLoaded`, `onPinsVisibilityChange`) that feed `InteractionManager` so raycasting only targets visible pins.
- `InteractionManager` keeps a per-building map of sprites to gate visibility when floors are toggled; it dispatches a `pinClick` event consumed by `PopupManager`.
- `CameraManager` centralizes every camera tween (focus pin/object, reset, fit bounding box) to keep navigation behavior consistent with UI events.
- `CustomOutlinePass` works on meshes that enable layer 1 and the `color` attribute injected by `FindSurfaces`.

## Customization Tips
- Update camera behavior or controls in `src/config.js`; `App` and `CameraManager` consume those values everywhere.
- Modify UI colors/spacing inside `public/styles.css`. All UI buttons share the `.ui-btn` class for easy theming.
- To disable performance panels, toggle `this.enableStats` inside `App.init`.
- Add new popup fields by extending the template in `PopupManager._createPopupElement` and ensuring the Excel-to-JSON converter emits those properties.

## Viewer API (console & postMessage)

The app exposes a stable viewer API after initialization at `window.UFCIM` (set in `src/main.js` via `App.getAPI()`). All methods return booleans or promises.

**Methods**
- `focusOnPin(pinId, options?)` — Focus camera and optionally open popup (`options.openPopup?: boolean`).
- `focusOnFloor(buildingId, floorLevel, options?)` — Enable building, set floor, focus camera on that floor.
- `focusOnBuilding(buildingId, options?)` — Enable only that building and fit camera to its bounding box.
- `resetCamera()` — Restore camera to default config position/target.
- `setPinColor(pinId, colorHex)` — Set a pin’s color (e.g. `'#ff00ff'`).
- `setPinColorPreset(pinId, presetIndex)` — Use presets (`0` green, `1` yellow, `2` red).

### Using from the browser console
Run these after the app finishes loading:
```js
// Focus a pin by id; open popup too
window.UFCIM.focusOnPin('LABCAD', { openPopup: true });

// Focus a specific floor
window.UFCIM.focusOnFloor('bloco1', 0);

// Focus a building (hides pins until a floor/pin is focused)
window.UFCIM.focusOnBuilding('bloco1');

// Reset camera
window.UFCIM.resetCamera();

// Change pin color directly or via preset
window.UFCIM.setPinColor('LABCAD', '#ff00ff');
window.UFCIM.setPinColorPreset('LABCAD', 2); // red
```

### Using from another frame via postMessage
The viewer listens for `message` events (currently accepts all origins; lock down later). Message contract:
```ts
type UFCIMMessage =
  | { type: 'ufcim.focusOnPin'; payload: { pinId: string; options?: { openPopup?: boolean } } }
  | { type: 'ufcim.focusOnFloor'; payload: { buildingId: string; floorLevel: number; options?: any } }
  | { type: 'ufcim.focusOnBuilding'; payload: { buildingId: string; options?: any } }
  | { type: 'ufcim.resetCamera'; payload?: {} }
  | { type: 'ufcim.setPinColor'; payload: { pinId: string; color: string } }
  | { type: 'ufcim.setPinColorPreset'; payload: { pinId: string; presetIndex: number } };
```

Example from a parent page embedding the viewer in an `<iframe id="viewer">`:
```js
function sendUfcimMessage(type, payload) {
  const iframe = document.getElementById('viewer');
  iframe.contentWindow.postMessage({ type, payload }, '*'); // TODO: replace '*' with allowed origin
}

sendUfcimMessage('ufcim.focusOnPin', { pinId: 'LABCAD', options: { openPopup: true } });
sendUfcimMessage('ufcim.focusOnBuilding', { buildingId: 'bloco1' });
sendUfcimMessage('ufcim.resetCamera', {});
sendUfcimMessage('ufcim.setPinColorPreset', { pinId: 'LABCAD', presetIndex: 1 });
```

## Troubleshooting
- **Blank scene**: check that the canvas exists (`<canvas class="webgl">`) and that GLB assets + manifest are present under `public/assets/models/IAUD`.
- **Pins don't show**: confirm manifest entries include `pins`, or ensure pin meshes inside GLBs follow the `Pin_<ID>` naming convention so `ModelManager` can infer them.
- **Popup data missing**: rebuild `pins_db_popup.json` and verify the pin `id` matches the room `id` in the JSON payload.

Feel free to adapt these utilities (manifest builder, popup DB generator, camera helpers) for other 3D campuses or digital twin experiences.
