// sayon-frontend/src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  // 💡 Original: Hardcoded to your local laptop
  baseURL: 'http://localhost:3000/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attaches the JWT token to every request
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; 
  }
  return config;
}, error => {
  return Promise.reject(error);
});

export default apiClient;