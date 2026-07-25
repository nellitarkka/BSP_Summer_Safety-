import { Text, StyleSheet } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { PRIVACY_NOTICE } from '@/lib/constants';
import { colors, font } from '@/lib/theme';

export default function PrivacyNoticeScreen() {
  return (
    <Screen scroll>
      <Card>
        <Text style={styles.body}>{PRIVACY_NOTICE}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 28, fontFamily: font.regular, color: colors.text },
});
