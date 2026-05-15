import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { WishlistItem } from '../../types';
import { WISHLIST_PHOTOS } from '../../constants/photos';

interface Props {
  item: WishlistItem;
  theme: Palette;
}

export function WishlistTile({ item, theme: T }: Props) {
  const photo = WISHLIST_PHOTOS[item.id];

  return (
    <View style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}>
      <View style={styles.imageContainer}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, { backgroundColor: item.palette.c }]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.42)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.vibe}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.name, { color: T.ink }]}>{item.name}</Text>
        <Text style={[styles.sub, { color: T.muted }]}>
          {item.season} · {item.flight}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexShrink: 0, width: 168,
    borderRadius: 12, overflow: 'hidden', borderWidth: 0.5,
  },
  imageContainer: {
    height: 170,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 170,
  },
  badge: {
    position: 'absolute',
    bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: {
    color: '#f5efe2', fontSize: 9,
    letterSpacing: 2, textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  meta: { padding: 14, gap: 6 },
  name: { fontSize: 14, letterSpacing: -0.2 },
  sub: {
    fontSize: 10, letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
