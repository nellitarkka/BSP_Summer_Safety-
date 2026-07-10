import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { gradients, colors, radius, space, fontSize, weight } from '@/lib/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Brand mark + tagline */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="shield-checkmark" size={44} color={colors.white} />
            </View>
            <Text style={styles.title}>
              Safety{'\n'}Companion
            </Text>
            <Text style={styles.tagline}>
              Plan safer journeys, check in with people you trust, and get calm support when you need it.
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
              This app supports personal safety planning. It does not replace emergency services.
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
  header: { marginTop: 64, alignItems: 'flex-start' },
  logo: {
    height: 80,
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['4xl'],
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  title: {
    marginTop: space[6],
    fontSize: fontSize['4xl'],
    fontWeight: weight.extrabold,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: space[3],
    fontSize: fontSize.lg,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.8)',
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
    fontWeight: weight.bold,
    color: colors.brand,
  },
  secondaryBtn: {
    borderRadius: radius['2xl'],
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: space[4],
  },
  secondaryBtnText: {
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: weight.bold,
    color: '#FFFFFF',
  },
  disclaimer: {
    marginTop: space[4],
    textAlign: 'center',
    fontSize: fontSize.xs,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.7)',
  },
});
