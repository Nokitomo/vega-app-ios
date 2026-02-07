# Troubleshooting

## App bloccata sullo splashscreen
Sintomo: l'app non supera la schermata iniziale.

Cause frequenti:
1) Metro non attivo o porta occupata.
2) Dev client installato non allineato alla versione React Native/Expo del progetto.
3) Errore JS early (es. TurboModule mancante).

### Passi di risoluzione
1) Chiudi eventuali Metro attivi su 8081.
2) Avvia Metro in modo non interattivo:
```
npx expo start -c --dev-client --scheme com.vega --port 8081
```
3) Se in logcat compare:
"TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found"
il problema e quasi sempre la New Architecture.
   - Assicurati che sia disattivata:
     - app.config.js: `newArchEnabled: false`
     - android/gradle.properties: `newArchEnabled=false`
   - Poi ricostruisci:
```
adb uninstall com.vega
npx expo run:android --device "Medium_phone_API_35"
```
Nota: non usare l'emulatore Pixel_6_Pro_API_35.
Questo riallinea binario nativo e bundle JS.
Nota: non eseguire `npx expo prebuild` (ci sono customizzazioni native).

## Errore Crashlytics: Default FirebaseApp not initialized
Se i plugin Firebase sono abilitati e mancano google-services.json o GoogleService-Info.plist, Crashlytics logga un errore.
- E' previsto se Firebase e attivo.
- Il log non dovrebbe bloccare l'app.

## Metro: Unable to resolve module node:stream
Sintomo: Metro fallisce con "Unable to resolve module node:stream" (es. da cheerio).
- Verifica che `stream-browserify`, `events`, `assert`, `buffer`, `process`, `util` siano tra le dipendenze.
- Verifica che `metro.config.js` risolva i moduli `node:` e faccia il mapping a `stream`, `events`, `assert`, `buffer`, `process`, `util`.

## Metro: Unable to resolve module node:net (undici)
Sintomo: Metro fallisce con "Unable to resolve module node:net" da `undici/...`.
- Verifica che esista `src/shims/undici.js`.
- Verifica che `metro.config.js` mappi `undici` (anche import profondi `undici/...`) allo shim.

## iOS: ExpoModulesCore richiede iOS 15.1
Sintomo: build iOS fallisce con "module 'ExpoModulesCore' has a minimum deployment target of iOS 15.1".
- Allinea `IPHONEOS_DEPLOYMENT_TARGET` a 15.1 nell'app iOS.

## iOS CI: GOOGLE_APP_ID mancante (Firebase non usato)
Sintomo: build iOS in GitHub Actions fallisce con "Could not get GOOGLE_APP_ID in Google Services file".
- Se Firebase non e usato, disabilita l'autolinking iOS per `@react-native-firebase/*` in `react-native.config.js`.
- In questo modo i pod Firebase non vengono installati e lo script Crashlytics non gira.

## React Native FS / Patch-package
- Fix applicato via patch-package: patches/@dr.pogodin+react-native-fs+2.34.0.patch
- Se si reinstallano i node_modules, il postinstall applica la patch.

## Expo Go in offline mode
Se Expo segnala che Expo Go non e installato in offline mode:
- Usa un dev client (`expo run:android`); Expo Go non e supportato per funzionalita native.

## Stringhe non tradotte / chiavi visibili
Sintomo: testi in inglese o chiavi raw (es. `Some Key`).
- Verifica che la chiave esista in `src/i18n/en.json` e `src/i18n/it.json`.
- Nei componenti usare `t(...)`; nei servizi usare `i18n.t(...)`.
