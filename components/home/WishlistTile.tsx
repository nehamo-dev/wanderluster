import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Palette } from '../../constants/theme';
import type { WishlistItem } from '../../types';
import { WishlistArt } from '../art/WishlistArt';

interface Props {
  item: WishlistItem;
  theme: Palette;
}

export function WishlistTile({ item, theme: T }: Props) {
  return (
    <View style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}>
      <WishlistArt item={item} height={170} />
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
  meta: { padding: 14, gap: 6 },
  name: { fontSize: 14, letterSpacing: -0.2 },
  sub: {
    fontSize: 10, letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
