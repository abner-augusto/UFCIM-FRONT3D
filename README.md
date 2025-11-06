# UFCIM Front 3D

Interactive 3D viewer for the IAUD campus built with Vite and Three.js. The app loads modular GLB files per building/floor, renders them with custom post-processing, and overlays clickable pins that open rich popups backed by data converted from Excel spreadsheets.

## Highlights
- **Three.js scene orchestration** (`src/App.js`, `World.js`, `CameraManager.js`) with OrbitControls, tweened camera motions, stats overlays, and a gradient ground plane.
- **Building/floor management** via a manifest-driven `ModelManager` that streams GLB assets from `public/assets/models/IAUD`, tracks bounding boxes, and controls visibility per floor.
- **Interactive pins & popups** created by `PinFactory` / `InteractionManager`; metadata is loaded from `public/assets/pins_db_popup.json` and rendered through `PopupManager` with camera focus + UI dimming.
- **Custom rendering passes** (`src/postprocessing/CustomOutlinePass.js`, `FindSurfaces.js`) to highlight meshes on a dedicated outline layer.
- **UI toolkit** (`UIManager.js`) that provides building filters, floor selectors, and placeholder controls for search/date blocks, all styled by `public/styles.css`.

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

## Troubleshooting
- **Blank scene**: check that the canvas exists (`<canvas class="webgl">`) and that GLB assets + manifest are present under `public/assets/models/IAUD`.
- **Pins don't show**: confirm manifest entries include `pins`, or ensure pin meshes inside GLBs follow the `Pin_<ID>` naming convention so `ModelManager` can infer them.
- **Popup data missing**: rebuild `pins_db_popup.json` and verify the pin `id` matches the room `id` in the JSON payload.

Feel free to adapt these utilities (manifest builder, popup DB generator, camera helpers) for other 3D campuses or digital twin experiences.
