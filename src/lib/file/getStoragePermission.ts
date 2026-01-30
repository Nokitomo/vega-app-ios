import {Platform, PermissionsAndroid, Alert} from 'react-native';
import i18n from '../../i18n';

export default async function requestStoragePermission() {
  try {
    console.log('requesting storage permission', Platform.OS, Platform.Version);
    if (Platform.OS === 'android' && Platform.Version > 29) {
      return true;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: i18n.t('Storage Permission'),
        message: i18n.t('App needs access to your storage to download files.'),
        buttonNeutral: i18n.t('Ask Me Later'),
        buttonNegative: i18n.t('Cancel'),
        buttonPositive: i18n.t('OK'),
      },
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      Alert.alert(
        i18n.t('Permission Denied'),
        i18n.t('Please enable storage permission in settings'),
      );
    }
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
}
