import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';
import './styles/detail-panel.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore, type UserRole } from './stores/auth';
import { api } from './services/api';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

const auth = useAuthStore();

/** Rehydrate the user from the stored token. Never rejects. */
async function restoreSession(): Promise<void> {
  if (!auth.token || auth.user) return;
  try {
    const me = await api.getMe(auth.token);
    auth.setAuth(auth.token!, auth.refreshToken ?? 'dev', {
      id: me.id,
      name: me.name,
      email: me.email,
      registration: me.registration,
      role: me.role as UserRole,
      department: me.department,
      isMasterAdmin: me.isMasterAdmin ?? false,
    }, me.unreadCount ?? 0);
  } catch {
    auth.logout(); // token is invalid/expired — clear it
  }
}

restoreSession().then(() => {
  app.use(router);
  app.mount('#app');
});
