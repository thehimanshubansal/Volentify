import sys
import os

# Inject paths for Vercel Serverless execution
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from api.models.schemas import (
    TaskSchema, VolunteerSchema, RankedMatchSchema,
    RawReportSchema, DeduplicatedEventSchema,
    EvidenceSchema, SituationBriefingSchema,
    InfraFacilitySchema, RegisterRequest, LoginRequest
)
from api.db.database import supabase
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

@app.get("/api/health")
def read_health():
    db_status = "ONLINE" if supabase else "OFFLINE"
    return {
        "status": "ONLINE",
        "system": "VOLENTIFY DISASTER INTELLIGENCE PLATFORM",
        "version": "2.0.0",
        "platform": "VERCEL SERVERLESS PYTHON",
        "database": db_status
    }

@app.get("/api/disasters", response_model=list[HazardNodeSchema])
def get_disasters():
    if not supabase:
        return []
    try:
        response = supabase.table("disasters").select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching from Supabase: {e}")
        return []

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

# --- Authentication & Volunteer Routes ---
@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        existing = supabase.table("users").select("*").eq("email", req.email).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        new_user = {
            "name": req.name,
            "email": req.email,
            "phone": req.phone,
            "state_district": req.state_district,
            "role": req.role,
            "password": req.password
        }
        res = supabase.table("users").insert(new_user).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Registration failed")
        return {"status": "success", "user": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        res = supabase.table("users").select("*").eq("email", req.email).execute()
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = res.data[0]
        if user["password"] != req.password:
            raise HTTPException(status_code=401, detail="Invalid password")
            
        return {"status": "success", "user": user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tasks")
def get_tasks():
    if not supabase:
        return []
    try:
        res = supabase.table("tasks").select("*").execute()
        return res.data
    except Exception as e:
        print(f"Error fetching tasks: {e}")
        return []

@app.post("/api/volunteer/profile")
def create_volunteer_profile(profile: dict = Body(...)):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
    try:
        res = supabase.table("volunteers").insert(profile).execute()
        return {"status": "success", "profile": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Feature 1: Resource Matching ---

@app.post("/api/match", response_model=List[RankedMatchSchema])
def match_task(task: TaskSchema, volunteers: List[VolunteerSchema] = Body(...)):
    return ResourceMatcher.match_task(task, volunteers)

# --- Feature 4: Event Deduplication ---

@app.post("/api/events/ingest", response_model=List[DeduplicatedEventSchema])
def events_ingest(reports: List[RawReportSchema]):
    return EventDeduplicator.deduplicate(reports)

# --- Feature 7: Situation Briefing ---

@app.post("/api/briefing/generate", response_model=SituationBriefingSchema)
def briefing_generate(event_id: str = Body(...), event_label: str = Body(...), location: str = Body(...), evidence: List[EvidenceSchema] = Body(...)):
    return SituationBriefingEngine.generate_briefing(event_id, event_label, location, evidence)

# --- Feature 11: Infrastructure Proximity ---

@app.post("/api/infrastructure/nearby")
async def infrastructure_nearby(lat: float = Body(...), lng: float = Body(...), radius_km: float = Body(10.0)):
    return await InfraProximityEngine.get_nearby_infrastructure(lat, lng, radius_km)
