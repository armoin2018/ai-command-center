const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';

    return {
        entry: './src/index.tsx',
        output: {
            path: path.resolve(__dirname, '../media/webview'),
            filename: '[name].bundle.js',
            clean: true
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx'],
            alias: {
                '@': path.resolve(__dirname, 'src')
            }
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.css$/,
                    use: ['style-loader', 'css-loader']
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext]'
                    }
                },
                {
                    test: /\.(png|svg|jpg|jpeg|gif)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'images/[name][ext]'
                    }
                }
            ]
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: './public/index.html',
                filename: 'index.html',
                inject: 'body'
            })
        ],
        devtool: isProduction ? false : 'source-map',
        performance: {
            hints: false,
            maxAssetSize: 1024 * 1024 * 2, // 2MB
            maxEntrypointSize: 1024 * 1024 * 2 // 2MB
        },
        optimization: {
            minimize: isProduction,
            splitChunks: {
                chunks: 'all',
                cacheGroups: {
                    // Bundle Bootstrap and jQuery together
                    bootstrap: {
                        test: /[\\/]node_modules[\\/](bootstrap|jquery)[\\/]/,
                        name: 'bootstrap',
                        priority: 15,
                        reuseExistingChunk: true
                    },
                    // Bundle visualization libraries separately
                    charts: {
                        test: /[\\/]node_modules[\\/](chart\.js|mermaid)[\\/]/,
                        name: 'charts',
                        priority: 10,
                        reuseExistingChunk: true
                    },
                    // Bundle data table library
                    tabulator: {
                        test: /[\\/]node_modules[\\/](tabulator-tables)[\\/]/,
                        name: 'tabulator',
                        priority: 8,
                        reuseExistingChunk: true
                    },
                    // Bundle Tagify
                    tagify: {
                        test: /[\\/]node_modules[\\/](@yaireo[\\/]tagify)[\\/]/,
                        name: 'tagify',
                        priority: 7,
                        reuseExistingChunk: true
                    },
                    // Bundle utility libraries
                    utils: {
                        test: /[\\/]node_modules[\\/](moment|lodash)[\\/]/,
                        name: 'utils',
                        priority: 5,
                        reuseExistingChunk: true
                    },
                    // Default vendor bundle
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendor',
                        priority: 1,
                        reuseExistingChunk: true
                    }
                }
            }
        }
    };
};
