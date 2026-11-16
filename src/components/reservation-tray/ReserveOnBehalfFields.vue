<script setup lang="ts">
import { computed, nextTick, ref, toRef } from 'vue';
import { ChevronDownIcon, XIcon } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MIN_REQUESTER_QUERY, useRequesterSearch } from '@/composables/useRequesterSearch';
import type { RequesterCandidate } from '@/types/reservation';
import {
  REQUESTER_TEXT_MAX,
  emptyRequester,
  hasOrphanRequesterContact,
  requesterRoleLabel,
  requesterSearchStatus,
  type RequesterSelection,
} from '@/utils/reservation-requester';

/**
 * Optional "Reservar para outra pessoa" block (MEL-025, staff only). Staff
 * search a registered user (debounced GET /users/search) and pick one, or keep
 * the typed name as free text; the contact is optional either way.
 */
const props = defineProps<{
  modelValue: RequesterSelection;
  /** Prefix for element ids, so the block can appear in more than one form. */
  idPrefix: string;
  editing?: boolean;
  isSeries?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [selection: RequesterSelection];
}>();

const VISIBLE_RESULTS = 6;
const hasContent = (s: RequesterSelection) => !!(s.user || s.query.trim() || s.contact.trim());
const expanded = ref(hasContent(props.modelValue));
const searchInput = ref<InstanceType<typeof Input> | null>(null);
const { results, searching, searchFailed, resetSearch } = useRequesterSearch(toRef(props, 'modelValue'));

const ids = computed(() => ({
  panel: `${props.idPrefix}-panel`,
  search: `${props.idPrefix}-search`,
  hint: `${props.idPrefix}-hint`,
  contact: `${props.idPrefix}-contact`,
}));

const trimmedQuery = computed(() => props.modelValue.query.trim());
const orphanContact = computed(() => hasOrphanRequesterContact(props.modelValue));
const showResults = computed(() => !props.modelValue.user && trimmedQuery.value.length >= MIN_REQUESTER_QUERY);
const visibleResults = computed(() => results.value.slice(0, VISIBLE_RESULTS));
const searchStatus = computed(() => requesterSearchStatus({
  active: showResults.value,
  searching: searching.value,
  failed: searchFailed.value,
  visibleCount: visibleResults.value.length,
  totalCount: results.value.length,
}));

function update(patch: Partial<RequesterSelection>) {
  emit('update:modelValue', { ...props.modelValue, ...patch });
}

function removeRequester() {
  resetSearch();
  emit('update:modelValue', emptyRequester());
  expanded.value = false;
}

function toggle() {
  if (expanded.value) {
    // Closing the block drops the requester: the reservation is for oneself again.
    removeRequester();
    return;
  }
  expanded.value = true;
}

function pick(candidate: RequesterCandidate) {
  update({ user: candidate, query: candidate.name });
}

async function changePerson() {
  update({ user: null });
  await nextTick();
  (searchInput.value?.$el as HTMLInputElement | undefined)?.focus();
}
</script>

