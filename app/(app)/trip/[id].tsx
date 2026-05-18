import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Modal, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { DEFAULT_PALETTE as T } from '../../../constants/theme';
import { FOLIOS, WAYFINDER_GREETINGS } from '../../../data/mock';
import { getDestinationPhoto, fetchWikiPhoto } from '../../../constants/photos';
import { DestinationArt } from '../../../components/art/DestinationArt';
import { DayCard } from '../../../components/trip/DayCard';
import { useFolios } from '../../../lib/folios-context';
import { useWayfinder } from '../../../lib/wayfinder-context';
import { useWishlist } from '../../../lib/wishlist-context';
import type { TripDay, TripEvent } from '../../../types';

// ── Static best-time data for known inspiration destinations ─────────────────
const BEST_TIME: Record<string, { months: string; why: string; temp: string; crowd: string }> = {
  tokyo: {
    months: 'Mar – Apr  ·  Oct – Nov',
    why: 'Cherry blossoms peak late March; maple foliage peaks mid-November. Both windows offer mild temperatures and the most photogenic city in the world.',
    temp: '10 – 20°C',
    crowd: 'Busy weekends, quiet mid-week',
  },
  salzburg: {
    months: 'Dec  ·  Jun – Aug',
    why: 'Advent markets fill the Altstadt from late November. Summer brings the Salzburg Festival — Mozart Week in January is quieter and magical.',
    temp: '−2 – 25°C',
    crowd: 'Peak in December & July',
  },
  yosemite: {
    months: 'May – Jun  ·  Sep',
    why: 'Snowmelt waterfalls are at full roar May–June. September brings golden light, fewer crowds, and open trails before winter closures.',
    temp: '8 – 28°C',
    crowd: 'Quietest in early May & September',
  },
};

