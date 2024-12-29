const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const setupProject = () => {
  // Create necessary directories
  const dirs = [
    "packages/main/src",
    "packages/renderer/src",
    "packages/common",
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create basic webpack config if it doesn't exist
  if (!fs.existsSync("webpack.config.js")) {
    const webpackConfig = `
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './packages/renderer/src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    port: 3000,
  }
};`;
    fs.writeFileSync("webpack.config.js", webpackConfig);
  }

  // Separate dev dependencies and regular dependencies
  const devDependencies = [
    "@babel/core",
    "@babel/preset-react",
    "@babel/preset-env",
    "babel-loader",
    "webpack",
    "webpack-cli",
    "webpack-dev-server",
    "electron",
    "electron-builder",
    "concurrently",
    "wait-on",
  ];

  const regularDependencies = ["react", "react-dom"];

  try {
    // Install dev dependencies
    console.log("Installing dev dependencies...");
    execSync(`yarn add -D ${devDependencies.join(" ")}`, { stdio: "inherit" });

    // Install regular dependencies
    console.log("Installing regular dependencies...");
    execSync(`yarn add ${regularDependencies.join(" ")}`, { stdio: "inherit" });
  } catch (error) {
    console.error(
      "Some packages may already be installed. Continuing with setup...",
    );
  }

  console.log("Setup completed!");
};

setupProject();
