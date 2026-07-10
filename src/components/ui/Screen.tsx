import type { ReactNode } from 'react';
import { View, ScrollView, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from '@/lib/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: readonly Edge[];
  // Extra styles applied to the content container.
  contentStyle?: StyleProp<ViewStyle>;
  center?: boolean;
}

// Consistent screen scaffold: safe-area + app background + standard padding.
// Use `scroll` for long content, `center` for empty/loading states.
export function Screen({
  children,
  scroll = false,
  edges = ['bottom'],
  contentStyle,
  center = false,
}: ScreenProps) {
  if (center) {
    return (
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={[styles.center, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: space[5], paddingVertical: space[5], gap: space[4] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    gap: space[4],
  },
});
