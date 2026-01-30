/**
 * Webpack configuration for bundling the extension code
 * This reduces package size by bundling all extension JavaScript into a single file
 */
const path = require('path');

module.exports = {
    target: 'node', // VS Code extensions run in a Node.js context
    mode: 'none', // Set to 'none' for now, controlled by npm scripts
    
    entry: './src/extension.ts', // Extension entry point
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2'
    },
    
    externals: {
        vscode: 'commonjs vscode', // VS Code API is provided at runtime
        bufferutil: 'commonjs bufferutil', // Optional ws dependency
        'utf-8-validate': 'commonjs utf-8-validate' // Optional ws dependency
    },
    
    resolve: {
        extensions: ['.ts', '.js'],
        mainFields: ['main', 'module']
    },
    
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            transpileOnly: true,
                            compilerOptions: {
                                module: 'esnext'
                            }
                        }
                    }
                ]
            }
        ]
    },
    
    devtool: 'nosources-source-map', // Source maps for debugging but without source code
    infrastructureLogging: {
        level: 'log' // Show basic build info
    },
    
    // Ignore warnings for optional ws dependencies
    ignoreWarnings: [
        {
            module: /node_modules\/ws\/lib/,
            message: /Can't resolve 'bufferutil'/
        },
        {
            module: /node_modules\/ws\/lib/,
            message: /Can't resolve 'utf-8-validate'/
        }
    ]
};
