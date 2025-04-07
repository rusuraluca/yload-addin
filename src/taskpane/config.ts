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

    // Authentication API endpoints
    authUrl: getEnvUrl(
        process.env.DEV_AUTH_URL,
        process.env.PROD_AUTH_URL
    ),

    // Yload API endpoints for customer operations
    yloadUrl: getEnvUrl(
        process.env.DEV_YLOAD_URL,
        process.env.PROD_YLOAD_URL
    )
};

export default config;