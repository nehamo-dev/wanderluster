import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DEFAULT_PALETTE as T } from '../../constants/theme';
import { useSettings } from '../../lib/settings-context';
import { useFolios } from '../../lib/folios-context';

function SmallCaps({ children }: { children: string }) {
  return <Text style={styles.smallCaps}>{children}</Text>;
}

function Row({
  label,
  last = false,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: T.ink }]}>{label}</Text>
        <View style={styles.rowRight}>{children}</View>
      </View>
      {!last && <View style={[styles.divider, { backgroundColor: T.hair }]} />}
    </>
  );
}

export default function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { addFolio } = useFolios();

  const [homeCity, setHomeCity] = useState(settings.homeCity);
  const [travelPrefs, setTravelPrefs] = useState(settings.travelPreferences);
  const [scanning, setScanning] = useState<'calendar' | 'gmail' | null>(null);
  const [calendarTrips, setCalendarTrips] = useState<any[]>([]);
  const [gmailBookings, setGmailBookings] = useState<any[]>([]);

  // Pick up token from URL after OAuth redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      updateSettings({ googleConnected: true, googleAccessToken: token });
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function saveHomeCity() {
    updateSettings({ homeCity });
  }

  function saveTravelPrefs() {
    updateSettings({ travelPreferences: travelPrefs });
  }

  function connectGoogle() {
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/google';
    }
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
      if (res.ok) {
        const data = await res.json();
        setCalendarTrips(data.trips ?? []);
      }
    } catch (e) {
      console.error('[scanCalendar]', e);
    } finally {
      setScanning(null);
    }
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
      if (res.ok) {
        const data = await res.json();
        setGmailBookings(data.bookings ?? []);
      }
    } catch (e) {
      console.error('[scanGmail]', e);
    } finally {
      setScanning(null);
    }
  }

  function importCalendarTrips() {
    for (const trip of calendarTrips) {
      addFolio(trip as any);
    }
    setCalendarTrips([]);
  }

  function importGmailBookings() {
    for (const booking of gmailBookings) {
      addFolio(booking as any);
    }
    setGmailBookings([]);
  }

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: T.bg }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
      >
        {/* PROFILE */}
        <View style={styles.sectionLabel}>
          <SmallCaps>Profile</SmallCaps>
        </View>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
          <Row label="Home city">
            <TextInput
              value={homeCity}
              onChangeText={setHomeCity}
              onBlur={saveHomeCity}
              placeholder="e.g. London"
              placeholderTextColor={T.muted}
              style={[styles.textInput, { color: T.ink }]}
              returnKeyType="done"
              onSubmitEditing={saveHomeCity}
            />
          </Row>
          <Row label="Travel preferences" last>
            <TextInput
              value={travelPrefs}
              onChangeText={setTravelPrefs}
              onBlur={saveTravelPrefs}
              placeholder={
                'e.g. I prefer boutique hotels, love street food, avoid tourist traps, travel solo 2–3 times a year'
              }
              placeholderTextColor={T.muted}
              style={[styles.textArea, { color: T.ink }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onSubmitEditing={saveTravelPrefs}
            />
          </Row>
        </View>

        {/* CONNECTORS */}
        <View style={styles.sectionLabel}>
          <SmallCaps>Connectors</SmallCaps>
        </View>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
          {/* Google Calendar */}
          <View style={styles.row}>
            <View style={styles.connectorLeft}>
              <Text style={[styles.rowLabel, { color: T.ink }]}>Google Calendar</Text>
              {settings.googleConnected ? (
                <View style={styles.connectedBadge}>
                  <View style={[styles.greenDot, { backgroundColor: '#5a8a5a' }]} />
                  <Text style={[styles.connectedText, { color: '#5a8a5a' }]}>Connected</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.connectorActions}>
              {!settings.googleConnected ? (
                <TouchableOpacity
                  onPress={connectGoogle}
                  style={[styles.connectBtn, { borderColor: T.accent }]}
                >
                  <Text style={[styles.connectBtnText, { color: T.accent }]}>Connect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={scanCalendar}
                  style={[styles.scanBtn, { backgroundColor: T.surface, borderColor: T.hair }]}
                  disabled={scanning === 'calendar'}
                >
                  {scanning === 'calendar' ? (
                    <ActivityIndicator size="small" color={T.muted} />
                  ) : (
                    <Text style={[styles.scanBtnText, { color: T.sub }]}>Scan now</Text>
                  )}
                </TouchableOpacity>
              )}
              {calendarTrips.length > 0 && (
                <TouchableOpacity
                  onPress={importCalendarTrips}
                  style={[styles.importBtn, { backgroundColor: T.accent }]}
                >
                  <Text style={[styles.importBtnText, { color: '#f5efe2' }]}>
                    Import {calendarTrips.length} trip{calendarTrips.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: T.hair }]} />
          {/* Gmail */}
          <View style={styles.row}>
            <View style={styles.connectorLeft}>
              <Text style={[styles.rowLabel, { color: T.ink }]}>Gmail</Text>
              {settings.googleConnected ? (
                <View style={styles.connectedBadge}>
                  <View style={[styles.greenDot, { backgroundColor: '#5a8a5a' }]} />
                  <Text style={[styles.connectedText, { color: '#5a8a5a' }]}>Connected</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.connectorActions}>
              {!settings.googleConnected ? (
                <TouchableOpacity
                  onPress={connectGoogle}
                  style={[styles.connectBtn, { borderColor: T.accent }]}
                >
                  <Text style={[styles.connectBtnText, { color: T.accent }]}>Connect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={scanGmail}
                  style={[styles.scanBtn, { backgroundColor: T.surface, borderColor: T.hair }]}
                  disabled={scanning === 'gmail'}
                >
                  {scanning === 'gmail' ? (
                    <ActivityIndicator size="small" color={T.muted} />
                  ) : (
                    <Text style={[styles.scanBtnText, { color: T.sub }]}>Scan now</Text>
                  )}
                </TouchableOpacity>
              )}
              {gmailBookings.length > 0 && (
                <TouchableOpacity
                  onPress={importGmailBookings}
                  style={[styles.importBtn, { backgroundColor: T.accent }]}
                >
                  <Text style={[styles.importBtnText, { color: '#f5efe2' }]}>
                    Import {gmailBookings.length} booking{gmailBookings.length !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ACCOUNT */}
        <View style={styles.sectionLabel}>
          <SmallCaps>Account</SmallCaps>
        </View>
        <View style={[styles.card, { backgroundColor: T.surface, borderColor: T.hair }]}>
          <View style={[styles.row, styles.rowLast]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: T.ink }]}>Demo account</Text>
              <Text style={[styles.rowSub, { color: T.muted }]}>
                Sign up for a real account to sync across devices.
              </Text>
            </View>
            <Text style={[styles.nudgeArrow, { color: T.muted }]}>›</Text>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  backChevron: { fontSize: 28, marginTop: -2 },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 15, fontWeight: '500', letterSpacing: -0.2,
  },
  headerRight: { width: 36 },
  hairline: { height: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },
  sectionLabel: {
    paddingTop: 32, paddingBottom: 12, paddingHorizontal: 4,
  },
  smallCaps: {
    fontFamily: 'monospace', fontSize: 10, letterSpacing: 3.5,
    textTransform: 'uppercase', color: 'rgba(26,18,8,0.45)',
  },
  card: {
    borderRadius: 12, borderWidth: 0.5, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowLast: {
    // no special style needed, last row in card
  },
  rowLabel: { fontSize: 14, letterSpacing: -0.15 },
  rowSub: { fontSize: 12, marginTop: 3, letterSpacing: -0.1 },
  rowRight: { flex: 1, alignItems: 'flex-end' },
  divider: { height: 0.5, marginHorizontal: 16 },
  textInput: {
    fontSize: 14, letterSpacing: -0.15, textAlign: 'right',
    minWidth: 120, paddingVertical: 2,
  },
  textArea: {
    fontSize: 13.5, letterSpacing: -0.1, lineHeight: 20,
    minHeight: 72, paddingTop: 4,
  },
  connectorLeft: { flex: 1, gap: 4 },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  greenDot: { width: 6, height: 6, borderRadius: 3 },
  connectedText: { fontSize: 11, letterSpacing: 0.2 },
  connectorActions: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  connectBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5,
  },
  connectBtnText: { fontSize: 12.5, letterSpacing: -0.1 },
  scanBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, borderWidth: 0.5,
    minWidth: 80, alignItems: 'center',
  },
  scanBtnText: { fontSize: 12.5, letterSpacing: -0.1 },
  importBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999,
  },
  importBtnText: { fontSize: 12.5, letterSpacing: -0.1, fontWeight: '500' },
  nudgeArrow: { fontSize: 20 },
});
