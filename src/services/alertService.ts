import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Alert, AlertStatus, AlertType, TrustedContact } from '@/types';
import { ALERT_BASE_MESSAGE, EMERGENCY_NUMBER } from '@/lib/constants';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated');
  return data.user.id;
}

// Spec §15 message builder. Location/status/timestamp only when sharing is on (FR-36).
export function buildAlertMessage(opts: {
  sharingEnabled: boolean;
  locationLink?: string;
  sessionStatus?: string;
}): string {
  let m = ALERT_BASE_MESSAGE;
  if (opts.sharingEnabled && opts.locationLink) {
    m += `\nLocation: ${opts.locationLink}\nStatus: ${opts.sessionStatus ?? 'active'}\nTime: ${new Date().toLocaleString()}`;
  }
  return m;
}

function channelUrl(contact: TrustedContact, message: string): string | null {
  const body = encodeURIComponent(message);
  switch (contact.preferred_method) {
    case 'sms':
      if (!contact.phone) return null;
      return `sms:${contact.phone}${Platform.OS === 'ios' ? '&' : '?'}body=${body}`;
    case 'email':
      if (!contact.email) return null;
      return `mailto:${contact.email}?subject=${encodeURIComponent('I feel unsafe')}&body=${body}`;
    case 'call':
      return contact.phone ? `tel:${contact.phone}` : null;
    case 'app':
    default:
      return null; // simulated in-app alert
  }
}

async function record(
  userId: string,
  alert_type: AlertType,
  message: string,
  status: AlertStatus,
  contact_id: string | null,
  session_id: string | null,
): Promise<Alert> {
  const { data, error } = await supabase
    .from('alerts')
    .insert({ user_id: userId, alert_type, message, status, contact_id, session_id })
    .select('*')
    .single();
  if (error) throw error;
  return data as Alert;
}

export const alertService = {
  // FR-37: open the device composer when possible; otherwise log a simulated alert.
  async sendAlertToContact(
    contact: TrustedContact,
    message: string,
    sessionId: string | null,
  ): Promise<Alert> {
    const userId = await requireUserId();
    const url = channelUrl(contact, message);
    const methodToType: Record<TrustedContact['preferred_method'], AlertType> = {
      sms: 'sms', email: 'email', call: 'sos', app: 'app',
    };
    const type: AlertType = methodToType[contact.preferred_method];
    if (!url) return record(userId, 'app', message, 'simulated', contact.id, sessionId);
    try {
      await Linking.openURL(url);
      return record(userId, type, message, 'sent', contact.id, sessionId);
    } catch {
      return record(userId, type, message, 'failed', contact.id, sessionId);
    }
  },

  // FR-31: simulated notification when a check-in is missed.
  async simulateMissedAlert(sessionId: string, message: string): Promise<Alert> {
    const userId = await requireUserId();
    return record(userId, 'app', message, 'simulated', null, sessionId);
  },

  // FR-34: only ever called after explicit user confirmation.
  async callEmergency(): Promise<void> {
    await Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  },

  async callContact(contact: TrustedContact): Promise<void> {
    if (contact.phone) await Linking.openURL(`tel:${contact.phone}`);
  },
};

export function mapsLink(latitude: number, longitude: number): string {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
}
