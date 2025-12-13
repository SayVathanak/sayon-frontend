import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api'; 

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
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
    
    // Remove the header so future requests fail cleanly
    delete apiClient.defaults.headers.common['Authorization'];
    
    // Optional: Force a refresh or redirect to ensure the Login screen appears
    // window.location.href = '/login'; 
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
      logout(); 
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // --- ✅ NEW: AUTOMATIC LOGOUT INTERCEPTOR ---
  // This watches every response from the server. 
  // If the server says "401 Unauthorized" (expired token), we log out immediately.
  apiClient.interceptors.response.use(
    (response) => response, 
    (error) => {
      if (error.response && error.response.status === 401) {
        console.warn('Session expired (401). Logging out automatically.');
        logout();
      }
      return Promise.reject(error);
    }
  );

  // --- INITIALIZATION LOGIC ---
  const initialize = () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = JSON.parse(localStorage.getItem('authUser'));

    // Set header immediately if token exists
    if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    // Defensive check: Ensure we have both a token AND a valid user object with a role
    if (storedToken && storedUser && storedUser.role) {
        token.value = storedToken;
        user.value = storedUser;
    } else if (storedToken || storedUser) {
        // Partial/Corrupted data found? Clean it up.
        console.warn("Corrupted session detected during init. Logging out.");
        logout(); 
    }
  };

  // Run initialization
  initialize();

  // --- RETURN ---
  return { 
    token, user, authError, isLoading,
    isAuthenticated, userName, 
    login, logout 
  };
});