const {getDefaultConfig} = require('expo/metro-config');
const {resolve} = require('metro-resolver');
const {withNativeWind} = require('nativewind/metro');
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    assert: require.resolve('assert/'),
    buffer: require.resolve('buffer/'),
    ...config.resolver?.extraNodeModules,
    events: require.resolve('events/'),
    process: require.resolve('process/browser'),
    stream: require.resolve('stream-browserify'),
    undici: require.resolve('./src/shims/undici'),
    util: require.resolve('util/'),
  },
  resolveRequest: (context, moduleName, platform) => {
    if (moduleName.startsWith('node:')) {
      return resolve(context, moduleName.replace(/^node:/, ''), platform);
    }
    return resolve(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, {input: './src/global.css'});
