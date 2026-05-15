import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { WayfinderDock } from '../../components/wayfinder/WayfinderDock';
import { WayfinderSheet } from '../../components/wayfinder/WayfinderSheet';
import { DEFAULT_PALETTE } from '../../constants/theme';
import { WayfinderContext } from '../../lib/wayfinder-context';
import { FoliosProvider } from '../../lib/folios-context';

const T = DEFAULT_PALETTE;

type ComposeMode = 'screenshots' | 'words' | 'link';

export default function AppLayout() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [folioId, setFolioId] = useState<string | undefined>();
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
  const [seedQ, setSeedQ] = useState('');

  function openWayfinder(q?: string) {
    if (q) setSeedQ(q);
    setComposeMode(null);
    setSheetOpen(true);
  }

  function openCompose(kind: ComposeMode) {
    setComposeMode(kind);
    setSeedQ('');
    setFolioId(undefined);
    setSheetOpen(true);
  }

  function handleClose() {
    setSheetOpen(false);
    setComposeMode(null);
    setSeedQ('');
  }

  return (
    <FoliosProvider>
    <WayfinderContext.Provider value={{ openCompose, openWayfinder }}>
      <View style={styles.root}>
        <Stack
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          screenListeners={{
            state: (e) => {
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
          <WayfinderDock theme={T} onExpand={() => openWayfinder()} />
        )}

        <WayfinderSheet
          theme={T}
          open={sheetOpen}
          onClose={handleClose}
          seedQuestion={seedQ}
          folioId={folioId}
          composeMode={composeMode}
        />
      </View>
    </WayfinderContext.Provider>
    </FoliosProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
