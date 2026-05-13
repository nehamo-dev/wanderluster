import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { WishlistItem } from '../../types';
import { FilmGrain } from './FilmGrain';

interface Props {
  item: WishlistItem;
  height?: number;
}

export function WishlistArt({ item, height = 200 }: Props) {
  const p = item.palette;
  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={[p.a, p.b, p.c]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { backgroundColor: p.a }]} />
      <FilmGrain seed={item.id.length} opacity={0.20} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: '55%' }]}
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
    top: '-20%', right: '-20%',
    width: '80%', height: '70%',
    borderRadius: 999,
    opacity: 0.33,
  },
});
