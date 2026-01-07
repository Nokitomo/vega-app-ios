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
- Disinstalla l'app dal device/emulatore:
```
adb uninstall com.vega
```
- Ricostruisci e reinstalla:
```
npx expo run:android --device "Medium_phone_API_35"
```
Questo riallinea binario nativo e bundle JS.

## Errore Crashlytics: Default FirebaseApp not initialized
Se mancano google-services.json o GoogleService-Info.plist, Crashlytics logga un errore.
- E' previsto: i plugin Firebase sono condizionati dalla presenza dei file.
- Il log non dovrebbe bloccare l'app.

## NativeWind / Tailwind
Errore: "Use process(css).then(cb) to work with async plugins"
- Fix applicato via patch-package: patches/nativewind+2.0.11.patch
- Se si reinstallano i node_modules, il postinstall applica la patch.

## Expo Go in offline mode
Se Expo segnala che Expo Go non e installato in offline mode:
- Usa un dev client (`expo run:android`) oppure installa Expo Go.
