/** API contracts — mirror api/_lib/schemas.py. */

export type Role = 'CITIZEN' | 'VOLUNTEER' | 'NGO_MEMBER' | 'RESEARCHER' | 'INCIDENT_ADMIN';
export type Severity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type Availability = 'AVAILABLE' | 'BUSY' | 'OFFLINE';
export type SourceType = 'OFFICIAL' | 'NEWS' | 'SOCIAL' | 'SENSOR' | 'CITIZEN';
export type MeshPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type MeshEventType =
  | 'PERSON_RESCUED' | 'PERSON_MISSING' | 'PERSON_TRAPPED' | 'MEDICAL_EMERGENCY' | 'FIRE' | 'FLOOD'
  | 'RESOURCE_REQUEST' | 'VOLUNTEER_STATUS' | 'DISASTER_STATUS';
export type ReviewStatus = 'UNREVIEWED' | 'REVIEWED' | 'PROMOTED' | 'REJECTED';
export type DataSource = 'database' | 'fallback' | 'memory' | 'request';

export interface Disaster {
  id: string; code: string; title: string; category: string; severity: Severity;
  lat: number; lng: number; location: string; state: string; radius_km: number;
  polygon_geojson: GeoJSON.Polygon | GeoJSON.MultiPolygon | null; status: string;
  affected_pop: string | null; summary: string; wind_speed_kmh: number | null;
  rainfall_mm: number | null; surge_meters: number | null; org_id: string | null;
  created_at: string; updated_at: string;
  /** Live feed the incident came from (GDACS, USGS, NASA EONET) and the source's own page. */
  source: string | null; source_url: string | null; external_id: string | null;
}

export interface Evidence {
  id: string; disaster_id: string; author_id: string | null; source: string; source_type: SourceType;
  claim_text: string; relation: string; confidence: number; language: string; created_at: string;
}

export interface Task {
  id: string; code: string; title: string; description: string | null; urgency: Severity;
  required_skill: string; lat: number; lng: number; location_name: string; quantity_needed: number;
  status: TaskStatus; disaster_id: string; created_by_id: string; assigned_to_id: string | null;
  created_at: string; updated_at: string;
  accepted_at?: string | null; started_at?: string | null; completed_at?: string | null;
  start_lat?: number | null; start_lng?: number | null; people_helped?: number | null; outcome_note?: string | null;
}

export interface Alert {
  id: string; code: string; title: string; category: string; level: Severity; location: string;
  state: string; description: string; advisory: string; disaster_id: string | null;
  sender_id: string | null; created_at: string;
  /** BROADCAST: issued by verified incident command. AUTO: generated from a live-feed incident — never official. */
  kind?: 'BROADCAST' | 'AUTO'; source?: string | null; source_url?: string | null;
}

export interface Volunteer {
  id: string; user_id: string | null; name: string; skills: string[]; lat: number; lng: number;
  location_name: string; availability: Availability; verified: boolean; missions_done: number;
  total_hours: number; equipment: string[]; badge_level: string; response_rate: number; active_missions: number;
}

export interface Organization {
  id: string; name: string; category: string; state: string; district: string;
  contact_email: string; contact_phone: string; registration_no: string | null; verified: boolean;
}

export interface MusterPass {
  code: string; title: string; role: Role; holder: string; issued_at: string; signature: string;
}

export interface User {
  id: string; name: string; email: string; phone: string; role: Role; state_district: string | null;
  lat: number | null; lng: number | null; provider: string; avatar_url: string | null;
  blood_group: string | null; emergency_contact: string | null; is_verified: boolean; onboarded: boolean;
  org_id: string | null; profile_data: Record<string, unknown>; muster: MusterPass | null; created_at: string;
}

export interface AuthResponse { user: User; requiresOnboarding: boolean }

export interface MeshEvent {
  id: string; event_id: string; origin_node_id: string; disaster_id: string | null; type: MeshEventType;
  priority: MeshPriority; payload: Record<string, unknown>; lat: number | null; lng: number | null;
  observed_at: string; hop_count: number; ttl: number; received_at: string; review_status: ReviewStatus;
  promoted_task_id: string | null;
}

export interface MeshNode {
  id: string; node_uuid: string; volunteer_id: string | null; last_lat: number | null; last_lng: number | null;
  battery_level: number | null; last_seen_at: string; active: boolean; created_at: string;
}

