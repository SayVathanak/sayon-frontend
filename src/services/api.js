// sayon-frontend/src/services/api.js
import axios from 'axios';

// 💡 SMART FIX: Automatically detect the API URL
// 1. If you are on laptop (localhost), it connects to localhost:3000
// 2. If you are on tablet (10.10.x.x), it connects to 10.10.x.x:3000
// This means you don't need to change .env files when switching Wi-Fi.
const currentIp = window.location.hostname;
const backendUrl = `http://${currentIp}:3000/api`;

console.log(`🔌 API Client connecting to: ${backendUrl}`);

const apiClient = axios.create({
  baseURL: backendUrl,
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

// Response Interceptor: Optional safety net for expired tokens
apiClient.interceptors.response.use(response => {
  return response;
}, error => {
  if (error.response && error.response.status === 401) {
    // If token is invalid/expired, we could auto-logout here
    console.warn('⚠️ Session expired or invalid token.');
  }
  return Promise.reject(error);
});

export default apiClient;