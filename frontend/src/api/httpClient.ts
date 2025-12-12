import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
httpClient.interceptors.request.use(
  (config) => {
    console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[HTTP Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error logging
httpClient.interceptors.response.use(
  (response) => {
    console.log(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('[HTTP Response Error]', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('[HTTP Network Error]', error.message);
    } else {
      console.error('[HTTP Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export default httpClient;
