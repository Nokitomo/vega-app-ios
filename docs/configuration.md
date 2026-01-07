# Configurazione

## Expo
File: app.config.js
- newArchEnabled: true
- android.package: com.vega
- plugins: bootsplash, edge-to-edge, react-native-video, build-properties, firebase (solo se presenti i file google-services).
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
- patch-package: patches/nativewind+2.0.11.patch
  (fix per plugin PostCSS async con Tailwind)

## Typescript
- tsconfig.json definisce target e path.
