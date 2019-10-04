const path = require('path');
const webpack = require('webpack');
const getMembersData = require('./src/getData');

/*
 * SplitChunksPlugin is enabled by default and replaced
 * deprecated CommonsChunkPlugin. It automatically identifies modules which
 * should be splitted of chunk by heuristics using module duplication count and
 * module category (i. e. node_modules). And splits the chunks…
 *
 * It is safe to remove "splitChunks" from the generated configuration
 * and was added as an educational example.
 *
 * https://webpack.js.org/plugins/split-chunks-plugin/
 *
 */

const HtmlWebpackPlugin = require('html-webpack-plugin');

/*
 * We've enabled HtmlWebpackPlugin for you! This generates a html
 * page for you when you compile webpack, which will make you start
 * developing and prototyping faster.
 *
 * https://github.com/jantimon/html-webpack-plugin
 *
 */

module.exports = async () => {
  const data = await getMembersData(process.env.GITHUB_API_LOGIN, process.env.GITHUB_API_TOKEN, 'cleverage');

  return {
    mode: 'development',
    entry: './src/index.js',

    output: {
      filename: '[name].[chunkhash].js',
      path: path.resolve(__dirname, 'dist')
    },

    plugins: [
      new webpack.ProgressPlugin(),
      new HtmlWebpackPlugin({
        template: './src/html/index.twig',
        templateParameters: {
          usersData: data,
        }
      })
    ],

    module: {
      rules: [
        {
          test: /.(js|jsx)$/,
          include: [path.resolve(__dirname, 'src')],
          loader: 'babel-loader',

          options: {
            plugins: ['syntax-dynamic-import'],

            presets: [
              [
                '@babel/preset-env',
                {
                  modules: false
                }
              ]
            ]
          }
        },
        {
          test: /\.scss$/i,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader',
            'resolve-url-loader',
            'sass-loader',
          ],
        },
        {
          test: /\.twig$/,
          use: [
            {
              loader: 'twing-loader',
              options: {
                environmentModulePath: require.resolve('./twigEnvironment.js')
              }
            }
          ]
        }
      ]
    },

    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            priority: -10,
            test: /[\\/]node_modules[\\/]/
          }
        },

        chunks: 'async',
        minChunks: 1,
        minSize: 30000,
        name: true
      }
    },

    devServer: {
      open: true
    }
  };
};
