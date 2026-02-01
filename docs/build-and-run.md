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
Nota: il wrapper Gradle usa 8.14.3; se vedi errori di versione minima, verifica `android/gradle/wrapper/gradle-wrapper.properties`.
Nota: la New Architecture e' disattivata.

## Prebuild (rigenera android/ios)
Attenzione: non eseguire `npx expo prebuild` per Android (sovrascrive customizzazioni in `android/`).
Per iOS, usarlo solo se strettamente necessario e concordato:
```
npx expo prebuild -p ios --clean
```
Nota: il progetto contiene customizzazioni native; evitare prebuild se non richiesto.

## Avvio iOS (dev client)
```
npx expo run:ios
```

## Build produzione
- Android: usa EAS o build gradle manuale.
- fastlane/ contiene metadata per Play Store.

## Verifica lingua (i18n)
- In app: Settings -> Preferences -> App Language.
- Testare sia inglese che italiano durante QA, includendo notifiche e messaggi di errore.
