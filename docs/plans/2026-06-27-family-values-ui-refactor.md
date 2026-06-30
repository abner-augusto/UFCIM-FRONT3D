# Family Values UI Refactor Implementation Plan

> **For Hermes:** Use `subagent-driven-development` or direct task-by-task execution. Implement one commit at a time. Do not batch phases.

**Goal:** Apply the Family Values UI interaction architecture to UFCIM-FRONT3D so the selected space/reservation context travels through the 3D viewer, reservation, confirmation, and list flows.

**Architecture:** Add a small interaction-continuity store, replace native destructive confirms with contextual dialog/drawer UI, decompose `RoomPopup.vue`, then introduce a contextual reservation tray while preserving route-based fallback pages. Motion must explain continuity, causality, or state; no decorative animation pass.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router hash history, shadcn-vue/reka-ui/vaul-vue, Three.js, Vitest, Playwright.

---

## Repository Rules

Read `AGENTS.md` before executing. Key rules for this plan:

- Branch for this work: `refactor-family-ui`.
- UI copy in pt-BR; identifiers/types/route names in English.
- Every Vue component uses `<script setup lang="ts">`.
- Do not couple Vue state directly into `src/three/`; use `ThreeViewer.vue` public APIs/events.
- Every commit must pass:

```bash
npm run lint
npm run type-check
npm test
```

- End of functional phases must also pass:

```bash
npm run build
```

- Before PR, run:

```bash
npm run test:e2e
```

E2E requires sibling backend repo `../ufcim-backend-proto`.

## Source Material

Primary design note:

```txt
/home/hermes-vm/Obsidian Vault/Hackaton UFC/UFCIM-FRONT3D - Arquitetura de Interação Family Values UI.md
```

User-facing planning note:

```txt
/home/hermes-vm/Obsidian Vault/Hackaton UFC/UFCIM-QA/MEL-014 — Refatoração Family Values UI.md
```

Relevant repo files inspected:

- `AGENTS.md`
- `PRODUCT.md`
- `DESIGN.md`
- `src/views/ViewerView.vue`
- `src/components/RoomPopup.vue`
- `src/views/ReservationView.vue`
- `src/views/ConfirmReservationView.vue`
- `src/views/SpaceBrowserView.vue`
- `src/views/MyReservationsView.vue`
- `src/components/SpaceCard.vue`
- `src/components/StatefulActionButton.vue`
- `src/stores/reservation.ts`
- `src/styles/tokens.css`
- `src/styles/motion.css`
- `tests/e2e/reservation.spec.ts`
- `tests/e2e/viewer.spec.ts`
- `tests/e2e/routing.spec.ts`

---

## Phase 0: Baseline and Branch

**Objective:** Start from a clean, validated branch.

**Files:**
- No code files.

**Step 1: Prepare branch**

```bash
git switch main
git pull --ff-only
git switch -c refactor-family-ui
```

**Step 2: Run baseline gates**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

Expected: all pass. Build may warn about large chunks, especially Three.js vendor chunk.

**Step 3: Commit this plan if not already committed**

```bash
git add docs/plans/2026-06-27-family-values-ui-refactor.md
git commit -m "docs: planejar refatoração family values ui"
```

---

## Phase 1: Interaction Continuity Store

### Task 1.1: Add interaction store

**Objective:** Create a tiny Pinia store for visual/navigation continuity.

**Files:**
- Create: `src/stores/interaction.ts`
- Create: `tests/unit/stores/interaction.test.ts`

**Design:**

```ts
export type InteractionOrigin = 'viewer' | 'space-browser' | 'reservation-list' | 'notification' | 'deep-link';

export interface InteractionSubject {
  campusId: string;
  spaceId?: string;
  modelId?: string;
  spaceName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  reservationId?: string;
  origin: InteractionOrigin;
}
```

The store should expose:

- `subject`
- `setSubject(subject)`
- `updateSchedule({ date, startTime, endTime })`
- `setReservation(reservationId)`
- `clear()`

**Validation:**

```bash
npx vitest run tests/unit/stores/interaction.test.ts
npm run lint
npm run type-check
npm test
```

**Commit:**

```bash
git add src/stores/interaction.ts tests/unit/stores/interaction.test.ts
git commit -m "feat(interaction): adicionar contexto visual"
```

### Task 1.2: Register selected viewer space

**Objective:** When a pin opens `RoomPopup`, record the selected space in the interaction store.

