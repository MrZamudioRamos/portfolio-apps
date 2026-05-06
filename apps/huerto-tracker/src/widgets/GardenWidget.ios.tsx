import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import { Text, VStack, HStack, Spacer } from '@expo/ui';

export type GardenWidgetProps = {
  gardenName: string;
  plantCount: number;
  nextReminder: string | null;
  lunarEmoji: string;
};

function GardenWidgetSmall(props: GardenWidgetProps, _env: WidgetEnvironment) {
  'widget';
  return (
    <VStack alignment="leading" spacing={6}>
      <Text textStyle="caption1" foregroundStyle="secondary">
        {props.lunarEmoji} HuertoTracker
      </Text>
      <Text textStyle="title2">🌱 {props.plantCount}</Text>
      <Spacer />
      {props.nextReminder ? (
        <Text textStyle="caption2" foregroundStyle="secondary">
          💧 {props.nextReminder}
        </Text>
      ) : (
        <Text textStyle="caption2" foregroundStyle="secondary">
          {props.gardenName}
        </Text>
      )}
    </VStack>
  );
}

function GardenWidgetMedium(props: GardenWidgetProps, _env: WidgetEnvironment) {
  'widget';
  return (
    <HStack alignment="center" spacing={12}>
      <VStack alignment="leading" spacing={4}>
        <Text textStyle="headline">{props.gardenName}</Text>
        <Text textStyle="title">🌱 {props.plantCount} plants</Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={4}>
        <Text textStyle="caption1">{props.lunarEmoji}</Text>
        {props.nextReminder ? (
          <Text textStyle="caption1" foregroundStyle="secondary">
            💧 {props.nextReminder}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}

function GardenWidgetRoot(props: GardenWidgetProps, env: WidgetEnvironment) {
  'widget';
  if (env.family === 'systemMedium') {
    return GardenWidgetMedium(props, env);
  }
  return GardenWidgetSmall(props, env);
}

export const GardenWidget = createWidget('GardenWidget', GardenWidgetRoot);
