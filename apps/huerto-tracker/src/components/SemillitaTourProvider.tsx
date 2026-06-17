import React from 'react';
import { View } from 'react-native';
import { CopilotProvider, walkthroughable } from 'react-native-copilot';
import { useColors } from '@portfolio/ui';
import { SemillitaTooltip } from './SemillitaTooltip';

/** Shared walkthroughable wrapper — wrap tour targets in <WalkView>. */
export const WalkView = walkthroughable(View);

/**
 * Standard Semillita spotlight-tour provider: svg overlay, dark backdrop,
 * on-brand tooltip + card. Wrap a screen's tree with this, mark targets with
 * CopilotStep + WalkView, and start the tour with useTourAutoStart.
 */
export function SemillitaTourProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <CopilotProvider
      overlay="svg"
      animated
      backdropColor="rgba(0,0,0,0.75)"
      arrowColor={colors.surface}
      tooltipComponent={SemillitaTooltip}
      tooltipStyle={{ backgroundColor: colors.surface, borderRadius: 20, padding: 16, width: 300 }}
      stepNumberComponent={() => null}
    >
      {children}
    </CopilotProvider>
  );
}
