import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/** Fire-and-forget haptics; no-ops on web and never throws. */
export const haptics = {
  tap: () => {
    if (supported) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success: () => {
    if (supported)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
