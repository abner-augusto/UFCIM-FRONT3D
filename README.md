# ufcim-front3d

SPA de gerenciamento de espaços para os campi da UFC, com visualizador 3D interativo e fluxo completo de reservas. Construído com **Vue 3**, **Three.js** e **Vite**.

> **Escopo atual:** MVP focado no departamento IAUD, campus Benfica.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| 3D Engine | Three.js (r168+) com GLTFLoader + DRACOLoader |
| Estado global | Pinia |
| Roteamento | Vue Router 4 (hash mode) |
| Build | Vite |
| PWA | vite-plugin-pwa |
| Tipagem | TypeScript |
| Deploy | Cloudflare Pages + `_worker.js` proxy |

---

## Arquitetura

```
src/
├── main.ts               # Bootstrap: Pinia, Vue Router, restauração de sessão via token
├── App.vue               # Root component — layout shell + NavDrawer
│
├── router/
│   └── index.ts          # Rotas com hash history; guards requiresAuth / guestOnly
│
├── views/                # Componentes de página (lazy-loaded)
│   ├── LoginView.vue
│   ├── AcceptInviteView.vue
│   ├── CampusSelectView.vue
│   ├── DepartmentSelectView.vue
│   ├── ViewerView.vue         # ★ Visualizador 3D — orquestra ThreeViewer + popups + cores de pins
│   ├── SpaceBrowserView.vue   # Listagem filtrada de espaços com disponibilidade
│   ├── ReservationView.vue    # Seleção de horário para reserva
│   ├── ConfirmReservationView.vue
│   ├── MyReservationsView.vue
│   ├── BlockingCreateView.vue
│   ├── MyBlockingsView.vue
│   ├── NotificationsView.vue
│   └── ProfileView.vue
│
├── components/           # Componentes reutilizáveis
│   ├── ThreeViewer.vue        # ★ Encapsulamento do Three.js — monta/desmonta com dispose de GPU
│   ├── RoomPopup.vue          # Popup de detalhes do espaço ao clicar no pin
│   ├── PeriodSelector.vue     # Seletor manhã/tarde/noite
│   ├── ViewerControlsRail.vue # Controles mobile do viewer
│   ├── ViewerSearchSheet.vue  # Sheet de busca por espaço no viewer
│   ├── SpaceCard.vue          # Card de espaço na listagem
│   └── NavDrawer.vue          # Menu lateral com links role-gated
│
├── stores/               # Pinia stores
│   ├── auth.ts           # Token, user info, unreadCount, logout
│   ├── campus.ts         # Campus selecionado
│   └── reservation.ts    # Dados temporários do fluxo de reserva
│
├── composables/          # Lógica reativa reutilizável
│   ├── usePinAvailability.ts  # Busca disponibilidade por período e mapeia cores para os pins
│   └── useSpaceBrowser.ts     # Estado e filtros do SpaceBrowserView
│
├── services/
│   └── api.ts            # Cliente HTTP tipado — todas as chamadas ao backend
│
├── utils/
│   ├── roles.ts          # hasRole(), constantes CAN_BLOCK, CAN_MANAGE, etc.
│   ├── period.ts         # getCurrentPeriod(), mapeamento de períodos para ranges horários
│   └── logger.ts         # Wrapper de console com nível de log
│
├── types/
│   ├── space.ts          # Space, SpaceType, SPACE_TYPE_LABELS
│   └── reservation.ts    # Reservation, Blocking, TIME_SLOT_RANGES, BLOCK_TYPE_LABELS
│
├── data/
│   └── campuses.ts       # Lista estática de campi com id, shortName e nome exibido
│
└── styles/
    ├── tokens.css        # Design tokens CSS (variáveis de cor, tipografia, espaçamento)
    └── base.css          # Reset e estilos globais
```

> **Sem framework CSS.** Todo o estilo usa tokens CSS customizados definidos em `src/styles/tokens.css`.  
> **Sem localStorage.** Tokens de sessão são armazenados em `sessionStorage`.

---

## Visualizador 3D

O viewer é intencionalmente desacoplado do Vue para garantir performance e controle fino do ciclo de vida dos recursos de GPU.

### Fluxo de dados

```
manifest.json
    │
    ▼
ModelManager          — carrega GLBs por prédio/andar via GLTFLoader + DRACO
    │  onPinsLoaded()
    ▼
InteractionManager    — cria sprites de pin (PinFactory), raycasting no pointerdown
    │  evento "pin-click"
    ▼
ThreeViewer.vue       — expõe API imperativa via defineExpose()
    │  emit("pin-click", { pinId, displayName, ... })
    ▼
ViewerView.vue        — busca Space no Map<modelId, Space>, exibe RoomPopup
```

### Módulos Three.js (`src/three/`)

| Arquivo | Responsabilidade |
|---|---|
| `App.js` | Renderer WebGL, scene, animation loop, câmera, OrbitControls |
| `ModelManager.js` | Carrega `manifest.json`, gerencia GLBs por prédio/andar, extrai pins de nós do modelo (`Pin_<id>`), controla visibilidade por andar |
| `InteractionManager.js` | Gerencia sprites de pins, raycasting, hover/click, visibilidade por andar ativo |
| `PinFactory.js` | Fábrica de sprites de pin (canvas 2D → texture Three.js) |
| `CameraManager.js` | Transições suaves de câmera, foco em prédio/espaço |

