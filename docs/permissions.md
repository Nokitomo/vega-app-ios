# Permessi Android

Definiti in app.config.js:
- FOREGROUND_SERVICE
- FOREGROUND_SERVICE_MEDIA_PLAYBACK
- INTERNET
- MANAGE_EXTERNAL_STORAGE
- READ_EXTERNAL_STORAGE (con maxSdkVersion 32)
- READ_MEDIA_VIDEO
- WRITE_EXTERNAL_STORAGE (con maxSdkVersion 32)
- WRITE_SETTINGS

Motivazioni principali:
- Riproduzione media e servizi in foreground.
- Download e accesso ai file locali.
- Streaming e accesso alle reti.

Nota i18n:
- I testi di richiesta permesso storage sono localizzati in `src/i18n/`.
