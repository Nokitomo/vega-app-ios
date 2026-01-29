# Navigazione

## Root
- RootStack (createNativeStackNavigator)
  - TabStack
  - Player (landscape)

## Orientamento
- Gestione centralizzata in `src/App.tsx`: portrait per tutte le schermate, landscape solo per `Player`.

## TabStack (Bottom Tabs)
- HomeStack
- SearchStack
- WatchListStack
- SettingsStack

## HomeStack
- Home
- Info (param: link, provider?, poster?, infoStack?)
- ScrollList (param: filter, title?, providerValue?, isSearch)
- Webview (param: link)

## SearchStack
- Search
- ScrollList
- Info
- SearchResults (param: filter, availableProviders?)

## WatchListStack
- WatchList
- Info

## WatchHistoryStack
- WatchHistory
- Info
- SeriesEpisodes (param: series, episodes, thumbnails)
Nota: lo stack WatchHistory e raggiungibile da Settings.

## SettingsStack
- Settings
- About
- Preferences
- Downloads
- Extensions
- WatchHistoryStack
- SubTitlesPreferences

## Note UI
- Tab bar personalizzata con haptic feedback opzionale.
- Uso di SafeAreaView e tema scuro custom.
- In Info, il pulsante X torna alla schermata precedente senza reset dello stack.
- Preferenze: "Show Tab Bar Labels" controlla la visibilita delle etichette nella tab bar; "Show Recently Watched" abilita/disabilita la sezione Continue Watching in Home.
