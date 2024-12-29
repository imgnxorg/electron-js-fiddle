// webpack.dev.config.js
const config = require("./webpack.config");
const path = require("path");

module.exports = {
  ...config,
  devServer: {
    port: 3000,
    hot: true,
    static: {
      directory: path.join(__dirname, "packages/renderer/public"),
    },
    historyApiFallback: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/javascript",
    },
  },
};
