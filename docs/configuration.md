# Configurazione

## Expo
File: app.config.js
- newArchEnabled: false (disabilitato per stabilita).
- android.package: com.vega
- plugins: bootsplash, edge-to-edge, react-native-video, build-properties.
- firebase: i plugin @react-native-firebase/* vengono aggiunti solo se esistono google-services.json o GoogleService-Info.plist.
- permissions Android e intentFilters.

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
