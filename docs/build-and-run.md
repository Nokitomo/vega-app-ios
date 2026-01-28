# Build e Avvio

## Prerequisiti
- Node >= 20.19.4 (vedi package.json -> volta).
- Android SDK configurato.
- Per iOS: Xcode + CocoaPods.

## Installazione
```
npm install
```

## Avvio Metro (dev client)
```
npx expo start -c --dev-client --scheme com.vega --port 8081
```
Nota: serve il dev client; non usare Expo Go per funzioni native.

## Avvio Android (dev client)
```
npx expo run:android --device "Medium_phone_API_35"
```
Nota: non usare l'emulatore Pixel_6_Pro_API_35.
Nota: il wrapper Gradle usa 8.13; se vedi errori di versione minima, verifica `android/gradle/wrapper/gradle-wrapper.properties`.
Nota: la New Architecture è attiva; `react-native-webview` usa l'interoperability layer (legacy component) via `react-native.config.js` per evitare crash Fabric.

## Prebuild (rigenera android/ios)
```
npx expo prebuild -p android --clean
```
Nota: il progetto contiene customizzazioni in android/ e ios/ (vedi plugins/).

## Avvio iOS (dev client)
```
npx expo run:ios
```

## Prebuild iOS (rigenera ios/)
```
npx expo prebuild -p ios --clean
```

## Build produzione
- Android: usa EAS o build gradle manuale.
- fastlane/ contiene metadata per Play Store.
