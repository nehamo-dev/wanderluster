import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { WayfinderDock } from '../../components/wayfinder/WayfinderDock';
import { WayfinderSheet } from '../../components/wayfinder/WayfinderSheet';
import { DEFAULT_PALETTE } from '../../constants/theme';

const T = DEFAULT_PALETTE;

export default function AppLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [folioId, setFolioId] = useState<string | undefined>();
  const [composeMode, setComposeMode] = useState<'screenshots' | 'words' | 'link' | null>(null);
  const [seedQ, setSeedQ] = useState('');

  function openWayfinder(q?: string, folio?: string) {
    if (q) setSeedQ(q);
    if (folio) setFolioId(folio);
    setComposeMode(null);
    setSheetOpen(true);
  }

  function openCompose(kind: 'screenshots' | 'words' | 'link', folio?: string) {
    if (folio) setFolioId(folio);
    setComposeMode(kind);
    setSeedQ('');
    setSheetOpen(true);
  }

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        screenListeners={{
          state: (e) => {
            // track which folio screen is active so Wayfinder has context
            const routes = (e.data as any)?.state?.routes ?? [];
            const current = routes[routes.length - 1];
            if (current?.name === 'trip/[id]') {
              setFolioId(current.params?.id);
            } else {
              setFolioId(undefined);
            }
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="trip/[id]" />
      </Stack>

      {!sheetOpen && (
        <WayfinderDock
          theme={T}
          onExpand={() => openWayfinder()}
        />
      )}

      <WayfinderSheet
        theme={T}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setComposeMode(null); }}
        seedQuestion={seedQ}
        folioId={folioId}
        composeMode={composeMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
