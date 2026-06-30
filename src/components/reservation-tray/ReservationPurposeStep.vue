<script setup lang="ts">
import { ref, watch } from 'vue';
import { PURPOSE_OPTIONS } from '@/types/reservation';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

interface ReservationPurposeSelection {
  purpose: string;
  description: string;
}

const props = defineProps<{
  initialPurpose?: ReservationPurposeSelection | null;
}>();

const emit = defineEmits<{
  purposeChange: [selection: ReservationPurposeSelection];
}>();

const selectedPurpose = ref(props.initialPurpose?.purpose ?? '');
const descriptionInput = ref(props.initialPurpose?.description ?? '');

watch(() => props.initialPurpose, (selection) => {
  selectedPurpose.value = selection?.purpose ?? '';
  descriptionInput.value = selection?.description ?? '';
});

watch([selectedPurpose, descriptionInput], () => {
  emit('purposeChange', {
    purpose: selectedPurpose.value,
    description: descriptionInput.value,
  });
}, { immediate: true });
</script>

<template>
  <section class="reservation-purpose-step" aria-labelledby="reservation-purpose-title">
    <div class="reservation-purpose-step__head">
      <h3 id="reservation-purpose-title">Informar finalidade</h3>
      <p>Escolha o motivo da reserva e, se quiser, acrescente uma descrição curta.</p>
    </div>

    <div class="reservation-purpose-step__field">
      <Label class="reservation-purpose-step__label" for="tray-reservation-purpose">Finalidade</Label>
      <NativeSelect id="tray-reservation-purpose" v-model="selectedPurpose" class="reservation-purpose-step__input">
        <NativeSelectOption value="" disabled>Selecione uma finalidade</NativeSelectOption>
        <NativeSelectOption v-for="opt in PURPOSE_OPTIONS" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </NativeSelectOption>
      </NativeSelect>
    </div>

    <div class="reservation-purpose-step__field">
      <Label class="reservation-purpose-step__label" for="tray-description-input">Descrição</Label>
      <Textarea
        id="tray-description-input"
        v-model="descriptionInput"
        class="reservation-purpose-step__textarea"
        maxlength="100"
        placeholder="Ex: Modelagem Tridimensional"
        aria-describedby="tray-description-hint"
      />
      <p id="tray-description-hint" class="reservation-purpose-step__hint">
        opcional · visível a professores · ex: Modelagem Tridimensional
      </p>
    </div>
  </section>
</template>

<style scoped>
.reservation-purpose-step {
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.reservation-purpose-step__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.reservation-purpose-step__head h3 {
  margin: 0;
  color: var(--foreground);
  font-size: 1rem;
  font-weight: 700;
}

.reservation-purpose-step__head p,
.reservation-purpose-step__hint {
  margin: 0;
  color: var(--muted-foreground);
  font-size: 0.82rem;
}

.reservation-purpose-step__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.reservation-purpose-step__label {
  color: var(--foreground);
  font-size: 0.86rem;
  font-weight: 600;
}

.reservation-purpose-step__input {
  width: 100%;
  min-height: var(--tap-min, 44px);
}

.reservation-purpose-step__textarea {
  min-height: 5rem;
  resize: vertical;
}
</style>
