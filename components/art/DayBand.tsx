import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Folio } from '../../types';
import { FilmGrain } from './FilmGrain';

interface Props {
  folio: Folio;
  height?: number;
  idx?: number;
}

export function DayBand({ folio, height = 96, idx = 0 }: Props) {
  const p = folio.palette;
  const glowLeft = ((idx * 23) % 70) as any;
  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={[p.a, p.b, p.c]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.85, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { backgroundColor: p.a, left: glowLeft }]} />
      <FilmGrain seed={idx + folio.id.length} opacity={0.24} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.20)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: '50%' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: '-30%',
    width: '70%', height: '120%',
    borderRadius: 999,
    opacity: 0.53,
  },
});
