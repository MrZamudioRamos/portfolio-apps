import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { CopilotProvider, walkthroughable } from 'react-native-copilot';
import { useColors } from '@portfolio/ui';
import { SemillitaTooltip } from './SemillitaTooltip';

/** Shared walkthroughable wrapper — wrap tour targets in <WalkView>. */
export const WalkView = walkthroughable(View);

const SPOTLIGHT_RADIUS = 16;

// Rounded-rect cutout using SVG arc commands (evenodd fill punches the hole)
const roundedSpotlightPath: Parameters<typeof CopilotProvider>[0]['svgMaskPath'] = ({
  size,
  position,
  canvasSize,
}) => {
  const x = (position.x as any)._value as number;
  const y = (position.y as any)._value as number;
  const w = (size.x as any)._value as number;
  const h = (size.y as any)._value as number;
  const r = Math.min(SPOTLIGHT_RADIUS, w / 2, h / 2);
  return (
    `M0,0H${canvasSize.x}V${canvasSize.y}H0V0Z` +
    `M${x + r},${y}H${x + w - r}a${r},${r} 0 0 1 ${r},${r}` +
    `V${y + h - r}a${r},${r} 0 0 1 ${-r},${r}` +
    `H${x + r}a${r},${r} 0 0 1 ${-r},${-r}` +
    `V${y + r}a${r},${r} 0 0 1 ${r},${-r}Z`
  );
};

/**
 * Standard Semillita spotlight-tour provider: svg overlay, dark backdrop,
 * on-brand tooltip + card. Wrap a screen's tree with this, mark targets with
 * CopilotStep + WalkView, and start the tour with useTourAutoStart.
 */
export function SemillitaTourProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  return (
    <CopilotProvider
      // Copilot's SVG setNativeProps path is incompatible with RN SVG on web.
      // Keep the library's supported View mask there; native retains the rounded SVG.
      overlay={Platform.OS === 'web' ? 'view' : 'svg'}
      animated={Platform.OS !== 'web'}
      backdropColor="rgba(0,0,0,0.75)"
      arrowSize={0}
      tooltipComponent={SemillitaTooltip}
      tooltipStyle={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, width: Math.min(300, width - 32) }}
      stepNumberComponent={() => null}
      svgMaskPath={roundedSpotlightPath}
    >
      {children}
    </CopilotProvider>
  );
}
