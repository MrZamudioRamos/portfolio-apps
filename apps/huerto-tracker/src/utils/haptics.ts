import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

/** Light tap — button presses, selections */
export function tapHaptic() {
  if (!isIOS) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium impact — save, confirm actions */
export function successHaptic() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Error feedback */
export function errorHaptic() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

/** Heavy — destructive actions (delete confirm) */
export function warningHaptic() {
  if (!isIOS) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
