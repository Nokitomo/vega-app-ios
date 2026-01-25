# Configurazione

## Expo
File: app.config.js
- newArchEnabled: false (disabilitato per stabilita).
- android.package: com.vega
- plugins: custom Android (android-native-config, with-android-notification-icons, with-android-release-gradle, with-android-signing, with-android-okhttp), react-native-video, react-native-edge-to-edge, react-native-bootsplash, expo-build-properties.
- firebase: @react-native-firebase/app e crashlytics sono opzionali e si attivano solo se esistono google-services.json o GoogleService-Info.plist. Analytics non e incluso.
- android: minSdkVersion 24, edgeToEdgeEnabled true, supportsPictureInPicture true, launchMode singleTask, queries per http/https/vlc.

## Metro
File: metro.config.js
- usa expo/metro-config
- minifier con drop_console e opzioni unsafe.

## Babel
File: babel.config.js
- plugin nativewind/babel
- react-native-reanimated/plugin

## Tailwind / NativeWind
- tailwind.config.js: content su src/**
- nativewind: plugin babel
- patch-package: patches/@dr.pogodin+react-native-fs+2.34.0.patch

## Typescript
- tsconfig.json definisce target e path.
