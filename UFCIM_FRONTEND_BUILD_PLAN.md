# UFCIM Frontend — Build Plan

> **Purpose:** Step-by-step instructions for Claude Code to transform the UFCIM-FRONT3D viewer into a full Vue 3 SPA with authentication, campus selection, room reservation, and user management.
>
> **Rule:** Follow phases in order. Each phase is self-contained with inputs, outputs, and acceptance criteria. Do not skip ahead. Run acceptance checks before moving to the next phase.

### Global Rule — Language

**All user-facing text in the interface must be in Brazilian Portuguese (pt-BR).** This includes every button, label, heading, placeholder, error message, success message, tooltip, empty state, loading text, and any string visible to the user in the browser. Code (variable names, function names, file names, comments, types) stays in English.

Route **paths** use Portuguese for readability (`/minhas-reservas`, `/reserva/confirmar`). Route **names** and programmatic identifiers stay in English (`my-reservations`, `reservation-confirm`).

This rule applies to **every phase below**. When creating stub views, placeholder text, or skeleton components, write the placeholder text in Portuguese too — never leave English-facing text in the UI even temporarily.

---

## Phase 0 — Pre-flight Checks

Before starting, verify the repo is in a workable state.

```bash
# Confirm we're in the UFCIM-FRONT3D repo
ls src/App.js src/main.js src/UFCIMAPI.js public/assets/models/IAUD/manifest.json

# Confirm Vite works
npm run dev  # Should start without errors, Ctrl+C after confirming
```

### Acceptance Criteria
- [ ] `src/App.js`, `src/main.js`, and `src/UFCIMAPI.js` exist
- [ ] `npm run dev` starts the Vite dev server
- [ ] 3D viewer loads in browser at `http://localhost:5173`

---

## Phase 1 — Install Dependencies & Configure

### 1.1 Install Vue ecosystem

```bash
npm install vue vue-router@4 pinia
npm install -D @vitejs/plugin-vue vue-tsc typescript
npm install vite-plugin-pwa workbox-precaching -D
```

### 1.2 Update `vite.config.js` → `vite.config.ts`

