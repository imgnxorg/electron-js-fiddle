const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: './src/renderer/index.jsx',
  target: 'electron-renderer',
  output: {
    path: path.resolve(__dirname, 'build/js'),
    filename: 'app.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react', '@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
