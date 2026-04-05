<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/services/api';

const router = useRouter();
const auth = useAuthStore();

interface UserProfile {
  id: string;
  name: string;
  email: string;
  registration: string;
  role: string;
  department?: string;
}

const profile = ref<UserProfile | null>(null);
const loading = ref(true);
const errorMsg = ref<string | null>(null);

const ROLE_LABELS: Record<string, string> = {
  student: 'Estudante',
  professor: 'Professor(a)',
  staff: 'Funcionário(a)',
  maintenance: 'Manutenção',
};

onMounted(async () => {
  try {
    profile.value = await api.getMe(auth.token);
  } catch {
    errorMsg.value = 'Não foi possível carregar os dados do perfil.';
  } finally {
    loading.value = false;
  }
});

function handleLogout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="profile-view">
    <div class="view-header">
      <button class="back-btn" @click="router.back()">← Voltar</button>
      <h1>Meu Perfil</h1>
    </div>

    <div v-if="loading" class="state-msg">Carregando perfil...</div>
    <div v-else-if="errorMsg" class="state-error">{{ errorMsg }}</div>

    <div v-else-if="profile" class="profile-card">
      <div class="profile-row">
        <span class="profile-label">Nome</span>
        <span class="profile-value">{{ profile.name }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Matrícula</span>
        <span class="profile-value">{{ profile.registration }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Email</span>
        <span class="profile-value">{{ profile.email }}</span>
      </div>
      <div v-if="profile.department" class="profile-row">
        <span class="profile-label">Departamento</span>
        <span class="profile-value">{{ profile.department }}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Perfil</span>
        <span class="profile-value">{{ ROLE_LABELS[profile.role] ?? profile.role }}</span>
      </div>
    </div>

    <button v-if="!loading" class="logout-btn" @click="handleLogout">
      Sair
    </button>
  </div>
</template>

<style scoped>
.profile-view {
  max-width: 540px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.view-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.view-header h1 {
  margin: 0;
  font-size: 1.3rem;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #1D9E75;
  font-size: 0.95rem;
  padding: 0;
}
.profile-card {
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}
.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid #f0f0f0;
}
.profile-row:last-child {
  border-bottom: none;
}
.profile-label {
  color: #888;
  font-size: 0.875rem;
}
.profile-value {
  font-weight: 500;
  font-size: 0.9rem;
  text-align: right;
  max-width: 60%;
}
.logout-btn {
  width: 100%;
  padding: 0.85rem;
  border: 1px solid #c0392b;
  border-radius: 10px;
  background: none;
  color: #c0392b;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
.logout-btn:hover {
  background: #fdf0ee;
}
.state-msg {
  color: #888;
  font-size: 0.9rem;
}
.state-error {
  color: #c0392b;
  font-size: 0.9rem;
}
</style>
