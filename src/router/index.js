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

// Navigation Guard: Handles Authentication and Role-Based Redirection
router.beforeEach((to, from, next) => {
  // 💡 IMPORTANT: Initialize the store inside the guard function
  const auth = useAuthStore();

  const requiredRoles = to.meta.roles;

  // 1. Check if the destination requires authentication AND the user is NOT authenticated
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return next({ name: 'login' });
  }

  // 2. If the user IS authenticated, check role and login redirection
  if (auth.isAuthenticated) {
    const userRole = auth.user.role;

    // If logged in and trying to go to the login page, redirect based on role
    if (to.name === 'login') {
      // Admin goes to Admin Dashboard, Cashier goes to POS
      return next({ name: userRole === 'admin' ? 'admin-dashboard' : 'pos-main' });
    }

    // Check 3: Role Authorization (Check if the user has the required role for the route)
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      // Logged in, but wrong role. Send them to their default route.
      return next({ name: userRole === 'admin' ? 'admin-dashboard' : 'pos-main' });
    }
  }

  // 3. Proceed to the route
  next();
});

export default router;