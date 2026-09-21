import React from 'react';

import { SemillitaBug, type SemillitaPose } from './SemillitaBug';

export type MascotPose = SemillitaPose;

interface Props {
  pose?: MascotPose;
  size?: number;
}

/**
 * Shared mascot API kept for existing screens. Every pose now uses the
 * official Semillín artwork selected from Stitch, so legacy screens do not
 * fall back to the previous green SVG character.
 */
export function Mascot({ pose = 'idle', size = 120 }: Props) {
  return <SemillitaBug pose={pose} size={size} />;
}
