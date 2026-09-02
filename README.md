# UFCIM Front 3D

SPA para localizar, consultar e reservar espaços da Universidade Federal do Ceará por meio de uma maquete 3D interativa. O escopo implantado é o MVP do IAUD, no campus Benfica.

## Funcionalidades

- Navegação por campus, departamento, prédio e andar em uma maquete Three.js.
- Disponibilidade por data e período, com seleção de faixa horária.
- Reservas simples e recorrentes, cancelamento e histórico do usuário.
- Busca e filtros de espaços fora da maquete.
- Bloqueios de salas conforme o papel do usuário.
- Notificações, chamados de equipamentos e relatórios de ocupação.
- PWA responsiva com temas claro e escuro.

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | Vue 3.5, TypeScript e Pinia |
| Componentes | Tailwind CSS 4, shadcn-vue e Reka UI |
| Visualização 3D | Three.js r184, GLTFLoader e DRACOLoader |
| Rotas | Vue Router 5 com hash history |
| Build e PWA | Vite 7 e vite-plugin-pwa |
| Testes | Vitest e Playwright |
| Hospedagem | Cloudflare Pages com proxy em `_worker.js` |

As versões exatas ficam em `package.json` e `package-lock.json`.

## Arquitetura

O frontend Vue e o motor 3D são deliberadamente separados:

```text
src/views/ViewerView.vue
  -> src/components/ThreeViewer.vue
    -> src/three/App.js
      -> ModelManager / InteractionManager / CameraManager / PinFactory
```

`ThreeViewer.vue` cria o motor no `onMounted` e chama `dispose()` no `onUnmounted`. Todo recurso de GPU, listener e animation frame criado em `src/three/` deve ser liberado durante esse teardown.

Os demais limites principais são:

- `src/router/index.ts`: rotas lazy, autenticação e restrições por papel.
- `src/services/api.ts`: cliente tipado usado por todas as chamadas ao backend.
- `src/stores/`: autenticação, campus, reserva e contexto de interação.
- `src/composables/`: disponibilidade, detalhes de sala e lógica reutilizável de UI.
- `src/styles/tokens.css`: tokens dos temas, status, layout e movimento.
- `src/components/ui/`: primitivas shadcn-vue.

Os caminhos visíveis ficam em português e os nomes programáticos das rotas ficam em inglês. O router usa `createWebHashHistory`, portanto uma URL publicada tem a forma `/#/campus/...`.

### Pins e disponibilidade

O manifesto em `public/assets/models/IAUD/manifest.json` associa prédios, andares, GLBs e pins. O `id` de cada pin deve ser igual ao `modelId` do espaço no backend.

`usePinAvailability.ts` consulta a disponibilidade e envia ao motor 3D os estados visuais de livre, parcial, reservado, bloqueado, fechado ou não reservável. A interface também apresenta texto ou ícone; cor não é o único sinal.

### Estado e acesso

Tokens, refresh tokens e campus selecionado usam `sessionStorage`. Apenas preferências não sensíveis, como o tema, usam `localStorage`.

As permissões de interface ficam em `src/utils/roles.ts`. Elas controlam navegação e ações visíveis, mas o backend continua sendo a autoridade de autorização.

## Desenvolvimento local

### Pré-requisitos

- Node.js `^20.19.0`, `>=22.12.0` ou uma versão mais nova compatível.
- npm.
- O backend em `../ufcim-backend-proto` para fluxos integrados e testes E2E.

```bash
npm ci
npm run dev
```

O Vite atende em `http://localhost:5173` e encaminha `/api/v1` e `/auth` para `http://localhost:8787`.

### Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` | Inicia o servidor Vite |
| `npm run build` | Regenera o manifesto, verifica tipos e cria `dist/` |
| `npm run type-check` | Executa `vue-tsc --noEmit` |
| `npm run lint` | Executa ESLint |
| `npm test` | Executa os testes unitários |
| `npm run test:e2e` | Executa Playwright com frontend e backend locais |
| `npm run dead-code` | Audita código e dependências com Knip |
| `npm run build:manifest` | Regenera o manifesto dos modelos GLB |
| `npm run build:pins` | Converte a planilha de ativos para JSON |

Os testes E2E usam o backend real do repositório irmão, sem mocks, e rodam com um worker porque compartilham o banco D1 local semeado pelo `globalSetup`.

## Deploy

O build é publicado no Cloudflare Pages. `public/_worker.js` encaminha `/api/v1/*` e `/auth/*` ao Worker do backend e entrega os demais arquivos estáticos.

A PWA usa atualização por confirmação: quando há uma nova versão, a interface pede ao usuário para recarregar. Consultas de disponibilidade usam estratégia `NetworkFirst` com validade de 60 segundos; as demais consultas de API têm cache de até cinco minutos.

## Convenções

- Texto da interface em português brasileiro; identificadores e tipos em inglês.
- Componentes Vue com `<script setup lang="ts">`.
- Tailwind e primitivas de `src/components/ui/` por padrão.
- CSS manual apenas quando tokens e utilitários não expressam bem o comportamento.
- Caminhos internos por `@/`, apontando para `src/`.

## Documentação

- `PRODUCT.md`: público, propósito e princípios do produto.
- `DESIGN.md`: linguagem visual e regras de interface.
- `docs/qa-routine.md`: roteiro manual por papel.
- `CHANGELOG.md`: histórico gerado pelo release-please.
