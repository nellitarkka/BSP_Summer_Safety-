import { ContactFormScreen } from '@/components/ContactFormScreen';

// ADD a new contact — a distinct route with no id param, so the form always starts
// empty regardless of any previously edited contact (Bug 3, round-2 robust fix).
export default function ContactNewScreen() {
  return <ContactFormScreen mode="add" />;
}
