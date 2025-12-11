// sayon-frontend/src/stores/auth.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api'; 

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  // Initial values are set to null; they will be loaded later in the initialize block
  const token = ref(null);
  const user = ref(null);
  const authError = ref(null);
  const isLoading = ref(false);

  // --- GETTERS ---
  const isAuthenticated = computed(() => !!token.value);
  const userName = computed(() => user.value ? user.value.name : 'Guest');

  // --- ACTIONS ---
  
  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    delete apiClient.defaults.headers.common['Authorization'];
  }

  async function login(username, password) {
    isLoading.value = true;
    authError.value = null;

    try {
      const response = await apiClient.post('/auth/login', { username, password });
      
      const newToken = response.data.token;
      const newUser = response.data.user;

      // 1. Update State & Local Storage
      token.value = newToken;
      user.value = newUser;
      localStorage.setItem('authToken', newToken);
      localStorage.setItem('authUser', JSON.stringify(newUser));

      // 2. Set the global header for all subsequent API calls
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

      return true;
      
    } catch (error) {
      authError.value = error.response?.data?.message || 'Login failed.';
      // We call logout on failed login attempt to ensure state is clean
      logout(); 
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  
  // --- DEFENSIVE INITIALIZATION LOGIC (Fixes the infinite loop issue) ---
  const initialize = () => {
    // Load initial data from storage
    const storedToken = localStorage.getItem('authToken');
    const storedUser = JSON.parse(localStorage.getItem('authUser'));

    // Set token header if it exists
    if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    // 💡 DEFENSIVE CHECK: Validate that all essential pieces of the session are present (token AND role)
    if (storedToken && storedUser && storedUser.role) {
        // Data is valid, set state
        token.value = storedToken;
        user.value = storedUser;
    } else if (storedToken || storedUser) {
        // 🚨 SAFETY NET: Corrupted or incomplete session found (token without user, or user without role).
        // Force a clean logout immediately to prevent the router from crashing/looping.
        console.warn("Corrupted session detected. Performing clean logout.");
        logout(); 
    }
  };

  // Execute initialization logic when the store is first defined
  initialize();

  // --- RETURN STATEMENT ---
  return { 
    token, user, authError, isLoading,
    isAuthenticated, userName, 
    login, logout 
  };
});