**Files:**
- Modify: `src/views/ViewerView.vue`

**Implementation notes:**

- Import `useInteractionStore`.
- When the selected `Space` is resolved from `modelId`, call `setSubject` with `campusId`, `space.id`, `space.modelId`, `space.name`, `origin: 'viewer'`.
- Do not store sensitive data.
- Do not touch `src/three/`.

**Validation:**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

**Commit:**

```bash
git add src/views/ViewerView.vue
git commit -m "feat(viewer): registrar espaço selecionado"
```

### Task 1.3: Support reservation highlight in list

**Objective:** Use `?highlight=<reservationId>` in `MyReservationsView.vue` to visually connect a new/selected reservation to the list.

**Files:**
- Modify: `src/views/MyReservationsView.vue`
- Add or modify e2e only if fixture can reliably target a known reservation.

**Implementation notes:**

- Read `route.query.highlight`.
- Add class to the matching group/item.
- Clear highlight visually after a short timeout, but leave URL behavior stable.
- Respect `prefers-reduced-motion` if adding animation.

**Validation:**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

**Commit:**

```bash
git add src/views/MyReservationsView.vue
git commit -m "feat(reservas): destacar reserva por query"
```

---

## Phase 2: Contextual Cancellation Dialog

### Task 2.1: Add failing/target e2e for contextual cancellation

**Objective:** Document expected behavior before replacing `window.confirm()`.

**Files:**
- Create or modify: `tests/e2e/my-reservations.spec.ts`

**Behavior to assert:**

- Opening cancel flow shows app-owned dialog/drawer.
- Dialog includes room/date/time summary.
- Dialog has “Manter reserva” and destructive cancel action.

**Validation:**

```bash
npx playwright test tests/e2e/my-reservations.spec.ts -g "cancelar reserva"
```

Expected initially: fail until implementation exists. If fixtures do not allow stable cancellation, mark as `test.fixme` with a precise reason and still add unit/component-level coverage where feasible.

**Commit:**

```bash
git add tests/e2e/my-reservations.spec.ts
git commit -m "test(reservas): especificar cancelamento contextual"
```

### Task 2.2: Replace native confirm

**Objective:** Remove `window.confirm()` from `MyReservationsView.vue`.

**Files:**
- Create: `src/components/CancelReservationDialog.vue`
- Modify: `src/views/MyReservationsView.vue`

**Implementation notes:**

- Use existing dialog/drawer primitives.
- Show simple reservation summary.
- For recurring series, show number of future affected occurrences if available.
- Keep API calls in the view unless extracting a composable becomes clearly useful.

**Validation:**

```bash
npm run lint
npm run type-check
npm test
npx playwright test tests/e2e/my-reservations.spec.ts -g "cancelar reserva"
npm run build
```

**Commit:**

```bash
git add src/components/CancelReservationDialog.vue src/views/MyReservationsView.vue tests/e2e/my-reservations.spec.ts
git commit -m "feat(reservas): substituir confirm por dialog"
```

### Task 2.3: Add async state feedback

**Objective:** Make cancellation feel trustworthy with `idle → submitting → success/error`.

**Files:**
- Modify: `src/components/CancelReservationDialog.vue`
- Modify: `src/views/MyReservationsView.vue`
- Optionally reuse: `src/components/StatefulActionButton.vue`

**Validation:**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

**Commit:**

```bash
git add src/components/CancelReservationDialog.vue src/views/MyReservationsView.vue
git commit -m "feat(reservas): adicionar estado ao cancelamento"
```

---

## Phase 3: Decompose RoomPopup Without Behavior Change

**Objective:** Reduce `RoomPopup.vue` risk before adding contextual reservation steps.

### Task 3.1: Extract header

**Files:**
- Create: `src/components/room-popup/RoomPopupHeader.vue`
- Modify: `src/components/RoomPopup.vue`

**Commit:** `refactor(room-popup): extrair cabeçalho`

### Task 3.2: Extract availability strip

**Files:**
- Create: `src/components/room-popup/RoomAvailabilityStrip.vue`
- Modify: `src/components/RoomPopup.vue`

**Commit:** `refactor(room-popup): extrair disponibilidade`

### Task 3.3: Extract slot detail

**Files:**
- Create: `src/components/room-popup/RoomSlotDetail.vue`
- Modify: `src/components/RoomPopup.vue`

