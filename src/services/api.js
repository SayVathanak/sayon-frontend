// sayon-frontend/src/services/api.js
import axios from 'axios';

// Vite automatically loads VITE_API_URL from .env.development
const API_BASE_URL = import.meta.env.VITE_API_URL; 

if (!API_BASE_URL) {
    console.error('VITE_API_URL is not defined in the environment variables. Check .env.development');
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (JWT token attachment logic goes here after login)
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }
  return config;
});

export default apiClient;