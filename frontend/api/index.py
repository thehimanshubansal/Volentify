import sys
import os

# Inject paths for Vercel Serverless execution
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI, Body
from pydantic import BaseModel
from typing import List, Dict, Any

from api.models.schemas import (
    TaskSchema, VolunteerSchema, RankedMatchSchema,
    RawReportSchema, DeduplicatedEventSchema,
    EvidenceSchema, SituationBriefingSchema,
    InfraFacilitySchema
)
from api.data.mock_data import (
    MOCK_TASKS, MOCK_VOLUNTEERS, MOCK_REPORTS, MOCK_EVIDENCE, FALLBACK_INFRA
)
from api.engines.resource_matcher import ResourceMatcher
from api.engines.event_dedup import EventDeduplicator
from api.engines.situation_briefing import SituationBriefingEngine
from api.engines.infra_proximity import InfraProximityEngine

app = FastAPI(
    title="Volentify Disaster Intelligence API",
    version="2.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

class HazardNodeSchema(BaseModel):
    id: str
    name: str
    category: str
    subType: str
    severity: str
    lat: float
    lng: float
    details: str
    status: str
    updatedAt: str

class PredictionRequestSchema(BaseModel):
    lat: float
    lng: float
    district: str
    state: str
    wind_speed: float
    rainfall_mm: float

class PredictionResponseSchema(BaseModel):
    hazard_probability: float
    risk_level: str
    predicted_surge_m: float
    confidence_score: float

MOCK_DISASTERS = [
    {
        "id": "node-1",
        "name": "Cyclone Remal Center",
        "category": "hazard",
        "subType": "Cyclone",
        "severity": "CRITICAL",
        "lat": 19.8135,
        "lng": 85.8312,
        "details": "Category 3 Hurricane force winds (140 km/h) approaching Puri & Paradip coast.",
        "status": "Active Warning",
        "updatedAt": "10 mins ago"
    },
    {
        "id": "node-2",
        "name": "Guwahati Brahmaputra Inundation Zone",
        "category": "hazard",
        "subType": "Flood",
        "severity": "CRITICAL",
        "lat": 26.1445,
        "lng": 91.7362,
        "details": "River level 1.8m above danger mark. Evacuation order in 12 villages.",
        "status": "Evacuation in Progress",
        "updatedAt": "5 mins ago"
    }
]

@app.get("/api/health")
def read_health():
    return {
        "status": "ONLINE",
        "system": "VOLENTIFY DISASTER INTELLIGENCE PLATFORM",
        "version": "2.0.0",
        "platform": "VERCEL SERVERLESS PYTHON"
    }

@app.get("/api/disasters", response_model=list[HazardNodeSchema])
def get_disasters():
    return MOCK_DISASTERS

@app.post("/api/predict", response_model=PredictionResponseSchema)
def predict_hazard(data: PredictionRequestSchema):
    prob = min(0.98, (data.wind_speed * 0.004) + (data.rainfall_mm * 0.002))
    surge = round(prob * 3.8, 2)
    risk = "CRITICAL" if prob > 0.8 else "HIGH" if prob > 0.5 else "MODERATE"
    return {
        "hazard_probability": round(prob, 3),
        "risk_level": risk,
        "predicted_surge_m": surge,
        "confidence_score": 0.948
    }

# --- Feature 1: Resource Matching ---

@app.get("/api/match/demo", response_model=Dict[str, List[RankedMatchSchema]])
def match_demo():
    # Return batch matching for all mock tasks and volunteers
    return ResourceMatcher.batch_match(MOCK_TASKS, MOCK_VOLUNTEERS)

@app.post("/api/match", response_model=List[RankedMatchSchema])
def match_task(task: TaskSchema, volunteers: List[VolunteerSchema] = Body(default=MOCK_VOLUNTEERS)):
    return ResourceMatcher.match_task(task, volunteers)

# --- Feature 4: Event Deduplication ---

@app.get("/api/events/demo", response_model=List[DeduplicatedEventSchema])
def events_demo():
    return EventDeduplicator.deduplicate(MOCK_REPORTS)

@app.post("/api/events/ingest", response_model=List[DeduplicatedEventSchema])
def events_ingest(reports: List[RawReportSchema]):
    return EventDeduplicator.deduplicate(reports)

# --- Feature 7: Situation Briefing ---

@app.get("/api/briefing/demo", response_model=SituationBriefingSchema)
def briefing_demo():
    event_label = "Assam Flood"
    location = "Guwahati"
    return SituationBriefingEngine.generate_briefing("EVT-001", event_label, location, MOCK_EVIDENCE)

@app.post("/api/briefing/generate", response_model=SituationBriefingSchema)
def briefing_generate(event_id: str = Body(...), event_label: str = Body(...), location: str = Body(...), evidence: List[EvidenceSchema] = Body(...)):
    return SituationBriefingEngine.generate_briefing(event_id, event_label, location, evidence)

# --- Feature 11: Infrastructure Proximity ---

@app.get("/api/infrastructure/demo")
async def infrastructure_demo():
    # Demo for Delhi coordinates
    return await InfraProximityEngine.get_nearby_infrastructure(28.6139, 77.2090, 10.0)

@app.post("/api/infrastructure/nearby")
async def infrastructure_nearby(lat: float = Body(...), lng: float = Body(...), radius_km: float = Body(10.0)):
    return await InfraProximityEngine.get_nearby_infrastructure(lat, lng, radius_km)
