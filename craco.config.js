module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      return {
        ...webpackConfig,
        entry: {
          main: [
            env === 'development' &&
              require.resolve('react-dev-utils/webpackHotDevClient'),
            paths.appIndexJs,
          ].filter(Boolean),
          leetcode: './src/scripts/leetcode.ts',
          background: './src/background.ts',
          'remote-bridge': './src/scripts/remote-bridge.ts',
          'authorize-github': './src/scripts/authorize-github.ts',
          'popup-content-script': './src/scripts/popup-content-script.ts',
          'main-world-bridge': './src/scripts/main-world-bridge.ts',
          'inject-main-world-bridge': './src/scripts/inject-main-world-bridge.ts'
        },
        output: {
          ...webpackConfig.output,
          filename: 'static/scripts/[name].js',
        },
        optimization: {
          ...webpackConfig.optimization,
          runtimeChunk: false,
        },
      };
    },
  },
};
