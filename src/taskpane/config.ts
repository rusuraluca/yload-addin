const getEnvUrl = (devUrl, prodUrl) => {
    const isDev = process.env.NODE_ENV === 'development';
    return isDev ? devUrl : prodUrl;
};

const config = {
    // Base URLs for the application
    baseUrl: getEnvUrl(
        process.env.DEV_URL || 'https://localhost:3000/',
        process.env.PROD_URL || 'https://www.yload.eu/'
    ),

    // Authentication API endpoints
    authUrl: getEnvUrl(
        process.env.DEV_AUTH_URL || 'https://dev.api.yload.eu/graphql',
        process.env.PROD_AUTH_URL || 'https://fracht.network.yload.eu/graphql'
    ),

    // Yload API endpoints for customer operations
    yloadUrl: getEnvUrl(
        process.env.DEV_YLOAD_URL || 'https://dummyjson.com/http/200/',
        process.env.PROD_YLOAD_URL || 'https://fracht.network.yload.eu/api/v1'
    )
};

export default config;