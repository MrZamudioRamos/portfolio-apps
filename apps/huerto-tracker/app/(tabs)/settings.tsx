import { useColors } from '@portfolio/ui';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 32 }}>⚙️</Text>
        <Text style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginTop: 8 }}>
          Ajustes
        </Text>
      </View>
    </SafeAreaView>
  );
}
