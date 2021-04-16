const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  output: {
    globalObject: 'typeof self !== \'undefined\' ? self : this',
    library: 'test',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, "debug")
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: [{
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }]
      }
    ]
  }
};
