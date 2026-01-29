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
- La vista "more" del calendario include anche la sezione "Undetermined".
- L'hero usa una cache settimanale per ridurre refresh involontari.

2) Ricerca
- Ricerca per titolo o filtro.
- La schermata Search usa OMDb per suggerimenti rapidi e salva la cronologia locale.
- Risultati raggruppati per provider.
- La ricerca globale usa cache LRU (max 10 query): resta valida mentre la tab Search e attiva, poi scade dopo 10 minuti dall'uscita.

3) Dettaglio contenuto (Info)
- Metadati, poster, trama e accesso alle sorgenti/episodi.
- Supporta vista Episodi e vista Correlati.
- Include controlli di chiusura e ritorno al contenuto precedente.
- Mostra il pulsante "Riprendi"; se non esiste riproduzione salvata mostra "Riproduci Ep. 1 00:00".
- La lista episodi mostra una barra di avanzamento per gli episodi gia iniziati.
- Il pulsante "Riprendi/Riproduci" cambia automaticamente pagina quando il provider usa range di episodi (es. AnimeUnity).
- Se il provider fornisce rating e generi, vengono mostrati; per AnimeUnity i generi compaiono sotto "Studio".

4) Player
- Riproduzione video con supporto a qualita, sottotitoli, controlli.
- Su Android e disponibile l'apertura in player esterno (es. VLC).
- L'app resta in verticale fuori dal player; il player blocca l'orizzontale.

5) Watchlist e Cronologia
- Salva e consulta elementi preferiti e gia visti.
- La sezione Continue Watching mostra il badge episodio quando disponibile.
- La pulizia della cronologia rimuove anche i progressi salvati.
- La rimozione di un titolo dalla cronologia azzera anche i progressi episodio.

6) Download
- Download locale con stato e gestione file.
- Per AnimeUnity il download in-app usa solo il server "AnimeUnity Download"; i server HLS non supportati vengono esclusi.

## Estensioni/Provider
- I provider sono moduli JS remoti che forniscono catalogo, metadata e stream.
- Il sistema supporta aggiornamenti automatici e installazione/rimozione.
- Per AnimeUnity, se un'immagine fallisce il caricamento in lista, viene cercato il poster dai metadata.
- Alcuni provider (es. AnimeUnity) usano una lista Pastebin per risolvere il base URL; i fallback restano nel provider.

## Persistenza dati
- Impostazioni utente, watchlist, cronologia e download vengono salvati in storage locale MMKV.
