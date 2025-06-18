interface AppConfig {
  baseUrl: string;    // Frontend URL (e.g., https://yload-app.netlify.app or https://localhost:3000)
  authUrl: string;    // Authentication API URL
  apiBaseUrl: string; // General backend API URL
  runtimeEnv: 'prod' | 'dev'; // Indicates the resolved runtime environment
}

let appConfig: AppConfig;

// Safely access window.location.search. This code runs in the browser.
const currentSearch = (typeof window !== 'undefined' && window.location && window.location.search) ? window.location.search : "";
const queryParams = new URLSearchParams(currentSearch);
const runtimeEnvQueryParam = queryParams.get('env');

let effectiveRuntimeEnv: 'prod' | 'dev' = 'dev'; // Default to 'dev'

if (runtimeEnvQueryParam === 'prod') {
  effectiveRuntimeEnv = 'prod';
}
// Any other value of 'env' (including 'dev') or its absence defaults to 'dev'

// All URLs (baseUrl, authUrl, apiBaseUrl) are now selected based on the effectiveRuntimeEnv,
// which is derived from the '?env=' query parameter.
// The process.env.XXX variables are injected at build time by webpack.

if (effectiveRuntimeEnv === 'prod') {
  appConfig = {
    // Use PROD_FRONTEND_URL for production baseUrl, as specified.
    // This implies PROD_FRONTEND_URL should be defined in .env and exposed by webpack.
    baseUrl: process.env.PROD_FRONTEND_URL || "",
    authUrl: process.env.PROD_AUTH_URL || "",
    apiBaseUrl: process.env.PROD_BASE_URL || "",
    runtimeEnv: 'prod',
  };
} else { // 'dev' or fallback due to invalid/missing query param
  appConfig = {
    baseUrl: process.env.DEV_URL || "", // DEV_URL is used for development baseUrl
    authUrl: process.env.DEV_AUTH_URL || "",
    apiBaseUrl: process.env.DEV_BASE_URL || "",
    runtimeEnv: 'dev',
  };
}

// Console errors for missing critical URLs.
// These checks are important because empty URLs will likely cause runtime application errors.
if (!appConfig.baseUrl) {
    console.error(
        `Critical frontend baseUrl is not defined for runtimeEnv '${effectiveRuntimeEnv}'. ` +
        `This means ${effectiveRuntimeEnv === 'prod' ? 'PROD_FRONTEND_URL' : 'DEV_URL'} ` +
        `was not available or empty during the build process.`
    );
}
if (!appConfig.authUrl) {
    console.error(
        `Critical authUrl is not defined for runtimeEnv '${effectiveRuntimeEnv}'. ` +
        `This means ${effectiveRuntimeEnv === 'prod' ? 'PROD_AUTH_URL' : 'DEV_AUTH_URL'} ` +
        `was not available or empty during the build process.`
    );
}
if (!appConfig.apiBaseUrl) {
    console.error(
        `Critical apiBaseUrl is not defined for runtimeEnv '${effectiveRuntimeEnv}'. ` +
        `This means ${effectiveRuntimeEnv === 'prod' ? 'PROD_BASE_URL' : 'DEV_BASE_URL'} ` +
        `was not available or empty during the build process.`
    );
}

export default appConfig;
