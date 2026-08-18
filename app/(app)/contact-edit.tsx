import { useLocalSearchParams } from 'expo-router';
import { ContactFormScreen } from '@/components/ContactFormScreen';

// EDIT an existing contact. Kept as a distinct route from Add (contact-new) so a reused
// Tabs screen / stale route param can never make Add inherit this contact (Bug 3).
export default function ContactEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ContactFormScreen mode="edit" editId={id} />;
}
