import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Palette } from '../../constants/theme';
import type { Folio } from '../../types';
import { DestinationArt } from '../art/DestinationArt';

interface Props {
  folio: Folio;
  theme: Palette;
  onOpen: () => void;
}

export function FolioTile({ folio, theme: T, onOpen }: Props) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.88}
      style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}
    >
      <View style={styles.imageContainer}>
        <DestinationArt folio={folio} height={220} />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.topRow}>
            <Text style={styles.folioLabel}>Folio</Text>
            <Text style={styles.durationLabel}>{folio.duration}</Text>
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.destinationLabel}>{folio.destination}</Text>
            <Text style={styles.title}>{folio.title}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.metaLeft}>
          <Text style={[styles.dates, { color: T.ink }]}>{folio.dates}</Text>
          <Text style={[styles.vibe, { color: T.muted }]}>{folio.vibe}</Text>
        </View>
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
    position: 'relative',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  folioLabel: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase',
    fontFamily: 'monospace', opacity: 0.82,
  },
  durationLabel: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 3, textTransform: 'uppercase',
    fontFamily: 'monospace', opacity: 0.82,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 12, left: 14, right: 14,
  },
  destinationLabel: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 2.5, textTransform: 'uppercase',
    opacity: 0.78, marginBottom: 4,
  },
  title: {
    color: '#f5efe2', fontSize: 20,
    letterSpacing: -0.6, lineHeight: 21,
    fontWeight: '400',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  metaLeft: { gap: 2 },
  dates: { fontSize: 12.5, letterSpacing: -0.15 },
  vibe: { fontSize: 10.5, letterSpacing: 0.3, marginTop: 2 },
  arrow: { fontSize: 14 },
});
