
var webpackNotifier = require('webpack-notifier');
var _path=require("path");


module.exports = {
    entry: "./public/js/edit-page.js",
    output: {
        path: __dirname,
        filename: "./public/js/dist/edit-page-bundled.js"
    },
    module: {
        loaders: [
            { test: /\.css$/, loader: "style!css" },

            {
              test: /\.jsx?$/,
              exclude: /(node_modules|bower_components)/,
              loader: 'babel', 
              query: {
                presets: ['react', 'es2015']
              }
            }
        ]
    },

    resolve:{
        modulesDirectories:["./apps/"]
    },

    plugins:[new webpackNotifier({alwaysNotify: false})],

    devtool: 'inline-source-map'
};