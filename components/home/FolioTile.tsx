import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  Modal, Pressable, Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Palette } from '../../constants/theme';
import type { Folio } from '../../types';
import { getDestinationPhoto } from '../../constants/photos';
import { DestinationArt } from '../art/DestinationArt';

interface Props {
  folio: Folio;
  theme: Palette;
  onOpen: () => void;
  onDelete?: () => void;
}

export function FolioTile({ folio, theme: T, onOpen, onDelete }: Props) {
  // Priority: stored photo → static map → art fallback
  const photo = folio.photo ?? getDestinationPhoto(folio.id, folio.destination);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (photo && !imageLoaded) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [photo]);

  const shimmerOpacity = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.85] });

  function handleDeletePress() {
    setMenuOpen(false);
    setTimeout(() => setConfirmOpen(true), 200);
  }

  function handleConfirmDelete() {
    setConfirmOpen(false);
    onDelete?.();
  }

  return (
    <>
      <TouchableOpacity
        onPress={onOpen}
        activeOpacity={0.88}
        style={[styles.tile, { backgroundColor: T.surface, borderColor: T.hair }]}
      >
        <View style={styles.imageContainer}>
          {photo ? (
            <>
              {!imageLoaded && (
                <Animated.View
                  style={[styles.skeleton, { backgroundColor: T.surface, opacity: shimmerOpacity }]}
                />
              )}
              <Image
                source={{ uri: photo }}
                style={[styles.photo, !imageLoaded && styles.photoHidden]}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {imageLoaded && (
                <LinearGradient
                  colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.72)']}
                  locations={[0, 0.38, 1]}
                  style={StyleSheet.absoluteFill}
                />
              )}
            </>
          ) : (
            <DestinationArt folio={folio} height={220} />
          )}

          <View style={[StyleSheet.absoluteFill, styles.labelLayer]}>
            <View style={styles.topRow}>
              <Text style={styles.folioLabel}>Folio</Text>
              <View style={styles.topRight}>
                <Text style={styles.durationLabel}>{folio.duration}</Text>
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

      {/* Context menu */}
      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuScrim} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeletePress} activeOpacity={0.7}>
              <Text style={styles.menuItemDelete}>Delete folio</Text>
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
            <Text style={styles.confirmTitle}>Delete "{folio.title}"?</Text>
            <Text style={styles.confirmSub}>This folio and all its days will be removed.</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity style={styles.confirmCancel} onPress={() => setConfirmOpen(false)} activeOpacity={0.7}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDelete} onPress={handleConfirmDelete} activeOpacity={0.7}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
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
    flexShrink: 0, width: 220,
    borderRadius: 12, overflow: 'hidden', borderWidth: 0.5,
  },
  imageContainer: { position: 'relative', height: 220 },
  photo: { width: '100%', height: 220 },
  photoHidden: { opacity: 0 },
  skeleton: { ...StyleSheet.absoluteFillObject },
  labelLayer: { justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  folioLabel: {
    color: '#fff', fontSize: 9,
    letterSpacing: 3.5, textTransform: 'uppercase', fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  durationLabel: {
    color: '#fff', fontSize: 9,
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  menuBtn: {
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12,
  },
  menuDots: { color: '#fff', fontSize: 12, letterSpacing: 1 },
  bottomOverlay: { padding: 14 },
  destinationLabel: {
    color: '#fff', fontSize: 9,
    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  title: {
    color: '#fff', fontSize: 20,
    letterSpacing: -0.6, lineHeight: 21, fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  meta: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  metaLeft: { gap: 2 },
  dates: { fontSize: 12.5, letterSpacing: -0.15 },
  vibe: { fontSize: 10.5, letterSpacing: 0.3, marginTop: 2 },
  arrow: { fontSize: 14 },

  // Menu
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

  // Confirm
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
