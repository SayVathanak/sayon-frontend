// sayon-frontend/src/services/api.js
import axios from 'axios';

// 💡 SMART URL SELECTION:
// 1. If running on Vercel (Production), use the Render URL from .env.production
// 2. If running locally, check if we have a VITE_API_URL set, otherwise default to localhost logic
const isProduction = import.meta.env.MODE === 'production';

let backendUrl;

if (isProduction) {
    // 🚀 PRODUCTION: Use the URL configured in Vercel Settings
    // If this is missing, it falls back to empty string (which will fail, helping you debug)
    backendUrl = import.meta.env.VITE_API_URL || 'https://sayon-backend.onrender.com/api'; 
} else {
    // 💻 DEVELOPMENT: Use dynamic IP so tablet/laptop both work
    const currentIp = window.location.hostname;
    // Check if we are on localhost or a real IP (like 192.168.x.x)
    backendUrl = `http://${currentIp}:3000/api`;
}

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

export default apiClient;