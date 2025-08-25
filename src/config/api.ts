// API Configuration
export const API_CONFIG = {
  // Update this URL to match your actual API endpoint
  BASE_URL: 'https://heritage-interact-kit-backend-draft.vercel.app/api/mobile',
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Default headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

// Storage keys for AsyncStorage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
};

// App constants
export const APP_CONFIG = {
  DEFAULT_SITE_NAME: 'Heritage Interact Kit',
  LOADING_TIMEOUT: 30000, // 30 seconds
}; 