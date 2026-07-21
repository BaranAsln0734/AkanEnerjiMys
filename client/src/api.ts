import axios from 'axios';

const getBaseURL = () => {
  const customUrl = localStorage.getItem('api_url');
  if (customUrl) return customUrl;
  
  // If running inside Capacitor (native mobile app wrapper)
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return 'http://78.188.8.207:5000/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Add a request interceptor to add the JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
