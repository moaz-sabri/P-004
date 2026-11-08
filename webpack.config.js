const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WebpackObfuscator = require("webpack-obfuscator");

// Unique build revision so every build produces new asset versions/filenames.
const BUILD_REVISION = process.env.BUILD_REVISION || String(Date.now());

// Source scripts must load in this dependency order (IIFE globals).
const SCRIPTS = [
  "./js/utils.js",
  "./js/templates.js",
  "./js/store.js",
  "./js/notificationManager.js",
  "./js/views/statsView.js",
  "./js/views/modalView.js",
  "./js/views/agendaView.js",
  "./js/views/kanbanView.js",
  "./js/views/clientsView.js",
  "./js/app.js",
];

const PAGES = [
  { name: "index", template: "./src/index.html" },
  { name: "projects", template: "./src/projects.html" },
  { name: "clients", template: "./src/clients.html" },
  { name: "settings", template: "./src/settings.html" },
];

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";
  const revisionSuffix = BUILD_REVISION;

  const plugins = [
    new MiniCssExtractPlugin({
      filename: `css/[name].[contenthash:12].${revisionSuffix}.css`,
      chunkFilename: `css/[id].[contenthash:12].${revisionSuffix}.css`,
    }),
    ...PAGES.map(
      (page) =>
        new HtmlWebpackPlugin({
          template: page.template,
          filename: `${page.name}.html`,
          inject: "body",
          chunks: ["main"],
          minify: isProd
            ? {
                collapseWhitespace: true,
                keepClosingSlash: true,
                removeComments: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
                useShortDoctype: true,
              }
            : false,
        })
    ),
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "icons", to: "icons" },
        { from: "sw.js", to: "sw.js" },
      ],
    }),
  ];

  if (isProd) {
    plugins.push(
      new WebpackObfuscator(
        {
          compact: true,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          debugProtection: false,
          disableConsoleOutput: false,
          identifierNamesGenerator: "hexadecimal",
          log: false,
          renameGlobals: false,
          rotateStringArray: true,
          selfDefending: false,
          stringArray: true,
          stringArrayEncoding: ["base64"],
          stringArrayThreshold: 0.75,
          transformObjectKeys: false,
          unicodeEscapeSequence: false,
        },
        ["**/vendors~*.js"] // exclude nothing extra actually pattern; safe
      )
    );
  }

  return {
    mode: isProd ? "production" : "development",
    entry: {
      main: [...SCRIPTS, "./css/main.css"],
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: `js/[name].[contenthash:12].${revisionSuffix}.js`,
      chunkFilename: `js/[name].[contenthash:12].${revisionSuffix}.js`,
      assetModuleFilename: "assets/[hash][ext][query]",
      clean: true,
      publicPath: "./",
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: [MiniCssExtractPlugin.loader, "css-loader"],
        },
        {
          test: /\.(png|svg|jpe?g|gif|webp|ico)$/i,
          type: "asset/resource",
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: "asset/resource",
        },
      ],
    },
    optimization: {
      splitChunks: false, // keep everything in one bundle per entry
      runtimeChunk: false,
    },
    plugins,
    devtool: isProd ? false : "source-map",
    stats: "minimal",
  };
};
