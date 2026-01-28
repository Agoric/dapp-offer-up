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
      // Call the base synpress setupNodeEvents
      if (config.e2e.setupNodeEvents) {
        config.e2e.setupNodeEvents(on, cypressConfig);
      }
      
      // Add webpack preprocessor for handling ES modules
      const webpack = require('@cypress/webpack-preprocessor');
      const options = {
        webpackOptions: {
          resolve: {
            extensions: ['.ts', '.js'],
            fullySpecified: false,
          },
          module: {
            rules: [
              {
                test: /\.js$/,
                exclude: /node_modules\/(?!(@agoric\/synpress|@testing-library)\/).*/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                      ['@babel/preset-env', {
                        modules: false,
                      }]
                    ],
                  },
                },
              },
            ],
          },
        },
      };
      
      on('file:preprocessor', webpack(options));
      
      return cypressConfig;
    },
  },
});
