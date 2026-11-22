"""Pydantic request/response contracts for the Volentify REST API (PRD §10)."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MAX_PAYLOAD_BYTES = 4096
MAX_EVENTS_PER_BATCH = 100
MAX_TTL = 5


# ─── Enums (mirror prisma/schema.prisma) ────────────────────────────────────

class Role(str, Enum):
    CITIZEN = "CITIZEN"
    VOLUNTEER = "VOLUNTEER"
    NGO_MEMBER = "NGO_MEMBER"
    RESEARCHER = "RESEARCHER"
    INCIDENT_ADMIN = "INCIDENT_ADMIN"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class TaskStatus(str, Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SourceType(str, Enum):
    OFFICIAL = "OFFICIAL"
    NEWS = "NEWS"
    SOCIAL = "SOCIAL"
    SENSOR = "SENSOR"
    CITIZEN = "CITIZEN"


class Availability(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"


class MeshEventType(str, Enum):
    PERSON_RESCUED = "PERSON_RESCUED"
    PERSON_MISSING = "PERSON_MISSING"
    PERSON_TRAPPED = "PERSON_TRAPPED"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    RESOURCE_REQUEST = "RESOURCE_REQUEST"
    VOLUNTEER_STATUS = "VOLUNTEER_STATUS"
    DISASTER_STATUS = "DISASTER_STATUS"


class MeshPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ReviewStatus(str, Enum):
    UNREVIEWED = "UNREVIEWED"
    REVIEWED = "REVIEWED"
    PROMOTED = "PROMOTED"
    REJECTED = "REJECTED"


class APIModel(BaseModel):
    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)


# ─── Core entities ──────────────────────────────────────────────────────────

class Disaster(APIModel):
    id: str
    code: str
    title: str
    category: str
    severity: Severity
    lat: float
    lng: float
    location: str
    state: str
    radius_km: float = 25.0
    polygon_geojson: Optional[dict[str, Any]] = None
    status: str = "ACTIVE"
    affected_pop: Optional[str] = None
    summary: str
    wind_speed_kmh: Optional[float] = None
    rainfall_mm: Optional[float] = None
    surge_meters: Optional[float] = None
    org_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    source: Optional[str] = None
    source_url: Optional[str] = None
    external_id: Optional[str] = None


class Evidence(APIModel):
    id: str
    disaster_id: str
    author_id: Optional[str] = None
    source: str
    source_type: SourceType = SourceType.OFFICIAL
    claim_text: str
    relation: str = "SUPPORTING"
    confidence: float = 0.92
    language: str = "en"
    created_at: datetime


class Task(APIModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None
    urgency: Severity = Severity.HIGH
    required_skill: str
    lat: float
    lng: float
    location_name: str = "Incident Site"
    quantity_needed: int = 1
    status: TaskStatus = TaskStatus.OPEN
    disaster_id: str
    created_by_id: str
    assigned_to_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    accepted_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    start_lat: Optional[float] = None
    start_lng: Optional[float] = None
    people_helped: Optional[int] = None
    outcome_note: Optional[str] = None


class TaskCreate(APIModel):
    title: str = Field(min_length=4, max_length=160)
    description: Optional[str] = Field(default=None, max_length=2000)
    urgency: Severity = Severity.HIGH
    required_skill: str = Field(min_length=2, max_length=60)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    location_name: str = Field(default="Incident Site", max_length=120)
    quantity_needed: int = Field(default=1, ge=1, le=500)
    disaster_id: str


class TaskStatusUpdate(APIModel):
    status: TaskStatus
    # Starting a mission: where the responder is setting off from (typed or from the device's GPS).
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    location_name: Optional[str] = Field(default=None, max_length=120)
    # Completing a mission: the outcome, for the responder's history and the public impact figures.
    people_helped: Optional[int] = Field(default=None, ge=0, le=100000)
    outcome_note: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _coords_pair(self) -> "TaskStatusUpdate":
        if (self.lat is None) != (self.lng is None):
            raise ValueError("lat and lng must both be present or both be null")
        return self


class LocationUpdate(APIModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    location_name: Optional[str] = Field(default=None, max_length=120)


class ReviewCreate(APIModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=600)
    task_id: Optional[str] = Field(default=None, max_length=64)


class Review(APIModel):
    id: str
    rating: int
    comment: str
    author_name: str
    author_role: str
    task_code: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class Alert(APIModel):
    id: str
    code: str
    title: str
    category: str
    level: Severity = Severity.CRITICAL
    location: str
    state: str
    description: str
    advisory: str
    disaster_id: Optional[str] = None
    sender_id: Optional[str] = None
    created_at: datetime
    # BROADCAST: issued by a verified incident commander. AUTO: generated from a live-feed incident (never "official").
    kind: Literal["BROADCAST", "AUTO"] = "BROADCAST"
    source: Optional[str] = None
    source_url: Optional[str] = None


class AlertCreate(APIModel):
    title: str = Field(min_length=4, max_length=160)
    category: str = Field(min_length=3, max_length=40)
    level: Severity = Severity.HIGH
    location: str = Field(min_length=2, max_length=160)
    state: str = Field(min_length=2, max_length=60)
    description: str = Field(min_length=8, max_length=1200)
    advisory: str = Field(min_length=8, max_length=1200)
    disaster_id: Optional[str] = None


class Volunteer(APIModel):
    id: str
    user_id: Optional[str] = None
    name: str
    skills: list[str]
    lat: float
    lng: float
    location_name: str = "Field Location"
    availability: Availability = Availability.AVAILABLE
    verified: bool = False
    missions_done: int = 0
    total_hours: float = 0.0
    equipment: list[str] = []
    badge_level: str = "Tier-1 Field Responder"
    response_rate: float = 98.0
    active_missions: int = 0


class AvailabilityUpdate(APIModel):
    volunteer_id: str
    availability: Availability


class Organization(APIModel):
    id: str
    name: str
    category: str
    state: str
    district: str
    contact_email: str
    contact_phone: str
    registration_no: Optional[str] = None
    verified: bool = True


# ─── Auth & onboarding ──────────────────────────────────────────────────────

class MusterPass(APIModel):
    code: str
    title: str
    role: Role
    holder: str
    issued_at: datetime
    signature: str


class User(APIModel):
    id: str
    name: str
    email: str
    phone: str = ""
    role: Role = Role.CITIZEN
    state_district: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    provider: str = "credentials"
    avatar_url: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact: Optional[str] = None
    is_verified: bool = False
    onboarded: bool = False
    org_id: Optional[str] = None
    profile_data: dict[str, Any] = {}
    muster: Optional[MusterPass] = None
    created_at: datetime


class GoogleAuthRequest(APIModel):
    id_token: str = Field(min_length=20)
    state: Optional[str] = None


class RegisterRequest(APIModel):
    name: str = Field(min_length=2, max_length=80)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.CITIZEN
    # Honeypot: a field people never see. Bots that fill every input reveal themselves.
    website: Optional[str] = Field(default=None, max_length=200)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return v


class LoginRequest(APIModel):
    email: str
    password: str


class AuthResponse(APIModel):
    user: User
    requires_onboarding: bool = Field(serialization_alias="requiresOnboarding")


PHONE_HINT = "Enter a 10-digit Indian mobile number"


class OnboardRequest(APIModel):
    phone: str
    role: Role
    state_district: str = Field(min_length=2, max_length=120)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    blood_group: Optional[str] = Field(default=None, max_length=4)
    emergency_contact: Optional[str] = Field(default=None, max_length=120)
    skills: list[str] = Field(default_factory=list, max_length=12)
    equipment: list[str] = Field(default_factory=list, max_length=20)
    profile: dict[str, Any] = Field(default_factory=dict)

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        digits = "".join(ch for ch in v if ch.isdigit())
        if len(digits) == 12 and digits.startswith("91"):
            digits = digits[2:]
        if len(digits) != 10 or digits[0] not in "6789":
            raise ValueError(PHONE_HINT)
        return digits

    @field_validator("profile")
    @classmethod
    def _profile_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(v)) > 4096:
            raise ValueError("Profile details are too large")
        return v


class RoleUpdate(APIModel):
    role: Role
    is_verified: Optional[bool] = None


class PasswordChange(APIModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


# ─── Mesh (PRD §3, §10.2) ───────────────────────────────────────────────────

class MeshEventIn(APIModel):
    event_id: str = Field(min_length=8, max_length=64)
    origin_node_id: str = Field(min_length=8, max_length=64)
    disaster_id: Optional[str] = Field(default=None, max_length=64)
    type: MeshEventType
    priority: MeshPriority = MeshPriority.MEDIUM
    payload: dict[str, Any] = Field(default_factory=dict)
    lat: Optional[float] = None
    lng: Optional[float] = None
    observed_at: datetime
    hop_count: int = Field(default=0, ge=0, le=64)
    ttl: int = Field(default=MAX_TTL, ge=0, le=MAX_TTL)

    @field_validator("payload")
    @classmethod
    def _payload_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(v, separators=(",", ":")).encode()) > MAX_PAYLOAD_BYTES:
            raise ValueError("payload exceeds 4 KB")
        return v

    @field_validator("lat")
    @classmethod
    def _lat(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (math.isnan(v) or not -90 <= v <= 90):
            raise ValueError("lat out of range")
        return v

    @field_validator("lng")
    @classmethod
    def _lng(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and (math.isnan(v) or not -180 <= v <= 180):
            raise ValueError("lng out of range")
        return v

    @field_validator("observed_at")
    @classmethod
    def _observed(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v

    @model_validator(mode="after")
    def _coords_pair(self) -> "MeshEventIn":
        if (self.lat is None) != (self.lng is None):
            raise ValueError("lat and lng must both be present or both be null")
        return self


class MeshIngestRequest(APIModel):
    gateway_node_id: str = Field(min_length=8, max_length=64)
    gateway_battery: Optional[float] = Field(default=None, ge=0, le=100)
    gateway_lat: Optional[float] = Field(default=None, ge=-90, le=90)
    gateway_lng: Optional[float] = Field(default=None, ge=-180, le=180)
    events: list[MeshEventIn] = Field(max_length=MAX_EVENTS_PER_BATCH)


class MeshIngestResponse(APIModel):
    status: Literal["success"] = "success"
    accepted_count: int
    duplicate_count: int
    gateway_ack_id: str
    accepted_ids: list[str]
    duplicate_ids: list[str]
    persistence: Literal["durable", "volatile"]
    blocked_count: int = 0


class MeshEvent(APIModel):
    id: str
    event_id: str
    origin_node_id: str
    disaster_id: Optional[str] = None
    type: MeshEventType
    priority: MeshPriority
    payload: dict[str, Any]
    lat: Optional[float] = None
    lng: Optional[float] = None
    observed_at: datetime
    hop_count: int
    ttl: int
    received_at: datetime
    review_status: ReviewStatus = ReviewStatus.UNREVIEWED
    promoted_task_id: Optional[str] = None


class MeshNode(APIModel):
    id: str
    node_uuid: str
    volunteer_id: Optional[str] = None
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    battery_level: Optional[float] = None
    last_seen_at: datetime
    active: bool = True
    created_at: datetime


class MeshReviewRequest(APIModel):
    action: Literal["REVIEWED", "PROMOTE", "REJECT"]
    disaster_id: Optional[str] = None
    # REJECT only: also quarantine the phone that originated it (deliberate false or abusive reports).
    block_node: bool = False
    reason: Optional[str] = Field(default=None, max_length=200)


class MeshBroadcastRequest(APIModel):
    message: str = Field(min_length=2, max_length=240)
    priority: Literal["MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    disaster_id: Optional[str] = Field(default=None, max_length=64)


class MeshIncident(APIModel):
    disaster_id: str
    code: str
    title: str
    category: str
    severity: Severity
    center: tuple[float, float]
    bbox: tuple[float, float, float, float]
    radius_km: float


class MeshToken(APIModel):
    token: str
    expires_at: datetime
    token_type: Literal["Bearer"] = "Bearer"


# ─── ML (PRD §4, §10.3) ─────────────────────────────────────────────────────

class PredictionRequest(APIModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    district: str = ""
    state: str = ""
    wind_speed: float = Field(ge=0, le=400)
    rainfall_mm: float = Field(ge=0, le=2000)
    pressure_hpa: Optional[float] = Field(default=None, ge=850, le=1050)
    coast_distance_km: Optional[float] = Field(default=None, ge=0, le=2000)
    elevation_m: Optional[float] = Field(default=None, ge=-50, le=9000)
    tidal_phase: Optional[float] = Field(default=None, ge=-1, le=1)
    storm_speed_kmh: Optional[float] = Field(default=None, ge=0, le=150)
    storm_dir_deg: Optional[float] = Field(default=None, ge=0, le=360)
    wind_speed_24h_ago: Optional[float] = Field(default=None, ge=0, le=400)


class PredictionResponse(APIModel):
    hazard_probability: float
    risk_level: Literal["CRITICAL", "HIGH", "MODERATE"]
    predicted_surge_m: float
    confidence_score: float
    model: str
    latency_ms: float
    features: dict[str, float]
    wind_24h_kmh: Optional[float] = None
    severe_probability: Optional[float] = None


class TriageRequest(APIModel):
    text: str = Field(min_length=2, max_length=4000)
    location: Optional[str] = Field(default=None, max_length=120)
    language_hint: Optional[str] = Field(default=None, max_length=8)


class TriageFlags(APIModel):
    trapped_civilians: bool = False
    medical_emergency: bool = False
    food_water_needed: bool = False
    road_blocked: bool = False


class TriageResponse(APIModel):
    disaster_type: str
    severity: Severity
    urgency_score: int = Field(ge=1, le=5)
    confidence: float
    latency_ms: float
    language: str
    tier: Literal["laya-local", "impossibl-hosted", "deterministic"]
    flags: TriageFlags
    needs: list[str] = []
    trapped_count: Optional[int] = None


class RawReport(APIModel):
    id: str
    text: str = Field(max_length=4000)
    source: str
    timestamp: datetime
    lat: Optional[float] = None
    lng: Optional[float] = None


class DeduplicatedEvent(APIModel):
    event_id: str
    disaster_type: str
    location: str
    lat: float
    lng: float
    report_count: int
    report_ids: list[str]
    status: str
    last_update: datetime
    severity: str
    confidence: float
    corroborated_facts: list[str] = []
    engine: Literal["gemini", "heuristic"] = "heuristic"


class BriefingEvidence(APIModel):
    id: str
    source: str
    source_type: SourceType = SourceType.OFFICIAL
    timestamp: datetime
    claim_text: str


class BriefingRequest(APIModel):
    event_id: str
    event_label: str
    location: str = ""
    evidence: list[BriefingEvidence] = Field(min_length=1, max_length=200)


class SituationBriefing(APIModel):
    event_id: str
    event_label: str
    severity: str
    confidence: float
    supporting_count: int
    conflicting_count: int
    duplicate_count: int
    needs: list[str]
    checklist: list[str]
    brief: str
    engine: Literal["gemini", "heuristic"] = "heuristic"


# ─── Dispatch (PRD §5) ──────────────────────────────────────────────────────

class MatchRequest(APIModel):
    task: Task
    volunteers: Optional[list[Volunteer]] = None


class RankedMatch(APIModel):
    volunteer_id: str
    name: str
    score: float
    distance_km: float
    skill_match: float
    scarcity: float
    squander_penalised: bool
    reason: str


class DispatchRequest(APIModel):
    tasks: Optional[list[Task]] = None
    volunteers: Optional[list[Volunteer]] = None
    commit: bool = False


class Assignment(APIModel):
    task_id: str
    task_code: str
    task_title: str
    urgency: Severity
    slot: int
    volunteer_id: str
    volunteer_name: str
    score: float
    distance_km: float
    tier: Literal["EXACT", "ADJACENT", "GENERIC"]
    reason: str


class Bottleneck(APIModel):
    task_id: str
    task_code: str
    skill: str
    requested: int
    filled: int
    deficit: int


class DispatchResult(APIModel):
    assignments: list[Assignment]
    bottlenecks: list[Bottleneck]
    scarcity: dict[str, float]
    tiers: dict[str, int]
    completeness: float
    latency_ms: float
    tasks_evaluated: int
    volunteers_evaluated: int


# ─── Reports & infrastructure ───────────────────────────────────────────────

class CitizenReport(APIModel):
    text: str = Field(min_length=8, max_length=2000)
    location: str = Field(min_length=2, max_length=160)
    contact: Optional[str] = Field(default=None, max_length=120)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lng: Optional[float] = Field(default=None, ge=-180, le=180)
    disaster_id: Optional[str] = None
    website: Optional[str] = Field(default=None, max_length=200)  # honeypot, see RegisterRequest


class CitizenReportResponse(APIModel):
    reference: str
    triage: TriageResponse
    linked_disaster_id: Optional[str] = None
    stored: bool
    removed: list[str] = []  # kinds of identity/contact numbers removed from the text before storing


class NearbyRequest(APIModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=10.0, gt=0, le=50)
