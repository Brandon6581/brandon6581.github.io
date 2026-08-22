import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Bottom padding a tab screen's scroll content needs so its last item is not
 * hidden behind the tab bar.
 *
 * The tab bar is absolutely positioned on iOS (for the blur effect), so content
 * scrolls *underneath* it rather than stopping above it. Without this the final
 * slime in the roster and the shop's footnote were unreachable.
 */
const TAB_BAR_BASE_HEIGHT = 56;

export function useTabContentPadding(extra = 24): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom + extra;
}
