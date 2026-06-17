import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useColors } from '@portfolio/ui';

export type MascotPose = 'idle' | 'wave' | 'point' | 'celebrate';

interface Props {
  pose?: MascotPose;
  size?: number;
}

/**
 * "Semillita" — the app mascot. Pure SVG, theme-recolored (same technique as
 * Illustration.tsx, zero external art). A sprout with a face and two leaf-arms
 * that rotate around shoulder pivots. Angles below are clockwise, 0° = up.
 */
export function Mascot({ pose = 'idle', size = 120 }: Props) {
  const colors = useColors();
  const body = colors.primaryLight;
  const leaf = colors.primary;
  const dark = colors.primaryDark;
  const eye = '#2E3D2B';
  const cheek = colors.error;

  // Leaf-arm angles per pose (deg, clockwise, 0 = pointing up).
  const arms: Record<MascotPose, { l: number; r: number }> = {
    idle: { l: 210, r: 150 }, // both hang down-and-out
    wave: { l: 210, r: 18 }, // right arm raised high (waving)
    point: { l: 210, r: 90 }, // right arm straight out to the side
    celebrate: { l: 325, r: 35 }, // both up in a V
  };
  const { l, r } = arms[pose];

  const calm = pose === 'idle' || pose === 'point';
  const mouth = calm
    ? 'M52 70 Q60 78 68 70' // gentle smile
    : pose === 'celebrate'
      ? 'M50 68 Q60 86 70 68 Q60 75 50 68 Z' // big open grin
      : 'M53 69 Q60 81 67 69 Q60 75 53 69 Z'; // happy open (wave)

  // Leaf drawn with its base at local origin, tip pointing up (−y).
  const Arm = ({ px, py, rot }: { px: number; py: number; rot: number }) => (
    <G transform={`translate(${px}, ${py}) rotate(${rot})`}>
      <Path d="M0 0 C -9 -9 -9 -26 0 -34 C 9 -26 9 -9 0 0 Z" fill={leaf} />
      <Path d="M0 -3 L0 -29" stroke={dark} strokeWidth={1.5} strokeLinecap="round" opacity={0.4} fill="none" />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* ground shadow */}
      <Ellipse cx={60} cy={114} rx={24} ry={4} fill={colors.surfaceAlt} />

      {/* arms (behind body so shoulders tuck in) */}
      <Arm px={38} py={74} rot={l} />
      <Arm px={82} py={74} rot={r} />

      {/* sprout tip on top of the head */}
      <Path d="M60 33 C60 27 60 23 60 19" stroke={dark} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M60 25 C53 23 49 15 50 10 C57 11 61 18 60 25 Z" fill={leaf} />
      <Path d="M60 27 C67 25 71 17 70 12 C63 13 59 20 60 27 Z" fill={leaf} />

      {/* body / head */}
      <Circle cx={60} cy={64} r={30} fill={body} />
      <Circle cx={60} cy={64} r={30} fill="none" stroke={leaf} strokeWidth={2} opacity={0.5} />

      {/* cheeks */}
      <Circle cx={45} cy={69} r={4.5} fill={cheek} opacity={0.32} />
      <Circle cx={75} cy={69} r={4.5} fill={cheek} opacity={0.32} />

      {/* eyes */}
      <Circle cx={51} cy={59} r={5} fill={eye} />
      <Circle cx={69} cy={59} r={5} fill={eye} />
      <Circle cx={52.8} cy={57.2} r={1.7} fill="#fff" />
      <Circle cx={70.8} cy={57.2} r={1.7} fill="#fff" />

      {/* mouth */}
      <Path
        d={mouth}
        fill={calm ? 'none' : '#7A3B2E'}
        stroke={calm ? '#5A3326' : 'none'}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