**Commit:** `refactor(room-popup): extrair detalhe de horário`

### Task 3.4: Extract expandable details

**Files:**
- Create: `src/components/room-popup/RoomDetailsCollapse.vue`
- Modify: `src/components/RoomPopup.vue`

**Commit:** `refactor(room-popup): extrair detalhes expansíveis`

### Task 3.5: Extract actions

**Files:**
- Create: `src/components/room-popup/RoomPopupActions.vue`
- Modify: `src/components/RoomPopup.vue`

**Commit:** `refactor(room-popup): extrair ações do popup`

**Validation for every Task 3 commit:**

```bash
npm run lint
npm run type-check
npm test
```

After Task 3.5:

```bash
npm run build
npx playwright test tests/e2e/viewer.spec.ts
```

Expected: viewer still loads; popup behavior should be manually checked if browser is available.

---

## Phase 4: Contextual Reservation Tray

**Objective:** Keep the primary reservation flow inside the room context when started from the 3D viewer.

**Files to create:**

```txt
src/components/reservation-tray/ReservationTray.vue
src/components/reservation-tray/ReservationScheduleStep.vue
src/components/reservation-tray/ReservationPurposeStep.vue
src/components/reservation-tray/ReservationConfirmStep.vue
src/components/reservation-tray/ReservationSuccessStep.vue
```

### Task 4.1: Add tray shell

**Objective:** Add step container without changing default reservation behavior yet.

**Commit:** `feat(reservation-tray): criar fluxo contextual`

### Task 4.2: Wire schedule step

**Objective:** Reuse/extract availability selection logic from `RoomPopup`, avoiding duplicate rules.

**Commit:** `feat(reservation-tray): selecionar horário no contexto`

### Task 4.3: Add purpose step

**Objective:** Collect `PURPOSE_OPTIONS` and optional description.

**Commit:** `feat(reservation-tray): coletar finalidade da reserva`

### Task 4.4: Add confirmation step

**Objective:** Show compact summary and call `api.createReservation` with `StatefulActionButton`.

**Commit:** `feat(reservation-tray): confirmar reserva no popup`

### Task 4.5: Add success step

**Objective:** Show explicit success with CTAs: “Ver minhas reservas” and “Voltar para maquete”.

**Commit:** `feat(reservation-tray): finalizar com sucesso contextual`

**Validation for every Task 4 commit:**

```bash
npm run lint
npm run type-check
npm test
```

After Task 4.5:

```bash
npm run build
npx playwright test tests/e2e/reservation.spec.ts
npx playwright test tests/e2e/viewer.spec.ts
```

---

## Phase 5: Progressive Filters in Space Browser

**Objective:** Apply “Reveal” by keeping search/date visible and moving advanced filters into a sheet.

### Task 5.1: Add e2e target

**Files:**
- Create or modify: `tests/e2e/space-browser.spec.ts`

**Commit:** `test(espacos): especificar filtros progressivos`

### Task 5.2: Create SpaceFiltersSheet

**Files:**
- Create: `src/components/SpaceFiltersSheet.vue`
- Modify: `src/views/SpaceBrowserView.vue`

**Commit:** `feat(espacos): adicionar sheet de filtros`

### Task 5.3: Add active filter chips

**Files:**
- Modify: `src/views/SpaceBrowserView.vue`
- Possibly modify: `src/composables/useSpaceBrowser.ts`

**Commit:** `feat(espacos): mostrar chips de filtros ativos`

### Task 5.4: Simplify toolbar

**Files:**
- Modify: `src/views/SpaceBrowserView.vue`

**Commit:** `refactor(espacos): simplificar toolbar de busca`

**Validation:** gates for each commit; after Task 5.4 run build and focused e2e.

---

## Phase 6: Reservation Success Milestone

**Objective:** Replace the too-fast success redirect with a deliberate, useful success state.

### Task 6.1: Replace automatic redirect in ConfirmReservationView

**Files:**
- Modify: `src/views/ConfirmReservationView.vue`

**Commit:** `feat(reservas): tornar sucesso explícito`

### Task 6.2: Propagate reservation highlight

**Files:**
- Modify: `src/views/ConfirmReservationView.vue`
- Modify if needed: `src/services/api.ts` types for create response

**Commit:** `feat(reservas): destacar reserva criada`

### Task 6.3: Add restrained success feedback

