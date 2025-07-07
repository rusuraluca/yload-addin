interface AppConfig {
  baseUrl: string;    // Frontend URL (e.g., https://yload-app.netlify.app or https://localhost:3000)
  authUrl: string;    // Authentication API URL
  apiBaseUrl: string; // General backend API URL
  runtimeEnv: 'prod' | 'dev'; // Indicates the resolved runtime environment
}

let appConfig: AppConfig;

// Safely access window.location.search
const currentSearch = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : "";
const queryParams = new URLSearchParams(currentSearch);
const runtimeEnvQueryParam = queryParams.get('env');

let effectiveRuntimeEnv: 'prod' | 'dev' = 'dev'; // Default to 'dev'

if (runtimeEnvQueryParam === 'prod') {
  effectiveRuntimeEnv = 'prod';
}

if (effectiveRuntimeEnv === 'prod') {
  appConfig = {
    baseUrl: process.env.PROD_FRONTEND_URL || "", // Use PROD_FRONTEND_URL for prod baseUrl
    authUrl: process.env.PROD_AUTH_URL || "",
    apiBaseUrl: process.env.PROD_BASE_URL || "",
    runtimeEnv: 'prod',
  };
} else { // 'dev' or fallback
  appConfig = {
    baseUrl: process.env.DEV_URL || "", // Use DEV_URL for dev baseUrl
    authUrl: process.env.DEV_AUTH_URL || "",
    apiBaseUrl: process.env.DEV_BASE_URL || "",
    runtimeEnv: 'dev',
  };
}

// Error logging and ensuring properties exist
if (!appConfig.baseUrl) {
    console.error(`Critical frontend URL (baseUrl) for runtimeEnv '${effectiveRuntimeEnv}' is not defined. Check PROD_FRONTEND_URL/DEV_URL in build environment.`);
    appConfig.baseUrl = ""; // Ensure property exists
}
if (!appConfig.authUrl) {
  console.error(`Critical API URL (authUrl) for runtimeEnv '${effectiveRuntimeEnv}' is not defined. Check PROD_AUTH_URL/DEV_AUTH_URL in build environment.`);
  appConfig.authUrl = ""; // Ensure property exists
}
if (!appConfig.apiBaseUrl) {
  console.error(`Critical API URL (apiBaseUrl) for runtimeEnv '${effectiveRuntimeEnv}' is not defined. Check PROD_BASE_URL/DEV_BASE_URL in build environment.`);
  appConfig.apiBaseUrl = ""; // Ensure property exists
}

export default appConfig;
