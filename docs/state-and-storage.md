# Stato e Storage

## Zustand (stato in memoria)
Store principali:
- src/lib/zustand/contentStore.ts: provider attivo, catalogo e contenuti.
- src/lib/zustand/themeStore.ts: tema e colori principali.
- src/lib/zustand/herostore.ts: contenuto in evidenza (hero).
- src/lib/zustand/watchListStore.ts: watchlist in memoria.
- src/lib/zustand/watchHistrory.ts: cronologia.
- src/lib/zustand/downloadsStore.ts: download in corso e completati.

## Storage persistente (MMKV)
Wrapper: src/lib/storage/StorageService.ts
- mainStorage: storage principale
- cacheStorage: storage secondario per cache

Manager specifici:
- SettingsStorage: preferenze UI, feedback, player, telemetry.
- WatchListStorage / WatchHistoryStorage: liste persistenti.
- DownloadsStorage: stato download e cache file/thumbnails.
- ProvidersStorage / ExtensionStorage: provider disponibili e installati.
- CacheStorage: cache generica.

## Principi
- Stato volatile in Zustand, persistenza tramite MMKV.
- Le chiavi di storage sono centralizzate negli enum delle classi.
