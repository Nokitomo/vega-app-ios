# AGENTS

Queste regole sono vincolanti per ogni intervento su questo progetto.

## Contesto tecnico
- App Expo/React Native con progetto nativo prebuildato (cartelle android/ e ios/ presenti).
- Piattaforme supportate: Android e iOS. Web non supportato.
- Dev client richiesto: non usare Expo Go per testare funzionalita native.
- Emulatore da usare: Medium_phone_API_35. Non avviare Pixel_6_Pro_API_35.

## Comandi standard
- Avvio Metro (dev client): `npx expo start -c --dev-client --scheme com.vega --port 8081`
- Build Android (dev client): `npx expo run:android --device \"Medium_phone_API_35\"`
- Prebuild Android pulito: `npx expo prebuild -p android --clean`
- Lint: `npm run lint`

## Git hygiene
- Non committare: `node_modules/`, `android/.gradle/`, `ios/Pods/`, `*.log`, `*.tmp`, `*.keystore`, `local.properties`, `key.properties`, output build (`android/app/build/`, `ios/build/`).
- Se una modifica genera file temporanei o cache, rimuoverli prima del commit.
- Usare commit piccoli e descrittivi; evitare di includere modifiche non correlate.

## Regole di lavoro
1) Dopo ogni modifica a un file, eseguire git e creare un commit che registri la modifica.
2) Aggiornare questo file (AGENTS.md) ogni volta che vengono introdotte nuove regole, flussi di lavoro o vincoli di progetto.
3) Mantenere la documentazione in `docs/` sincronizzata con lo stato reale del progetto. Se una modifica influisce su comportamento, build, CI o funzionalita, aggiornare la documentazione nello stesso set di modifiche.
4) Rispondere sempre in italiano.
5) Dopo ogni modifica al codice, eseguire il comando di analisi/lint appropriato (es. `flutter analyze` o equivalente). Gli info possono essere ignorati. Correggere solo errori bloccanti (rossi) e warning (gialli) senza cambiare comportamento o rompere l'app. Se non e certo che il fix non alteri il comportamento, fermarsi e fornire un report dettagliato con possibili soluzioni.
6) Quando si eseguono git e commit, verificare con attenzione cosa si sta salvando nella storia del progetto. Se ci sono file che non andrebbero committati, non farlo e informare l'utente indicando quali file e perche.
