import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';

interface Props {
  opacity?: number;
  seed?: number;
}

export function FilmGrain({ opacity = 0.18, seed = 1 }: Props) {
  const filterId = `grain-${seed}`;
  return (
    <Svg
      style={[StyleSheet.absoluteFill, { opacity, mixBlendMode: 'overlay' } as any]}
      preserveAspectRatio="none"
    >
      <Filter id={filterId}>
        <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed} />
        <FeColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
      </Filter>
      <Rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </Svg>
  );
}