**Files:**
- Modify: `src/views/ConfirmReservationView.vue`
- Possibly modify: `src/styles/motion.css`

**Commit:** `style(reservas): adicionar feedback de sucesso`

**Validation:** gates for each commit; after Task 6.3 run build + reservation e2e.

---

## Phase 7: Expandable Cards and Motion Audit

**Objective:** Make reveals feel like same-object expansion, not abrupt insertion.

### Task 7.1: Extract/shared collapse pattern

**Files:**
- Create if useful: `src/components/ExpandableCard.vue` or CSS utility in `src/styles/motion.css`

**Commit:** `refactor(cards): criar padrão de expansão`

### Task 7.2: Apply to SpaceCard

**Files:**
- Modify: `src/components/SpaceCard.vue`

**Commit:** `refactor(espacos): suavizar expansão do card`

### Task 7.3: Align reservations/blockings cards

**Files:**
- Modify: `src/views/MyReservationsView.vue`
- Modify: `src/views/MyBlockingsView.vue`

**Commit:** `refactor(cards): alinhar expansão de listas`

### Task 7.4: Motion audit documentation

**Files:**
- Modify: `src/styles/motion.css`
- Modify: this plan if needed

**Commit:** `docs(motion): registrar regra de continuidade`

### Task 7.5: Uniform polish pass on low-traffic screens

**Objective:** Apply the Delight value's "no dirty bathrooms" rule — a neglected rarely-used screen drags down the whole experience, so the obscure corners must match the hero flow's finish. This closes the one Delight gap in the plan: it is *baseline polish parity*, not added flourish, and stays within the decorative-animation restraint above.

**Files (audit, modify only where below standard):**
- `src/views/MyBlockingsView.vue`
- `src/views/MyReservationsView.vue` (empty/error/loading states)
- Any infrequently reached empty, error, or zero-result state surfaced while implementing Phases 1–6.

**Implementation notes:**

- Walk each low-traffic screen against the hero reservation flow: spacing, token usage, empty-state copy (pt-BR), loading/error feedback, and reduced-motion behavior.
- Bring each to the same standard; do **not** add new flourish, easter eggs, or motion not tied to meaning (see Out of Scope).
- Record any screen left intentionally untouched and why.

**Validation:**

```bash
npm run lint
npm run type-check
npm test
npm run build
```

**Commit:** `refactor(ui): nivelar acabamento de telas secundárias`

**Validation:** gates for each commit; final build.

---

## Phase 8: Final Validation and PR

**Objective:** Produce evidence that the full branch works.

**Commands:**

```bash
npm run lint
npm run type-check
npm test
npm run build
npm run test:e2e
```

**Manual QA checklist:**

- Maquete → RoomPopup/ReservationTray → reserva → sucesso.
- “Ver minhas reservas” highlights the reservation.
- “Voltar para maquete” preserves/focuses selected space.
- Cancel reservation simple flow uses dialog/drawer, not native confirm.
- Cancel recurring series shows larger impact.
- Buscar Espaços keeps search/date primary and filters progressive.
- Reduced motion does not break critical feedback.

**Commit if final docs/checklist changed:**

```bash
git add docs/plans/2026-06-27-family-values-ui-refactor.md
git commit -m "docs: registrar validação family values ui"
```

**Open PR:**

```bash
git push -u origin refactor-family-ui
gh pr create --base main --head refactor-family-ui \
  --title "feat: aplicar arquitetura de interação Family Values UI" \
  --body-file docs/plans/2026-06-27-family-values-ui-refactor.md
```

---

## Out of Scope

- Rewriting the Three.js engine.
- Replacing shadcn/reka/vaul primitives.
- Implementing Keycloak/login real.
- Normalizing `space.block`/`space.number` at the data layer.
- New analytics reports.
- Decorative confetti/animation not tied to meaning.

## Acceptance Criteria

- The user can reserve from the 3D map without losing room context.
- The core object — space, time range, reservation — stays visible or recoverable through transitions.
- Advanced filters no longer compete with search/date in `SpaceBrowserView`.
- `MyReservationsView.vue` no longer uses `window.confirm()`.
- Reservation success has explicit next actions.
- Low-traffic screens (blockings, empty/error/loading states) match the hero flow's finish.
- All added motion respects `prefers-reduced-motion` and explains continuity/causality/state.
- Every code commit has lint, type-check, and unit-test evidence.
- Final branch passes build and e2e before PR.
