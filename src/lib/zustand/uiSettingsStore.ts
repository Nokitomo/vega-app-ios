import {create} from 'zustand';
import {settingsStorage} from '../storage';

type UiSettingsState = {
  showTabBarLabels: boolean;
  showRecentlyWatched: boolean;
  setShowTabBarLabels: (value: boolean) => void;
  setShowRecentlyWatched: (value: boolean) => void;
};

const useUiSettingsStore = create<UiSettingsState>(set => ({
  showTabBarLabels: settingsStorage.showTabBarLabels(),
  showRecentlyWatched: settingsStorage.getBool('showRecentlyWatched', true),
  setShowTabBarLabels: value => {
    settingsStorage.setShowTabBarLabels(value);
    set({showTabBarLabels: value});
  },
  setShowRecentlyWatched: value => {
    settingsStorage.setBool('showRecentlyWatched', value);
    set({showRecentlyWatched: value});
  },
}));

export default useUiSettingsStore;
