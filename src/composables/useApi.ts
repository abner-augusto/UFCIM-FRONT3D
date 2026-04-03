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
