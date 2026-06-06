import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { hasRole, CAN_VIEW_REPORTS, CAN_MANAGE_EQUIPMENT } from '@/utils/roles';
import type { UserRole } from '@/stores/auth';

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
      meta: { guestOnly: true },
    },
    {
      path: '/convite/:token',
      name: 'accept-invite',
      component: () => import('@/views/AcceptInviteView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/campus',
      name: 'campus-select',
      component: () => import('@/views/CampusSelectView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campus/:campusId/departamento',
      name: 'department-select',
      component: () => import('@/views/DepartmentSelectView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campus/:campusId/viewer',
      name: 'viewer',
      component: () => import('@/views/ViewerView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/campus/:campusId/espacos',
      name: 'space-browser',
      component: () => import('@/views/SpaceBrowserView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reserva/:spaceId',
      name: 'reservation',
      component: () => import('@/views/ReservationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reserva/confirmar',
      name: 'reservation-confirm',
      component: () => import('@/views/ConfirmReservationView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/minhas-reservas',
      name: 'my-reservations',
      component: () => import('@/views/MyReservationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/notificacoes',
      name: 'notifications',
      component: () => import('@/views/NotificationsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/espacos/:spaceId/bloquear',
      name: 'blocking-create',
      component: () => import('@/views/BlockingCreateView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/meus-bloqueios',
      name: 'my-blockings',
      component: () => import('@/views/MyBlockingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/perfil',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/relatorios',
      name: 'reports',
      component: () => import('@/views/ReportsView.vue'),
      meta: { requiresAuth: true, roles: CAN_VIEW_REPORTS },
    },
    {
      path: '/manutencao/chamados',
      name: 'maintenance-reports',
      component: () => import('@/views/MaintenanceReportsView.vue'),
      meta: { requiresAuth: true, roles: CAN_MANAGE_EQUIPMENT },
    },
    {
      path: '/espacos/:spaceId/relatorio',
      name: 'space-report',
      component: () => import('@/views/SpaceReportView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/solicitar-convite',
      name: 'request-invite',
      component: () => import('@/views/RequestInviteView.vue'),
      meta: { guestOnly: true },
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'campus-select' };
  }

  if (to.meta.roles && auth.userRole && !hasRole(auth.userRole, to.meta.roles as UserRole[])) {
    return { name: 'campus-select' };
  }
});

export default router;
