import { View, Text, FlatList, Pressable, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SafetyButton } from '@/components/SafetyButton';
import { useContacts, useDeleteContact } from '@/hooks/useContacts';
import type { TrustedContact } from '@/types';
import { colors, space, radius, fontSize, font } from '@/lib/theme';

export default function ContactsScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useContacts();
  const del = useDeleteContact();

  function confirmDelete(c: TrustedContact) {
    Alert.alert('Delete contact', `Remove ${c.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(c.id) },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <SafetyButton label="Add contact" variant="primary" icon="person-add" onPress={() => router.push('/(app)/contact-edit')} />
        {isError ? (
          <Pressable onPress={() => refetch()}>
            <Text style={styles.retry}>Couldn&apos;t load contacts. Tap to retry.</Text>
          </Pressable>
        ) : null}
        <FlatList
          data={data ?? []}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={40} color={colors.muted} />
              <Text style={styles.emptyText}>Add a trusted contact to enable alerts.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View
                style={[styles.avatar, { backgroundColor: item.is_emergency ? colors.warn + '22' : colors.brandSoft }]}
              >
                <Ionicons name={item.is_emergency ? 'star' : 'person'} size={22} color={item.is_emergency ? colors.warn : colors.brand} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.relationship ? `${item.relationship} · ` : ''}{item.preferred_method.toUpperCase()}
                  {item.is_emergency && item.priority ? ` · priority ${item.priority}` : ''}
                </Text>
              </View>
              <Pressable accessibilityLabel={`Edit ${item.name}`} hitSlop={8} onPress={() => router.push({ pathname: '/(app)/contact-edit', params: { id: item.id } })} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={22} color={colors.brand} />
              </Pressable>
              <Pressable accessibilityLabel={`Delete ${item.name}`} hitSlop={8} onPress={() => confirmDelete(item)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </Pressable>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, gap: space[4], paddingHorizontal: space[5], paddingVertical: space[4] },
  retry: { fontFamily: font.medium, color: colors.danger },
  empty: {
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius['4xl'],
    backgroundColor: colors.card,
    padding: space[8],
  },
  emptyText: { textAlign: 'center', fontFamily: font.regular, color: colors.muted },
  separator: { height: space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    borderRadius: radius['4xl'],
    backgroundColor: colors.card,
    padding: space[4],
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius['2xl'],
  },
  info: { flex: 1 },
  name: { fontSize: fontSize.base, fontFamily: font.bold, color: colors.text },
  meta: { fontSize: fontSize.xs, fontFamily: font.regular, color: colors.muted },
  iconBtn: { padding: space[2] },
});
