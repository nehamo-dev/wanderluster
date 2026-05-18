import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Animated, KeyboardAvoidingView, Platform, Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DEFAULT_PALETTE as T } from '../../constants/theme';
import { useSettings } from '../../lib/settings-context';
import { useFolios } from '../../lib/folios-context';

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ visible, toastKey }: { visible: boolean; toastKey: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [toastKey]);
  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>✓  Saved</Text>
    </Animated.View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.skeleton, { opacity }]} />;
}

// ─── City search (Open-Meteo geocoding — free, no key) ────────────────────────
interface CityResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

async function searchCities(q: string): Promise<CityResult[]> {
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`
    );
    const data = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

// ─── HomeCitySheet ────────────────────────────────────────────────────────────
interface HomeCitySheetProps {
  visible: boolean;
  initial: string;
  onSave: (city: string, coords: { lat: number; lng: number }) => void;
  onClose: () => void;
}

function HomeCitySheet({ visible, initial, onSave, onClose }: HomeCitySheetProps) {
  const [input, setInput] = useState(initial);
  const [results, setResults] = useState<CityResult[]>([]);
  const [selected, setSelected] = useState<CityResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) { setInput(initial); setResults([]); setSelected(null); setError(''); }
  }, [visible]);

  function handleChange(text: string) {
    setInput(text);
    setSelected(null);
    setError('');
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      const r = await searchCities(text);
      setResults(r);
      setSearching(false);
    }, 320);
  }

  function handleSelect(city: CityResult) {
    const display = city.admin1
      ? `${city.name}, ${city.admin1}, ${city.country}`
      : `${city.name}, ${city.country}`;
    setInput(display);
    setSelected(city);
    setResults([]);
  }

  function handleSave() {
    if (!input.trim()) return;
    if (selected) {
      onSave(input.trim(), { lat: selected.latitude, lng: selected.longitude });
    } else {
      onSave(input.trim(), { lat: 0, lng: 0 });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetScrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Pressable onPress={() => {}} style={[styles.sheet, { backgroundColor: T.bg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: T.hair }]} />
            <Text style={[styles.sheetTitle, { color: T.ink }]}>Home city</Text>

            {/* Input */}
            <View style={[styles.inputRow, { borderColor: T.hair, backgroundColor: T.surface }]}>
              <TextInput
                value={input}
                onChangeText={handleChange}
                placeholder="Search for a city…"
                placeholderTextColor={T.muted}
                style={[styles.sheetInput, { color: T.ink }]}
                autoFocus
                returnKeyType="search"
              />
              {searching
                ? <ActivityIndicator size="small" color={T.muted} style={{ marginRight: 2 }} />
                : input.length > 0 && (
                  <TouchableOpacity onPress={() => { setInput(''); setResults([]); setSelected(null); }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={[styles.clearBtn, { color: T.muted }]}>✕</Text>
                  </TouchableOpacity>
                )}
            </View>

            {/* Suggestion list */}
            {results.length > 0 && (
              <View style={[styles.resultList, { borderColor: T.hair, backgroundColor: T.surface }]}>
                {results.map((city, i) => {
                  const line1 = city.admin1 ? `${city.name}, ${city.admin1}` : city.name;
                  return (
                    <React.Fragment key={city.id}>
                      {i > 0 && <View style={[styles.resultDivider, { backgroundColor: T.hair }]} />}
                      <TouchableOpacity
                        style={styles.resultRow}
                        onPress={() => handleSelect(city)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.resultCity, { color: T.ink }]}>{line1}</Text>
                        <Text style={[styles.resultCountry, { color: T.muted }]}>{city.country}</Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
            )}

            {error ? <Text style={styles.sheetError}>{error}</Text> : null}

            <View style={styles.sheetActions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.sheetCancelBtn, { borderColor: T.hair }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetCancelText, { color: T.sub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.sheetSaveBtn, { backgroundColor: T.ink }, !input.trim() && { opacity: 0.4 }]}
                disabled={!input.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.sheetSaveText, { color: T.bg }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Travel prefs sheet ───────────────────────────────────────────────────────
const PREF_CHIPS = [
  'Solo traveler', 'Boutique hotels', 'Street food',
  'Avoid tourist traps', 'Family-friendly', 'Budget-conscious', 'Luxury',
];

interface PrefsSheetProps {
  visible: boolean;
  initialTags: string[];
  initialNote: string;
  onSave: (tags: string[], note: string) => void;
  onClose: () => void;
}

function PrefsSheet({ visible, initialTags, initialNote, onSave, onClose }: PrefsSheetProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (visible) { setTags(initialTags); setNote(initialNote); }
  }, [visible]);

  function toggleChip(chip: string) {
    setTags(prev => prev.includes(chip) ? prev.filter(t => t !== chip) : [...prev, chip]);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetScrim} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Pressable onPress={() => {}} style={[styles.sheet, styles.sheetTall, { backgroundColor: T.bg }]}>
            <View style={[styles.sheetHandle, { backgroundColor: T.hair }]} />
            <Text style={[styles.sheetTitle, { color: T.ink }]}>Travel preferences</Text>

            {/* Active tags */}
            {tags.length > 0 && (
              <View style={styles.tagList}>
                {tags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleChip(tag)}
                    style={[styles.tag, { backgroundColor: T.ink }]}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tagText, { color: T.bg }]}>{tag}</Text>
                    <Text style={[styles.tagRemove, { color: T.bg }]}>×</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Freeform note */}
            <View style={[styles.noteInputWrap, { borderColor: T.hair, backgroundColor: T.surface }]}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Describe how you like to travel…"
                placeholderTextColor={T.muted}
                style={[styles.noteInput, { color: T.ink }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Quick-add chips */}
            <Text style={[styles.chipSectionLabel, { color: T.muted }]}>Quick add</Text>
            <View style={styles.chipWrap}>
              {PREF_CHIPS.map(chip => {
                const active = tags.includes(chip);
                return (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => toggleChip(chip)}
                    style={[
                      styles.chip,
                      { borderColor: active ? T.ink : T.hair },
                      active && { backgroundColor: T.ink },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, { color: active ? T.bg : T.sub }]}>{chip}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.sheetCancelBtn, { borderColor: T.hair }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.sheetCancelText, { color: T.sub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSave(tags, note)}
                style={[styles.sheetSaveBtn, { backgroundColor: T.ink }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.sheetSaveText, { color: T.bg }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Icon circles ─────────────────────────────────────────────────────────────
function IconCircle({ bg, name, color = '#fff' }: { bg: string; name: React.ComponentProps<typeof Ionicons>['name']; color?: string }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      <Ionicons name={name} size={18} color={color} />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { addFolio } = useFolios();

  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [prefsSheetOpen, setPrefsSheetOpen] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [scanning, setScanning] = useState<'calendar' | 'gmail' | null>(null);
  const [calendarTrips, setCalendarTrips] = useState<any[]>([]);
  const [gmailBookings, setGmailBookings] = useState<any[]>([]);
  const [connectorError, setConnectorError] = useState('');
  const [loading] = useState(false); // set true if fetching settings from remote

  // Pick up OAuth token from URL after redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      updateSettings({ googleConnected: true, googleAccessToken: token });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function showToast() {
    setToastKey(k => k + 1);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }

  function saveCity(city: string, coords: { lat: number; lng: number }) {
    updateSettings({ homeCity: city, homeCityCoords: coords });
    setCitySheetOpen(false);
    showToast();
  }

  function savePrefs(tags: string[], note: string) {
    updateSettings({ travelTags: tags, travelPreferences: note });
    setPrefsSheetOpen(false);
    showToast();
  }

  function connectGoogle() {
    setConnectorError('');
    if (typeof window !== 'undefined') window.location.href = '/api/auth/google';
  }

  async function scanCalendar() {
    if (!settings.googleAccessToken) return;
    setScanning('calendar');
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: settings.googleAccessToken }),
      });
      if (res.ok) { const d = await res.json(); setCalendarTrips(d.trips ?? []); }
    } catch { setConnectorError('Scan failed. Check your connection.'); }
    finally { setScanning(null); }
  }

  async function scanGmail() {
    if (!settings.googleAccessToken) return;
    setScanning('gmail');
    try {
      const res = await fetch('/api/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: settings.googleAccessToken }),
      });
      if (res.ok) { const d = await res.json(); setGmailBookings(d.bookings ?? []); }
    } catch { setConnectorError('Scan failed. Check your connection.'); }
    finally { setScanning(null); }
  }

  function importCalendar() {
    calendarTrips.forEach(t => addFolio(t as any));
    setCalendarTrips([]);
  }

  function importGmail() {
    gmailBookings.forEach(b => addFolio(b as any));
    setGmailBookings([]);
  }

  // ── Derived display values
  const hasCity = !!settings.homeCity;
  const hasTags = (settings.travelTags ?? []).length > 0;
  const hasNote = !!settings.travelPreferences;
  const tagsLine = (settings.travelTags ?? []).join(' · ');

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: T.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={[styles.backChevron, { color: T.ink }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: T.ink }]}>Settings</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={[styles.hairline, { backgroundColor: T.hair }]} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── PROFILE ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>Profile</Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>

            {/* Home city row */}
            <TouchableOpacity
              onPress={() => setCitySheetOpen(true)}
              activeOpacity={0.7}
              style={styles.profileRow}
            >
              <IconCircle bg="#1a1210" name="home-outline" />
              <View style={styles.profileText}>
                <Text style={[styles.profileLabel, { color: T.muted }]}>Home city</Text>
                {loading ? <Skeleton /> : hasCity
                  ? <Text style={[styles.profileValue, { color: T.ink }]}>{settings.homeCity}</Text>
                  : <Text style={[styles.profilePlaceholder, { color: T.muted }]}>Add your home city</Text>
                }
              </View>
              <Text style={[styles.editIcon, { color: T.muted }]}>{hasCity ? '✎' : '+'}</Text>
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: T.hair }]} />

            {/* Travel preferences row */}
            <TouchableOpacity
              onPress={() => setPrefsSheetOpen(true)}
              activeOpacity={0.7}
              style={styles.profileRow}
            >
              <IconCircle bg="#1a1210" name="heart-outline" />
              <View style={styles.profileText}>
                <Text style={[styles.profileLabel, { color: T.muted }]}>Travel preferences</Text>
                {loading ? <Skeleton /> : (hasTags || hasNote)
                  ? <>
                      {hasTags && <Text style={[styles.profileValue, { color: T.ink }]}>{tagsLine}</Text>}
                      {hasNote && <Text style={[styles.profileNote, { color: T.muted }]}>{settings.travelPreferences}</Text>}
                    </>
                  : <Text style={[styles.profilePlaceholder, { color: T.muted }]}>Add your travel preferences</Text>
                }
              </View>
              <Text style={[styles.editIcon, { color: T.muted }]}>{(hasTags || hasNote) ? '✎' : '+'}</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* ── CONNECTORS ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>Connectors</Text>
          <Text style={[styles.sectionSub, { color: T.muted }]}>
            Connect your accounts so Wayfinder can check your calendar and travel confirmations.
          </Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>

            {/* Google Calendar */}
            <TouchableOpacity
              onPress={settings.googleConnected ? undefined : connectGoogle}
              activeOpacity={settings.googleConnected ? 1 : 0.7}
              style={styles.connectorRow}
            >
              <View style={[styles.connectorIcon, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="calendar-outline" size={20} color="#2E7D32" />
              </View>
              <View style={styles.connectorText}>
                <Text style={[styles.connectorName, { color: T.ink }]}>Google Calendar</Text>
                <Text style={[styles.connectorSub, { color: T.muted }]}>Check availability for trips</Text>
              </View>
              {settings.googleConnected ? (
                <View style={styles.connectorRight}>
                  <View style={styles.connectedPill}>
                    <Text style={styles.connectedCheck}>✓</Text>
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                  {scanning === 'calendar'
                    ? <ActivityIndicator size="small" color={T.muted} style={{ marginTop: 4 }} />
                    : <TouchableOpacity onPress={scanCalendar} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={[styles.scanLink, { color: T.muted }]}>
                          {calendarTrips.length > 0 ? `Import ${calendarTrips.length} trip${calendarTrips.length !== 1 ? 's' : ''}` : 'Scan now'}
                        </Text>
                      </TouchableOpacity>
                  }
                </View>
              ) : (
                <TouchableOpacity onPress={connectGoogle} style={styles.connectBtn} activeOpacity={0.85}>
                  <Text style={styles.connectBtnText}>Connect</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: T.hair }]} />

            {/* Gmail */}
            <TouchableOpacity
              onPress={settings.googleConnected ? undefined : connectGoogle}
              activeOpacity={settings.googleConnected ? 1 : 0.7}
              style={styles.connectorRow}
            >
              <View style={[styles.connectorIcon, { backgroundColor: '#FDE8E8' }]}>
                <Ionicons name="mail-outline" size={20} color="#C62828" />
              </View>
              <View style={styles.connectorText}>
                <Text style={[styles.connectorName, { color: T.ink }]}>Gmail</Text>
                <Text style={[styles.connectorSub, { color: T.muted }]}>Import booking confirmations</Text>
              </View>
              {settings.googleConnected ? (
                <View style={styles.connectorRight}>
                  <View style={styles.connectedPill}>
                    <Text style={styles.connectedCheck}>✓</Text>
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                  {scanning === 'gmail'
                    ? <ActivityIndicator size="small" color={T.muted} style={{ marginTop: 4 }} />
                    : <TouchableOpacity onPress={scanGmail} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={[styles.scanLink, { color: T.muted }]}>
                          {gmailBookings.length > 0 ? `Import ${gmailBookings.length} booking${gmailBookings.length !== 1 ? 's' : ''}` : 'Scan now'}
                        </Text>
                      </TouchableOpacity>
                  }
                </View>
              ) : (
                <TouchableOpacity onPress={connectGoogle} style={styles.connectBtn} activeOpacity={0.85}>
                  <Text style={styles.connectBtnText}>Connect</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>

          </View>
          {connectorError ? (
            <Text style={styles.connectorError}>{connectorError}</Text>
          ) : null}
        </View>

        {/* ── ACCOUNT ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionLabel, { color: T.muted }]}>Account</Text>
          <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
            <TouchableOpacity
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              style={styles.accountRow}
            >
              <View style={[styles.accountAvatar, { backgroundColor: '#E8E4F4' }]}>
                <Text style={styles.accountAvatarText}>M</Text>
              </View>
              <View style={styles.accountText}>
                <Text style={[styles.accountName, { color: T.ink }]}>Demo account</Text>
                <Text style={[styles.accountSub, { color: T.muted }]}>
                  Sign up to sync across devices and save your trips
                </Text>
              </View>
              <View style={styles.upgradePill}>
                <Text style={styles.upgradeText}>Upgrade</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Sheets ── */}
      <HomeCitySheet
        visible={citySheetOpen}
        initial={settings.homeCity}
        onSave={saveCity}
        onClose={() => setCitySheetOpen(false)}
      />
      <PrefsSheet
        visible={prefsSheetOpen}
        initialTags={settings.travelTags ?? []}
        initialNote={settings.travelPreferences}
        onSave={savePrefs}
        onClose={() => setPrefsSheetOpen(false)}
      />

      {/* ── Toast ── */}
      <Toast visible={toastVisible} toastKey={toastKey} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const SHEET_RADIUS = 20;

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backChevron: { fontSize: 28, marginTop: -2 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },
  headerRight: { width: 36 },
  hairline: { height: 0.5 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  sectionBlock: { paddingTop: 28 },
  sectionLabel: {
    fontFamily: 'monospace', fontSize: 10, letterSpacing: 3.5,
    textTransform: 'uppercase', paddingBottom: 12, paddingHorizontal: 4,
  },
  sectionSub: { fontSize: 12, letterSpacing: -0.1, lineHeight: 17, paddingHorizontal: 4, marginTop: -4, marginBottom: 12 },

  card: { borderRadius: 14, borderWidth: 0.5, overflow: 'hidden' },
  divider: { height: 0.5, marginHorizontal: 16 },

  // Profile rows
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  profileText: { flex: 1, gap: 3 },
  profileLabel: { fontSize: 11, letterSpacing: 0.1 },
  profileValue: { fontSize: 14, letterSpacing: -0.2, fontWeight: '500' },
  profileNote: { fontSize: 12, letterSpacing: -0.1, marginTop: 1 },
  profilePlaceholder: { fontSize: 14, letterSpacing: -0.2, fontStyle: 'italic' },
  editIcon: { fontSize: 16, flexShrink: 0 },

  // Skeleton
  skeleton: {
    width: 80, height: 12, borderRadius: 6, backgroundColor: '#E8E5DF',
  },

  // Connectors
  connectorRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  connectorIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  connectorText: { flex: 1 },
  connectorName: { fontSize: 14, letterSpacing: -0.2, fontWeight: '500' },
  connectorSub: { fontSize: 12, letterSpacing: -0.1, marginTop: 2 },
  connectorRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  connectedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EAF3DE', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  connectedCheck: { color: '#3B6D11', fontSize: 11, fontWeight: '600' },
  connectedText: { color: '#3B6D11', fontSize: 11, letterSpacing: 0.1, fontWeight: '500' },
  scanLink: { fontSize: 11, letterSpacing: -0.05, textDecorationLine: 'underline' },
  connectBtn: {
    backgroundColor: '#1a1210',
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9, flexShrink: 0,
  },
  connectBtnText: { color: '#f5efe2', fontSize: 13, fontWeight: '500', letterSpacing: -0.1 },
  connectorError: { fontSize: 12, color: '#c0392b', marginTop: 8, paddingHorizontal: 4 },

  // Account
  accountRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 14,
  },
  accountAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  accountAvatarText: { color: '#5A4E8A', fontSize: 15, fontWeight: '600' },
  accountText: { flex: 1 },
  accountName: { fontSize: 14, letterSpacing: -0.2, fontWeight: '500' },
  accountSub: { fontSize: 12, letterSpacing: -0.1, lineHeight: 17, marginTop: 2 },
  upgradePill: {
    backgroundColor: '#FEF3C7', borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 5, flexShrink: 0,
  },
  upgradeText: { color: '#92400E', fontSize: 11, fontWeight: '600', letterSpacing: 0.1 },

  // Bottom sheet
  sheetScrim: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: SHEET_RADIUS, borderTopRightRadius: SHEET_RADIUS,
    padding: 24, paddingBottom: 40,
  },
  sheetTall: { paddingBottom: 48 },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 17, fontWeight: '500', letterSpacing: -0.3, marginBottom: 20 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  sheetInput: { flex: 1, fontSize: 15, letterSpacing: -0.2 },
  clearBtn: { fontSize: 13, padding: 2 },

  resultList: {
    borderWidth: 0.5, borderRadius: 12, overflow: 'hidden', marginTop: 10,
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 13 },
  resultDivider: { height: 0.5, marginHorizontal: 14 },
  resultCity: { fontSize: 14, letterSpacing: -0.15 },
  resultCountry: { fontSize: 12, letterSpacing: -0.05, marginTop: 2 },

  sheetError: { fontSize: 12, color: '#c0392b', marginTop: 10 },

  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  sheetCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 0.5, alignItems: 'center',
  },
  sheetCancelText: { fontSize: 15, letterSpacing: -0.2 },
  sheetSaveBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
  },
  sheetSaveText: { fontSize: 15, fontWeight: '500', letterSpacing: -0.2 },

  // Prefs sheet
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText: { fontSize: 13, letterSpacing: -0.1 },
  tagRemove: { fontSize: 13, opacity: 0.6 },
  noteInputWrap: {
    borderWidth: 0.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  noteInput: { fontSize: 14, letterSpacing: -0.15, lineHeight: 21, minHeight: 72 },
  chipSectionLabel: { fontSize: 11, letterSpacing: 0.3, marginTop: 20, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 0.5, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 13, letterSpacing: -0.1 },

  // Toast
  toast: {
    position: 'absolute', bottom: 36, alignSelf: 'center',
    backgroundColor: '#1a1210', borderRadius: 999,
    paddingHorizontal: 20, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  toastText: { color: '#f5efe2', fontSize: 13, fontWeight: '500', letterSpacing: -0.1 },
});
