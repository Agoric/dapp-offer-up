const config = require('@agoric/synpress/synpress.config');
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  ...config,
  e2e: {
    ...config.e2e,
    baseUrl: 'http://localhost:5173',
    specPattern: 'test/e2e/specs/**/*spec.{js,jsx,ts,tsx}',
    supportFile: 'test/support.js',
    screenshotsFolder: 'test/e2e/screenshots',
    videosFolder: 'test/e2e/videos',
    setupNodeEvents(on, cypressConfig) {
      // Call synpress setupNodeEvents first
      if (config.e2e.setupNodeEvents) {
        config.e2e.setupNodeEvents(on, cypressConfig);
      }
      
      // Configure webpack to handle ES6 modules in synpress support files
      const webpackPreprocessor = require('@cypress/webpack-preprocessor');
      const webpackOptions = {
        resolve: {
          extensions: ['.ts', '.js'],
        },
        module: {
          rules: [
            {
              test: /\.js$/,
              exclude: [/node_modules\/(?!@agoric\/synpress)/],
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env'],
                },
              },
            },
          ],
        },
      };
      
      on('file:preprocessor', webpackPreprocessor({ webpackOptions }));
      
      return cypressConfig;
    },
  },
});
