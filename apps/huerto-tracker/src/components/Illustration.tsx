import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { useColors } from '@portfolio/ui';

type IllustrationName =
  | 'seedling'      // home first-use / no plants
  | 'empty-basket'  // no harvest
  | 'not-found'     // scan/search no result
  | 'diary-empty'   // no diary entries
  | 'calendar'      // calendar empty month
  | 'crops'         // empty custom crops
  | 'error';        // generic error

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

  if (name === 'diary-empty') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        <Circle cx={88} cy={28} r={8} fill={sun} />
        {/* notebook */}
        <Rect x={28} y={36} width={56} height={66} rx={6} fill={colors.surface} />
        <Rect x={28} y={36} width={10} height={66} rx={6} fill={leafLight} />
        {/* lines */}
        <Rect x={46} y={52} width={32} height={4} rx={2} fill={colors.border} />
        <Rect x={46} y={62} width={24} height={4} rx={2} fill={colors.border} />
        <Rect x={46} y={72} width={28} height={4} rx={2} fill={colors.border} />
        {/* pencil */}
        <Path d="M78 88 L94 72 L100 78 L84 94 Z" fill={sun} />
        <Path d="M94 72 L100 78 L102 70 Z" fill={pot} />
        <Path d="M78 88 L84 94 L76 96 Z" fill={soil} />
      </Svg>
    );
  }

  if (name === 'calendar') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        <Circle cx={90} cy={28} r={8} fill={sun} />
        {/* calendar body */}
        <Rect x={20} y={38} width={80} height={62} rx={8} fill={colors.surface} />
        <Rect x={20} y={38} width={80} height={20} rx={8} fill={leaf} />
        <Rect x={20} y={48} width={80} height={10} fill={leaf} />
        {/* ring hooks */}
        <Rect x={38} y={32} width={6} height={14} rx={3} fill={leafLight} />
        <Rect x={76} y={32} width={6} height={14} rx={3} fill={leafLight} />
        {/* dots */}
        {[36,52,68,84].map((x, i) => (
          <G key={i}>
            <Circle cx={x} cy={74} r={4} fill={i === 0 ? sun : colors.border} />
            <Circle cx={x} cy={88} r={4} fill={colors.border} />
          </G>
        ))}
      </Svg>
    );
  }

  if (name === 'crops') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        <Circle cx={88} cy={28} r={8} fill={sun} />
        {/* seed packet */}
        <Rect x={30} y={40} width={60} height={52} rx={8} fill={colors.surface} />
        <Rect x={30} y={40} width={60} height={22} rx={8} fill={leaf} />
        <Rect x={30} y={52} width={60} height={10} fill={leaf} />
        {/* sprout on packet */}
        <Path d="M60 62 C60 54 60 48 60 42" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M60 52 C54 50 50 44 50 38 C56 38 60 44 60 52 Z" fill={leafLight} />
        {/* + badge */}
        <Circle cx={80} cy={82} r={14} fill={sun} />
        <Path d="M80 74 L80 90 M72 82 L88 82" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
      </Svg>
    );
  }

  if (name === 'error') {
    return (
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx={60} cy={60} r={56} fill={ring} />
        <Circle cx={60} cy={60} r={36} fill={colors.surface} />
        <Path d="M60 42 L60 68" stroke={colors.error} strokeWidth={6} strokeLinecap="round" />
        <Circle cx={60} cy={78} r={4} fill={colors.error} />
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
