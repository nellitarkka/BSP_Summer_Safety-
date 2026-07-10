import { Redirect } from 'expo-router';

// Entry point — AuthGate in the root layout handles the real routing once the
// session resolves; this just provides a default target.
export default function Index() {
  return <Redirect href="/(app)/home" />;
}
