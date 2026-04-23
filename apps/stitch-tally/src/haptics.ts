import * as Haptics from 'expo-haptics';

export async function hapticTap() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export async function hapticDecrement() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export async function hapticMilestone() {
  // Every 10 rows: double pulse
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise((r) => setTimeout(r, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export async function hapticComplete() {
  // Project finished: triple pulse + notification
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise((r) => setTimeout(r, 70));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise((r) => setTimeout(r, 70));
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export async function hapticReset() {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
