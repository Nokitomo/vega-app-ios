import {Platform} from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

let navBarSuspended = false;

export const setNavBarSuspended = (value: boolean) => {
  navBarSuspended = value;
  if (value && Platform.OS === 'android') {
    NavigationBar.setVisibilityAsync('visible').catch(() => {});
  }
};

export const isNavBarSuspended = () => navBarSuspended;
