import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { persistPickedImage } from '../utils/persistImage';

export type PickPhotoResult =
  | { kind: 'success'; uri: string }
  | { kind: 'canceled' }
  | { kind: 'denied' };

export type UsePickPhotoOptions = {
  aspect?: [number, number];
  quality?: number;
  /** i18n key prefix for permission-denied alerts. Defaults to 'common'. */
  i18nNamespace?: 'common' | 'plantScan' | 'identify';
};

/**
 * Shared photo-picker with permission recovery + persistPickedImage.
 *
 * Encapsulates the 7-site duplicate that had the H9 bug class: silent deny
 * with no `canAskAgain` / `Linking.openSettings` recovery. Now every site
 * gets the same UX: blocked users get an Alert with "Abrir Ajustes" CTA.
 *
 * Returns the persisted file:// uri (or https URL if the source was remote).
 */
export function usePickPhoto(opts: UsePickPhotoOptions = {}) {
  const { aspect = [4, 3], quality = 0.7, i18nNamespace = 'common' } = opts;
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);

  const showPermissionAlert = useCallback(
    (kind: 'camera' | 'gallery', canAskAgain: boolean) => {
      const ns = i18nNamespace;
      const titleKey = ns === 'common' ? 'common.cameraDeniedTitle' : `${ns}.cameraDeniedTitle`;
      const descKey =
        kind === 'camera'
          ? ns === 'common'
            ? 'common.cameraDeniedDesc'
            : `${ns}.cameraDeniedDesc`
          : ns === 'common'
            ? 'common.galleryDeniedDesc'
            : `${ns}.galleryDeniedDesc`;
      Alert.alert(t(titleKey), t(descKey), [
        { text: t('common.cancel'), style: 'cancel' },
        canAskAgain
          ? { text: t('common.retry') }
          : { text: t('common.openSettings'), onPress: () => { void Linking.openSettings(); } },
      ]);
    },
    [i18nNamespace, t],
  );

  const pickFromGallery = useCallback(async (): Promise<PickPhotoResult> => {
    if (picking) return { kind: 'canceled' };
    setPicking(true);
    try {
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showPermissionAlert('gallery', canAskAgain);
        return { kind: 'denied' };
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect,
        quality,
      });
      if (result.canceled) return { kind: 'canceled' };
      const uri = await persistPickedImage(result.assets[0].uri);
      return { kind: 'success', uri };
    } finally {
      setPicking(false);
    }
  }, [picking, aspect, quality, showPermissionAlert]);

  const pickFromCamera = useCallback(async (): Promise<PickPhotoResult> => {
    if (picking) return { kind: 'canceled' };
    setPicking(true);
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showPermissionAlert('camera', canAskAgain);
        return { kind: 'denied' };
      }
      try {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect,
          quality,
        });
        if (result.canceled) return { kind: 'canceled' };
        const uri = await persistPickedImage(result.assets[0].uri);
        return { kind: 'success', uri };
      } catch {
        Alert.alert(t('common.error'), t('common.noCameraDesc'));
        return { kind: 'canceled' };
      }
    } finally {
      setPicking(false);
    }
  }, [picking, aspect, quality, showPermissionAlert, t]);

  return { pickFromGallery, pickFromCamera, picking };
}
