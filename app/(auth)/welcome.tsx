import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients, colors, radius, space, fontSize, font } from '@/lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Brand mark + name */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="moon" size={40} color={colors.white} />
            </View>
            <Text style={styles.wordmark}>Safety{'\n'}Companion</Text>
            <Text style={styles.tagline}>Get home safe. Take your time.</Text>
            <Text style={styles.blurb}>
              Someone quietly keeping you company until you&rsquo;re safely inside — attentive,
              unhurried, and never dramatic.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.secondaryBtnText}>I already have an account</Text>
            </Pressable>

            <Text style={styles.disclaimer}>
              Safety Companion supports personal safety planning. It supports 112 — it never replaces it.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space[6],
    paddingVertical: space[8],
  },
  header: { marginTop: 56, alignItems: 'flex-start' },
  logo: {
    height: 76,
    width: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['3xl'],
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  wordmark: {
    marginTop: space[6],
    fontSize: fontSize.display,
    fontFamily: font.display,
    letterSpacing: 0.5,
    color: colors.white,
  },
  tagline: {
    marginTop: space[1],
    fontSize: fontSize.xl,
    fontFamily: font.displayItalic,
    color: '#DDD2EC',
  },
  blurb: {
    marginTop: space[4],
    fontSize: fontSize.base,
    fontFamily: font.regular,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.72)',
  },
  actions: { gap: space[3] },
  primaryBtn: {
    borderRadius: radius['2xl'],
    backgroundColor: colors.white,
    paddingVertical: space[4],
  },
  primaryBtnText: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontFamily: font.bold,
    color: colors.brandDark,
  },
  secondaryBtn: {
    borderRadius: radius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingVertical: space[4],
  },
  secondaryBtnText: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontFamily: font.bold,
    color: colors.white,
  },
  disclaimer: {
    marginTop: space[4],
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontFamily: font.regular,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.68)',
  },
});
