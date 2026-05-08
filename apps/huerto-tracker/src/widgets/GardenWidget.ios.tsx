import { Text, VStack, HStack, Spacer } from '@expo/ui/swift-ui';
import { foregroundStyle, bold, font, padding } from '@expo/ui/swift-ui/modifiers';
import type { WidgetEnvironment } from 'expo-widgets';

export type GardenWidgetProps = {
  gardenName: string;
  plantCount: number;
  nextReminder: string | null;
  lunarEmoji: string;
};

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

function GardenWidgetSmall(props: GardenWidgetProps, _env: WidgetEnvironment) {
  'widget';
  return (
    <VStack alignment="leading" spacing={6} modifiers={[padding({ all: 4 })]}>
      <Text modifiers={[secondary, font({ size: 11 })]}>
        {props.lunarEmoji} HuertoTracker
      </Text>
      <Text modifiers={[bold(), font({ size: 28 })]}>
        🌱 {props.plantCount}
      </Text>
      <Spacer />
      <Text modifiers={[secondary, font({ size: 11 })]}>
        {props.nextReminder ? `💧 ${props.nextReminder}` : props.gardenName}
      </Text>
    </VStack>
  );
}

function GardenWidgetMedium(props: GardenWidgetProps, _env: WidgetEnvironment) {
  'widget';
  return (
    <HStack alignment="center" spacing={12} modifiers={[padding({ all: 4 })]}>
      <VStack alignment="leading" spacing={4}>
        <Text modifiers={[bold(), font({ size: 15 })]}>
          {props.gardenName}
        </Text>
        <Text modifiers={[font({ size: 28 })]}>
          🌱 {props.plantCount}
        </Text>
      </VStack>
      <Spacer />
      <VStack alignment="trailing" spacing={4}>
        <Text modifiers={[font({ size: 20 })]}>
          {props.lunarEmoji}
        </Text>
        {props.nextReminder ? (
          <Text modifiers={[secondary, font({ size: 12 })]}>
            💧 {props.nextReminder}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}

function GardenWidgetRoot(props: GardenWidgetProps, env: WidgetEnvironment) {
  'widget';
  if (env.widgetFamily === 'systemMedium') {
    return GardenWidgetMedium(props, env);
  }
  return GardenWidgetSmall(props, env);
}

export const GardenWidget: { updateSnapshot: (props: GardenWidgetProps) => void } = (() => {
  try {
    // createWidget requires a native build — silently no-ops in Expo Go
    const { createWidget } = require('expo-widgets') as typeof import('expo-widgets');
    return createWidget('GardenWidget', GardenWidgetRoot) as any;
  } catch {
    return { updateSnapshot: () => {} };
  }
})();