Rename and update to include Vue and PWA plugins:

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,glb,json}'],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
      manifest: {
        name: 'UFCIM — Reserva de Espaços UFC',
        short_name: 'UFCIM',
        theme_color: '#1D9E75',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'pt-BR',
        icons: [
          { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### 1.3 Create `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.d.ts",
    "src/**/*.vue",
    "env.d.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

### 1.4 Create `env.d.ts`

```typescript
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEV_AUTH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 1.5 Create environment files

**.env.development:**
```
VITE_API_BASE_URL=http://localhost:8787/api/v1
VITE_DEV_AUTH=true
```

**.env.production:**
```
VITE_API_BASE_URL=https://ufcim.ACCOUNT.workers.dev/api/v1
VITE_DEV_AUTH=false
```

### 1.6 Update `package.json` scripts

Add to the existing scripts (do not remove `build:manifest` or `build:pins`):

```json
{
  "scripts": {
    "dev": "vite --host",
    "build": "npm run build:manifest && vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "build:manifest": "node tools/modelManifest.js scan public/assets/models/IAUD",
    "build:pins": "node tools/xlsxToPopupDB.js"
  }
}
```

### Acceptance Criteria
- [ ] `npm install` completes without errors
- [ ] `npx vue-tsc --noEmit` runs (may have errors from missing files — that's ok at this stage)
- [ ] `vite.config.ts` is valid and Vite starts with `npx vite --host`

---

## Phase 2 — Relocate Three.js Code

Move existing Three.js source files into `src/three/` to separate them from Vue code. This is a move-only operation — no content changes.

### 2.1 Create `src/three/` directory

```bash
mkdir -p src/three/postprocessing
```

### 2.2 Move files

```bash
# Move all Three.js source files
mv src/App.js src/three/App.js
mv src/UFCIMAPI.js src/three/UFCIMAPI.js
mv src/CameraManager.js src/three/CameraManager.js
mv src/InteractionManager.js src/three/InteractionManager.js
mv src/ModelManager.js src/three/ModelManager.js
mv src/PopUpManager.js src/three/PopUpManager.js
mv src/UIManager.js src/three/UIManager.js
mv src/PinFactory.js src/three/PinFactory.js
mv src/World.js src/three/World.js
mv src/config.js src/three/config.js

# Move postprocessing
mv src/postprocessing/CustomOutlinePass.js src/three/postprocessing/CustomOutlinePass.js
mv src/postprocessing/FindSurfaces.js src/three/postprocessing/FindSurfaces.js

# Remove empty postprocessing dir if exists
rmdir src/postprocessing 2>/dev/null || true
```

### 2.3 Fix imports inside Three.js files

Update all internal imports in the moved files. The pattern:

```javascript
// BEFORE (in App.js):
import { World } from './World.js';
import { ModelManager } from './ModelManager.js';

// AFTER (in three/App.js) — no change needed, relative paths still work
// since all files moved together into the same directory
```

The only file that needs an import update is `src/main.js` which imports from `./App.js`:

```javascript
// BEFORE:
import { App } from './App.js';

// AFTER:
import { App } from './three/App.js';
```

**IMPORTANT:** Do not rename `src/main.js` yet — it still works as the Vite entry point until we replace it in Phase 3.

### 2.4 Add dispose() method to App.js

The Three.js `App` class needs a `dispose()` method for clean unmounting. Add this method to `src/three/App.js`:

```javascript
dispose() {
    // Stop animation loop
    if (this._animationFrameId) {
        cancelAnimationFrame(this._animationFrameId);
        this._animationFrameId = null;
    }

    // Dispose popup manager
    this.popupManager?.dispose();

    // Dispose debug GUI
    if (this.debugGui) {
        this.debugGui.destroy();
        this.debugGui = null;
    }

    // Remove stats panels
    if (this.statsPanel) {
        this.statsPanel.dom.remove();
        this.statsPanel = null;
    }
    if (this.drawCallsPanel) {
        this.drawCallsPanel.dom.remove();
        this.drawCallsPanel = null;
    }

    // Dispose UI manager
    this.uiManager?.dispose?.();

    // Dispose all Three.js objects
    this.scene?.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach((m) => {
                    m.map?.dispose();
                    m.normalMap?.dispose();
                    m.roughnessMap?.dispose();
                    m.metalnessMap?.dispose();
                    m.dispose();
                });
            } else {
                object.material.map?.dispose();
                object.material.normalMap?.dispose();
                object.material.roughnessMap?.dispose();
                object.material.metalnessMap?.dispose();
                object.material.dispose();
            }
        }
    });

    // Dispose postprocessing
    this.composer?.dispose?.();
    this.outlinePass?.dispose?.();

    // Dispose renderer (releases WebGL context)
    this.renderer?.dispose();
    this.renderer = null;

    // Dispose controls
    this.controls?.dispose();

    // Clear scene
    while (this.scene?.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
    }

    // Remove resize listener
    window.removeEventListener('resize', this._boundResize);
}
```

Also, store the animation frame ID and resize handler in `init()` so `dispose()` can cancel them. In the animation loop setup, change:

```javascript
// Store the frame ID
this._animationFrameId = requestAnimationFrame(this._tick.bind(this));
```

And for the resize handler:

```javascript
// In init(), store bound reference
this._boundResize = this._onResize.bind(this);
window.addEventListener('resize', this._boundResize);
```

### 2.5 Add custom event dispatch for pin clicks

In `src/three/InteractionManager.js`, where the pin click is handled and the popup is opened, also dispatch a DOM event so Vue can listen:

```javascript
// After the existing popup/interaction logic:
window.dispatchEvent(new CustomEvent('ufcim:pin-click', {
    detail: {
        pinId: pin.userData.id,
        displayName: pin.userData.displayName || pin.name,
        building: pin.userData.building,
        floorLevel: pin.userData.floorLevel,
    }
}));
```

### Acceptance Criteria
- [ ] All `.js` files are now under `src/three/`
- [ ] `src/postprocessing/` directory no longer exists (moved to `src/three/postprocessing/`)
- [ ] `src/main.js` import updated to `./three/App.js`
- [ ] `npm run dev` still works — 3D viewer loads and functions
- [ ] Pin clicks dispatch `ufcim:pin-click` custom event
- [ ] `App.js` has a `dispose()` method

---

## Phase 3 — Vue App Shell

Replace the vanilla entry point with a Vue application.

### 3.1 Rename old entry point

```bash
mv src/main.js src/three/legacy-main.js
```

Keep it as reference but it's no longer the entry point.

### 3.2 Create `src/main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

