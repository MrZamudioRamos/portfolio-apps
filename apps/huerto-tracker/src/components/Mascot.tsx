import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { useColors } from '@portfolio/ui';

export type MascotPose = 'idle' | 'wave' | 'point' | 'celebrate';

interface Props {
  pose?: MascotPose;
  size?: number;
}

/**
 * "Semillita" — the app mascot. Same pure-SVG, theme-recolored technique as
 * Illustration.tsx so it stays on-brand with zero external art. A sprout with
 * a face + two leaf-arms that change pose. First pass: poses are rough and
 * meant to be tuned once seen on device.
 */
export function Mascot({ pose = 'idle', size = 120 }: Props) {
  const colors = useColors();
  const body = colors.primaryLight;
  const leaf = colors.primary;
  const dark = colors.primaryDark;
  const eye = '#2E3D2B';
  const cheek = colors.error;

  // Leaf-arm rotation per pose (degrees, 0 = pointing up, + = clockwise).
  const arms: Record<MascotPose, { l: number; r: number }> = {
    idle: { l: -150, r: 150 },
    wave: { l: -150, r: 15 },
    point: { l: -150, r: 100 },
    celebrate: { l: -35, r: 35 },
  };
  const { l, r } = arms[pose];

  const smile = pose === 'idle' || pose === 'point';
  // Open mouth for expressive poses, gentle arc for calm ones.
  const mouth = smile
    ? 'M52 70 Q60 78 68 70'
    : pose === 'celebrate'
      ? 'M50 69 Q60 85 70 69 Q60 75 50 69 Z'
      : 'M53 69 Q60 80 67 69 Q60 74 53 69 Z';

  const Arm = ({ px, py, rot }: { px: number; py: number; rot: number }) => (
    <G rotation={rot} origin={`${px}, ${py}`}>
      <Ellipse cx={px} cy={py - 16} rx={6.5} ry={14} fill={leaf} />
      <Line x1={px} y1={py - 3} x2={px} y2={py - 29} stroke={dark} strokeWidth={1.5} opacity={0.4} />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* ground shadow */}
      <Ellipse cx={60} cy={113} rx={26} ry={4} fill={colors.surfaceAlt} />

      {/* sprout tip on top of the head */}
      <Path d="M60 32 C60 26 60 22 60 18" stroke={dark} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M60 24 C54 22 50 15 51 10 C57 11 61 17 60 24 Z" fill={leaf} />
      <Path d="M60 26 C66 24 70 17 69 12 C63 13 59 19 60 26 Z" fill={leaf} />

      {/* arms */}
      <Arm px={40} py={80} rot={l} />
      <Arm px={80} py={80} rot={r} />

      {/* body / head */}
      <Circle cx={60} cy={62} r={30} fill={body} />
      <Circle cx={60} cy={62} r={30} fill="none" stroke={leaf} strokeWidth={2} opacity={0.5} />

      {/* cheeks */}
      <Circle cx={45} cy={67} r={4} fill={cheek} opacity={0.35} />
      <Circle cx={75} cy={67} r={4} fill={cheek} opacity={0.35} />

      {/* eyes */}
      <Circle cx={51} cy={57} r={4.5} fill={eye} />
      <Circle cx={69} cy={57} r={4.5} fill={eye} />
      <Circle cx={52.5} cy={55.5} r={1.5} fill="#fff" />
      <Circle cx={70.5} cy={55.5} r={1.5} fill="#fff" />

      {/* mouth */}
      <Path
        d={mouth}
        fill={smile ? 'none' : '#7A3B2E'}
        stroke={smile ? '#5A3326' : 'none'}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}
