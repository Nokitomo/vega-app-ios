# Servizi

## Notifiche
File: src/lib/services/Notification.ts
- Usa Notifee per canali: default, download, update.
- Gestisce progress download, completamento e fallimenti.
- Gestisce azioni (cancel download, installazione APK).

## Download
- DownloadManager (src/lib/services/DownloadManager.ts) gestisce stato e persistenza.
- Utilizza RNFS per operazioni su file.
- HLS downloader: src/lib/hlsDownloader.ts e src/lib/hlsDownloader2.ts.

## Aggiornamenti provider
File: src/lib/services/UpdateProviders.ts
- Confronta versioni provider e avvia update automatici.
- Mostra notifiche di progresso tramite NotificationService.

## Estensioni
ExtensionManager (src/lib/services/ExtensionManager.ts)
- Download moduli, cache e modalita test.

## OMDb
File: src/lib/services/omdb.ts
- Integrazione con OMDb per metadata aggiuntivi.
