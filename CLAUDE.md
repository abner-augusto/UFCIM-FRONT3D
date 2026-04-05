# CLAUDE.md

> This file is read automatically by Claude Code. It provides project context, conventions, and guardrails for the UFCIM frontend application.

## Project

UFCIM-FRONT3D — the frontend SPA for UFCIM (Federal University of Ceará Infrastructure Manager). Originally a standalone Three.js 3D viewer for the IAUD campus, now being expanded into a full reservation application with authentication, campus selection, room booking, and user management.

The backend API lives in a separate repository and is already complete (Hono + Drizzle ORM on Cloudflare Workers + D1). This frontend consumes it.

Before making changes that depend on backend contracts, endpoints, payloads, or business rules, always read `docs/UFCIM-API-REFERENCE.md`.

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | **Vue 3** (Composition API + `<script setup>`) | Added on top of existing Vite project |
| Router | **Vue Router 4** | Hash mode for Cloudflare Pages compatibility |
| State | **Pinia** | Auth store, campus store, reservation store |
| 3D Engine | **Three.js** (existing) | Encapsulated in `ThreeViewer.vue` component |
| Build | **Vite** (already configured) | Add `@vitejs/plugin-vue` |
| PWA | **vite-plugin-pwa** | Offline support, installability |
| Language | **TypeScript** for new code, **JavaScript** for existing Three.js code |
| Styling | **CSS** (existing `public/styles.css`) + scoped `<style>` in Vue SFCs |

## Language Policy

**UI language is Portuguese (pt-BR). Code language is English.**

- All user-facing text must be in Brazilian Portuguese: labels, buttons, headings, placeholders, error messages, success messages, tooltips, empty states, loading indicators, and any text visible in the browser.
- Code is in English: variable names, function names, class names, file names, comments, commit messages, type names, route names, store keys.
- Route **paths** use Portuguese where it makes the URL readable for users: `/minhas-reservas`, `/notificacoes`, `/reserva/confirmar`. Route **names** (used in `router.push`) stay in English: `my-reservations`, `notifications`, `reservation-confirm`.
- API error messages come from the backend in English — the frontend must map them to Portuguese before displaying to the user.

Examples:
```vue
<!-- CORRECT -->
<button>Reservar sala</button>
<p>Nenhuma reserva encontrada.</p>
<span>Carregando...</span>
<label>Data da reserva</label>
<option>Estudo em grupo</option>
<p class="error">Este horário já está reservado.</p>

<!-- WRONG -->
<button>Reserve room</button>
<p>No reservations found.</p>
```

```typescript
// CORRECT — code in English, UI strings in Portuguese
const errorMessage = ref('Erro ao carregar dados. Tente novamente.');
function handleReserve() { /* ... */ }
const isLoading = ref(false);

// WRONG — code in Portuguese
const mensagemErro = ref('...');
function lidarComReserva() { /* ... */ }
```

## Key Files

### Vue Application (new)
- `src/main.ts` — Vue app bootstrap (replaces old `src/main.js` as entry point)
- `src/App.vue` — Root component with `<router-view>` and global layout
- `src/router/index.ts` — Route definitions and navigation guards
- `src/stores/auth.ts` — Pinia store: user data, JWT token, role
- `src/stores/campus.ts` — Pinia store: selected campus
- `src/stores/reservation.ts` — Pinia store: active reservation flow state
- `src/composables/useApi.ts` — Fetch wrapper that injects `Authorization: Bearer` header
- `src/services/api.ts` — Typed API client (all backend endpoints)
- `src/views/` — Page-level components (one per route)
- `src/components/` — Reusable UI components

### Three.js Viewer (existing, relocated)
- `src/three/App.js` — Scene orchestrator (was `src/App.js`)
- `src/three/UFCIMAPI.js` — Public API (`window.UFCIM`)
- `src/three/ModelManager.js` — GLB manifest loader
- `src/three/PopUpManager.js` — Popup lifecycle (being replaced by Vue component)
- `src/three/CameraManager.js` — Camera tweens
- `src/three/InteractionManager.js` — Raycasting, pin events
- `src/three/UIManager.js` — Building/floor controls
- `src/three/config.js` — Camera and UI constants

