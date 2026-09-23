import sys
import os
import json

# Inject paths for Vercel Serverless execution
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from fastapi import FastAPI, Body, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

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
from api.engines.laya_engine import LayaDecisionEngine
from api.engines.bhuvan_service import BhuvanGeospatialService

app = FastAPI(
    title="Volentify 2.0 Disaster Intelligence API",
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
    location: Optional[str] = None
    state: Optional[str] = None
    radius_km: Optional[float] = 25.0
    affected_pop: Optional[str] = None
    wind_speed: Optional[float] = None
    rainfall_mm: Optional[float] = None
    surge_m: Optional[float] = None

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

class LayaTriageRequest(BaseModel):
    text: str
    location: Optional[str] = "India"
    language_hint: Optional[str] = "auto"

class InfraRequestSchema(BaseModel):
    lat: float
    lng: float
    radius_km: Optional[float] = 10.0

@app.get("/api/health")
def read_health():
    db_status = "ONLINE" if supabase else "OFFLINE"
    return {
        "status": "ONLINE",
        "system": "VOLENTIFY 2.0 DISASTER INTELLIGENCE PLATFORM",
        "version": "2.0.0",
        "engine": "LAYA MULTILINGUAL SYSTEM 1 DECISION ENGINE",
        "database": db_status
    }

# --- Laya Multilingual System 1 Triage Endpoint ---
@app.post("/api/triage/laya")
async def laya_triage(req: LayaTriageRequest):
    """
    Sub-35ms Non-Autoregressive System 1 Crisis Triage in 100+ languages
    """
    return await LayaDecisionEngine.evaluate_crisis_report(req.text, req.location or "India", req.language_hint or "auto")

# --- ISRO Bhuvan Satellite & Disaster Geospatial Feeds ---
@app.get("/api/bhuvan/layers")
def get_bhuvan_layers():
    """
    Returns ISRO Bhuvan OGC WMS disaster layers (Floods, Fire Hotspots, CartoDEM)
    """
    return BhuvanGeospatialService.get_disaster_layers()

@app.get("/api/bhuvan/bulletins")
def get_bhuvan_bulletins():
    """
    Returns NRSC DMSP & ISRO satellite disaster intelligence bulletins
    """
    return BhuvanGeospatialService.get_bhuvan_bulletins()


# --- Disasters Endpoint (Live Supabase DB) ---
@app.get("/api/disasters", response_model=List[HazardNodeSchema])
def get_disasters():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected. Check environment variables.")
    try:
        response = supabase.table("disasters").select("*").execute()
        return response.data or []
    except Exception as e:
        print(f"Supabase disasters query error: {e}")
        return []

# --- Tasks Endpoint (Live Supabase DB) ---
@app.get("/api/tasks")
def get_tasks():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected. Check environment variables.")
    try:
        res = supabase.table("tasks").select("*").execute()
        return res.data or []
    except Exception as e:
        print(f"Supabase tasks query error: {e}")
        return []

# --- Volunteers Endpoint (Live Supabase DB) ---
@app.get("/api/volunteers")
def get_volunteers(availability: Optional[str] = None):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected. Check environment variables.")
    try:
        query = supabase.table("volunteers").select("*")
        if availability and availability != "ALL":
            query = query.eq("availability", availability)
        res = query.execute()
        return res.data or []
    except Exception as e:
        print(f"Supabase volunteers query error: {e}")
        return []

class VolunteerStatusUpdate(BaseModel):
    volunteer_id: str
    availability: str # "AVAILABLE", "BUSY", "OFFLINE"

@app.post("/api/volunteer/availability")
def update_volunteer_status(req: VolunteerStatusUpdate):
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected.")
    try:
        res = supabase.table("volunteers").update({"availability": req.availability}).eq("id", req.volunteer_id).execute()
        return {"status": "success", "volunteer": res.data[0] if res.data else {"id": req.volunteer_id, "availability": req.availability}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Alerts Endpoint (Live Supabase DB) ---
@app.get("/api/alerts")
def get_alerts():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected.")
    try:
        res = supabase.table("alerts").select("*").execute()
        return res.data or []
    except Exception as e:
        print(f"Supabase alerts query error: {e}")
        return []

# --- Organizations Endpoint (Live Supabase DB) ---
@app.get("/api/organizations")
def get_organizations():
    if not supabase:
        raise HTTPException(status_code=503, detail="Supabase database not connected.")
    try:
        res = supabase.table("organizations").select("*").execute()
        return res.data or []
    except Exception as e:
        print(f"Supabase organizations query error: {e}")
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
        # Mock registration for offline/local testing
        mock_user = {
            "id": "USR-DEV-001",
            "name": req.name,
            "email": req.email,
            "role": req.role,
            "state_district": req.state_district
        }
        return {"status": "success", "user": mock_user}
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
        return {"status": "success", "user": res.data[0] if res.data else new_user}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login")
def auth_login(req: LoginRequest):
    if not supabase:
        # Mock login for development
        return {
            "status": "success",
            "user": {
                "id": "USR-DEV-001",
                "name": "Rahul Sharma",
                "email": req.email,
                "role": "VOLUNTEER",
                "state_district": "Puri, Odisha"
            }
        }
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

@app.post("/api/volunteer/profile")
def create_volunteer_profile(profile: dict = Body(...)):
    if not supabase:
        return {"status": "success", "profile": profile}
    try:
        res = supabase.table("volunteers").insert(profile).execute()
        return {"status": "success", "profile": res.data[0] if res.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Feature 1: Resource Matching ---
@app.post("/api/match", response_model=List[RankedMatchSchema])
def match_task(task: TaskSchema, volunteers: Optional[List[VolunteerSchema]] = Body(None)):
    if not volunteers and supabase:
        try:
            res = supabase.table("volunteers").select("*").eq("availability", "AVAILABLE").execute()
            if res.data:
                volunteers = [
                    VolunteerSchema(
                        id=v["id"],
                        name=v["name"],
                        skills=v.get("skills", []),
                        lat=float(v.get("currentLat") or v.get("lat") or 0.0),
                        lng=float(v.get("currentLng") or v.get("lng") or 0.0),
                        availability=v.get("availability", "AVAILABLE"),
                        verified=v.get("verified", True)
                    )
                    for v in res.data
                ]
        except Exception as e:
            print(f"Supabase volunteer fetch in match_task error: {e}")
    return ResourceMatcher.match_task(task, volunteers or [])


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
async def infrastructure_nearby(req: InfraRequestSchema):
    return await InfraProximityEngine.get_nearby_infrastructure(req.lat, req.lng, req.radius_km or 10.0)
