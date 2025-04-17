const getEnvUrl = (devUrl, prodUrl) => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? devUrl : prodUrl;
};

const config = {
    // Base URLs for the application
    baseUrl: process.env.DEV_URL,

    // Yload API endpoints for authentication
    authUrl:process.env.DEV_AUTH_URL,

    apiBaseUrl: process.env.DEV_BASE_URL,
};

export default config;
