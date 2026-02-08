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
- Networking/cache: TanStack React Query (QueryClientProvider in App).
- Localizzazione: i18next + react-i18next con risorse in `src/i18n/`.
- Player interno: implementazione locale in `src/vendor/media-console` basata su `react-native-video` (senza dipendenza runtime da `@8man/react-native-media-console`).

## Nuova architettura
- newArchEnabled e disattivo in app.config.js e gradle.properties (stabilita).
- Hermes attivo (hermesEnabled=true).
