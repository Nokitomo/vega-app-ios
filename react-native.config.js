module.exports = {
  project: {
    android: {
      unstable_reactLegacyComponentNames: ['RNCWebView'],
    },
    ios: {
      unstable_reactLegacyComponentNames: ['RNCWebView'],
    },
  },
  dependencies: {
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
