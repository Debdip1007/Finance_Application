// Environment detection and configuration utilities

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isPreview = import.meta.env.MODE === 'preview';

export const getEnvironment = () => {
  if (isDevelopment) return 'development';
  if (isPreview) return 'preview';
  if (isProduction) return 'production';
  return 'unknown';
};

export const getBaseUrl = () => {
  if (isDevelopment) return 'http://localhost:5173';
  if (isPreview) return window.location.origin;
  return import.meta.env.VITE_APP_URL || window.location.origin;
};

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !anonKey) {
    throw new Error(`Missing Supabase configuration for ${getEnvironment()} environment`);
  }
  
  return { url, anonKey };
};

export const debugEnvironment = () => {
  console.log('Environment Debug Info:', {
    environment: getEnvironment(),
    baseUrl: getBaseUrl(),
    isDev: isDevelopment,
    isProd: isProduction,
    isPreview: isPreview,
    mode: import.meta.env.MODE,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  });
};

// Call this in development to debug environment issues
if (isDevelopment) {
  debugEnvironment();
}