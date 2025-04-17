const getEnvUrl = (devUrl, prodUrl) => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? devUrl : prodUrl;
};

const config = {
    // Base URLs for the application
    baseUrl: getEnvUrl(
        process.env.DEV_URL,
        process.env.PROD_URL
    ),

    // Yload API endpoints for authentication
    authUrl: getEnvUrl(
        process.env.DEV_AUTH_URL,
        process.env.PROD_AUTH_URL
    ),

    apiBaseUrl: getEnvUrl(
        process.env.DEV_BASE_URL,
        process.env.PROD_BASE_URL
    ),
};

export default config;