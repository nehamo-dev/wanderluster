import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import { FilmGrain } from '../art/FilmGrain';

interface Props {
  theme: Palette;
  onPress: () => void;
}

export function AddTile({ theme: T, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}
    >
      {/* Gradient image area — mirrors FolioTile height */}
      <View style={styles.imageContainer}>
        <LinearGradient
          colors={[T.accent, T.ink]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle glow blob */}
        <View style={[styles.glowBlob, { backgroundColor: T.accent }]} />
        <FilmGrain seed={3} opacity={0.18} />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>A blank folio</Text>
          <View style={styles.bottomText}>
            <Text style={styles.headline}>Throw it at me.</Text>
            <Text style={styles.sub}>
              Screenshots, pictures, URLs{'\n'}or free form text.
            </Text>
          </View>
        </View>

        {/* Plus indicator */}
        <View style={[styles.plusBadge, { backgroundColor: 'rgba(245,239,226,0.15)', borderColor: 'rgba(245,239,226,0.3)' }]}>
          <Text style={styles.plusText}>+</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: T.muted }]}>I'll organise it into a trip.</Text>
        <Text style={[styles.arrow, { color: T.ink }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexShrink: 0,
    width: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  imageContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  glowBlob: {
    position: 'absolute',
    top: '-20%',
    left: '-15%',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    opacity: 0.28,
  },
  content: {
    position: 'absolute',
    inset: 0 as any,
    padding: 16,
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#f5efe2',
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    opacity: 0.82,
  },
  bottomText: { gap: 6 },
  headline: {
    color: '#f5efe2',
    fontSize: 22,
    letterSpacing: -0.7,
    lineHeight: 24,
    fontWeight: '400',
  },
  sub: {
    color: '#f5efe2',
    fontSize: 11.5,
    lineHeight: 16,
    opacity: 0.72,
    letterSpacing: -0.05,
  },
  plusBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: '#f5efe2',
    fontSize: 16,
    lineHeight: 17,
    fontWeight: '300',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  metaText: {
    fontSize: 11.5,
    letterSpacing: -0.1,
    flex: 1,
  },
  arrow: { fontSize: 14 },
});
