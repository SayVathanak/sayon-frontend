// sayon-frontend/src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth'; // Import Pinia store
import LoginView from '../views/LoginView.vue';
import POSLayout from '../views/POSLayout.vue';
import CustomerView from '../views/CustomerView.vue';
import AdminDashboardView from '../views/AdminDashboardView.vue'; // 💡 NEW: Admin Component

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/pos',
      name: 'pos-main',
      component: POSLayout,
      meta: { requiresAuth: true, roles: ['branch', 'admin'] }
    },
    {
      path: '/customer',
      name: 'customer-display',
      component: CustomerView,
      meta: { requiresAuth: false } // No login needed for the display screen itself
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboardView,
      // Only accessible by admins
      meta: { requiresAuth: true, roles: ['admin'] }
    }
  ]
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  const requiredRoles = to.meta.roles;

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  if (auth.isAuthenticated) {
    
    const userRole = auth.user?.role; 

    if (!userRole) {
        auth.logout();
        return next({ name: 'login' });
    }

    if (to.name === 'login') {
      return next({ name: userRole === 'admin' ? 'admin-dashboard' : 'pos-main' });
    }

    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return next({ name: userRole === 'admin' ? 'admin-dashboard' : 'pos-main' });
    }
  }

  next();
});

export default router;