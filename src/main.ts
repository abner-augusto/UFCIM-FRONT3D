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
app.use(router);

// Restore user from stored token before first navigation
const auth = useAuthStore();
if (auth.token && !auth.user) {
  api.getMe(auth.token)
    .then(me => auth.setAuth(auth.token!, auth.refreshToken ?? 'dev', {
      id: me.id,
      name: me.name,
      email: me.email,
      registration: me.registration,
      role: me.role as UserRole,
      isMasterAdmin: me.isMasterAdmin ?? false,
    }, me.unreadCount ?? 0))
    .catch(() => auth.logout()) // token is invalid/expired — clear it
    .finally(() => app.mount('#app'));
} else {
  app.mount('#app');
}
