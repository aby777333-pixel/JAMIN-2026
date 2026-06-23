import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BackHeader } from '@/components/ui/BackHeader';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { color } from '@/theme/tokens';

/** Generic in-app browser — used for video / virtual / 3D property tours (§4). */
export default function WebViewScreen() {
  const { url, title } = useLocalSearchParams<{ url: string; title?: string }>();
  return (
    <Screen scroll={false} contentClassName="gap-0">
      <BackHeader title={title ?? 'View'} />
      {url ? (
        <View className="flex-1 overflow-hidden rounded-2xl border border-line">
          <WebView
            source={{ uri: url }}
            originWhitelist={['*']}
            allowsFullscreenVideo
            startInLoadingState
            renderLoading={() => (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={color.red} />
              </View>
            )}
          />
        </View>
      ) : (
        <Text variant="body" className="mt-8 text-center text-muted">
          Nothing to show.
        </Text>
      )}
    </Screen>
  );
}