### Assets & Data
- `public/assets/models/IAUD/manifest.json` — Building/floor/pin definitions
- `public/assets/pins_db_popup.json` — Room metadata (generated from Excel)
- `public/styles.css` — Global styles (viewer UI + popup)

## Architecture Rules

1. **Vue owns routing and state.** All navigation happens through Vue Router. The Three.js viewer is a guest component that mounts/unmounts with the route.

2. **Three.js is encapsulated.** The `ThreeViewer.vue` component manages the full lifecycle: `onMounted()` creates the scene, `onUnmounted()` disposes all GPU resources (geometries, materials, textures, renderer). No Three.js code leaks into Vue components outside `ThreeViewer.vue`.

3. **Communication via events, not direct coupling.** The Three.js viewer communicates with Vue through:
   - `window.UFCIM` API (Vue → Three.js): focus pins, change colors, reset camera
   - Custom DOM events (Three.js → Vue): `ufcim:pin-click`, `ufcim:popup-reserve`
   - Never import Vue stores inside Three.js code

4. **Views are thin.** Page components compose smaller components and call composables. Business logic lives in composables (`src/composables/`) and the API service layer (`src/services/`).

5. **API calls go through `useApi`.** Never call `fetch()` directly. The composable handles JWT injection, error normalization, and loading states.

6. **TypeScript for new code, JS for legacy.** New Vue components, stores, composables, and services are `.ts`/`.vue` with `<script setup lang="ts">`. Existing Three.js files stay as `.js` — add `// @ts-check` if touching them. Never rewrite Three.js files to TypeScript unless explicitly asked.

7. **Scoped styles in SFCs.** Use `<style scoped>` in Vue components. Global styles stay in `public/styles.css`. Never add global CSS in SFC `<style>` blocks without `scoped`.

8. **No UI framework.** Keep it lightweight — use custom CSS, no Tailwind, no Vuetify, no PrimeVue. Match the existing visual language in `styles.css`.

## File Organization

```
src/
├── main.ts                       # Vue app entry point
├── App.vue                       # Root layout (<router-view>)
├── router/
│   └── index.ts                  # Routes + navigation guards
├── stores/
│   ├── auth.ts                   # User, token, role
│   ├── campus.ts                 # Selected campus
│   └── reservation.ts            # Active reservation flow
├── views/
│   ├── LoginView.vue             # /login
│   ├── CampusSelectView.vue      # /campus
│   ├── ViewerView.vue            # /campus/:campusId/viewer
│   ├── ReservationView.vue       # /reserva/:spaceId
│   ├── ConfirmReservationView.vue # /reserva/confirmar
│   ├── MyReservationsView.vue    # /minhas-reservas
│   └── NotificationsView.vue     # /notificacoes
├── components/
│   ├── ThreeViewer.vue           # Three.js lifecycle wrapper
│   ├── RoomPopup.vue             # Room info popup (replaces PopUpManager DOM)
│   ├── CampusCard.vue            # Campus selection card
│   ├── ReservationCard.vue       # Single reservation display
│   ├── CalendarPicker.vue        # Date + time slot selector
│   ├── AppHeader.vue             # Top navigation bar
│   ├── AppSidebar.vue            # Side navigation (mobile drawer)
│   └── StatusBadge.vue           # Availability status indicator
├── composables/
│   ├── useApi.ts                 # Authenticated fetch wrapper
│   ├── useAuth.ts                # Login/logout logic
│   └── useReservation.ts         # Reservation flow logic
├── services/
│   └── api.ts                    # Backend endpoint definitions
├── types/
│   ├── api.ts                    # API response types
│   ├── campus.ts                 # Campus/building types
│   └── reservation.ts            # Reservation types
├── three/                        # ← existing Three.js code (relocated)
│   ├── App.js
│   ├── UFCIMAPI.js
│   ├── CameraManager.js
│   ├── InteractionManager.js
│   ├── ModelManager.js
│   ├── PopUpManager.js
│   ├── UIManager.js
│   ├── PinFactory.js
│   ├── World.js
│   ├── config.js
│   └── postprocessing/
│       ├── CustomOutlinePass.js
│       └── FindSurfaces.js
├── assets/                       # Vue-managed static assets (icons, etc.)
└── styles/
    └── variables.css             # CSS custom properties (design tokens)
```

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Vue components | `PascalCase.vue` | `CampusCard.vue` |
| Views | `PascalCase` + `View` suffix | `LoginView.vue` |
| Composables | `camelCase` with `use` prefix | `useAuth.ts` |
| Stores (Pinia) | `camelCase` with `use` + `Store` suffix in defineStore | `useAuthStore` |
| Store files | `kebab-case` or single word | `auth.ts` |
| Services | `camelCase` | `api.ts` |
| Types/Interfaces | `PascalCase` | `Reservation`, `Space` |
| CSS classes | `kebab-case` | `.campus-card`, `.status-badge` |
| Events (Vue) | `kebab-case` | `@pin-click`, `@reserve-room` |
| Events (DOM, Three.js→Vue) | `ufcim:` prefix | `ufcim:pin-click` |
| Route names | `kebab-case` | `campus-select`, `viewer` |
| Route paths | `kebab-case` | `/minhas-reservas` |

