// Canonical domain types (architecture.md §3). Strict — no `any`.
// Per-user ownership: every owned row carries user_id = auth.uid().

export interface PrivacyPreferences {
  location_sharing: boolean; // default false
  store_ai_text: boolean; // default false
  instant_alerts: boolean; // default false
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  disclaimer_accepted: boolean;
  privacy_preferences: PrivacyPreferences;
  created_at: string;
  updated_at: string;
}

export type PreferredMethod = 'sms' | 'email' | 'call' | 'app';

export interface TrustedContact {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
  preferred_method: PreferredMethod;
  is_emergency: boolean;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled' | 'missed_checkin';

export interface Coords {
  latitude: number;
  longitude: number;
}

export interface RouteSummary {
  coordinates: Coords[];
  distance_m: number;
  duration_s: number;
  provider: string;
}

export interface SafetySession {
  id: string;
  user_id: string;
  start_location: string;
  destination: string;
  route_data: RouteSummary | null;
  start_time: string;
  expected_arrival_time: string | null;
  checkin_interval_minutes: number;
  status: SessionStatus;
  location_sharing_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type CheckInStatus = 'pending' | 'confirmed' | 'missed' | 'help_requested';

export interface CheckIn {
  id: string;
  session_id: string;
  user_id: string;
  scheduled_time: string;
  completed_time: string | null;
  status: CheckInStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type AlertType = 'sms' | 'email' | 'app' | 'sos';
export type AlertStatus = 'created' | 'sent' | 'simulated' | 'failed';

export interface Alert {
  id: string;
  user_id: string;
  session_id: string | null;
  contact_id: string | null;
  alert_type: AlertType;
  message: string;
  status: AlertStatus;
  created_at: string;
}

export type SituationContext =
  | 'walking'
  | 'taxi'
  | 'club'
  | 'public_transport'
  | 'unknown';

export interface SafetyTipsRequest {
  situation: string;
  context?: SituationContext;
  time_of_day?: string;
  is_alone?: boolean;
  // No GPS field by design (FR-47).
}

export interface SafetyTipsResponse {
  tips: string[];
  emergency_reminder: string;
  contact_suggestion: string;
  complete: boolean; // LAST field — truncation detection
}

// ===========================================================================
// R2 — Route & data engine (FR-57..65) + route-feature AI (FR-66..68) + NFR-14
// ETHICAL BOUNDARY (load-bearing): indicators are ROUTE-LEVEL, relative, and
// uncertainty-aware. There is deliberately NO per-street danger score, danger
// label, or street-by-street risk map anywhere in these types (FR-59/FR-67/
// NFR-14). Crime statistics are background/motivation only — never a route input.
// ===========================================================================

export type TransitKind = 'bus' | 'tram' | 'train' | 'other';
export type HelpPointKind = 'police' | 'hospital' | 'pharmacy' | 'public_place';
export type PathType =
  | 'sidewalk'
  | 'footpath'
  | 'residential'
  | 'main_road'
  | 'park'
  | 'mixed'
  | 'unknown';
export type LightingTag = 'lit' | 'unlit' | 'unknown';
export type TimeOfDay = 'day' | 'evening' | 'night';

export interface TransitStopRef {
  name: string | null;
  kind: TransitKind;
  distance_m: number; // distance from the route
}

export interface HelpPointRef {
  kind: HelpPointKind;
  name: string | null;
  distance_m: number;
}

// Extracted per-candidate route features (FR-58). Fields are nullable/unknown
// where the underlying OSM data is unmapped — never fabricated.
export interface RouteFeatures {
  distance_m: number;
  duration_s: number;
  transit_stops: TransitStopRef[];
  help_points: HelpPointRef[];
  path_types: PathType[]; // aggregated set present along the route
  lighting: LightingTag; // route-level aggregate
  isolated_segment_count: number; // count only — NOT located/labelled as "dangerous"
}

// Relative, uncertainty-aware route-level rating. Higher = more of the positive
// attribute (e.g. more lighting, closer transit). This is NOT a danger score.
export type IndicatorRating = 'lower' | 'moderate' | 'higher' | 'unknown';

// Route-level safety indicators (FR-59). Framed positively; no "danger" field.
export interface RouteIndicators {
  lighting_availability: IndicatorRating;
  transit_proximity: IndicatorRating;
  help_point_proximity: IndicatorRating;
  route_openness: IndicatorRating; // inverse of isolation; higher = less isolated
  time_of_day: TimeOfDay;
  uncertainty_note: string; // required — features may be incomplete
}

export interface RouteCandidate {
  id: string; // stable within a response, e.g. 'A' | 'B' | 'C'
  label: string; // display label, e.g. 'Route A'
  summary: RouteSummary; // geometry + distance/duration/provider (reused MVP type)
  features: RouteFeatures;
  indicators: RouteIndicators;
}

// Comparison + plain-language explanation (FR-60). Relative wording only.
export interface RouteComparison {
  preferred_candidate_id: string | null; // null when tie / insufficient basis
  explanation: string;
}

export interface AvoidPreferArea {
  center: Coords;
  radius_m: number;
  mode: 'avoid' | 'prefer';
}

export interface RouteFeatureRequest {
  start: Coords;
  destination: Coords;
  time_of_day?: TimeOfDay;
  areas?: AvoidPreferArea[]; // FR-62 (Could) — optional avoid/prefer inputs
}

// Backend route-feature API shape (FR-61), consumed by the map/UI and the AI.
export interface RouteFeatureResponse {
  candidates: RouteCandidate[]; // 1..3 (FR-57)
  comparison: RouteComparison | null; // null when only one candidate
  generated_at: string;
  engine_version: string;
}

// Route-feature AI (FR-66..68). Input is AGGREGATED/RELATIVE descriptors only —
// there is deliberately no coordinates field, so precise GPS cannot be sent
// unless a consented descriptor is built upstream (FR-68, extends FR-47).
export interface RouteExplanationRequest {
  candidate_descriptors: string[]; // e.g. 'Route A: well-lit main road, close to a transit stop'
  time_of_day?: TimeOfDay;
}

export interface RouteExplanationResponse {
  explanation: string; // why a route may be preferable (FR-66)
  emergency_reminder: string;
  complete: boolean; // LAST field — truncation detection
}

// Data provenance & crime-data ethics (NFR-14). Documentation entity, not
// user-owned. `background_only` marks sources (e.g. crime statistics) that may
// motivate the work but must never feed route indicators or label streets.
export type DatasetRole = 'base_map' | 'transit' | 'incident_context_demo' | 'background_context';

export interface DatasetSource {
  id: string;
  name: string;
  source_url: string;
  license: string;
  limitations: string;
  role: DatasetRole;
  // true = motivation/background ONLY (e.g. crime statistics). Such a source must
  // never feed route indicators or label streets (NFR-14).
  background_only: boolean;
}
