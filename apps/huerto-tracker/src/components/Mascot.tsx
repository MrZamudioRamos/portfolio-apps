import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

export type MascotPose = 'idle' | 'wave' | 'point' | 'celebrate';

interface Props {
  pose?: MascotPose;
  size?: number;
}

/**
 * "Semillita" — the app mascot. Pure SVG, theme-recolored. A sprout with a
 * face and two leaf-arms that rotate around shoulder pivots. Arms are drawn
 * IN FRONT of the body (so they're visible) and rotated via rotation/originX
 * /originY (reliable across react-native-svg versions). Angles are degrees,
 * clockwise, 0° = pointing up.
 */
export function Mascot({ pose = 'idle', size = 120 }: Props) {
  // Always use huerto greens so Semillita keeps her identity regardless of app theme
  const body = '#76C77A';
  const leaf = '#43A047';
  const dark = '#2E7D32';
  const eye = '#2E3D2B';
  const cheek = '#E5533D';

  // Right arm is the expressive one; left mostly rests.
  const arms: Record<MascotPose, { l: number; r: number }> = {
    idle: { l: 215, r: 145 }, // both rest down-and-out
    wave: { l: 215, r: 8 }, // right arm up, waving
    point: { l: 215, r: 92 }, // right arm straight out to the side
    celebrate: { l: 312, r: 48 }, // both up in a V
  };
  const { l, r } = arms[pose];

  const calm = pose === 'idle' || pose === 'point';
  const mouth = calm
    ? 'M52 71 Q60 79 68 71'
    : pose === 'celebrate'
      ? 'M50 69 Q60 87 70 69 Q60 76 50 69 Z'
      : 'M53 70 Q60 82 67 70 Q60 76 53 70 Z';

  // Leaf with base at (px,py), tip up at (px, py-32); rotated around its base.
  const Arm = ({ px, py, rot }: { px: number; py: number; rot: number }) => (
    <G rotation={rot} originX={px} originY={py}>
      <Path
        d={`M${px} ${py} C ${px - 9} ${py - 9} ${px - 9} ${py - 26} ${px} ${py - 33} C ${px + 9} ${py - 26} ${px + 9} ${py - 9} ${px} ${py} Z`}
        fill={leaf}
      />
      <Path d={`M${px} ${py - 4} L${px} ${py - 28}`} stroke={dark} strokeWidth={1.5} strokeLinecap="round" opacity={0.4} />
    </G>
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* ground shadow */}
      <Ellipse cx={60} cy={114} rx={24} ry={4} fill="rgba(0,0,0,0.07)" />

      {/* sprout tip on top of the head */}
      <Path d="M60 33 C60 27 60 23 60 19" stroke={dark} strokeWidth={3} strokeLinecap="round" fill="none" />
      <Path d="M60 25 C53 23 49 15 50 10 C57 11 61 18 60 25 Z" fill={leaf} />
      <Path d="M60 27 C67 25 71 17 70 12 C63 13 59 20 60 27 Z" fill={leaf} />

      {/* body / head */}
      <Circle cx={60} cy={64} r={30} fill={body} />
      <Circle cx={60} cy={64} r={30} fill="none" stroke={leaf} strokeWidth={2} opacity={0.5} />

      {/* arms — in front of the body so the pose is visible */}
      <Arm px={34} py={70} rot={l} />
      <Arm px={86} py={70} rot={r} />

      {/* cheeks */}
      <Circle cx={45} cy={70} r={4.5} fill={cheek} opacity={0.32} />
      <Circle cx={75} cy={70} r={4.5} fill={cheek} opacity={0.32} />

      {/* eyes */}
      <Circle cx={51} cy={60} r={5} fill={eye} />
      <Circle cx={69} cy={60} r={5} fill={eye} />
      <Circle cx={52.8} cy={58.2} r={1.7} fill="#fff" />
      <Circle cx={70.8} cy={58.2} r={1.7} fill="#fff" />

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
