import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';

interface Props {
  theme: Palette;
  onPress: () => void;
}

export function AddWishlistTile({ theme: T, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}
    >
      <View style={styles.imageArea}>
        <LinearGradient
          colors={['#3a3a4a', '#1a1820']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Star field dots */}
        {[
          { top: '18%', left: '22%', size: 2 },
          { top: '38%', left: '60%', size: 1.5 },
          { top: '55%', left: '35%', size: 1 },
          { top: '25%', left: '75%', size: 2.5 },
          { top: '70%', left: '15%', size: 1.5 },
          { top: '60%', left: '80%', size: 1 },
          { top: '12%', left: '50%', size: 1 },
        ].map((dot, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: dot.top as any,
              left: dot.left as any,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
              backgroundColor: 'rgba(245,239,226,0.55)',
            }}
          />
        ))}
        <View style={styles.content}>
          <Text style={styles.eyebrow}>Add destination</Text>
          <View style={styles.plusCircle}>
            <Text style={styles.plusText}>+</Text>
          </View>
          <Text style={styles.label}>Somewhere{'\n'}new</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.metaSub, { color: T.muted }]}>Save for later</Text>
        <Text style={[styles.arrow, { color: T.muted }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexShrink: 0, width: 148,
    borderRadius: 12, overflow: 'hidden', borderWidth: 0.5,
  },
  imageArea: { height: 170, position: 'relative', overflow: 'hidden' },
  content: {
    position: 'absolute', inset: 0 as any,
    padding: 14, justifyContent: 'space-between',
  },
  eyebrow: {
    color: 'rgba(245,239,226,0.65)', fontSize: 9,
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  plusCircle: {
    alignSelf: 'center',
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1, borderColor: 'rgba(245,239,226,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  plusText: { color: 'rgba(245,239,226,0.8)', fontSize: 22, lineHeight: 24, fontWeight: '300' },
  label: {
    color: '#f5efe2', fontSize: 16, letterSpacing: -0.5,
    lineHeight: 19, fontWeight: '400',
  },
  meta: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12,
  },
  metaSub: { fontSize: 11, letterSpacing: -0.1 },
  arrow: { fontSize: 13 },
});