## Routes

| Path | Name | Component | Guard | Notes |
|------|------|-----------|-------|-------|
| `/login` | `login` | `LoginView` | guest only | Redirect to `/campus` if already logged in |
| `/campus` | `campus-select` | `CampusSelectView` | auth required | Campus selection |
| `/campus/:campusId/viewer` | `viewer` | `ViewerView` | auth + campus | 3D maquete |
| `/reserva/:spaceId` | `reservation` | `ReservationView` | auth | Calendar + form |
| `/reserva/confirmar` | `reservation-confirm` | `ConfirmReservationView` | auth + reservation data | Summary |
| `/minhas-reservas` | `my-reservations` | `MyReservationsView` | auth | User's bookings |
| `/notificacoes` | `notifications` | `NotificationsView` | auth | Alerts |
| `/` | — | redirect | — | → `/campus` if auth, else `/login` |

## Navigation Guards

```
beforeEach:
  1. If route requires auth AND no token → redirect /login
  2. If route is /login AND has token → redirect /campus
  3. If route requires campus AND no campus selected → redirect /campus
  4. If route requires reservation data AND store empty → redirect back to viewer
```

## Backend API

Base URL (dev): `http://localhost:8787/api/v1`
Auth: `Authorization: Bearer <jwt>` on all endpoints except `GET /health`.

Key endpoints consumed by this frontend:

| Method | Path | Used by |
|--------|------|---------|
| `POST` | `/dev/login` | LoginView (dev auth) |
| `GET` | `/users/me` | Auth store (profile) |
| `GET` | `/spaces` | ViewerView (room list) |
| `GET` | `/spaces/:id` | RoomPopup (details) |
| `GET` | `/spaces/:id/availability` | CalendarPicker |
| `POST` | `/reservations` | ConfirmReservationView |
| `GET` | `/reservations/mine` | MyReservationsView |
| `PATCH` | `/reservations/:id/cancel` | MyReservationsView |
| `GET` | `/notifications` | NotificationsView |
| `PATCH` | `/notifications/:id/read` | NotificationsView |
| `PATCH` | `/notifications/read-all` | NotificationsView |

## Commands

```bash
# Development
npm run dev                    # Start Vite dev server (Vue + Three.js)
npm run build                  # Production build (runs build:manifest first)
npm run build:manifest         # Regenerate GLB manifest.json
npm run build:pins             # Regenerate pins_db_popup.json from Excel
npm run preview                # Preview production build locally
npm run type-check             # Run vue-tsc --noEmit

# Asset pipeline (unchanged)
npm run build:manifest         # Scan GLB folders → manifest.json
npm run build:pins             # Excel → pins_db_popup.json
```

## Environment Variables

```bash
# .env.development
VITE_API_BASE_URL=http://localhost:8787/api/v1
VITE_DEV_AUTH=true

# .env.production
VITE_API_BASE_URL=https://ufcim.<account>.workers.dev/api/v1
VITE_DEV_AUTH=false
```

