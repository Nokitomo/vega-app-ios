module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: ['src/vendor/media-console/**'],
  rules: {
    'prettier/prettier': 0,
    'react-native/no-inline-styles': 0,
    'react-hooks/exhaustive-deps': 0,
    'react-hooks/rules-of-hooks': 0,
    'react/no-unstable-nested-components': 0,
    'no-new-func': 0,
  },
};