export interface Prediction {
  hazard_probability: number; risk_level: 'CRITICAL' | 'HIGH' | 'MODERATE'; predicted_surge_m: number;
  confidence_score: number; model: string; latency_ms: number; features: Record<string, number>;
  wind_24h_kmh: number | null; severe_probability: number | null;
}

export interface ModelCard {
  name: string; version: string; trained_at: string; evaluation: string; features: string[];
  data: { source: string; storms: number; fixes: number; first: string; last: string };
  targets: Record<string, string>;
  metrics: {
    folds: number;
    intensity_24h: { n: number; mae_kt_with_history: number; mae_kt_single_report: number; mae_kt_persistence: number; skill_vs_persistence: number | null };
    severe_24h: { n: number; base_rate: number; threshold_kt: number; auc_with_history: number | null; auc_single_report: number | null;
      brier_with_history: number; brier_climatology: number; brier_skill_score: number | null; auc_below_threshold: number | null; accuracy_at_0_5: number };
  };
}

export interface Triage {
  disaster_type: string; severity: Severity; urgency_score: number; confidence: number; latency_ms: number;
  language: string; tier: 'laya-local' | 'impossibl-hosted' | 'deterministic';
  flags: { trapped_civilians: boolean; medical_emergency: boolean; food_water_needed: boolean; road_blocked: boolean };
  needs: string[]; trapped_count: number | null;
}

export interface Briefing {
  event_id: string; event_label: string; severity: string; confidence: number; supporting_count: number;
  conflicting_count: number; duplicate_count: number; needs: string[]; checklist: string[]; brief: string;
  engine: 'gemini' | 'heuristic';
}

export interface RankedMatch {
  volunteer_id: string; name: string; score: number; distance_km: number; skill_match: number;
  scarcity: number; squander_penalised: boolean; reason: string;
}

export interface Assignment {
  task_id: string; task_code: string; task_title: string; urgency: Severity; slot: number;
  volunteer_id: string; volunteer_name: string; score: number; distance_km: number;
  tier: 'EXACT' | 'ADJACENT' | 'GENERIC'; reason: string;
}

export interface DispatchResult {
  assignments: Assignment[];
  bottlenecks: { task_id: string; task_code: string; skill: string; requested: number; filled: number; deficit: number }[];
  scarcity: Record<string, number>; tiers: Record<'EXACT' | 'ADJACENT' | 'GENERIC', number>;
  completeness: number; latency_ms: number; tasks_evaluated: number; volunteers_evaluated: number;
}

/** Facilities mapped in OpenStreetMap near an active incident. Capacity fields are null unless mapped. */
interface Facility_ {
  id: string; name: string; address: string; lat: number; lng: number; osm_url: string;
  incident_id: string; incident_title: string; distance_km: number;
  /** Inside the incident's mapped hazard radius: nearest, but may itself be affected. */
  inside_zone?: boolean;
}
export interface Hospital extends Facility_ {
  kind: string; beds: number | null; phone: string; emergency: boolean;
  icu_beds: number | null; icu_available: number | null; trauma_level: string | null;
}
export interface Shelter extends Facility_ {
  kind: string; capacity: number | null; occupancy: number | null; facilities: string[]; incharge: string | null;
}
export interface Resources {
  hotlines: { label: string; number: string }[]; hospitals: Hospital[]; shelters: Shelter[];
  mode: 'LIVE' | 'OFFLINE' | 'NO_INCIDENTS'; fetched_at: string | null; attribution: string;
  /** Overpass query the browser can run itself when the server couldn't reach OpenStreetMap. */
  query?: string | null;
}

export interface Dossier { disaster: Disaster; evidence: Evidence[]; tasks: Task[]; alerts: Alert[] }

export interface Facility {
  name: string; type: string; lat: number; lng: number; distance_km: number; status: string; osm_id: number | null;
}

export interface ImageryLayer {
  id: string; label: string; short?: string; provider: string; tiles: string[]; max_zoom: number; cadence: string;
  dynamic?: string; date?: string;
}

export interface Bulletin {
  title: string; description: string; link: string | null; source: string; severity: Severity; published_at: string;
  category?: string; event?: string | null; expires_at?: string | null; area?: string | null; instruction?: string | null;
}

