# Panoramica

Vega e una app Android e iOS per lo streaming di contenuti multimediali. La UI e costruita con React Native + Expo (SDK 52) e integra un sistema di provider esterni caricati dinamicamente. Il web non e supportato.

## Obiettivo principale
- Consentire all'utente di cercare contenuti, consultarne i dettagli e riprodurli.
- Supportare watchlist, cronologia, download e riproduzione con player interno/esterno.

## Flussi principali utente
1) Home
- Visualizza contenuti in base al provider attivo.
- Slider per categorie e hero in evidenza.
- Le card per episodi recenti e calendario mostrano il badge "Ep. X" quando disponibile.
- La vista "more" del calendario usa una griglia con sezioni per giorno.
- L'hero usa una cache settimanale per ridurre refresh involontari.

2) Ricerca
- Ricerca per titolo o filtro.
- Risultati raggruppati per provider.
- La ricerca globale usa cache LRU (max 10 query): resta valida mentre la tab Search e attiva, poi scade dopo 10 minuti dall'uscita.

3) Dettaglio contenuto (Info)
- Metadati, poster, trama e accesso alle sorgenti/episodi.
- Supporta vista Episodi e vista Correlati.
- Include controlli di chiusura e ritorno al contenuto precedente.
- Se disponibile la riproduzione salvata, mostra il pulsante "Riprendi" con minutaggio e episodio.
- La lista episodi mostra una barra di avanzamento per gli episodi gia iniziati.

4) Player
- Riproduzione video con supporto a qualita, sottotitoli, controlli.
- L'app resta in verticale fuori dal player; il player blocca l'orizzontale.

5) Watchlist e Cronologia
- Salva e consulta elementi preferiti e gia visti.
- La sezione Continue Watching mostra il badge episodio quando disponibile.

6) Download
- Download locale con stato e gestione file.

## Estensioni/Provider
- I provider sono moduli JS remoti che forniscono catalogo, metadata e stream.
- Il sistema supporta aggiornamenti automatici e installazione/rimozione.
- Per AnimeUnity, se un'immagine fallisce il caricamento in lista, viene cercato il poster dai metadata.

## Persistenza dati
- Impostazioni utente, watchlist, cronologia e download vengono salvati in storage locale MMKV.
