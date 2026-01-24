# Provider ed Estensioni

## Obiettivo
I contenuti non sono hardcoded: il catalogo e la logica di scraping/streaming vengono forniti da moduli esterni (provider) caricati dinamicamente.

## ExtensionManager
File: src/lib/services/ExtensionManager.ts
- Scarica il manifest provider dal repo primario:
  https://raw.githubusercontent.com/Nokitomo/vega-providers/refs/heads/main/manifest.json
- Se il repo primario non e disponibile, usa il fallback ufficiale:
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
- I provider possono fornire piu stream per lo stesso episodio (es. AnimeUnity via VixCloud Server1/Server2 con fallback Download e varianti qualita da master playlist).
- Nel player, su errori HTTP 403/503, viene fatto un refetch dei link stream per rigenerare i token prima di provare altri server, con cooldown per server e riuso della cache stream su mount.

## ProviderContext
File: src/lib/providers/providerContext.ts
- axios, cheerio, Crypto (expo-crypto)
- headers comuni e funzioni di estrazione (hubcloud, gofile, gdflix, superVideo)

## Storage provider
- ExtensionStorage gestisce cache locale e stato installato/abilitato.
- UpdateProvidersService verifica versioni e aggiorna automaticamente.

## Dove stanno i provider
- I provider non sono hardcoded nel repository dell'app.
- Sono moduli JS ospitati su GitHub e scaricati a runtime.
- Repo primario: `Nokitomo/vega-providers`
- Fallback ufficiale: `Zenda-Cross/vega-providers`
- Non esiste un backend privato: l'app consuma solo risorse pubbliche via HTTP.

## Come aggiungere provider personalizzati
- Devi pubblicare un tuo set di provider (manifest + moduli JS) in un repo/host accessibile via URL.
- L'app, di default, punta al repo ufficiale: per usare il tuo repo serve cambiare la base URL in `ExtensionManager` (o aggiungere una UI di configurazione).
