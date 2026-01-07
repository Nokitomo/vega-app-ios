# Provider ed Estensioni

## Obiettivo
I contenuti non sono hardcoded: il catalogo e la logica di scraping/streaming vengono forniti da moduli esterni (provider) caricati dinamicamente.

## ExtensionManager
File: src/lib/services/ExtensionManager.ts
- Scarica il manifest provider da GitHub:
  https://raw.githubusercontent.com/Zenda-Cross/vega-providers/refs/heads/main/manifest.json
- Gestisce installazione, aggiornamento e cache dei moduli.
- Supporta modalita test con baseUrl alternativo.

## Struttura dei moduli provider
Per ogni provider vengono scaricati file JS:
- posts.js (obbligatorio)
- meta.js (obbligatorio)
- stream.js (obbligatorio)
- catalog.js (obbligatorio)
- episodes.js (opzionale)

## ProviderManager
File: src/lib/services/ProviderManager.ts
- Esegue i moduli in un contesto isolato (new Function).
- Espone API per catalogo, ricerca, metadata, stream, episodi.
- Usa providerContext con axios, cheerio, estrattori e utility.

## ProviderContext
File: src/lib/providers/providerContext.ts
- axios, cheerio, Crypto (expo-crypto)
- headers comuni e funzioni di estrazione (hubcloud, gofile, gdflix, superVideo)

## Storage provider
- ExtensionStorage gestisce cache locale e stato installato/abilitato.
- UpdateProvidersService verifica versioni e aggiorna automaticamente.
