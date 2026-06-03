import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useColors } from '@portfolio/ui';

type IllustrationName = 'seedling' | 'empty-basket' | 'not-found';

interface Props {
  name?: IllustrationName;
  size?: number;
}

/**
 * Lightweight on-brand flat illustrations (pure SVG, recolored from the theme)
 * to replace bare emoji in empty states. Friendly + rounded to match the
 * "Fresco y amable" direction.
 */
export function Illustration({ name = 'seedling', size = 140 }: Props) {
  const colors = useColors();
  const leaf = colors.primary;
  const leafLight = colors.primaryLight;
  const sun = colors.secondary;
  const pot = colors.warning;
  const soil = '#7A4A2B';
  const ring = colors.surfaceAlt;

  if (name === 'empty-basket') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        <Circle cx={92} cy={30} r={9} fill={sun} />
        {/* basket */}
        <Path d="M30 58 L90 58 L82 96 Q80 102 74 102 L46 102 Q40 102 38 96 Z" fill={pot} />
        <Rect x={26} y={50} width={68} height={12} rx={6} fill={pot} opacity={0.85} />
        {/* weave lines */}
        <Line x1={44} y1={62} x2={50} y2={98} stroke="#fff" strokeWidth={2} opacity={0.5} />
        <Line x1={60} y1={62} x2={60} y2={100} stroke="#fff" strokeWidth={2} opacity={0.5} />
        <Line x1={76} y1={62} x2={70} y2={98} stroke="#fff" strokeWidth={2} opacity={0.5} />
        {/* a couple of veggies */}
        <Circle cx={50} cy={54} r={8} fill={leaf} />
        <Circle cx={68} cy={52} r={9} fill={leafLight} />
      </Svg>
    );
  }

  if (name === 'not-found') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        {/* magnifier */}
        <Circle cx={52} cy={52} r={24} fill="none" stroke={leaf} strokeWidth={7} />
        <Line x1={70} y1={70} x2={92} y2={92} stroke={leaf} strokeWidth={9} strokeLinecap="round" />
        <Path d="M52 44 q6 -8 12 0" fill="none" stroke={leafLight} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={92} cy={28} r={7} fill={sun} />
      </Svg>
    );
  }

  // seedling (default)
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx={60} cy={60} r={56} fill={ring} />
      {/* sun + rays */}
      <Circle cx={92} cy={28} r={11} fill={sun} />
      <Line x1={92} y1={8} x2={92} y2={14} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      <Line x1={110} y1={28} x2={104} y2={28} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      <Line x1={106} y1={14} x2={101} y2={19} stroke={sun} strokeWidth={3} strokeLinecap="round" />
      {/* pot */}
      <Path d="M40 84 L80 84 L75 108 Q74 110 71 110 L49 110 Q46 110 45 108 Z" fill={pot} />
      <Rect x={36} y={78} width={48} height={10} rx={5} fill={pot} />
      <Ellipse cx={60} cy={83} rx={22} ry={4} fill={soil} />
      {/* stem + leaves */}
      <Path d="M60 84 C60 70 60 58 60 48" stroke={leaf} strokeWidth={4} strokeLinecap="round" fill="none" />
      <Path d="M60 62 C48 60 40 50 40 40 C52 40 60 50 60 62 Z" fill={leafLight} />
      <Path d="M60 56 C72 54 80 44 80 34 C68 34 60 44 60 56 Z" fill={leaf} />
    </Svg>
  );
}
