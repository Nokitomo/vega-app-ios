# Navigazione

## Root
- RootStack (createNativeStackNavigator)
  - TabStack
  - Player (landscape)

## TabStack (Bottom Tabs)
- HomeStack
- SearchStack
- WatchListStack
- SettingsStack

## HomeStack
- Home
- Info (param: link, provider?, poster?)
- ScrollList (param: filter, title?, providerValue?, isSearch)
- Webview (param: link)

## SearchStack
- Search
- ScrollList
- Info
- SearchResults (param: filter, availableProviders?)
- Webview

## WatchListStack
- WatchList
- Info

## WatchHistoryStack
- WatchHistory
- Info
- SeriesEpisodes (param: series, episodes, thumbnails)

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
