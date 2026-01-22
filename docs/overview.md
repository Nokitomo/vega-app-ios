# Panoramica

Vega e una app Android e iOS per lo streaming di contenuti multimediali. La UI e costruita con React Native + Expo (SDK 52) e integra un sistema di provider esterni caricati dinamicamente. Il web non e supportato.

## Obiettivo principale
- Consentire all'utente di cercare contenuti, consultarne i dettagli e riprodurli.
- Supportare watchlist, cronologia, download e riproduzione con player interno/esterno.

## Flussi principali utente
1) Home
- Visualizza contenuti in base al provider attivo.
- Slider per categorie e hero in evidenza.

2) Ricerca
- Ricerca per titolo o filtro.
- Risultati raggruppati per provider.

3) Dettaglio contenuto (Info)
- Metadati, poster, trama e accesso alle sorgenti/episodi.
- Supporta vista Episodi e vista Correlati.
- Include controlli di chiusura e ritorno al contenuto precedente.

4) Player
- Riproduzione video con supporto a qualita, sottotitoli, controlli.

5) Watchlist e Cronologia
- Salva e consulta elementi preferiti e gia visti.

6) Download
- Download locale con stato e gestione file.

## Estensioni/Provider
- I provider sono moduli JS remoti che forniscono catalogo, metadata e stream.
- Il sistema supporta aggiornamenti automatici e installazione/rimozione.
- Per AnimeUnity, se un'immagine fallisce il caricamento in lista, viene cercato un fallback dai metadata.

## Persistenza dati
- Impostazioni utente, watchlist, cronologia e download vengono salvati in storage locale MMKV.
