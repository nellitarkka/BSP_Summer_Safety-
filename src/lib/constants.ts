export const SAFETY_DISCLAIMER =
  'This application is designed to support personal safety planning, but it does ' +
  'not replace emergency services. If you are in immediate danger, contact local ' +
  'emergency services immediately.';

export const AI_FALLBACK_TIP =
  "Couldn't generate tips right now. If you're in immediate danger, call local " +
  'emergency services. Move toward a public, well-lit area and contact a trusted person.';

export const PRIVACY_NOTICE = [
  'We collect only what the app needs to help you stay safe: your profile, your ',
  'trusted contacts, and your safety sessions and check-ins.',
  '',
  'Location is used only with your permission, and only to show your position and ',
  'plan routes. Location sharing is OFF by default and is included in alerts only ',
  'when you turn it on.',
  '',
  'Your situation text for AI tips is not stored unless you explicitly enable it. ',
  'We never sell your data, never share it without a clear action by you, and never ',
  'expose your emergency contacts publicly.',
  '',
  'You can delete your session history or your whole account at any time from ',
  'Privacy settings. Your data is protected by per-user access rules (RLS).',
].join('');

export const CHECKIN_INTERVALS = [15, 30, 60] as const;
export const FAKE_CALL_DELAYS_SEC = [0, 30, 60, 180] as const;

export const EMERGENCY_NUMBER = '112';


export const ALERT_BASE_MESSAGE =
  'Hi, I feel unsafe. This is my current location/check-in status. Please contact me or check on me.';

export const FAKE_CALLERS = ['Mom', 'Friend', 'Roommate'] as const;

export const FAKE_CALL_SCRIPT = [
  'Hey, where are you?',
  "I'm nearby.",
  'Stay on the phone with me.',
  "I'll meet you soon.",
] as const;
