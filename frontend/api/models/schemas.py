from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from datetime import datetime

# --- Enums ---

class Urgency(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"

class Availability(str, Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"

class SourceType(str, Enum):
    OFFICIAL = "OFFICIAL"
    NEWS = "NEWS"
    SOCIAL = "SOCIAL"
    SENSOR = "SENSOR"
    OTHER = "OTHER"

class DataMode(str, Enum):
    LIVE = "LIVE"
    DEMO = "DEMO"

# --- Feature 1: Resource Matching ---

class TaskSchema(BaseModel):
    id: str
    title: str
    urgency: Urgency
    required_skill: str
    lat: float
    lng: float
    quantity_needed: int
    status: str
    event_id: Optional[str] = None

class VolunteerSchema(BaseModel):
    id: str
    name: str
    skills: List[str]
    lat: float
    lng: float
    availability: Availability
    verified: bool

class RankedMatchSchema(BaseModel):
    volunteer_id: str
    name: str
    score: float
    reason: str
    distance_km: float

# --- Feature 4: Event Deduplication ---

class RawReportSchema(BaseModel):
    id: str
    text: str
    source: str
    timestamp: datetime

class DeduplicatedEventSchema(BaseModel):
    event_id: str
    disaster_type: str
    location: str
    lat: float
    lng: float
    report_count: int
    report_ids: List[str]
    status: str
    last_update: datetime
    severity: str

# --- Feature 7: Situation Briefing ---

class EvidenceSchema(BaseModel):
    id: str
    event_id: str
    source: str
    source_type: SourceType
    timestamp: datetime
    claim_text: str

class SituationBriefingSchema(BaseModel):
    event_id: str
    event_label: str
    severity: str
    confidence: float
    supporting_count: int
    conflicting_count: int
    duplicate_count: int
    needs: List[str]
    brief: str

# --- Feature 11: Infrastructure Proximity ---

class InfraFacilitySchema(BaseModel):
    name: str
    type: str
    lat: float
    lng: float
    distance_km: float
    status: str
    osm_id: Optional[int] = None
    data_mode: DataMode
