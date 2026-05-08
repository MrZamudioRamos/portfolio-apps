// Android / web stub — widgets are iOS only.
// Metro picks GardenWidget.ios.tsx on iOS automatically.

export type GardenWidgetProps = {
  gardenName: string;
  plantCount: number;
  nextReminder: string | null;
  lunarEmoji: string;
};

export const GardenWidget = {
  updateSnapshot: (_props: GardenWidgetProps): void => {},
  updateTimeline: (_props: GardenWidgetProps[]): void => {},
};