### 3.3 Update `index.html`

Replace the existing body content:

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>UFCIM</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Note:** Remove the old `<canvas class="webgl">` and `<script type="module" src="/src/main.js">`. The canvas will now be created inside `ThreeViewer.vue`.

### 3.4 Create `src/App.vue`

```vue
<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
</script>

<template>
  <AppHeader v-if="auth.isAuthenticated" />
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-main {
  min-height: 100vh;
}
</style>
```

### 3.5 Create `src/router/index.ts`

```typescript
import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/campus',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/campus',
      name: 'campus-select',
      component: () => import('@/views/CampusSelectView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campus/:campusId/viewer',
      name: 'viewer',
      component: () => import('@/views/ViewerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reserva/:spaceId',
      name: 'reservation',
      component: () => import('@/views/ReservationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reserva/confirmar',
      name: 'reservation-confirm',
      component: () => import('@/views/ConfirmReservationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/minhas-reservas',
      name: 'my-reservations',
      component: () => import('@/views/MyReservationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notificacoes',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'campus-select' };
  }
});

export default router;
```

### 3.6 Create Pinia Stores

**`src/stores/auth.ts`:**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type UserRole = 'student' | 'professor' | 'staff' | 'maintenance';

interface User {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: UserRole;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(sessionStorage.getItem('ufcim_token'));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role ?? null);

  function setAuth(jwt: string, userData: User) {
    token.value = jwt;
    user.value = userData;
    sessionStorage.setItem('ufcim_token', jwt);
  }

  function logout() {
    token.value = null;
    user.value = null;
    sessionStorage.removeItem('ufcim_token');
  }

  return { token, user, isAuthenticated, userRole, setAuth, logout };
});
```

**`src/stores/campus.ts`:**

```typescript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCampusStore = defineStore('campus', () => {
  const selectedCampusId = ref<string | null>(null);

  function selectCampus(id: string) {
    selectedCampusId.value = id;
  }

  function clearCampus() {
    selectedCampusId.value = null;
  }

  return { selectedCampusId, selectCampus, clearCampus };
});
```

**`src/stores/reservation.ts`:**

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useReservationStore = defineStore('reservation', () => {
  const spaceId = ref<string | null>(null);
  const spaceName = ref<string | null>(null);
  const date = ref<string | null>(null);
  const timeSlot = ref<'morning' | 'afternoon' | 'evening' | null>(null);
  const purpose = ref<string | null>(null);

  const isReady = computed(() =>
    !!(spaceId.value && date.value && timeSlot.value && purpose.value)
  );

  function setSpace(id: string, name: string) {
    spaceId.value = id;
    spaceName.value = name;
  }

  function setSchedule(d: string, slot: 'morning' | 'afternoon' | 'evening') {
    date.value = d;
    timeSlot.value = slot;
  }

  function setPurpose(p: string) {
    purpose.value = p;
  }

  function reset() {
    spaceId.value = null;
    spaceName.value = null;
    date.value = null;
    timeSlot.value = null;
    purpose.value = null;
  }

  return { spaceId, spaceName, date, timeSlot, purpose, isReady, setSpace, setSchedule, setPurpose, reset };
});
```

### 3.7 Create API layer

**`src/services/api.ts`:**

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(token), ...(options.headers || {}) },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, error.error || res.statusText, error.code, error.details);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Endpoints ---

