import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Folio } from '../../types';
import { FilmGrain } from './FilmGrain';

interface Props {
  folio: Folio;
  height?: number;
}

// Simulated radial glow blobs using oval Views with opacity
function Glow({ color, style }: { color: string; style: object }) {
  return (
    <View style={[styles.glow, { backgroundColor: color }, style]} />
  );
}

export function DestinationArt({ folio, height = 440 }: Props) {
  const p = folio.palette;
  const seed = folio.id.length;

  const compositions: Record<string, React.ReactNode> = {
    tokyo: (
      <>
        <Glow color={p.a} style={{ top: '-12%', right: '-8%', width: '68%', height: '58%', borderRadius: 999, opacity: 0.7 }} />
        <Glow color={p.b} style={{ bottom: '10%', left: '-10%', width: '58%', height: '46%', borderRadius: 999, opacity: 0.55 }} />
        <LinearGradient
          colors={[p.c, 'transparent']}
          start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
          style={[StyleSheet.absoluteFill, { top: '58%' }]}
        />
      </>
    ),
    salzburg: (
      <>
        <LinearGradient
          colors={[p.c, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { bottom: '45%' }]}
        />
        <Glow color={p.b} style={{ bottom: '-10%', right: '-10%', width: '70%', height: '60%', borderRadius: 999, opacity: 0.6 }} />
        <Glow color={p.a} style={{ top: '25%', left: '10%', width: '55%', height: '40%', borderRadius: 999, opacity: 0.2 }} />
      </>
    ),
    yosemite: (
      <>
        <LinearGradient
          colors={[p.a, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFill, { bottom: '50%', opacity: 0.7 }]}
        />
        <LinearGradient
          colors={[p.c, p.b, 'transparent']}
          start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
          style={[StyleSheet.absoluteFill, { top: '32%' }]}
        />
        <Glow color={p.b} style={{ top: '30%', right: '-20%', width: '80%', height: '45%', borderRadius: 999, opacity: 0.4 }} />
      </>
    ),
  };

  const composition = compositions[folio.id] ?? (
    <Glow color={p.a} style={{ top: '-10%', right: '-10%', width: '70%', height: '60%', borderRadius: 999, opacity: 0.6 }} />
  );

  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient
        colors={[p.a, p.b, p.c]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      {composition}
      <FilmGrain seed={seed} opacity={0.22} />
      {/* vignette */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: '60%' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
  },
});
