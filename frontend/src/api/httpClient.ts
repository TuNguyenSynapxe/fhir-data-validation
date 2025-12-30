import axios from 'axios';
import { message } from 'antd';

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

// Response interceptor for error logging and user notifications
httpClient.interceptors.response.use(
  (response) => {
    console.log(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    // Extract error details
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = '';

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      const url = error.config?.url || 'unknown';

      console.error('[HTTP Response Error]', {
        status,
        data,
        url,
      });

      // Build user-friendly error message
      if (data?.message) {
        errorMessage = data.message;
      } else if (data?.title) {
        errorMessage = data.title;
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = `Request failed with status ${status}`;
      }

      // Add validation errors if present
      if (data?.errors) {
        const validationErrors = Object.entries(data.errors)
          .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
          .join('; ');
        errorDetails = validationErrors;
      }

      // Show error notification to user
      let notificationContent = errorMessage;
      if (errorDetails) {
        notificationContent = `${errorMessage}\\n${errorDetails}`;
      }
      
      message.error({
        content: notificationContent,
        duration: 6,
        key: `error-${Date.now()}`,
      });
    } else if (error.request) {
      // Network error - no response received
      console.error('[HTTP Network Error]', error.message);
      errorMessage = 'Network error: Unable to reach server';
      message.error({
        content: errorMessage,
        duration: 5,
      });
    } else {
      // Request setup error
      console.error('[HTTP Error]', error.message);
      errorMessage = `Request error: ${error.message}`;
      message.error({
        content: errorMessage,
        duration: 5,
      });
    }

    return Promise.reject(error);
  }
);

export default httpClient;
