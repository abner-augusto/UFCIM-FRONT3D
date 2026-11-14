import { nextTick } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import { authGuard } from './guards';
import { focusPageHeading } from '@/utils/navigation-focus';
import { CAN_VIEW_REPORTS, CAN_MANAGE_EQUIPMENT, CAN_BLOCK, CAN_RESERVE, CAN_VIEW_MAINTENANCE_HISTORY } from '@/utils/roles';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/campus',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { title: 'Entrar', guestOnly: true },
    },
    {
      path: '/convite/:token',
      name: 'accept-invite',
      component: () => import('@/views/AcceptInviteView.vue'),
      meta: { title: 'Aceitar convite', guestOnly: true },
    },
    {
      path: '/campus',
      name: 'campus-select',
      component: () => import('@/views/CampusSelectView.vue'),
      meta: { title: 'Selecionar campus', requiresAuth: true },
    },
    {
      path: '/campus/:campusId/departamento',
      name: 'department-select',
      component: () => import('@/views/DepartmentSelectView.vue'),
      meta: { title: 'Selecionar departamento', requiresAuth: true },
    },
    {
      path: '/campus/:campusId/viewer',
      name: 'viewer',
      component: () => import('@/views/ViewerView.vue'),
      meta: { title: 'Visualizador', requiresAuth: true },
    },
    {
      path: '/campus/:campusId/espacos',
      name: 'space-browser',
      component: () => import('@/views/SpaceBrowserView.vue'),
      meta: { title: 'Buscar espaços', requiresAuth: true },
    },
    {
      path: '/reserva/:spaceId',
      name: 'reservation',
      component: () => import('@/views/ReservationView.vue'),
      meta: { title: 'Fazer reserva', requiresAuth: true },
    },
    {
      path: '/reserva/confirmar',
      name: 'reservation-confirm',
      component: () => import('@/views/ConfirmReservationView.vue'),
      meta: { title: 'Confirmar reserva', requiresAuth: true },
    },
    {
      path: '/minhas-reservas',
      name: 'my-reservations',
      component: () => import('@/views/MyReservationsView.vue'),
      // MEL-020: maintenance never holds reservations.
      meta: { title: 'Minhas reservas', requiresAuth: true, roles: CAN_RESERVE },
    },
    {
      path: '/notificacoes',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { title: 'Notificações', requiresAuth: true },
    },
    {
      path: '/espacos/:spaceId/bloquear',
      name: 'blocking-create',
      component: () => import('@/views/BlockingCreateView.vue'),
      meta: { title: 'Bloquear espaço', requiresAuth: true, roles: CAN_BLOCK },
    },
    {
      path: '/meus-bloqueios',
      name: 'my-blockings',
      component: () => import('@/views/MyBlockingsView.vue'),
      meta: { title: 'Meus bloqueios', requiresAuth: true, roles: CAN_BLOCK },
    },
    {
      path: '/perfil',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { title: 'Meu perfil', requiresAuth: true },
    },
    {
      path: '/relatorios',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { title: 'Relatórios', requiresAuth: true, roles: CAN_VIEW_REPORTS },
    },
    {
      path: '/manutencao/chamados',
      name: 'maintenance-reports',
      component: () => import('@/views/MaintenanceReportsView.vue'),
      meta: { title: 'Chamados de manutenção', requiresAuth: true, roles: CAN_MANAGE_EQUIPMENT },
    },
    {
      // Not `maintenance-reports`: that name is the ticket list above.
      path: '/manutencao/relatorios',
      name: 'maintenance-history',
      component: () => import('@/views/MaintenanceHistoryView.vue'),
      meta: { title: 'Histórico de manutenção', requiresAuth: true, roles: CAN_VIEW_MAINTENANCE_HISTORY },
    },
    {
      path: '/espacos/:spaceId/relatorio',
      name: 'space-report',
      component: () => import('@/views/SpaceReportView.vue'),
      meta: { title: 'Relatório da sala', requiresAuth: true, roles: CAN_VIEW_REPORTS },
    },
    {
      path: '/solicitar-convite',
      name: 'request-invite',
      component: () => import('@/views/RequestInviteView.vue'),
      meta: { title: 'Solicitar convite', guestOnly: true },
    },
    {
      // Catch-all: undefined routes (bad deep-links, stale URLs) redirect home
      // instead of rendering a blank page. The guard then sends guests to /login.
      path: '/:pathMatch(.*)*',
      redirect: '/campus',
    },
  ],
});

router.beforeEach(authGuard);

router.afterEach(async (to, from, failure) => {
  if (failure) return;
  document.title = `${to.meta.title} · UFCIM`;
  if (!from.matched.length || to.path === from.path) return;
  await nextTick();
  focusPageHeading();
});

export default router;

