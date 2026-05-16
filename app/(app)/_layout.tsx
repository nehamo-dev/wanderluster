import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { WayfinderDock } from '../../components/wayfinder/WayfinderDock';
import { WayfinderSheet } from '../../components/wayfinder/WayfinderSheet';
import { DEFAULT_PALETTE } from '../../constants/theme';
import { WayfinderContext } from '../../lib/wayfinder-context';
import { FoliosProvider, useFolios } from '../../lib/folios-context';
import { SettingsProvider } from '../../lib/settings-context';
import type { Folio } from '../../types';

const T = DEFAULT_PALETTE;

type ComposeMode = 'screenshots' | 'words' | 'link';

function AppLayoutInner() {
  const { updateFolio } = useFolios();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [folioId, setFolioId] = useState<string | undefined>();
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
  const [seedQ, setSeedQ] = useState('');
  const [editMode, setEditMode] = useState(false);

  function openWayfinder(q?: string) {
    if (q) setSeedQ(q);
    setComposeMode(null);
    setEditMode(false);
    setSheetOpen(true);
  }

  function openCompose(kind: ComposeMode) {
    setComposeMode(kind);
    setSeedQ('');
    setFolioId(undefined);
    setEditMode(false);
    setSheetOpen(true);
  }

  function editFolio(id: string) {
    setFolioId(id);
    setComposeMode(null);
    setSeedQ('');
    setEditMode(true);
    setSheetOpen(true);
  }

  function handleClose() {
    setSheetOpen(false);
    setComposeMode(null);
    setSeedQ('');
    setEditMode(false);
  }

  function handleUpdate(newFolio: Folio) {
    if (folioId) {
      updateFolio(folioId, newFolio);
    }
    handleClose();
  }

  return (
    <WayfinderContext.Provider value={{ openCompose, openWayfinder, editFolio }}>
      <View style={styles.root}>
        <Stack
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
          screenListeners={{
            state: (e) => {
              const routes = (e.data as any)?.state?.routes ?? [];
              const current = routes[routes.length - 1];
              if (current?.name === 'trip/[id]') {
                setFolioId(current.params?.id);
              } else if (!editMode) {
                setFolioId(undefined);
              }
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="trip/[id]" />
          <Stack.Screen name="settings" />
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
          editMode={editMode}
          onUpdate={handleUpdate}
        />
      </View>
    </WayfinderContext.Provider>
  );
}

export default function AppLayout() {
  return (
    <SettingsProvider>
      <FoliosProvider>
        <AppLayoutInner />
      </FoliosProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