export const api = {
  // Auth (dev)
  devLogin: (role: string) =>
    fetch(`${BASE_URL.replace('/api/v1', '')}/dev/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    }).then((r) => r.json() as Promise<{ token: string }>),

  // Users
  getMe: (token: string) =>
    request<{ id: string; name: string; email: string; registration: string; role: string }>(
      '/users/me', token
    ),

  // Spaces
  listSpaces: (token: string, params?: { campus?: string; type?: string }) =>
    request<{ data: any[]; pagination: any }>(
      `/spaces?${new URLSearchParams(params as any)}`, token
    ),

  getSpace: (token: string, id: string) =>
    request<any>(`/spaces/${id}`, token),

  getAvailability: (token: string, spaceId: string, date: string) =>
    request<any>(`/spaces/${spaceId}/availability?date=${date}`, token),

  // Reservations
  createReservation: (token: string, body: { spaceId: string; date: string; timeSlot: string }) =>
    request<any>('/reservations', token, { method: 'POST', body: JSON.stringify(body) }),

  getMyReservations: (token: string, page = 1, limit = 20) =>
    request<{ data: any[]; pagination: any }>(
      `/reservations/mine?page=${page}&limit=${limit}`, token
    ),

  cancelReservation: (token: string, id: string) =>
    request<any>(`/reservations/${id}/cancel`, token, { method: 'PATCH' }),

  // Notifications
  getNotifications: (token: string) =>
    request<{ data: any[] }>('/notifications', token),

  markNotificationRead: (token: string, id: string) =>
    request<any>(`/notifications/${id}/read`, token, { method: 'PATCH' }),

  markAllRead: (token: string) =>
    request<any>('/notifications/read-all', token, { method: 'PATCH' }),
};
```

**`src/composables/useApi.ts`:**

```typescript
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services/api';
import { useRouter } from 'vue-router';

export function useApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const auth = useAuthStore();
  const router = useRouter();

  async function call<T>(fn: (token: string) => Promise<T>): Promise<T | null> {
    if (!auth.token) {
      router.push({ name: 'login' });
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      return await fn(auth.token);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          auth.logout();
          router.push({ name: 'login' });
          return null;
        }
        error.value = e.message;
      } else {
        error.value = 'Erro de conexão. Tente novamente.';
      }
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, call };
}
```

### 3.8 Create stub views

Create minimal placeholder components for each view so the router works. Each file in `src/views/`:

**`LoginView.vue`:**
```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { api } from '@/services/api';

const auth = useAuthStore();
const router = useRouter();

// Dev login — will be replaced with Keycloak
async function loginAs(role: string) {
  try {
    const { token } = await api.devLogin(role);
    const userData = await api.getMe(token);
    auth.setAuth(token, {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      registration: userData.registration,
      role: userData.role as any,
    });
    router.push({ name: 'campus-select' });
  } catch (e) {
    console.error('Login failed:', e);
  }
}
</script>

<template>
  <div class="login-view">
    <div class="login-card">
      <h1>UFCIM</h1>
      <p>Reserva de Espaços — UFC</p>
      <div class="login-roles">
        <button @click="loginAs('student')">Entrar como Estudante</button>
        <button @click="loginAs('professor')">Entrar como Professor</button>
        <button @click="loginAs('staff')">Entrar como Funcionário</button>
        <button @click="loginAs('maintenance')">Entrar como Manutenção</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Implement in Phase 5 — just needs to be functional now */
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.login-card {
  text-align: center;
  padding: 2rem;
}
.login-roles {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}
.login-roles button {
  padding: 0.75rem 1.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
}
.login-roles button:hover {
  background: #f0f0f0;
}
</style>
```

**`CampusSelectView.vue`:**
```vue
<script setup lang="ts">
// Will be implemented in Phase 4
</script>

<template>
  <div class="campus-view">
    <h1>Selecione seu campus</h1>
    <p>Placeholder — implementar na Fase 4</p>
  </div>
</template>
```

**Create similar stubs for:** `ViewerView.vue`, `ReservationView.vue`, `ConfirmReservationView.vue`, `MyReservationsView.vue`, `NotificationsView.vue`. Each just needs a `<template>` with an `<h1>` identifying the page and a note saying it's a placeholder. **Remember: all placeholder text must be in Portuguese** (e.g., `<h1>Maquete 3D</h1><p>Placeholder — implementar na Fase 5</p>`).

**`src/components/AppHeader.vue`:**
```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <router-link to="/campus" class="header-logo">UFCIM</router-link>
    </div>
    <nav class="header-nav">
      <router-link to="/minhas-reservas">Minhas Reservas</router-link>
      <router-link to="/notificacoes">Notificações</router-link>
    </nav>
    <div class="header-right">
      <span class="header-user">{{ auth.user?.name }}</span>
      <button @click="logout" class="header-logout">Sair</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-logo {
  font-weight: 700;
  font-size: 1.25rem;
  color: #1D9E75;
  text-decoration: none;
}
.header-nav {
  display: flex;
  gap: 1.5rem;
}
.header-nav a {
  text-decoration: none;
  color: #555;
  font-size: 0.9rem;
}
.header-nav a.router-link-active {
  color: #1D9E75;
  font-weight: 500;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.header-user {
  font-size: 0.85rem;
  color: #777;
}
.header-logout {
  padding: 0.4rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  font-size: 0.85rem;
}
</style>
```

### Acceptance Criteria
- [ ] `npm run dev` starts and shows Vue app
- [ ] Navigating to `/#/login` shows the login view
- [ ] Clicking a role button calls the dev auth endpoint (will fail if backend isn't running — that's ok)
- [ ] Navigation guards work: visiting `/#/campus` without auth redirects to `/#/login`
- [ ] All routes resolve to their stub components without errors
- [ ] AppHeader renders with navigation links
- [ ] No console errors related to Vue, Router, or Pinia

---

## Phase 4 — Campus Selection Screen

### 4.1 Create campus data

**`src/data/campuses.ts`:**

```typescript
export interface Campus {
  id: string;
  name: string;
  shortName: string;
  city: string;
  neighborhood: string;
  buildings: string[];
  active: boolean;
  description: string;
}

export const campuses: Campus[] = [
  {
    id: 'benfica',
    name: 'Campus do Benfica',
    shortName: 'Benfica',
    city: 'Fortaleza',
    neighborhood: 'Benfica',
    buildings: ['Instituto de Arquitetura e Design (IAUD)'],
    active: true,
    description: 'Instituto de Arquitetura e Design da UFC',
  },
  {
    id: 'pici',
    name: 'Campus do Pici',
    shortName: 'Pici',
    city: 'Fortaleza',
    neighborhood: 'Pici',
    buildings: [],
    active: false,
    description: 'Campus principal com centros de Ciências, Tecnologia e Agronomia',
  },
  {
    id: 'porangabucu',
    name: 'Campus de Porangabuçu',
    shortName: 'Porangabuçu',
    city: 'Fortaleza',
    neighborhood: 'Porangabuçu',
    buildings: [],
    active: false,
    description: 'Faculdade de Medicina e Hospital Universitário',
  },
  {
    id: 'quixada',
    name: 'Campus de Quixadá',
    shortName: 'Quixadá',
    city: 'Quixadá',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Campus de Ciência da Computação e Design Digital',
  },
  {
    id: 'sobral',
    name: 'Campus de Sobral',
    shortName: 'Sobral',
    city: 'Sobral',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Engenharias e Ciências da Saúde',
  },
  {
    id: 'russas',
    name: 'Campus de Russas',
    shortName: 'Russas',
    city: 'Russas',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Engenharias e Ciência da Computação',
  },
  {
    id: 'crateus',
    name: 'Campus de Crateús',
    shortName: 'Crateús',
    city: 'Crateús',
    neighborhood: '',
    buildings: [],
    active: false,
    description: 'Sistemas de Informação e Engenharia Civil',
  },
];
```

### 4.2 Create `CampusCard.vue`

```vue
<script setup lang="ts">
import type { Campus } from '@/data/campuses';

defineProps<{
  campus: Campus;
}>();

defineEmits<{
  select: [campusId: string];
}>();
</script>

<template>
  <div
    class="campus-card"
    :class="{ 'campus-card--disabled': !campus.active }"
    @click="campus.active && $emit('select', campus.id)"
    role="button"
    :tabindex="campus.active ? 0 : -1"
    :aria-disabled="!campus.active"
  >
    <div class="campus-card__header">
      <h3 class="campus-card__name">{{ campus.shortName }}</h3>
      <span v-if="!campus.active" class="campus-card__badge">Em breve</span>
    </div>
    <p class="campus-card__description">{{ campus.description }}</p>
    <p class="campus-card__location">
      {{ campus.city }}{{ campus.neighborhood ? ` — ${campus.neighborhood}` : '' }}
    </p>
    <div v-if="campus.active && campus.buildings.length" class="campus-card__buildings">
      <span v-for="b in campus.buildings" :key="b" class="campus-card__building-tag">{{ b }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Implement proper styling — this is a functional skeleton */
.campus-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
}
.campus-card:hover:not(.campus-card--disabled) {
  border-color: #1D9E75;
  box-shadow: 0 2px 8px rgba(29, 158, 117, 0.1);
}
.campus-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.campus-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.campus-card__name {
  margin: 0;
  font-size: 1.1rem;
}
.campus-card__badge {
  font-size: 0.75rem;
  background: #f0f0f0;
  color: #888;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.campus-card__description {
  font-size: 0.85rem;
  color: #666;
  margin: 0 0 0.5rem;
}
.campus-card__location {
  font-size: 0.8rem;
  color: #999;
  margin: 0;
}
.campus-card__buildings {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.campus-card__building-tag {
  font-size: 0.75rem;
  background: #e8f5f0;
  color: #1D9E75;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
}
</style>
```

### 4.3 Implement `CampusSelectView.vue`

Replace the stub with the full implementation. Shows a grid of campus cards. Clicking the active campus (Benfica) navigates to the viewer.

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useCampusStore } from '@/stores/campus';
import { campuses } from '@/data/campuses';
import CampusCard from '@/components/CampusCard.vue';

const router = useRouter();
const campusStore = useCampusStore();

function handleSelect(campusId: string) {
  campusStore.selectCampus(campusId);
  router.push({ name: 'viewer', params: { campusId } });
}
</script>

<template>
  <div class="campus-select">
    <div class="campus-select__header">
      <h1>Selecione seu campus</h1>
      <p>Escolha o campus para visualizar e reservar espaços</p>
    </div>
    <div class="campus-select__grid">
      <CampusCard
        v-for="campus in campuses"
        :key="campus.id"
        :campus="campus"
        @select="handleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
.campus-select {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
}
.campus-select__header {
  text-align: center;
  margin-bottom: 2rem;
}
.campus-select__header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}
.campus-select__header p {
  margin: 0;
  color: #666;
}
.campus-select__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
</style>
```

### Acceptance Criteria
- [ ] `/#/campus` shows a grid of 7 campus cards
- [ ] Only "Benfica" is clickable — others show "Em breve" badge and are visually disabled
- [ ] Clicking Benfica navigates to `/#/campus/benfica/viewer`
- [ ] Campus selection is stored in Pinia

