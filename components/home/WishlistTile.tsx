import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { WishlistItem } from '../../types';
import { WISHLIST_PHOTOS } from '../../constants/photos';

interface Props {
  item: WishlistItem;
  theme: Palette;
  onPress?: () => void;
  onDelete?: () => void;
}

export function WishlistTile({ item, theme: T, onPress, onDelete }: Props) {
  const photo = WISHLIST_PHOTOS[item.id] ?? (item as any).photo;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDeletePress() {
    setMenuOpen(false);
    setTimeout(() => setConfirmOpen(true), 200);
  }

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={onPress ? 0.88 : 1}
        style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}
      >
        <View style={styles.imageContainer}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, { backgroundColor: item.palette.c }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.32)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.68)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.vibe}</Text>
          </View>
          {onDelete && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); setMenuOpen(true); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.menuBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.menuDots}>⋯</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.meta}>
          <Text style={[styles.name, { color: T.ink }]}>{item.name}</Text>
          <Text style={[styles.sub, { color: T.muted }]}>
            {item.season} · {item.flight}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Context menu */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeletePress} activeOpacity={0.7}>
              <Text style={styles.menuItemDelete}>Remove from wishlist</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={() => setMenuOpen(false)} activeOpacity={0.7}>
              <Text style={styles.menuItemCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Confirm delete */}
      <Modal transparent visible={confirmOpen} animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setConfirmOpen(false)}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Remove "{item.name}"?</Text>
            <Text style={styles.confirmSub}>It will be removed from your wishlist.</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmOpen(false)} activeOpacity={0.7}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDelete}
                onPress={() => { setConfirmOpen(false); onDelete?.(); }}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexShrink: 0, width: 168,
    borderRadius: 12, overflow: 'hidden', borderWidth: 0.5,
  },
  imageContainer: { height: 170, position: 'relative' },
  photo: { width: '100%', height: 170 },
  badge: {
    position: 'absolute', bottom: 10, left: 12,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
  },
  badgeText: {
    color: '#fff', fontSize: 9,
    letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  menuBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
  },
  menuDots: { color: '#fff', fontSize: 12, letterSpacing: 1 },
  meta: { padding: 14, gap: 6 },
  name: { fontSize: 14, letterSpacing: -0.2 },
  sub: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase' },

  menuScrim: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuCard: {
    width: 220, backgroundColor: '#F7F5F0',
    borderRadius: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 24, elevation: 16,
  },
  menuItem: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  menuItemDelete: { fontSize: 15, color: '#c0392b', letterSpacing: -0.2 },
  menuItemCancel: { fontSize: 15, color: 'rgba(0,0,0,0.45)', letterSpacing: -0.2 },
  menuDivider: { height: 0.5, backgroundColor: 'rgba(0,0,0,0.10)' },

  confirmCard: {
    width: 280, backgroundColor: '#F7F5F0',
    borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16, shadowRadius: 24, elevation: 16,
  },
  confirmTitle: { fontSize: 16, fontWeight: '500', color: '#1a1210', letterSpacing: -0.3, marginBottom: 8 },
  confirmSub: { fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 19, marginBottom: 20 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.07)', alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, color: 'rgba(0,0,0,0.55)', fontWeight: '500' },
  confirmDelete: {
    flex: 1, paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#c0392b', alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 14, color: '#fff', fontWeight: '500' },
});
