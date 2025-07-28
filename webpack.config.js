/* eslint-disable no-undef */
const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");
const path = require("path");

module.exports = async (env, options) => {
  const dev = options.mode === "development";

  // Load environment variables from .env file for local development fallback
  const envPath = path.resolve(__dirname, '.env');
  const localEnvConfig = dotenv.config({ path: envPath }).parsed || {};

  // Define the environment variables we expect the application to use
  const appEnvVars = [
    'DEV_URL', 'DEV_AUTH_URL', 'DEV_BASE_URL',
    'PROD_FRONTEND_URL', 'PROD_AUTH_URL', 'PROD_BASE_URL'
    // Add any other specific environment variables your app needs
  ];

  // Create object of environment variables to pass to DefinePlugin
  // Prioritize system environment variables (like those from Netlify),
  // then fall back to .env file, then to an empty string.
  const envKeys = appEnvVars.reduce((prev, name) => {
    const value = process.env[name] || localEnvConfig[name] || "";
    prev[`process.env.${name}`] = JSON.stringify(value);
    return prev;
  }, {});

  // Make sure NODE_ENV is set (this is crucial for config.ts logic)
  // options.mode is 'development' or 'production' based on Webpack's mode
  envKeys["process.env.NODE_ENV"] = JSON.stringify(options.mode);

  async function getHttpsOptions() {
    const httpsOptions = await devCerts.getHttpsServerOptions();
    return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
  }

  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      react: ["react", "react-dom"],
      taskpane: {
        import: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
        dependOn: "react",
      },
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
      fallback: {
        "process/browser": require.resolve("process/browser")
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane", "react"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest.xml",
            to: "manifest.xml",
          },
        ],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
        process: 'process/browser',
      }),
      new webpack.DefinePlugin(envKeys),
    ],
    devServer: {
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
    },
  };

  return config;
};
