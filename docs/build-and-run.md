# Build e Avvio

## Prerequisiti
- Node >= 18 (vedi package.json -> engines e volta).
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

## Avvio Android (dev client)
```
npx expo run:android --device "Medium_phone_API_35"
```

## Prebuild (rigenera android/ios)
```
npx expo prebuild --clean
```
Nota: il progetto contiene customizzazioni in android/ e ios/ (vedi plugins/).

## Build produzione
- Android: usa EAS o build gradle manuale.
- fastlane/ contiene metadata per Play Store.
