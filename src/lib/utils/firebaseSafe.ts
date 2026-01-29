// Safe, optional accessors for react-native-firebase modules.
// They return null when the native modules aren't available (e.g., google-services.json missing).
export const getAnalytics = (): any | null => {
  try {
    return require('@react-native-firebase/analytics').default;
  } catch {
    return null;
  }
};

export const getCrashlytics = (): any | null => {
  try {
    return require('@react-native-firebase/crashlytics').default;
  } catch {
    return null;
  }
};