/** NDMA SACHET feed: LIVE from SACHET, CACHED from Volentify's archive when SACHET is down, OFFLINE when neither. */
export interface BulletinFeed { source: string; mode: 'LIVE' | 'CACHED' | 'OFFLINE'; items: Bulletin[] }

export interface Health {
  status: string; system: string; version: string; database: 'ONLINE' | 'DEGRADED' | 'FALLBACK';
  ml_inference: string; inference_selftest_ms: number;
}

export interface Recommendation {
  score: number; distance_km: number | null; skill: string; skill_match: 'exact' | 'related' | 'general';
  qualified: boolean; recommended: boolean; reason: string;
}
export interface Recommendations {
  volunteer_id: string; skills: string[]; located: boolean; location_name: string | null; radius_km: number;
  tasks: (Recommendation & { task_id: string })[];
  reports: (Recommendation & { event_id: string })[];
}

export interface Review {
  id: string; rating: number; comment: string; author_name: string; author_role: Role; task_code: string | null;
  created_at: string; updated_at: string;
}

export interface MissionHistoryItem {
  id: string; code: string; title: string; urgency: Severity; status: TaskStatus; required_skill: string;
  location_name: string; disaster_id: string; disaster_title: string; created_at: string;
  accepted_at: string | null; started_at: string | null; completed_at: string | null; people_helped: number | null;
  outcome_note?: string | null;
}

export interface VolunteerProfileData {
  volunteer: Volunteer; is_self: boolean; member_since: string | null; district: string | null;
  avatar_url: string | null; badge: string;
  stats: {
    missions_completed: number; missions_active: number; hours: number; people_helped: number;
    median_minutes_to_start: number | null; average_rating: number | null; reviews: number;
    rating_counts: Record<'1' | '2' | '3' | '4' | '5', number>;
  };
  history: MissionHistoryItem[]; reviews: Review[]; can_review: boolean; viewer_review: Review | null;
  reviewable_missions: { id: string; code: string; title: string }[];
}

type Counts = Record<string, number>;
export interface TransparencyReport {
  generated_at: string; months: string[]; data_source: DataSource;
  incidents: { total: number; active: number; closed: number; by_source: Counts; by_category: Counts; by_severity: Counts; monthly: number[] };
  alerts: { broadcasts: number; last_30_days: number; by_level: Counts };
  mesh: {
    events: number; reports: number; messages: number; unreviewed: number; reviewed: number; promoted: number; rejected: number;
    by_type: Counts; by_priority: Counts; nodes: number; nodes_active: number; phones_reporting: number;
    median_relay_minutes: number | null; blocked_nodes: number; monthly: number[];
  };
  missions: {
    total: number; open: number; assigned: number; in_progress: number; completed: number; cancelled: number; dispatched: number;
    people_helped: number; volunteer_hours: number; responders_engaged: number;
    median_minutes_to_accept: number | null; median_minutes_to_start: number | null; median_minutes_to_complete: number | null;
    by_skill: Counts; by_urgency: Counts; completed_monthly: number[]; created_monthly: number[];
  };
  people: { helped_by_missions: number; rescues_reported: number; trapped_reported: number; missing_reported: number };
  volunteers: { registered: number; verified: number; available: number; busy: number; off_duty: number; skills: Counts; reviews: number; average_rating: number | null };
  accounts: { total: number; by_role: Counts; verified_elevated: number };
  governance: { audit_entries_180d: number; audit_by_action: Counts; report_retention_days: number; audit_retention_days: number; mission_start_limit_minutes: number };
}

export interface PastDisaster {
  id: string; title: string; category: string; severity: Severity; lat: number; lng: number; state: string | null;
  location: string | null; started_at: string | null; source: string | null; source_url: string | null;
  summary: string | null; status: 'CLOSED' | 'PAST' | 'ACTIVE';
}
export interface DisasterHistory {
  months: number; items: PastDisaster[]; archive_status: Record<string, string>; fetched_at: string | null; attribution: string;
}

export interface AuditEntry {
  id: number; at: string; actor_id: string | null; actor_email: string | null; actor_role: string | null; action: string;
  target_type: string | null; target_id: string | null; detail: Record<string, unknown>; ip: string | null;
  prev_hash: string | null; hash: string | null;
}