function SmallCaps({ children, color, size = 10 }: { children: string; color: string; size?: number }) {
  return (
    <Text style={[styles.smallCaps, { color, fontSize: size }]}>{children}</Text>
  );
}

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folio = FOLIOS[id ?? 'tokyo'];
  const { deleteFolio, planned } = useFolios();
  const { editFolio, openWayfinder } = useWayfinder();
  const { items: wishlistItems, addItem: addToWishlist } = useWishlist();

  // Is this an inspiration / past-trip folio (not user-created)?
  const isInspirationFolio = !planned.some(f => f.id === (id ?? ''));
  const isOnWishlist = wishlistItems.some(w => w.name.toLowerCase() === (folio?.destination ?? '').toLowerCase());
  const bestTime = folio ? BEST_TIME[folio.id] : undefined;
  const [priceAlertOn, setPriceAlertOn] = useState(false);

  const [activeDay, setActiveDay] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1, 2]));
  const [days, setDays] = useState<TripDay[]>(() => folio?.days ?? []);
  const [loadingAlt, setLoadingAlt] = useState<Record<string, boolean>>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [wikiPhoto, setWikiPhoto] = useState<string | null>(null);

  const staticPhoto = folio ? (folio.photo ?? getDestinationPhoto(folio.id, folio.destination)) : null;
  const heroPhoto = staticPhoto ?? wikiPhoto;

  useEffect(() => {
    if (!folio || staticPhoto) return;
    fetchWikiPhoto(folio.destination).then(url => {
      if (url) setWikiPhoto(url);
    });
  }, [folio?.id]);

  if (!folio) {
    router.back();
    return null;
  }

  function confirmEvent(dayN: number, eventIdx: number) {
    setDays(prev => prev.map(d => {
      if (d.n !== dayN) return d;
      return {
        ...d,
        events: d.events.map((e, i) =>
          i === eventIdx ? { ...e, suggested: false, confirmed: true } : e
        ),
      };
    }));
  }

  async function removeConfirmedEvent(
    dayN: number,
    eventIdx: number,
    reason: 'incorrect_data' | 'change_of_plan',
  ) {
    const day = days.find(d => d.n === dayN);
    if (!day) return;
    const event = day.events[eventIdx];

    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folioId: folio.id,
        destination: folio.destination,
        event: { kind: event.kind, title: event.title, time: event.time },
        reason,
      }),
    }).catch(() => {});

    if (reason === 'incorrect_data') {
      setDays(prev => prev.map(d => {
        if (d.n !== dayN) return d;
        return { ...d, events: d.events.filter((_, i) => i !== eventIdx) };
      }));
    } else {
      await removeEvent(dayN, eventIdx);
    }
  }

  async function removeEvent(dayN: number, eventIdx: number) {
    const day = days.find(d => d.n === dayN);
    if (!day) return;
    const removedEvent = day.events[eventIdx];

    const key = `${dayN}-${eventIdx}`;

    setDays(prev => prev.map(d => {
      if (d.n !== dayN) return d;
      const next = [...d.events];
      next[eventIdx] = { ...removedEvent, title: '__loading__', suggested: true };
      return { ...d, events: next };
    }));
    setLoadingAlt(prev => ({ ...prev, [key]: true }));

    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: folio.destination,
          country: folio.country,
          dayLabel: day.label,
          dayDate: day.date,
          removedEvent: { kind: removedEvent.kind, title: removedEvent.title, time: removedEvent.time },
          existingEvents: day.events.filter((_, i) => i !== eventIdx).map(e => ({
            kind: e.kind, title: e.title, time: e.time,
          })),
        }),
      });

      const data = await res.json();
      const alt: TripEvent = data.event ?? {
        kind: removedEvent.kind, time: removedEvent.time,
        title: 'Alternative suggestion', meta: '', confirmed: false, suggested: true,
      };

      setDays(prev => prev.map(d => {
        if (d.n !== dayN) return d;
        const next = [...d.events];
        next[eventIdx] = { ...alt, suggested: true, confirmed: false };
        return { ...d, events: next };
      }));
    } catch {
      setDays(prev => prev.map(d => {
        if (d.n !== dayN) return d;
        return { ...d, events: d.events.filter((_, i) => i !== eventIdx) };
      }));
    } finally {
      setLoadingAlt(prev => { const n = { ...prev }; delete n[key]; return n; });
    }
  }

  function handleDelete() {
    deleteFolio(folio.id);
    setConfirmDelete(false);
    setMenuVisible(false);
    router.replace('/(app)');
  }

  function handleEditTrip() {
    setMenuVisible(false);
    editFolio(folio.id);
  }

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero */}
        <View style={{ position: 'relative' }}>
          {heroPhoto ? (
            <View style={{ height: 420 }}>
              <Image
                source={{ uri: heroPhoto }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.75)']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>
          ) : (
            <DestinationArt folio={folio} height={420} />
          )}

          {/* Nav overlay */}
          <SafeAreaView edges={['top']} style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <View style={styles.navRow} pointerEvents="auto">
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backChevron}>‹</Text>
              </TouchableOpacity>
              <View style={styles.navRight}>
                <View style={styles.folioBadge}>
                  <Text style={styles.folioBadgeText}>
                    {isInspirationFolio ? 'Inspiration' : 'Folio · Draft'}
                  </Text>
                </View>
                {!isInspirationFolio && (
                  <TouchableOpacity
                    onPress={() => setMenuVisible(true)}
                    style={styles.menuBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.menuDots}>⋯</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>

          {/* Hero text */}
          <View style={styles.heroText}>
            <Text style={styles.heroDestLabel}>
              {`${folio.destination} · ${folio.country}`.toUpperCase()}
            </Text>
            <Text style={styles.heroTitle}>{folio.title}</Text>
            <View style={styles.heroPills}>
              <Text style={styles.heroPillText}>{folio.dates}</Text>
              <View style={styles.heroDot} />
              <Text style={styles.heroPillText}>{folio.duration}</Text>
              <View style={styles.heroDot} />
              <Text style={styles.heroPillText}>{folio.vibe}</Text>
            </View>
            {isInspirationFolio && (
              <TouchableOpacity
                onPress={() => openWayfinder(
                  `I'd like to plan a trip to ${folio.destination} — ${folio.duration}, ${folio.season}. ${folio.vibe}.`
                )}
                style={styles.planBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.planBtnText}>Plan this trip</Text>
                <Text style={styles.planBtnArrow}>→</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Wayfinder note — only for user folios */}
        {!isInspirationFolio && (
          <View style={styles.px}>
            <View style={[styles.wayfinderNote, { backgroundColor: T.surface, borderColor: T.hair }]}>
              <View style={[styles.wfNoteAvatar, { backgroundColor: T.accent }]}>
                <Text style={[styles.wfNoteAvatarText, { color: '#f5efe2' }]}>W</Text>
              </View>
              <View style={styles.wfNoteBody}>
                <SmallCaps color={T.muted} size={9}>Wayfinder · just now</SmallCaps>
                <Text style={[styles.wfNoteText, { color: T.ink }]}>
                  {WAYFINDER_GREETINGS[folio.id] ?? folio.teaser}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── INSPIRATION-ONLY SECTIONS ── */}
        {isInspirationFolio && (
          <View style={styles.px}>

            {/* Best time to visit */}
            {bestTime && (
              <View style={[styles.inspCard, { backgroundColor: T.surface, borderColor: T.hair }]}>
                <View style={styles.inspCardHeader}>
                  <Text style={styles.inspCardIcon}>☀</Text>
                  <SmallCaps color={T.muted} size={9}>Best time to visit</SmallCaps>
                </View>
                <Text style={[styles.inspMonths, { color: T.ink }]}>{bestTime.months}</Text>
                <Text style={[styles.inspWhy, { color: T.sub }]}>{bestTime.why}</Text>
                <View style={styles.inspPills}>
                  <View style={[styles.inspPill, { backgroundColor: T.bg, borderColor: T.hair }]}>
                    <Text style={[styles.inspPillText, { color: T.muted }]}>🌡 {bestTime.temp}</Text>
                  </View>
                  <View style={[styles.inspPill, { backgroundColor: T.bg, borderColor: T.hair }]}>
                    <Text style={[styles.inspPillText, { color: T.muted }]}>👥 {bestTime.crowd}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Track prices */}
            <TouchableOpacity
              onPress={() => setPriceAlertOn(v => !v)}
              activeOpacity={0.85}
              style={[
                styles.inspCard,
                { borderColor: priceAlertOn ? T.accent : T.hair },
                priceAlertOn ? { backgroundColor: T.accent + '12' } : { backgroundColor: T.surface },
              ]}
            >
              <View style={styles.priceTrackRow}>
                <View style={styles.priceTrackLeft}>
                  <Text style={styles.inspCardIcon}>{priceAlertOn ? '🔔' : '🔕'}</Text>
                  <View>
                    <Text style={[styles.priceTrackTitle, { color: T.ink }]}>
                      {priceAlertOn ? 'Price alert active' : 'Track flight prices'}
                    </Text>
                    <Text style={[styles.priceTrackSub, { color: T.muted }]}>
                      {priceAlertOn
                        ? `We'll notify you when fares drop to ${folio.destination}`
                        : 'Get notified when fares drop for this destination'}
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.priceTrackToggle,
                  { backgroundColor: priceAlertOn ? T.accent : T.hair },
                ]}>
                  <View style={[styles.priceTrackThumb, priceAlertOn && styles.priceTrackThumbOn]} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Add to wishlist */}
            {!isOnWishlist && (
              <TouchableOpacity
                onPress={() => addToWishlist({
                  id: `wish-${folio.id}`,
                  name: folio.destination,
                  season: folio.season,
                  vibe: folio.vibe,
                  flight: '',
                  visa: folio.visa?.label ?? '',
                  budget: '$$',
                  palette: { a: folio.palette.a, b: folio.palette.b ?? folio.palette.a, c: folio.palette.c },
                  photo: heroPhoto ?? undefined,
                  bestTime: bestTime,
                })}
                activeOpacity={0.85}
                style={[styles.inspCard, styles.wishlistCTA, { backgroundColor: T.surface, borderColor: T.hair }]}
              >
                <Text style={styles.inspCardIcon}>♡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.priceTrackTitle, { color: T.ink }]}>Save to wishlist</Text>
                  <Text style={[styles.priceTrackSub, { color: T.muted }]}>Keep it on your radar</Text>
                </View>
                <Text style={[styles.wishlistArrow, { color: T.muted }]}>→</Text>
              </TouchableOpacity>
            )}
            {isOnWishlist && (
              <View style={[styles.inspCard, styles.wishlistCTA, { backgroundColor: T.surface, borderColor: T.hair }]}>
                <Text style={styles.inspCardIcon}>♥</Text>
                <Text style={[styles.priceTrackTitle, { color: T.muted }]}>On your wishlist</Text>
              </View>
            )}

            {/* Coming soon teaser */}
            <View style={[styles.comingSoonCard, { borderColor: T.hair }]}>
              <SmallCaps color={T.muted} size={9}>Coming soon</SmallCaps>
              <Text style={[styles.comingSoonTitle, { color: T.ink }]}>More ways to plan smarter</Text>
              {[
                { icon: '⚡', label: 'Auto-book when price drops to your target' },
                { icon: '📅', label: 'Sync best dates with your calendar automatically' },
                { icon: '👥', label: 'Coordinate group trips and split costs' },
                { icon: '🛂', label: 'Visa applications handled end-to-end' },
              ].map((f, i) => (
                <View key={i} style={styles.comingSoonRow}>
                  <Text style={styles.comingSoonIcon}>{f.icon}</Text>
                  <Text style={[styles.comingSoonText, { color: T.sub }]}>{f.label}</Text>
                </View>
              ))}
            </View>

          </View>
        )}

        {/* TLDR + Highlights */}
        {(folio.tldr || (folio.highlights && folio.highlights.length > 0)) && (
          <View style={styles.px}>
            <View style={[styles.tldrCard, { backgroundColor: T.surface, borderColor: T.hair }]}>
              <SmallCaps color={T.muted} size={9}>Trip Overview</SmallCaps>
              {folio.tldr && (
                <Text style={[styles.tldrText, { color: T.ink }]}>{folio.tldr}</Text>
              )}
              {folio.highlights && folio.highlights.length > 0 && (
                <View style={styles.highlights}>
                  {folio.highlights.map((h, i) => (
                    <View key={i} style={styles.highlightRow}>
                      <Text style={[styles.highlightBullet, { color: T.accent }]}>·</Text>
                      <Text style={[styles.highlightText, { color: T.sub }]}>{h}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Day strip */}
        <View style={styles.dayStripSection}>
          <View style={styles.sectionHeader}>
            <SmallCaps color={T.muted}>Itinerary</SmallCaps>
            <SmallCaps color={T.muted} size={9}>{`${folio.days.length} days`}</SmallCaps>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
            {folio.days.map(d => (
              <TouchableOpacity
                key={d.n}
                onPress={() => {
                  setActiveDay(d.n);
                  setExpandedDays(prev => new Set(prev).add(d.n));
                }}
                style={[
                  styles.dayPill,
                  {
                    borderColor: activeDay === d.n ? T.ink : T.hair,
                    backgroundColor: activeDay === d.n ? T.ink : 'transparent',
                  },
                ]}
              >
                <Text style={[styles.dayPillText, { color: activeDay === d.n ? T.bg : T.sub }]}>
                  Day {d.n}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Day cards */}
        <View style={[styles.px, styles.dayCards]}>
          {days.map((day, idx) => (
            <DayCard
              key={day.n}
              day={day}
              folio={folio}
              theme={T}
              idx={idx}
              defaultExpanded={expandedDays.has(day.n)}
              onAskWayfinder={() => {}}
              onConfirmEvent={(eventIdx) => confirmEvent(day.n, eventIdx)}
              onRemoveEvent={(eventIdx) => removeEvent(day.n, eventIdx)}
              onRemoveConfirmedEvent={(eventIdx, reason) => removeConfirmedEvent(day.n, eventIdx, reason)}
              loadingEventIdx={
                Object.entries(loadingAlt).find(([k, v]) => v && k.startsWith(`${day.n}-`))
                  ? parseInt(Object.entries(loadingAlt).find(([k, v]) => v && k.startsWith(`${day.n}-`))![0].split('-')[1])
                  : null
              }
            />
          ))}
        </View>

        {/* Documents */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <SmallCaps color={T.muted}>Documents</SmallCaps>
          <TouchableOpacity>
            <Text style={[styles.uploadLink, { color: T.sub }]}>+ Upload</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.px}>
          <View style={[styles.docsList, { backgroundColor: T.surface, borderColor: T.hair }]}>
            {folio.docs.map((doc, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.docDivider, { backgroundColor: T.hair }]} />}
                <View style={styles.docRow}>
                  <View style={styles.docLeft}>
                    <Text style={[styles.docName, { color: T.ink }]}>{doc.name}</Text>
                    <Text style={[styles.docState, { color: T.muted }]}>{doc.state}</Text>
                  </View>
                  <View style={[
                    styles.docStatus,
                    { backgroundColor: doc.state.includes('attached') ? T.ink : 'transparent',
                      borderColor: T.muted,
                      borderWidth: doc.state.includes('attached') ? 0 : 0.5,
                      borderStyle: 'dashed',
                    },
                  ]}>
                    <Text style={[styles.docStatusIcon, { color: doc.state.includes('attached') ? T.bg : T.muted }]}>
                      {doc.state.includes('attached') ? '✓' : '+'}
                    </Text>
                  </View>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* ⋯ menu overlay */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setMenuVisible(false); setConfirmDelete(false); }}
      >
        <Pressable style={styles.overlay} onPress={() => { setMenuVisible(false); setConfirmDelete(false); }}>
          <Pressable style={[styles.menuCard, { backgroundColor: T.surface, borderColor: T.hair }]} onPress={() => {}}>
            {!confirmDelete ? (
              <>
                <TouchableOpacity
                  onPress={handleEditTrip}
                  style={styles.menuItem}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.menuItemText, { color: T.ink }]}>Edit trip</Text>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: T.hair }]} />
                <TouchableOpacity
                  onPress={() => setConfirmDelete(true)}
                  style={styles.menuItem}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.menuItemText, { color: '#c04040' }]}>Delete trip</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.confirmBox}>
                <Text style={[styles.confirmTitle, { color: T.ink }]}>
                  Delete {folio.destination}?
                </Text>
                <Text style={[styles.confirmSub, { color: T.muted }]}>
                  This can't be undone.
                </Text>
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    onPress={() => setConfirmDelete(false)}
                    style={[styles.confirmCancel, { borderColor: T.hair }]}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.confirmCancelText, { color: T.sub }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={styles.confirmDelete}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: {},
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56,
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  backChevron: { color: '#fff', fontSize: 24, marginTop: -2 },
  folioBadge: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  folioBadgeText: {
    color: '#fff', fontSize: 10,
    letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'monospace',
  },
  menuBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuDots: { color: '#fff', fontSize: 18, letterSpacing: 1 },
  heroText: {
    position: 'absolute', left: 24, right: 24, bottom: 26,
  },
  heroDestLabel: {
    color: '#fff', fontSize: 10, fontFamily: 'monospace',
    letterSpacing: 3.5, textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroTitle: {
    color: '#fff', fontSize: 40, lineHeight: 40,
    letterSpacing: -1.6, fontWeight: '400', marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },
  heroPills: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 14,
  },
  heroPillText: {
    color: '#fff', fontSize: 12, letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
  planBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 18,
    backgroundColor: '#f5efe2', borderRadius: 10,
    paddingVertical: 13, paddingHorizontal: 20,
  },
  planBtnText: {
    color: '#1a1210', fontSize: 14, fontWeight: '500', letterSpacing: -0.2,
  },
  planBtnArrow: { color: '#1a1210', fontSize: 16 },
  px: { paddingHorizontal: 16 },
  wayfinderNote: {
    flexDirection: 'row', gap: 12,
    borderRadius: 12, borderWidth: 0.5,
    padding: 14, marginTop: 20,
  },
  wfNoteAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  wfNoteAvatarText: { fontSize: 11, fontWeight: '500' },
  wfNoteBody: { flex: 1, gap: 4 },
  wfNoteText: { fontSize: 13.5, lineHeight: 20, letterSpacing: -0.15 },
  tldrCard: {
    borderRadius: 12, borderWidth: 0.5,
    padding: 16, marginTop: 14, gap: 10,
  },
  tldrText: { fontSize: 13.5, lineHeight: 21, letterSpacing: -0.15, marginTop: 6 },
  highlights: { gap: 6, marginTop: 2 },
  highlightRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  highlightBullet: { fontSize: 16, lineHeight: 18, marginTop: -1 },
  highlightText: { fontSize: 12.5, letterSpacing: -0.1, lineHeight: 18, flex: 1 },
  dayStripSection: { paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: 24, paddingBottom: 12,
  },
  smallCaps: {
    fontFamily: 'monospace', letterSpacing: 3.5, textTransform: 'uppercase',
  },
  dayStrip: { paddingHorizontal: 24, gap: 8, paddingBottom: 16 },
  dayPill: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999, borderWidth: 0.5,
  },
  dayPillText: {
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  },
  dayCards: { gap: 14 },
  uploadLink: { fontSize: 12 },
  docsList: {
    borderRadius: 12, borderWidth: 0.5, overflow: 'hidden', marginTop: 4,
  },
  docRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  docLeft: { flex: 1 },
  docName: { fontSize: 14, letterSpacing: -0.15 },
  docState: { fontSize: 11, marginTop: 3, letterSpacing: 0.3 },
  docStatus: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  docStatusIcon: { fontSize: 11 },
  docDivider: { height: 0.5, marginHorizontal: 16 },
  // menu overlay
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  menuCard: {
    width: '100%', maxWidth: 320, borderRadius: 16,
    borderWidth: 0.5, overflow: 'hidden',
  },
  menuItem: { paddingHorizontal: 20, paddingVertical: 18 },
  menuItemText: { fontSize: 15, letterSpacing: -0.2 },
  menuDivider: { height: 0.5 },
  confirmBox: { padding: 20, gap: 8 },
  confirmTitle: { fontSize: 16, fontWeight: '500', letterSpacing: -0.3 },
  confirmSub: { fontSize: 13, letterSpacing: -0.1, marginTop: 2 },
  confirmButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  confirmCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 0.5,
    alignItems: 'center',
  },
  confirmCancelText: { fontSize: 14, letterSpacing: -0.1 },
  confirmDelete: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#c04040', alignItems: 'center',
  },
  confirmDeleteText: { fontSize: 14, letterSpacing: -0.1, color: '#fff', fontWeight: '500' },

  // ── Inspiration sections ─────────────────────────────────────────────────
  inspCard: {
    borderWidth: 0.5, borderRadius: 14,
    padding: 16, marginBottom: 12,
  },
  inspCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  inspCardIcon: { fontSize: 16 },
  inspMonths: { fontSize: 16, fontWeight: '500', letterSpacing: -0.4, marginBottom: 8 },
  inspWhy: { fontSize: 13.5, lineHeight: 20, letterSpacing: -0.1, marginBottom: 12 },
  inspPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  inspPill: {
    borderWidth: 0.5, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  inspPillText: { fontSize: 11, letterSpacing: -0.05 },

  priceTrackRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceTrackLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceTrackTitle: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2, marginBottom: 2 },
  priceTrackSub: { fontSize: 12, letterSpacing: -0.1, lineHeight: 16 },
  priceTrackToggle: {
    width: 44, height: 26, borderRadius: 13, padding: 3,
    justifyContent: 'center', flexShrink: 0,
  },
  priceTrackThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  priceTrackThumbOn: { alignSelf: 'flex-end' },

  wishlistCTA: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistArrow: { fontSize: 16, flexShrink: 0 },

  comingSoonCard: {
    borderWidth: 0.5, borderRadius: 14, borderStyle: 'dashed',
    padding: 16, marginBottom: 12, gap: 12,
  },
  comingSoonTitle: { fontSize: 15, fontWeight: '500', letterSpacing: -0.3 },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  comingSoonIcon: { fontSize: 15, width: 22, textAlign: 'center' },
  comingSoonText: { fontSize: 13, letterSpacing: -0.1, flex: 1 },
});