### Ciclo de vida e memória

`ThreeViewer.vue` monta o engine Three.js no `onMounted` e chama `dispose()` em todos os recursos de GPU no `onUnmounted`. Isso é uma decisão deliberada de performance: ao navegar para outra view e voltar, o viewer reinicia do zero em vez de acumular vazamentos de memória.

### Cores de disponibilidade dos pins

Os pins exibem cores em tempo real conforme a disponibilidade do espaço no período selecionado (manhã/tarde/noite), calculadas pelo composable `usePinAvailability.ts`:

| Status | Cor |
|---|---|
| `available` | Verde |
| `partial` | Amarelo |
| `reserved` | Vermelho |
| `blocked` | Cinza |
| `closed` | Cinza escuro |
| `not_reservable` | Cinza claro |

---

## Roteamento

O router usa **hash history** (`createWebHashHistory`) para compatibilidade com Cloudflare Pages sem configuração de redirects.

| Nome da rota | Caminho | Descrição |
|---|---|---|
| `login` | `/login` | — |
| `accept-invite` | `/convite/:token` | — |
| `campus-select` | `/campus` | — |
| `department-select` | `/campus/:campusId/departamento` | — |
| `viewer` | `/campus/:campusId/viewer` | Visualizador 3D |
| `space-browser` | `/campus/:campusId/espacos` | Listagem de espaços |
| `reservation` | `/reserva/:spaceId` | Formulário de reserva |
| `reservation-confirm` | `/reserva/confirmar` | Confirmação |
| `my-reservations` | `/minhas-reservas` | — |
| `my-blockings` | `/meus-bloqueios` | — |
| `notifications` | `/notificacoes` | — |
| `blocking-create` | `/espacos/:spaceId/bloquear` | Criar bloqueio |
| `profile` | `/perfil` | — |

**Convenção:** Caminhos em português (pt-BR); nomes de rota em inglês.

---

## Estado Global (Pinia)

### `useAuthStore`
- Token JWT (sessionStorage), dados do usuário, `unreadCount` de notificações.
- `setAuth()`, `logout()`, getter `isAuthenticated`, `userRole`.

### `useCampusStore`
- `selectedCampusId` — persiste a navegação entre views.

### `useReservationStore`
- Armazena `spaceId` e `spaceName` para o fluxo de reserva entre `ReservationView` → `ConfirmReservationView`.

---

## Controle de Acesso no Frontend

Permissões de UI são centralizadas em `src/utils/roles.ts`:

```ts
// Exemplo
export const CAN_BLOCK = ['coordinator', 'staff', 'maintenance'];
export function hasRole(userRole: string, allowedRoles: string[]): boolean
```

Componentes como `NavDrawer.vue` usam `hasRole()` para exibir ou ocultar links. O backend é a fonte de verdade — as verificações de frontend são apenas UX.

---

## Assets 3D

Os modelos GLB ficam em `public/assets/models/IAUD/` e são referenciados por um manifesto JSON gerado automaticamente.

### `manifest.json`

Estrutura por prédio → andares → pins:

```json
{
  "bloco1": {
    "name": "Bloco 1",
    "bbox": { "min": [...], "max": [...] },
    "floors": [
      {
        "file": "floor0.glb",
        "name": "Térreo",
        "level": 0,
        "pins": [
          { "id": "Sala 01", "position": [x, y, z], "opensPopup": true }
        ]
      }
    ]
  }
}
```

O `id` do pin deve corresponder ao campo `modelId` do espaço cadastrado no backend.

### Comandos de preparação de assets

```bash
npm run build:manifest   # Regenera manifest.json a partir dos GLBs
npm run build:pins       # Converte data/qt.Ativos.xlsx → public/assets/pins_db_popup.json
```

---

## Deploy

O frontend é hospedado no **Cloudflare Pages**. O arquivo `public/_worker.js` funciona como proxy reverso: requisições para `/api/v1/*` e `/auth/*` são repassadas ao backend Worker; demais requisições servem os assets estáticos.

```js
// public/_worker.js (resumo)
if (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/auth/')) {
  return fetch(new Request(BACKEND_URL + pathname, request));
}
return env.ASSETS.fetch(request);
```

---

## Como rodar localmente

### Pré-requisitos
- Node.js 18+

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

### Build de produção

```bash
npm run build
```

### Typecheck

```bash
npm run typecheck
```

---

## Convenções

- **Idioma da UI:** Português brasileiro (pt-BR) em todo texto visível ao usuário.
- **Idioma do código:** Inglês — nomes de variáveis, funções, nomes de rotas, tipos.
- **Caminhos de rota:** Português (`/minhas-reservas`); nomes programáticos: inglês (`my-reservations`).
- **Sem CSS frameworks:** Usar tokens CSS em `src/styles/tokens.css`.
- **Sem localStorage:** Usar `sessionStorage` para tokens de sessão.
- **Componentes Vue:** Sempre `<script setup>` com TypeScript.

---

## Roadmap

- [ ] Integração com Keycloak JWT em produção (substituir `devAuthMiddleware`)
- [ ] Visibilidade de espaços por escopo de departamento
- [ ] Exibição de equipamentos no `RoomPopup`
- [ ] Página de perfil do usuário (`ProfileView`)
- [ ] Expansão para outros campi além do IAUD/Benfica
- [ ] Integração com monitoramento ambiental IoT
