interface AppConfig {
  baseUrl: string;    // Frontend URL (e.g., https://yload-app.netlify.app or https://localhost:3000)
  authUrl: string;    // Authentication API URL
  apiBaseUrl: string; // General backend API URL
  runtimeEnv: 'prod' | 'dev'; // Effective environment based on NODE_ENV
}

let appConfig: AppConfig;

// Configuration is determined by build-time NODE_ENV
// These process.env variables are injected at build time by webpack.
if (process.env.NODE_ENV === 'production') {
  appConfig = {
    baseUrl: process.env.PROD_FRONTEND_URL || "",
    authUrl: process.env.PROD_AUTH_URL || "",
    apiBaseUrl: process.env.PROD_BASE_URL || "",
    runtimeEnv: 'prod',
  };
} else { // 'development' or any other value (e.g. undefined, test)
  appConfig = {
    baseUrl: process.env.DEV_URL || "",
    authUrl: process.env.DEV_AUTH_URL || "",
    apiBaseUrl: process.env.DEV_BASE_URL || "",
    runtimeEnv: 'dev',
  };
}

// Error logging for missing critical URLs
// These checks are important because empty URLs will likely cause runtime application errors.
if (!appConfig.baseUrl) {
  const varName = process.env.NODE_ENV === 'production' ? 'PROD_FRONTEND_URL' : 'DEV_URL';
  console.error(`Critical frontend URL (baseUrl) for NODE_ENV='${process.env.NODE_ENV}' is not defined. ` +
                `Check ${varName} in build environment.`);
  appConfig.baseUrl = ""; // Ensure property exists
}
if (!appConfig.authUrl) {
  const varName = process.env.NODE_ENV === 'production' ? 'PROD_AUTH_URL' : 'DEV_AUTH_URL';
  console.error(`Critical API URL (authUrl) for NODE_ENV='${process.env.NODE_ENV}' is not defined. ` +
                `Check ${varName} in build environment.`);
  appConfig.authUrl = ""; // Ensure property exists
}
if (!appConfig.apiBaseUrl) {
  const varName = process.env.NODE_ENV === 'production' ? 'PROD_BASE_URL' : 'DEV_BASE_URL';
  console.error(`Critical API URL (apiBaseUrl) for NODE_ENV='${process.env.NODE_ENV}' is not defined. ` +
                `Check ${varName} in build environment.`);
  appConfig.apiBaseUrl = ""; // Ensure property exists
}

export default appConfig;