<template>
  <div class="on-behalf" data-testid="reserve-on-behalf">
    <Button
      type="button"
      variant="outline"
      class="on-behalf__toggle"
      :aria-expanded="expanded"
      :aria-controls="ids.panel"
      data-testid="reserve-on-behalf-toggle"
      @click="toggle"
    >
      <span>{{ editing ? (hasContent(modelValue) ? 'Alterar solicitante' : 'Definir solicitante') : 'Reservar para outra pessoa' }}</span>
      <ChevronDownIcon class="on-behalf__chevron" :class="{ 'on-behalf__chevron--open': expanded }" aria-hidden="true" />
    </Button>

    <div v-if="expanded" :id="ids.panel" class="on-behalf__panel">
      <p v-if="editing && isSeries" class="on-behalf__hint" data-testid="reserve-on-behalf-series-note">
        A alteração do solicitante vale para toda a série.
      </p>
      <div class="on-behalf__field">
        <Label class="on-behalf__label" :for="ids.search">Solicitante</Label>

        <div v-if="modelValue.user" class="on-behalf__picked" data-testid="reserve-on-behalf-picked">
          <div class="on-behalf__picked-text">
            <span class="on-behalf__picked-name">{{ modelValue.user.name }}</span>
            <span class="on-behalf__meta">
              {{ modelValue.user.role ? requesterRoleLabel(modelValue.user.role) : 'Usuário cadastrado' }}<template v-if="modelValue.user.department"> · {{ modelValue.user.department }}</template>
            </span>
          </div>
          <Button type="button" variant="ghost" class="on-behalf__change" @click="changePerson">
            <XIcon aria-hidden="true" />
            Trocar
          </Button>
        </div>

        <template v-else>
          <Input
            :id="ids.search"
            ref="searchInput"
            :model-value="modelValue.query"
            class="on-behalf__input"
            type="text"
            autocomplete="off"
            :maxlength="REQUESTER_TEXT_MAX"
            placeholder="Nome ou e-mail de quem pediu"
            :aria-describedby="ids.hint"
            data-testid="reserve-on-behalf-search"
            @update:model-value="update({ query: String($event) })"
          />
          <p :id="ids.hint" class="on-behalf__hint">
            Escolha alguém cadastrado na lista ou mantenha o nome digitado.
          </p>

          <p role="status" class="on-behalf__status">{{ searchStatus.message }}</p>
          <ul
            v-if="searchStatus.showList"
            class="on-behalf__list"
            aria-label="Usuários encontrados"
          >
            <li v-for="candidate in visibleResults" :key="candidate.id">
              <button
                type="button"
                class="on-behalf__option"
                data-testid="reserve-on-behalf-option"
                @click="pick(candidate)"
              >
                <span class="on-behalf__option-name">{{ candidate.name }}</span>
                <span class="on-behalf__meta">
                  {{ requesterRoleLabel(candidate.role) }}<template v-if="candidate.department"> · {{ candidate.department }}</template>
                </span>
              </button>
            </li>
          </ul>
        </template>
      </div>

      <div class="on-behalf__field">
        <Label class="on-behalf__label" :for="ids.contact">Contato <span class="on-behalf__optional">(opcional)</span></Label>
        <Input
          :id="ids.contact"
          :model-value="modelValue.contact"
          class="on-behalf__input"
          type="text"
          autocomplete="off"
          :maxlength="REQUESTER_TEXT_MAX"
          placeholder="Telefone ou e-mail"
          data-testid="reserve-on-behalf-contact"
          @update:model-value="update({ contact: String($event) })"
        />
        <p class="on-behalf__hint">Só funcionários veem o contato.</p>
        <p v-if="orphanContact" class="on-behalf__hint" role="alert">Informe o solicitante para registrar o contato.</p>
      </div>
      <Button
        v-if="editing && hasContent(modelValue)"
        type="button"
        variant="outline"
        class="on-behalf__toggle"
        data-testid="reserve-on-behalf-remove"
        @click="removeRequester"
      >
        Remover solicitante
      </Button>
    </div>
  </div>
</template>

<style scoped>
.on-behalf {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.on-behalf__toggle {
  justify-content: space-between;
  width: 100%;
  min-height: var(--tap-min, 44px);
  font-size: 0.86rem;
  font-weight: 600;
}

.on-behalf__chevron {
  transition: transform 0.2s var(--ease-out-expo, ease-out);
}

.on-behalf__chevron--open {
  transform: rotate(180deg);
}

.on-behalf__panel {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.on-behalf__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.on-behalf__label {
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
}

.on-behalf__optional {
  color: var(--muted-foreground);
  font-weight: 400;
}

.on-behalf__input {
  min-height: var(--tap-min, 44px);
}

.on-behalf__hint,
.on-behalf__status {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}

.on-behalf__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.on-behalf__list li + li {
  border-top: 1px solid var(--border);
}

.on-behalf__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  width: 100%;
  min-height: var(--tap-min, 44px);
  padding: 0.5rem 0.75rem;
  background: var(--popover);
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.on-behalf__option:hover {
  background: var(--muted);
}

.on-behalf__option:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}

.on-behalf__option-name,
.on-behalf__picked-name {
  color: var(--foreground);
  font-size: 0.88rem;
  font-weight: 600;
}

.on-behalf__meta {
  color: var(--muted-foreground);
  font-size: 0.78rem;
}

.on-behalf__picked {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: var(--tap-min, 44px);
  padding: 0.4rem 0.4rem 0.4rem 0.75rem;
  border-radius: 10px;
  background: var(--secondary);
}

.on-behalf__picked-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.on-behalf__change {
  min-height: var(--tap-min, 44px);
}

@media (prefers-reduced-motion: reduce) {
  .on-behalf__chevron {
    transition: none;
  }
}
</style>
