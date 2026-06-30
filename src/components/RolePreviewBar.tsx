import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useAuth } from '@/stores/auth';
import { color } from '@/theme/tokens';

/**
 * Floating banner shown whenever a super-admin is previewing the app as another
 * role. Rendered at the app root (above everything) so "Exit" is always reachable
 * — preview never strips the real admin's way back.
 */
export function RolePreviewBar() {
  const insets = useSafeAreaInsets();
  const preview = useAuth((s) => s.previewRole);
  const setPreviewRole = useAuth((s) => s.setPreviewRole);
  if (!preview) return null;
  const label = preview.replace(/_/g, ' ');
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 4, alignItems: 'center', zIndex: 200 }}>
      <View
        className="flex-row items-center gap-2 rounded-full bg-charcoal px-3 py-1.5"
        style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 6 }}>
        <Ionicons name="eye" size={13} color={color.gold} />
        <Text className="text-[12px] font-semibold capitalize text-white">Previewing: {label}</Text>
        <Pressable onPress={() => setPreviewRole(null)} hitSlop={8} className="ml-1 rounded-full bg-white/20 px-2.5 py-1">
          <Text className="text-[11px] font-bold text-white">EXIT</Text>
        </Pressable>
      </View>
    </View>
  );
}
