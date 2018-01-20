const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

const extractSass = new ExtractTextPlugin({
  filename: "css/global.css",
  disable: false
});

const staticCSSFiles = [
	path.resolve(__dirname, './src/style/app.scss')
]

module.exports = {
	context: path.resolve(__dirname, 'src'),
	entry: [
		path.resolve(__dirname, 'src/app.tsx')
	],

	output: {
		path: path.resolve(__dirname, 'public'),
		publicPath: '/',
		filename: 'js/bundle.js'
	},

	resolve: {
		extensions: ['.jsx', '.js', '.ts', '.tsx', '.scss'],
		modules: [
			path.resolve(__dirname, 'node_modules'),
		],
		alias: {
			'react': 'preact-compat',
			'react-dom': 'preact-compat'
		}
	},

	module: {
		rules: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				use: 'babel-loader'
			}, {
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: 'ts-loader'
			}, {
				test: /\.scss$/,
				include: staticCSSFiles,
				use: extractSass.extract({
					use: [
						{
							loader: 'css-loader'
						}, {
							loader: 'postcss-loader'
						}, {
							loader: 'sass-loader'
						}
					],
					fallback: 'style-loader'
				})
			},
			{
				test: /\.scss$/,
				exclude: staticCSSFiles,
				use: [{
					loader: 'style-loader'
				}, {
					loader: 'css-loader'
				}, {
					loader: 'postcss-loader'
				}, {
					loader: 'sass-loader'
				}]
			}, {
				test: /\.html$/,
				use: {
					loader: 'html-loader',
					options: {
						minimize: true,
						conservativeCollapse: false,
						removeAttributeQuotes: false,
						caseSensitive: true
					}
				}
			}
		]
	},

	plugins: [
		extractSass
	]
};