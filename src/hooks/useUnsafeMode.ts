import { useProfile } from '@/hooks/useProfile';
import { useContacts } from '@/hooks/useContacts';
import { useActiveSession } from '@/hooks/useActiveSession';
import { locationService } from '@/services/locationService';
import { buildAlertMessage, mapsLink } from '@/services/alertService';
import type { TrustedContact } from '@/types';

// Aggregates the data Unsafe Mode needs and builds the alert message (with a
// location link only when sharing is enabled, FR-36/FR-47 — coarse maps link only).
export function useUnsafeMode() {
  const { data: profile } = useProfile();
  const { data: contacts } = useContacts();
  const { data: session } = useActiveSession();

  const emergencyContacts: TrustedContact[] = (contacts ?? []).filter((c) => c.is_emergency);
  const orderedContacts: TrustedContact[] =
    emergencyContacts.length > 0 ? emergencyContacts : (contacts ?? []);
  const instantAlerts = profile?.privacy_preferences.instant_alerts ?? false;
  const sharingEnabled =
    (profile?.privacy_preferences.location_sharing ?? false) ||
    (session?.location_sharing_enabled ?? false);

  // Sending an alert is an explicit, deliberate action, so we attach the current
  // location whenever the OS location permission allows it (the tap IS the consent
  // for this one alert). Passive background tracking stays gated by the sharing
  // preference elsewhere. If permission is denied, the alert still goes without it.
  async function composeMessage(): Promise<string> {
    let locationLink: string | undefined;
    try {
      const c = await locationService.getCurrent();
      locationLink = mapsLink(c.latitude, c.longitude);
    } catch {
      locationLink = undefined; // permission denied / unavailable — send without location
    }
    return buildAlertMessage({ sharingEnabled: true, locationLink, sessionStatus: session?.status });
  }

  return {
    profile,
    contacts: contacts ?? [],
    orderedContacts,
    session,
    instantAlerts,
    sharingEnabled,
    composeMessage,
  };
}
