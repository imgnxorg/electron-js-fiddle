// webpack.dev.config.js
const config = require('./webpack.config');

module.exports = {
  ...config,
  devServer: {
    static: {
      directory: path.join(__dirname, 'build'),
    },
    port: 3000,
    hot: true
  }
};
