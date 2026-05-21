import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Animated, KeyboardAvoidingView, Platform, Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DEFAULT_PALETTE as T } from '../../constants/theme';
import { useSettings } from '../../lib/settings-context';
import { useFolios } from '../../lib/folios-context';
import { supabase } from '../../lib/supabase';

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

// ─── Pref chips ───────────────────────────────────────────────────────────────
const PREF_CHIPS = [
  'Solo traveler', 'Boutique hotels', 'Street food',
  'Avoid tourist traps', 'Family-friendly', 'Budget-conscious', 'Luxury',
];

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

  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [scanning, setScanning] = useState<'calendar' | 'gmail' | null>(null);
  const [calendarTrips, setCalendarTrips] = useState<any[]>([]);
  const [gmailBookings, setGmailBookings] = useState<any[]>([]);
  const [connectorError, setConnectorError] = useState('');

  // Auth state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Inline editing state
  const [nameEditing, setNameEditing] = useState(false);
  const [nameValue, setNameValue] = useState(settings.name ?? '');
  const [openSection, setOpenSection] = useState<'city' | 'prefs' | null>(null);

  // Inline city state
  const [cityInput, setCityInput] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySelected, setCitySelected] = useState<CityResult | null>(null);
  const [citySearching, setCitySearching] = useState(false);
  const cityDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline prefs state
  const [prefsTags, setPrefsTags] = useState<string[]>([]);
  const [prefsNote, setPrefsNote] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
      setIsAnonymous(!session?.user?.email);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null);
      setIsAnonymous(!session?.user?.email);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { setNameValue(settings.name ?? ''); }, [settings.name]);

  // ── City helpers
  function openCity() {
    setCityInput(settings.homeCity);
    setCityResults([]);
    setCitySelected(null);
    setOpenSection('city');
  }

  function handleCityChange(text: string) {
    setCityInput(text);
    setCitySelected(null);
    if (cityDebounce.current) clearTimeout(cityDebounce.current);
    cityDebounce.current = setTimeout(async () => {
      setCitySearching(true);
      const r = await searchCities(text);
      setCityResults(r);
      setCitySearching(false);
    }, 320);
  }

  function handleCitySelect(city: CityResult) {
    const display = city.admin1
      ? `${city.name}, ${city.admin1}, ${city.country}`
      : `${city.name}, ${city.country}`;
    setCityInput(display);
    setCitySelected(city);
    setCityResults([]);
  }

  function saveCityInline() {
    if (!cityInput.trim()) { setOpenSection(null); return; }
    const coords = citySelected
      ? { lat: citySelected.latitude, lng: citySelected.longitude }
      : { lat: 0, lng: 0 };
    updateSettings({ homeCity: cityInput.trim(), homeCityCoords: coords });
    setOpenSection(null);
    showToast();
  }

  // ── Prefs helpers
  function openPrefs() {
    setPrefsTags(settings.travelTags ?? []);
    setPrefsNote(settings.travelPreferences ?? '');
    setOpenSection('prefs');
  }

  function togglePrefsChip(chip: string) {
    setPrefsTags(prev => prev.includes(chip) ? prev.filter(t => t !== chip) : [...prev, chip]);
  }

  function savePrefsInline() {
    updateSettings({ travelTags: prefsTags, travelPreferences: prefsNote });
    setOpenSection(null);
    showToast();
  }

  // ── Name helpers
  function saveName() {
    updateSettings({ name: nameValue.trim() });
    setNameEditing(false);
    showToast();
  }

  // ── Avatar
  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  function pickAvatar() {
    if (typeof document === 'undefined') return;
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.onchange = async () => {
      const file = el.files?.[0];
      if (!file) return;
      const url = await resizeImage(file, 128);
      if (url) { updateSettings({ avatarUrl: url }); showToast(); }
    };
    el.click();
  }

  function resizeImage(file: File, size: number): Promise<string | null> {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

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

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

              {/* Name row */}
              {isAnonymous ? (
                <View style={styles.profileRow}>
                  <IconCircle bg="#1a1210" name="person-outline" />
                  <View style={styles.profileText}>
                    <Text style={[styles.profileLabel, { color: T.muted }]}>Your name</Text>
                    <Text style={[styles.profileValue, { color: T.ink }]}>Maya</Text>
                  </View>
                  <Text style={[styles.demoLockLabel, { color: T.muted }]}>Demo</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setNameEditing(true)}
                  activeOpacity={0.7}
                  style={styles.profileRow}
                >
                  <IconCircle bg="#1a1210" name="person-outline" />
                  <View style={styles.profileText}>
                    <Text style={[styles.profileLabel, { color: T.muted }]}>Your name</Text>
                    {nameEditing ? (
                      <TextInput
                        autoFocus
                        value={nameValue}
                        onChangeText={setNameValue}
                        onBlur={saveName}
                        onSubmitEditing={saveName}
                        placeholder="Add your name"
                        placeholderTextColor={T.sub}
                        style={[styles.profileValue, { color: T.ink, padding: 0 }]}
                        returnKeyType="done"
                      />
                    ) : settings.name
                      ? <Text style={[styles.profileValue, { color: T.ink }]}>{settings.name}</Text>
                      : <Text style={[styles.profilePlaceholder, { color: T.sub }]}>Add your name</Text>
                    }
                  </View>
                  {!nameEditing && <Text style={[styles.editIcon, { color: T.muted }]}>{settings.name ? '✎' : '+'}</Text>}
                </TouchableOpacity>
              )}

              <View style={[styles.divider, { backgroundColor: T.hair }]} />

              {/* Home city row — inline expandable */}
              {openSection === 'city' ? (
                <View style={styles.inlineSection}>
                  <View style={[styles.inlineInputRow, { borderColor: T.hair, backgroundColor: T.bg }]}>
                    <TextInput
                      autoFocus
                      value={cityInput}
                      onChangeText={handleCityChange}
                      placeholder="Search for a city…"
                      placeholderTextColor={T.sub}
                      style={[styles.inlineInput, { color: T.ink }]}
                      returnKeyType="search"
                    />
                    {citySearching
                      ? <ActivityIndicator size="small" color={T.muted} />
                      : cityInput.length > 0 && (
                        <TouchableOpacity
                          onPress={() => { setCityInput(''); setCityResults([]); setCitySelected(null); }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={[styles.clearBtn, { color: T.muted }]}>✕</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                  {cityResults.length > 0 && (
                    <View style={[styles.resultList, { borderColor: T.hair, backgroundColor: T.bg }]}>
                      {cityResults.map((city, i) => {
                        const line1 = city.admin1 ? `${city.name}, ${city.admin1}` : city.name;
                        return (
                          <React.Fragment key={city.id}>
                            {i > 0 && <View style={[styles.resultDivider, { backgroundColor: T.hair }]} />}
                            <TouchableOpacity
                              style={styles.resultRow}
                              onPress={() => handleCitySelect(city)}
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
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      onPress={() => setOpenSection(null)}
                      style={[styles.inlineCancelBtn, { borderColor: T.hair }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inlineCancelText, { color: T.sub }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveCityInline}
                      disabled={!cityInput.trim()}
                      style={[styles.inlineSaveBtn, { backgroundColor: T.ink, opacity: cityInput.trim() ? 1 : 0.35 }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineSaveText, { color: T.bg }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={openCity}
                  activeOpacity={0.7}
                  style={styles.profileRow}
                >
                  <IconCircle bg="#1a1210" name="home-outline" />
                  <View style={styles.profileText}>
                    <Text style={[styles.profileLabel, { color: T.muted }]}>Home city</Text>
                    {hasCity
                      ? <Text style={[styles.profileValue, { color: T.ink }]}>{settings.homeCity}</Text>
                      : <Text style={[styles.profilePlaceholder, { color: T.sub }]}>Add your home city</Text>
                    }
                  </View>
                  <Text style={[styles.editIcon, { color: T.muted }]}>{hasCity ? '✎' : '+'}</Text>
                </TouchableOpacity>
              )}

              <View style={[styles.divider, { backgroundColor: T.hair }]} />

              {/* Travel preferences row — inline expandable */}
              {openSection === 'prefs' ? (
                <View style={styles.inlineSection}>
                  {/* Active tags */}
                  {prefsTags.length > 0 && (
                    <View style={styles.tagList}>
                      {prefsTags.map(tag => (
                        <TouchableOpacity
                          key={tag}
                          onPress={() => togglePrefsChip(tag)}
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
                  <View style={[styles.inlineInputRow, { borderColor: T.hair, backgroundColor: T.bg, alignItems: 'flex-start', paddingVertical: 12 }]}>
                    <TextInput
                      value={prefsNote}
                      onChangeText={setPrefsNote}
                      placeholder="Describe how you like to travel…"
                      placeholderTextColor={T.sub}
                      style={[styles.inlineInput, { color: T.ink, minHeight: 64, textAlignVertical: 'top' }]}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                  {/* Quick-add chips */}
                  <Text style={[styles.chipSectionLabel, { color: T.muted }]}>Quick add</Text>
                  <View style={styles.chipWrap}>
                    {PREF_CHIPS.map(chip => {
                      const active = prefsTags.includes(chip);
                      return (
                        <TouchableOpacity
                          key={chip}
                          onPress={() => togglePrefsChip(chip)}
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
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      onPress={() => setOpenSection(null)}
                      style={[styles.inlineCancelBtn, { borderColor: T.hair }]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inlineCancelText, { color: T.sub }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={savePrefsInline}
                      style={[styles.inlineSaveBtn, { backgroundColor: T.ink }]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.inlineSaveText, { color: T.bg }]}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={openPrefs}
                  activeOpacity={0.7}
                  style={styles.profileRow}
                >
                  <IconCircle bg="#1a1210" name="heart-outline" />
                  <View style={styles.profileText}>
                    <Text style={[styles.profileLabel, { color: T.muted }]}>Travel preferences</Text>
                    {(hasTags || hasNote)
                      ? <>
                          {hasTags && <Text style={[styles.profileValue, { color: T.ink }]}>{tagsLine}</Text>}
                          {hasNote && <Text style={[styles.profileNote, { color: T.muted }]}>{settings.travelPreferences}</Text>}
                        </>
                      : <Text style={[styles.profilePlaceholder, { color: T.sub }]}>Add your travel preferences</Text>
                    }
                  </View>
                  <Text style={[styles.editIcon, { color: T.muted }]}>{(hasTags || hasNote) ? '✎' : '+'}</Text>
                </TouchableOpacity>
              )}

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
              {isAnonymous ? (
                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  activeOpacity={0.7}
                  style={styles.accountRow}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#E8E4F4' }]}>
                    <Text style={styles.accountAvatarText}>?</Text>
                  </View>
                  <View style={styles.accountText}>
                    <Text style={[styles.accountName, { color: T.ink }]}>Demo account</Text>
                    <Text style={[styles.accountSub, { color: T.muted }]}>
                      Sign in to sync your trips across devices
                    </Text>
                  </View>
                  <View style={styles.upgradePill}>
                    <Text style={styles.upgradeText}>Sign in</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.accountRow}>
                    {/* Tappable avatar */}
                    <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8} style={styles.avatarWrap}>
                      {settings.avatarUrl ? (
                        Platform.OS === 'web'
                          ? <img src={settings.avatarUrl} style={{ width: 48, height: 48, borderRadius: 24, objectFit: 'cover', display: 'block' } as any} />
                          : (() => { const { Image } = require('react-native'); return <Image source={{ uri: settings.avatarUrl }} style={styles.avatarImg} />; })()
                      ) : (
                        <View style={[styles.accountAvatar, { backgroundColor: '#1a1210', width: 48, height: 48, borderRadius: 24 }]}>
                          <Text style={[styles.accountAvatarText, { color: '#f5f2ec', fontSize: 18 }]}>
                            {(settings.name || userEmail || '?')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.avatarEditBadge}>
                        <Text style={{ color: '#fff', fontSize: 8 }}>✎</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={styles.accountText}>
                      {settings.name ? (
                        <Text style={[styles.accountName, { color: T.ink }]}>{settings.name}</Text>
                      ) : null}
                      <Text style={[styles.accountSub, { color: settings.name ? T.muted : T.ink, fontSize: settings.name ? 12 : 14 }]}>
                        {userEmail}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.divider, { backgroundColor: T.hair }]} />
                  <TouchableOpacity onPress={signOut} activeOpacity={0.7} style={styles.signOutRow}>
                    <Text style={[styles.signOutText, { color: T.muted }]}>Sign out</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Toast ── */}
      <Toast visible={toastVisible} toastKey={toastKey} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  profilePlaceholder: { fontSize: 14, letterSpacing: -0.2 },
  editIcon: { fontSize: 16, flexShrink: 0 },
  demoLockLabel: {
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
    fontFamily: 'monospace', flexShrink: 0,
  },

  // Skeleton
  skeleton: {
    width: 80, height: 12, borderRadius: 6, backgroundColor: '#E8E5DF',
  },

  // Inline expandable sections
  inlineSection: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
  },
  inlineInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 0.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  inlineInput: { flex: 1, fontSize: 15, letterSpacing: -0.2 },
  clearBtn: { fontSize: 13, padding: 2 },
  resultList: {
    borderWidth: 0.5, borderRadius: 12, overflow: 'hidden', marginTop: 8,
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 13 },
  resultDivider: { height: 0.5, marginHorizontal: 14 },
  resultCity: { fontSize: 14, letterSpacing: -0.15 },
  resultCountry: { fontSize: 12, letterSpacing: -0.05, marginTop: 2 },
  inlineActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  inlineCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 0.5, alignItems: 'center',
  },
  inlineCancelText: { fontSize: 14, letterSpacing: -0.2 },
  inlineSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
  },
  inlineSaveText: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },

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
  // Ghost/outlined connect button — warm neutral instead of solid black
  connectBtn: {
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#c4b89a', flexShrink: 0,
  },
  connectBtnText: { color: '#1a1210', fontSize: 12.5, fontWeight: '500', letterSpacing: -0.1 },
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
  signOutRow: {
    paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { fontSize: 14, letterSpacing: -0.1, fontWeight: '400' },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#1a1210', borderWidth: 1.5, borderColor: '#f5f2ec',
    alignItems: 'center', justifyContent: 'center',
  },

  // Prefs chips
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText: { fontSize: 13, letterSpacing: -0.1 },
  tagRemove: { fontSize: 13, opacity: 0.6 },
  chipSectionLabel: { fontSize: 11, letterSpacing: 0.3, marginTop: 16, marginBottom: 10 },
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
