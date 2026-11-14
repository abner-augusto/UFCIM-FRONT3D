import './styles/tokens.css';
import './styles/base.css';
import './styles/motion.css';
import './styles/detail-panel.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { restoreSession } from './services/session';

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);

void restoreSession();
app.use(router);
app.mount('#app');