---

## Phase 5 — Three.js Viewer Integration

### 5.1 Create `ThreeViewer.vue`

This is the critical component that wraps the existing Three.js `App` class in a Vue lifecycle.

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let threeApp: any = null;

const emit = defineEmits<{
  'pin-click': [detail: { pinId: string; displayName: string; building: string; floorLevel: number }];
}>();

function onPinClick(event: Event) {
  const detail = (event as CustomEvent).detail;
  emit('pin-click', detail);
}

onMounted(async () => {
  if (!canvasRef.value) return;

  // Dynamic import to code-split the heavy Three.js bundle
  const { App } = await import('@/three/App.js');
  threeApp = new App(canvasRef.value);
  await threeApp.init();

  window.addEventListener('ufcim:pin-click', onPinClick);
});

onUnmounted(() => {
  window.removeEventListener('ufcim:pin-click', onPinClick);

  if (threeApp) {
    threeApp.dispose();
    threeApp = null;
  }
});

defineExpose({
  getAPI: () => threeApp?.api ?? null,
});
</script>

<template>
  <canvas ref="canvasRef" class="webgl"></canvas>
</template>

<style scoped>
.webgl {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
```

### 5.2 Implement `ViewerView.vue`

Replace the stub:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useReservationStore } from '@/stores/reservation';
import ThreeViewer from '@/components/ThreeViewer.vue';
import RoomPopup from '@/components/RoomPopup.vue';

const router = useRouter();
const reservationStore = useReservationStore();

const viewerRef = ref<InstanceType<typeof ThreeViewer> | null>(null);
const selectedRoom = ref<any>(null);
const showPopup = ref(false);

function handlePinClick(detail: { pinId: string; displayName: string }) {
  selectedRoom.value = detail;
  showPopup.value = true;
}

function handleReserve() {
  if (!selectedRoom.value) return;
  reservationStore.setSpace(selectedRoom.value.pinId, selectedRoom.value.displayName);
  router.push({ name: 'reservation', params: { spaceId: selectedRoom.value.pinId } });
}

function closePopup() {
  showPopup.value = false;
  selectedRoom.value = null;
}
</script>

<template>
  <div class="viewer-view">
    <ThreeViewer ref="viewerRef" @pin-click="handlePinClick" />
    <RoomPopup
      v-if="showPopup && selectedRoom"
      :room="selectedRoom"
      @close="closePopup"
      @reserve="handleReserve"
    />
  </div>
</template>

<style scoped>
.viewer-view {
  position: relative;
  width: 100vw;
  height: calc(100vh - 52px); /* subtract header height */
  overflow: hidden;
}
</style>
```

### 5.3 Create `RoomPopup.vue`

A Vue replacement for the popup currently rendered by `PopUpManager.js`. Initially simple — will be enhanced later:

```vue
<script setup lang="ts">
defineProps<{
  room: {
    pinId: string;
    displayName: string;
    building: string;
    floorLevel: number;
  };
}>();

defineEmits<{
  close: [];
  reserve: [];
}>();
</script>

<template>
  <div class="room-popup-overlay" @click.self="$emit('close')">
    <div class="room-popup">
      <button class="room-popup__close" @click="$emit('close')">&times;</button>
      <h2>{{ room.displayName }}</h2>
      <p class="room-popup__meta">
        {{ room.building }} — Andar {{ room.floorLevel }}
      </p>
      <!-- TODO: fetch room details from API and display equipment, capacity, etc. -->
      <div class="room-popup__actions">
        <button class="room-popup__reserve" @click="$emit('reserve')">
          Reservar
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-popup-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 2rem;
  z-index: 200;
}
.room-popup {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  position: relative;
}
.room-popup__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  border: none;
  background: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
}
.room-popup__meta {
  color: #666;
  font-size: 0.85rem;
  margin: 0.25rem 0 1rem;
}
.room-popup__reserve {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: #1D9E75;
  color: white;
  font-size: 1rem;
  cursor: pointer;
}
.room-popup__reserve:hover {
  background: #178a65;
}
</style>
```

### 5.4 Handle the popup conflict

The existing `PopUpManager.js` creates DOM popups on pin click. Since we now have a Vue-managed popup (`RoomPopup.vue`), we need to prevent the old popup from showing. Two options:

**Option A (recommended for now):** Comment out the popup creation in `PopUpManager.show()` so only the DOM event fires. Add a flag:

```javascript
// In PopUpManager constructor, add:
this.vueManaged = false; // Set to true when Vue handles popups

// In PopUpManager.show(), at the top:
if (this.vueManaged) {
    // Only dispatch event, don't create DOM popup
    window.dispatchEvent(new CustomEvent('ufcim:pin-click', {
        detail: { pinId: pin.userData.id, displayName: label, building: pin.userData.building, floorLevel: pin.userData.floorLevel }
    }));
    return;
}
```

Then in `ThreeViewer.vue`, after init:
```javascript
threeApp.popupManager.vueManaged = true;
```

**Option B (future):** Remove `PopUpManager.js` entirely once Vue popup is feature-complete.

### Acceptance Criteria
- [ ] `/#/campus/benfica/viewer` loads the 3D model
- [ ] The viewer canvas fills the viewport below the header
- [ ] Clicking a pin shows the Vue-managed `RoomPopup` (not the old DOM popup)
- [ ] Clicking "Reservar" navigates to `/#/reserva/<spaceId>`
- [ ] Navigating away from the viewer page releases GPU resources (check browser task manager: WebGL context count should drop)
- [ ] No memory leak: navigate viewer → reserva → back to campus → viewer multiple times, memory should not grow continuously

---

## Phase 6 — Reservation Flow

### 6.1 Implement `ReservationView.vue`

This view shows a calendar date picker, time slot selector (morning/afternoon/evening), and a purpose selector. It consumes `GET /spaces/:id/availability`.

Key behaviors:
- On mount, fetch space details via `api.getSpace()`
- Show a date picker (native `<input type="date">` is fine for MVP)
- When date is selected, fetch `api.getAvailability()` for that date
- Show three time slot buttons (morning/afternoon/evening) — disabled if unavailable
- Purpose dropdown: `estudo`, `reunião`, `aula`, `evento`
- "Continuar" button saves to reservation store and navigates to confirm

### 6.2 Implement `ConfirmReservationView.vue`

Summary of the reservation details from the store. "Confirmar Reserva" button calls `api.createReservation()`. On success, redirect to `/#/minhas-reservas` with a success notification.

If reservation store is empty (user navigated directly), redirect back to campus.

### 6.3 Implement `MyReservationsView.vue`

List of user's reservations from `api.getMyReservations()`. Each reservation card shows space name, date, time slot, status. "Cancelar" button calls `api.cancelReservation()` with confirmation dialog.

### 6.4 Implement `NotificationsView.vue`

List from `api.getNotifications()`. Each item shows title, message, timestamp, read status. "Marcar como lida" button. "Marcar todas como lidas" bulk action.

### Acceptance Criteria
- [ ] Complete reservation flow works end-to-end: viewer → popup → reserve → calendar → confirm → my reservations
- [ ] Availability check works — unavailable slots are disabled
- [ ] Cancel reservation works from My Reservations
- [ ] Notifications list loads and can be marked as read
- [ ] All views handle loading, error, and empty states
- [ ] Back navigation works correctly at every step

---

## Phase 7 — Polish & PWA

### 7.1 Responsive design
- Mobile hamburger menu for AppHeader
- Campus cards stack on small screens
- Viewer view handles touch controls (Three.js OrbitControls already supports touch)
- Reservation form is mobile-friendly

### 7.2 Visual polish
- Consistent color scheme using `#1D9E75` (teal) as primary
- Loading spinners/skeletons for async content
- Smooth page transitions (Vue `<Transition>`)
- Proper focus states for accessibility

### 7.3 PWA verification
- `npm run build` produces valid service worker
- App is installable on mobile
- GLB models are cached after first load
- Offline fallback shows a friendly message

### 7.4 Type safety
- Run `npm run type-check` and fix all errors
- Ensure all API response types are properly defined in `src/types/`

### Acceptance Criteria
- [ ] `npm run build` succeeds without errors
- [ ] `npm run type-check` passes
- [ ] App works on mobile (Chrome DevTools device emulation)
- [ ] Lighthouse PWA audit score ≥ 80
- [ ] No console errors in production build

---

## Migration Notes

### What changes from the old repo

| Before | After |
|--------|-------|
| `src/main.js` → Vite entry | `src/main.ts` → Vue app entry |
| `src/App.js` → Three.js root | `src/three/App.js` → Three.js root (moved) |
| `index.html` has `<canvas>` | `index.html` has `<div id="app">` |
| All JS in `src/` | Three.js in `src/three/`, Vue in `src/views/`, `src/components/`, etc. |
| `public/styles.css` → all styles | `public/styles.css` for viewer + scoped styles in Vue SFCs |
| No routing | Vue Router with hash mode |
| No auth | Pinia auth store + dev JWT |
| No API calls | `src/services/api.ts` + `useApi` composable |

### What stays the same

- All GLB models, manifest, and pin data unchanged
- `tools/` directory unchanged
- `public/assets/` unchanged
- Three.js class internals unchanged (only `App.js` gets `dispose()` added)
- Build commands `build:manifest` and `build:pins` unchanged
