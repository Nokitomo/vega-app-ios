# Architettura

## Entry point
- index.js: registra il componente principale e configura Notifee per eventi in background.
- src/App.tsx: root dell'app, navigazione, tema, servizi globali e bootsplash.

## Struttura cartelle principale
- src/screens: schermate dell'app (Home, Search, Player, Settings, ecc.).
- src/components: componenti UI riutilizzabili.
- src/lib: logica condivisa (servizi, storage, provider, hook, utility).
- plugins: config plugin Expo per Android (signing, okhttp, icone notifiche, ecc.).
- assets: icone e risorse (bootsplash, notifiche, app icon).
- android/ e ios/: progetto nativo prebuildato.

## Moduli chiave
- Navigazione: React Navigation (stack e bottom tabs).
- Stato globale: Zustand (store per tema, contenuti, watchlist, download, ecc.).
- Provider: moduli remoti caricati dinamicamente via ExtensionManager.
- Download e notifiche: DownloadManager + Notifee.

## Nuova architettura
- newArchEnabled e attivo in app.config.js e gradle.properties.
- Hermes attivo (hermesEnabled=true).
