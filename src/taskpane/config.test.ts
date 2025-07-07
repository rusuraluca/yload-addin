// src/taskpane/config.test.ts

describe('App Configuration Driven by Query Parameter src/taskpane/config.ts', () => {
  const originalProcessEnv = { ...process.env };
  let originalWindowLocation: Location;

  beforeAll(() => {
    if (typeof window !== 'undefined' && window.location) {
      originalWindowLocation = window.location;
    }
  });

  beforeEach(() => {
    jest.resetModules(); // Important to reset module cache for config import
    process.env = { ...originalProcessEnv }; // Reset process.env before each test

    // Mock window.location for each test
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { ...originalWindowLocation, search: '' },
        });
    } else {
        // Fallback for environments where window might not be fully defined by Jest/JSDOM
        global.window = { location: { search: '' } } as any;
    }
  });

  afterAll(() => {
    process.env = originalProcessEnv; // Restore original process.env
    if (typeof window !== 'undefined' && originalWindowLocation) {
        Object.defineProperty(window, 'location', { // Restore original window.location
            writable: true,
            value: originalWindowLocation,
        });
    }
  });

  it('should load DEV URLs when ?env=dev', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=dev';
    // NODE_ENV is not directly used by config.ts for URL selection anymore,
    // but it's good to set it to what it would be in a typical dev build.
    process.env.NODE_ENV = 'development';
    process.env.DEV_URL = 'http://localhost:dev_frontend';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_auth';
    process.env.DEV_BASE_URL = 'http://localhost:dev_api';
    // Set PROD URLs to ensure they are not picked
    process.env.PROD_FRONTEND_URL = 'https://prod.url/prod_frontend';
    process.env.PROD_AUTH_URL = 'https://prod.url/prod_auth';
    process.env.PROD_BASE_URL = 'https://prod.url/prod_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('http://localhost:dev_frontend');
    expect(config.authUrl).toBe('http://localhost:dev_auth');
    expect(config.apiBaseUrl).toBe('http://localhost:dev_api');
    expect(config.runtimeEnv).toBe('dev');
  });

  it('should load PROD URLs when ?env=prod', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=prod';
    // NODE_ENV is not directly used by config.ts for URL selection anymore.
    process.env.NODE_ENV = 'production';
    process.env.PROD_FRONTEND_URL = 'https://prod.frontend';
    process.env.PROD_AUTH_URL = 'https://prod.auth';
    process.env.PROD_BASE_URL = 'https://prod.api';
    // Set DEV URLs to ensure they are not picked
    process.env.DEV_URL = 'http://localhost:dev_frontend';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_auth';
    process.env.DEV_BASE_URL = 'http://localhost:dev_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('https://prod.frontend');
    expect(config.authUrl).toBe('https://prod.auth');
    expect(config.apiBaseUrl).toBe('https://prod.api');
    expect(config.runtimeEnv).toBe('prod');
  });

  it('should default to DEV URLs when ?env param is missing', () => {
    if (typeof window !== 'undefined') window.location.search = ''; // No env query param
    process.env.DEV_URL = 'http://localhost:dev_default_frontend';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_default_auth';
    process.env.DEV_BASE_URL = 'http://localhost:dev_default_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('http://localhost:dev_default_frontend');
    expect(config.authUrl).toBe('http://localhost:dev_default_auth');
    expect(config.apiBaseUrl).toBe('http://localhost:dev_default_api');
    expect(config.runtimeEnv).toBe('dev');
  });

  it('should default to DEV URLs for invalid ?env param value (e.g., ?env=invalid)', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=invalid';
    process.env.DEV_URL = 'http://localhost:dev_invalid_frontend';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_invalid_auth';
    process.env.DEV_BASE_URL = 'http://localhost:dev_invalid_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('http://localhost:dev_invalid_frontend');
    expect(config.authUrl).toBe('http://localhost:dev_invalid_auth');
    expect(config.apiBaseUrl).toBe('http://localhost:dev_invalid_api');
    expect(config.runtimeEnv).toBe('dev');
  });

  it('should use empty string for baseUrl if ?env=prod and PROD_FRONTEND_URL is undefined', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=prod';
    delete process.env.PROD_FRONTEND_URL; // Ensure it's undefined
    process.env.PROD_AUTH_URL = 'https://prod.auth';
    process.env.PROD_BASE_URL = 'https://prod.api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('');
    expect(config.authUrl).toBe('https://prod.auth');
    expect(config.apiBaseUrl).toBe('https://prod.api');
    expect(config.runtimeEnv).toBe('prod');
  });

  it('should use empty string for authUrl if ?env=dev and DEV_AUTH_URL is undefined', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=dev';
    process.env.DEV_URL = 'http://localhost:dev_frontend';
    delete process.env.DEV_AUTH_URL; // Ensure it's undefined
    process.env.DEV_BASE_URL = 'http://localhost:dev_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('http://localhost:dev_frontend');
    expect(config.authUrl).toBe('');
    expect(config.apiBaseUrl).toBe('http://localhost:dev_api');
    expect(config.runtimeEnv).toBe('dev');
  });

  it('should use empty string for apiBaseUrl if ?env=prod and PROD_BASE_URL is undefined', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=prod';
    process.env.PROD_FRONTEND_URL = 'https://prod.frontend';
    process.env.PROD_AUTH_URL = 'https://prod.auth';
    delete process.env.PROD_BASE_URL; // Ensure it's undefined

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('https://prod.frontend');
    expect(config.authUrl).toBe('https://prod.auth');
    expect(config.apiBaseUrl).toBe('');
    expect(config.runtimeEnv).toBe('prod');
  });

   it('should correctly handle ?env=dev even if NODE_ENV is production', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=dev';
    process.env.NODE_ENV = 'production'; // This should NOT affect URL choice in config.ts
    process.env.DEV_URL = 'http://localhost:dev_frontend_node_prod';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_auth_node_prod';
    process.env.DEV_BASE_URL = 'http://localhost:dev_api_node_prod';
    // Set PROD URLs as well to ensure they are NOT used by config.ts
    process.env.PROD_FRONTEND_URL = 'https://prod.url/unused_frontend';
    process.env.PROD_AUTH_URL = 'https://prod.url/unused_auth';
    process.env.PROD_BASE_URL = 'https://prod.url/unused_api';


    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('http://localhost:dev_frontend_node_prod');
    expect(config.authUrl).toBe('http://localhost:dev_auth_node_prod');
    expect(config.apiBaseUrl).toBe('http://localhost:dev_api_node_prod');
    expect(config.runtimeEnv).toBe('dev');
  });

  it('should correctly handle ?env=prod even if NODE_ENV is development', () => {
    if (typeof window !== 'undefined') window.location.search = '?env=prod';
    process.env.NODE_ENV = 'development'; // This should NOT affect URL choice in config.ts
    process.env.PROD_FRONTEND_URL = 'https://prod.frontend_node_dev';
    process.env.PROD_AUTH_URL = 'https://prod.auth_node_dev';
    process.env.PROD_BASE_URL = 'https://prod.api_node_dev';
    // Set DEV URLs as well to ensure they are NOT used by config.ts
    process.env.DEV_URL = 'http://localhost:dev_unused_frontend';
    process.env.DEV_AUTH_URL = 'http://localhost:dev_unused_auth';
    process.env.DEV_BASE_URL = 'http://localhost:dev_unused_api';

    const configModule = require('../config');
    const config = configModule.default;

    expect(config.baseUrl).toBe('https://prod.frontend_node_dev');
    expect(config.authUrl).toBe('https://prod.auth_node_dev');
    expect(config.apiBaseUrl).toBe('https://prod.api_node_dev');
    expect(config.runtimeEnv).toBe('prod');
  });
});
