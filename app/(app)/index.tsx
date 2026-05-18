import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DEFAULT_PALETTE as T } from '../../constants/theme';
import { FOLIO_LIST, WISHLIST, PAST_TRIPS } from '../../data/mock';
import { FolioTile } from '../../components/home/FolioTile';
import { WishlistTile } from '../../components/home/WishlistTile';
import { AddTile } from '../../components/home/AddTile';
import { AddWishlistTile } from '../../components/home/AddWishlistTile';
import { WishlistComposerSheet } from '../../components/wishlist/WishlistComposerSheet';
import { useWayfinder } from '../../lib/wayfinder-context';
import { useFolios } from '../../lib/folios-context';
import { useWishlist } from '../../lib/wishlist-context';

function SmallCaps({ children, style }: { children: string; style?: object }) {
  return (
    <Text style={[styles.smallCaps, { color: T.muted }, style]}>{children}</Text>
  );
}

export default function HomeScreen() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const { openWayfinder, editFolio } = useWayfinder();
  const { planned, deleteFolio } = useFolios();
  const { items: wishlistItems, addItem: addWishlistItem, deleteItem: deleteWishlistItem } = useWishlist();
  const [wishlistComposerOpen, setWishlistComposerOpen] = useState(false);

  const hasWishlist = wishlistItems.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView edges={['top']}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={styles.wordmark}>
              <View style={[styles.logoOrb, { backgroundColor: T.accent }]} />
              <Text style={[styles.logoText, { color: T.ink }]}>Wanderluster</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(app)/settings')}
              style={[styles.avatar, { backgroundColor: T.surface, borderColor: T.hair }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.avatarText, { color: T.sub }]}>M</Text>
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <View style={styles.greeting}>
            <SmallCaps>{today}</SmallCaps>
            <Text style={[styles.greetingTitle, { color: T.ink }]}>Good morning, Maya.</Text>
            <Text style={[styles.greetingSub, { color: T.muted }]}>Where to next?</Text>
          </View>

          <View style={[styles.hairline, { backgroundColor: T.hair }]} />

          {/* ── YOUR PLANS ── */}
          <View style={styles.sectionHeader}>
            <SmallCaps>Your plans</SmallCaps>
            {planned.length > 0 && (
              <SmallCaps style={{ fontSize: 9 }}>{String(planned.length)}</SmallCaps>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {planned.map(folio => (
              <FolioTile
                key={folio.id}
                folio={folio}
                theme={T}
                onOpen={() => router.push({ pathname: '/(app)/trip/[id]', params: { id: folio.id } })}
                onDelete={() => deleteFolio(folio.id)}
              />
            ))}
            <AddTile theme={T} onPress={() => openWayfinder()} />
          </ScrollView>

          <View style={[styles.hairline, { backgroundColor: T.hair, marginTop: 8 }]} />

          {/* ── WISHLIST (shown first if non-empty) ── */}
          {hasWishlist && (
            <>
              <View style={[styles.sectionHeader, { paddingTop: 32 }]}>
                <SmallCaps>On your wishlist</SmallCaps>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                {wishlistItems.map(item => (
                  <WishlistTile
                    key={item.id}
                    item={item}
                    theme={T}
                    onPress={() => openWayfinder(
                      `I'd like to plan a trip to ${item.name} — ${item.season}, ${item.vibe}.`
                    )}
                    onDelete={() => deleteWishlistItem(item.id)}
                  />
                ))}
                <AddWishlistTile theme={T} onPress={() => setWishlistComposerOpen(true)} />
              </ScrollView>
            </>
          )}

          {/* ── INSPIRATION ── */}
          <View style={[styles.sectionHeader, { paddingTop: 32 }]}>
            <SmallCaps>Inspiration</SmallCaps>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {FOLIO_LIST.map(folio => (
              <FolioTile
                key={folio.id}
                folio={folio}
                theme={T}
                onOpen={() => router.push({ pathname: '/(app)/trip/[id]', params: { id: folio.id } })}
              />
            ))}
          </ScrollView>

          {/* ── WISHLIST (shown below inspiration when empty) ── */}
          {!hasWishlist && (
            <>
              <View style={[styles.sectionHeader, { paddingTop: 32 }]}>
                <SmallCaps>On your wishlist</SmallCaps>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                <AddWishlistTile theme={T} onPress={() => setWishlistComposerOpen(true)} />
              </ScrollView>
            </>
          )}


          {/* ── PAST TRIPS ── */}
          <View style={[styles.hairline, { backgroundColor: T.hair, marginTop: 8 }]} />
          <View style={[styles.sectionHeader, { paddingTop: 32 }]}>
            <SmallCaps>Past trips</SmallCaps>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {PAST_TRIPS.map(folio => (
              <FolioTile
                key={folio.id}
                folio={folio}
                theme={T}
                onOpen={() => {}}
              />
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={[styles.hairline, { backgroundColor: T.hair }]} />
            <Text style={[styles.footerText, { color: T.muted }]}>Wanderluster · est. 2026</Text>
          </View>
        </SafeAreaView>
      </ScrollView>

      <WishlistComposerSheet
        visible={wishlistComposerOpen}
        onAdd={(item) => { addWishlistItem(item); }}
        onClose={() => setWishlistComposerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 160 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoOrb: { width: 22, height: 22, borderRadius: 11 },
  logoText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.15 },
  avatar: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 0.5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '500' },
  greeting: { padding: 24, paddingTop: 36 },
  greetingTitle: { fontSize: 32, lineHeight: 35, letterSpacing: -1.1, fontWeight: '400', marginTop: 14 },
  greetingSub: { fontSize: 32, lineHeight: 35, letterSpacing: -1.1, fontWeight: '400', marginTop: 4 },
  hairline: { height: 0.5, marginHorizontal: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 18,
  },
  smallCaps: {
    fontFamily: 'monospace',
    fontSize: 10,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
  },
  hScroll: { paddingHorizontal: 24, gap: 12, paddingBottom: 8 },
  emptyWishlist: {
    marginHorizontal: 24,
    borderWidth: 0.5,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, letterSpacing: -0.1 },
  footer: { padding: 24, paddingTop: 32, alignItems: 'center', gap: 24 },
  footerText: {
    fontFamily: 'monospace',
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    paddingVertical: 24,
  },
});