Access in code: `import.meta.env.VITE_API_BASE_URL`

## Campus Data

Hardcoded in `src/data/campuses.ts` (no API endpoint for campuses yet):

| ID | Name | Location | Status |
|----|------|----------|--------|
| `benfica` | Campus do Benfica | Fortaleza - Benfica | **active** (has IAUD 3D model) |
| `pici` | Campus do Pici | Fortaleza - Pici | disabled ("Em breve") |
| `porangabucu` | Campus de Porangabuçu | Fortaleza - Porangabuçu | disabled |
| `quixada` | Campus de Quixadá | Quixadá | disabled |
| `sobral` | Campus de Sobral | Sobral | disabled |
| `russas` | Campus de Russas | Russas | disabled |
| `crateus` | Campus de Crateús | Crateús | disabled |

Only `benfica` has a 3D model and navigates to the viewer. Others show a disabled state with "Em breve" badge.

## Three.js ↔ Vue Integration

### Mounting (ViewerView.vue → ThreeViewer.vue)
```
onMounted:
  1. Get <canvas> ref
  2. Import and instantiate three/App.js
  3. Call app.init(canvas)
  4. Store app reference
  5. Register DOM event listeners for ufcim:* events
```

### Unmounting (navigate away from viewer)
```
onUnmounted:
  1. Call app.dispose() — this must:
     - Stop animation loop
     - Dispose all geometries, materials, textures
     - Dispose renderer (releases WebGL context)
     - Remove all DOM elements (popups, UI)
     - Clear event listeners
  2. Nullify app reference
  3. Remove DOM event listeners
```

### Pin Click → Reserve Flow
```
User clicks pin in 3D
  → InteractionManager dispatches 'ufcim:pin-click' with { pinId, roomData }
  → ThreeViewer.vue catches event, emits to ViewerView.vue
  → ViewerView.vue shows RoomPopup.vue with room data
  → User clicks "Reservar" in RoomPopup
  → router.push({ name: 'reservation', params: { spaceId } })
  → ViewerView unmounts → ThreeViewer.vue onUnmounted runs → GPU freed
  → ReservationView mounts with clean memory
```

## PWA Configuration

```typescript
// vite.config.ts — VitePWA plugin config
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,json}'],
    maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB for GLB models
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/ufcim\..*\/api\/v1\/.*/,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } }
      }
    ]
  },
  manifest: {
    name: 'UFCIM — Reserva de Espaços UFC',
    short_name: 'UFCIM',
    theme_color: '#1D9E75',
    background_color: '#ffffff',
    display: 'standalone',
    lang: 'pt-BR'
  }
})
```

## Guardrails

- **Never** import Vue/Pinia inside `src/three/` files — use DOM events for communication
- **Never** leave Three.js resources undisposed — every `onMounted` must have a matching `onUnmounted` with full cleanup
- **Never** use `localStorage` for auth tokens — use Pinia with `sessionStorage` persistence only
- **Never** hardcode the API base URL — always use `import.meta.env.VITE_API_BASE_URL`
- **Never** add a CSS framework (Tailwind, Vuetify, etc.) — keep it custom and lightweight
- **Never** create barrel files (`index.ts` re-exports) — import directly from source
- **Always** use `<script setup lang="ts">` for new Vue components
- **Always** use scoped styles in SFCs
- **Always** handle loading, error, and empty states in views
- **Always** use Vue Router for navigation — never `window.location`
- **Always** type API responses with interfaces in `src/types/`
- **Always** use the `useApi` composable for backend calls

## Git Conventions

Same as backend:
```
feat(viewer): integrate Three.js as Vue component
fix(auth): handle expired token redirect
refactor(campus): extract campus data to static module
chore: add vite-plugin-pwa configuration
```

Prefixes: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`
Scope: the module or feature area

## Reference

- Backend CLAUDE.md — conventions for the API repo
- Backend TDD — full endpoint documentation and data model
- `src/three/UFCIMAPI.js` — viewer API methods (`focusOnPin`, `focusOnFloor`, etc.)
- `public/assets/models/IAUD/manifest.json` — building/floor/pin structure
