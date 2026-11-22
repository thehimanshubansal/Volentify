"""Test fixtures: a small, clearly fictional operational dataset for the API acceptance tests.

This used to be the app's built-in demo dataset. The live app no longer ships any sample data — incidents come
from public hazard feeds and everything else from real users — so it now lives only here, loaded into the
in-memory store by tests/test_api.py.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

NOW = datetime.now(timezone.utc)


def ago(**kw: float) -> datetime:
    return NOW - timedelta(**kw)


SYSTEM_USER_ID = "usr_system_command"

SKILLS = [
    "Rescue & Search",
    "Boat Rescue",
    "Paramedic",
    "Medical & First Aid",
    "Drone Operation",
    "Chainsaw & Debris",
    "Food & Shelter Logistics",
    "Transport & Driving",
    "Blood Donor",
    "Communications",
    "Manual Packing",
]

MOCK_ORGANIZATIONS = [
    {"id": "org_ndrf", "name": "National Disaster Response Force", "category": "NDRF", "state": "Delhi",
     "district": "New Delhi", "contact_email": "control@ndrf.gov.in", "contact_phone": "011-24363260",
     "registration_no": "GOI-MHA-NDRF", "verified": True},
    {"id": "org_osdma", "name": "Odisha State Disaster Management Authority", "category": "SDRF", "state": "Odisha",
     "district": "Bhubaneswar", "contact_email": "osdma@odisha.gov.in", "contact_phone": "0674-2395398",
     "registration_no": "OD-SDMA-01", "verified": True},
    {"id": "org_asdma", "name": "Assam State Disaster Management Authority", "category": "SDRF", "state": "Assam",
     "district": "Guwahati", "contact_email": "asdma@assam.gov.in", "contact_phone": "1079",
     "registration_no": "AS-SDMA-01", "verified": True},
    {"id": "org_ircs", "name": "Indian Red Cross Society", "category": "RED_CROSS", "state": "Delhi",
     "district": "New Delhi", "contact_email": "info@indianredcross.org", "contact_phone": "011-23716441",
     "registration_no": "DL/2017/0163525", "verified": True},
    {"id": "org_goonj", "name": "Goonj", "category": "LOCAL_NGO", "state": "Delhi", "district": "South Delhi",
     "contact_email": "mail@goonj.org", "contact_phone": "011-26972351", "registration_no": "DL/2017/0115372",
     "verified": True},
]

_REMAL_CONE = {
    "type": "Polygon",
    "coordinates": [[[85.2, 18.6], [86.6, 18.9], [87.6, 20.6], [87.9, 22.0], [86.4, 22.1], [85.6, 20.9], [85.2, 18.6]]],
}
_BRAHMAPUTRA_EXTENT = {
    "type": "Polygon",
    "coordinates": [[[91.30, 26.05], [91.62, 26.02], [91.95, 26.10], [92.20, 26.22], [92.05, 26.34],
                     [91.70, 26.30], [91.40, 26.24], [91.30, 26.05]]],
}

MOCK_HAZARDS = [
    {"id": "dis_remal_puri", "code": "CYC-2026-REMAL", "title": "Cyclone Remal", "category": "Cyclone",
     "severity": "CRITICAL", "lat": 19.8135, "lng": 85.8312, "location": "Puri & Paradip coast", "state": "Odisha",
     "radius_km": 120.0, "polygon_geojson": _REMAL_CONE, "status": "ACTIVE", "affected_pop": "1.2 million",
     "summary": "Severe cyclonic storm over the north-west Bay of Bengal moving north-north-west at 16 km/h. "
                "Extremely heavy rainfall forecast for Puri, Jagatsinghpur, Kendrapara and Bhadrak. Tidal waves "
                "3–4 m above astronomical tide likely to inundate low-lying coastal areas.",
     "wind_speed_kmh": 145.0, "rainfall_mm": 285.0, "surge_meters": 3.6, "org_id": "org_osdma",
     "created_at": ago(hours=30), "updated_at": ago(minutes=10)},
    {"id": "dis_brahmaputra_ghy", "code": "FLD-2026-BRAH", "title": "Brahmaputra Inundation", "category": "Flood",
     "severity": "CRITICAL", "lat": 26.1445, "lng": 91.7362, "location": "Guwahati, Kamrup & Barpeta",
     "state": "Assam", "radius_km": 45.0, "polygon_geojson": _BRAHMAPUTRA_EXTENT, "status": "ACTIVE",
     "affected_pop": "450,000",
     "summary": "Brahmaputra at Guwahati is flowing 1.8 m above the danger mark after sustained catchment rainfall. "
                "Twelve villages in Kamrup and Barpeta are submerged and evacuation to higher ground is underway.",
     "wind_speed_kmh": 22.0, "rainfall_mm": 190.0, "surge_meters": None, "org_id": "org_asdma",
     "created_at": ago(hours=52), "updated_at": ago(minutes=5)},
    {"id": "dis_wayanad_slide", "code": "LND-2026-WYD", "title": "Wayanad Slope Failure Risk", "category": "Landslide",
     "severity": "CRITICAL", "lat": 11.6854, "lng": 76.1320, "location": "Meppadi & Chooralmala", "state": "Kerala",
     "radius_km": 15.0, "polygon_geojson": None, "status": "ACTIVE", "affected_pop": "38,000",
     "summary": "280 mm of rain in 24 hours has saturated tea-estate slopes around Meppadi and Chooralmala. "
                "Pore-water pressure sensors indicate imminent slope failure; ghat-road traffic is suspended.",
     "wind_speed_kmh": 30.0, "rainfall_mm": 280.0, "surge_meters": None, "org_id": None,
     "created_at": ago(hours=20), "updated_at": ago(hours=2)},
    {"id": "dis_chamoli_fire", "code": "WLF-2026-CHM", "title": "Garhwal Forest Fires", "category": "Wildfire",
     "severity": "HIGH", "lat": 30.0668, "lng": 79.0193, "location": "Chamoli & Almora forest divisions",
     "state": "Uttarakhand", "radius_km": 20.0, "polygon_geojson": None, "status": "ACTIVE", "affected_pop": "12,500",
     "summary": "Dry westerlies and humidity below 20% are driving a 5 km fire line through pine forest near "
                "Chamoli. IAF helicopters are flying Bambi-bucket water drops to protect settlements.",
     "wind_speed_kmh": 38.0, "rainfall_mm": 0.0, "surge_meters": None, "org_id": "org_ndrf",
     "created_at": ago(hours=14), "updated_at": ago(hours=1)},
    {"id": "dis_delhi_heat", "code": "HTW-2026-DEL", "title": "Severe Heatwave", "category": "Heatwave",
     "severity": "HIGH", "lat": 28.6139, "lng": 77.2090, "location": "Delhi NCR & Haryana", "state": "Delhi",
     "radius_km": 60.0, "polygon_geojson": None, "status": "ACTIVE", "affected_pop": "21 million",
     "summary": "Safdarjung recorded 47.2 °C with dry westerly winds. IMD red alert for five consecutive days; "
                "cooling centres and water booths are active across 11 revenue districts.",
     "wind_speed_kmh": 18.0, "rainfall_mm": 0.0, "surge_meters": None, "org_id": None,
     "created_at": ago(hours=70), "updated_at": ago(hours=3)},
]

MOCK_EVIDENCE = [
    # Remal
    {"id": "ev_remal_1", "disaster_id": "dis_remal_puri", "source": "IMD Bhubaneswar", "source_type": "OFFICIAL",
     "claim_text": "Deep depression upgraded to Severe Cyclonic Storm Remal; landfall expected near Dhamra with 140 km/h gusts.",
     "relation": "SUPPORTING", "confidence": 0.97, "language": "en", "created_at": ago(hours=26)},
    {"id": "ev_remal_2", "disaster_id": "dis_remal_puri", "source": "OSDMA", "source_type": "OFFICIAL",
     "claim_text": "Evacuation order issued for 45 coastal villages in Puri and Jagatsinghpur; shelters opened.",
     "relation": "SUPPORTING", "confidence": 0.95, "language": "en", "created_at": ago(hours=12)},
    {"id": "ev_remal_3", "disaster_id": "dis_remal_puri", "source": "NDRF Control Room", "source_type": "OFFICIAL",
     "claim_text": "14 rescue teams deployed with inflatable boats and satellite communications across Balasore and Puri.",
     "relation": "SUPPORTING", "confidence": 0.94, "language": "en", "created_at": ago(hours=6)},
    {"id": "ev_remal_4", "disaster_id": "dis_remal_puri", "source": "Mesh field report", "source_type": "CITIZEN",
     "claim_text": "Tidal waves over 3.5 m breached the embankment in two villages near Paradip; families stranded.",
     "relation": "SUPPORTING", "confidence": 0.71, "language": "or", "created_at": ago(hours=2)},
    {"id": "ev_remal_5", "disaster_id": "dis_remal_puri", "source": "Local news", "source_type": "NEWS",
     "claim_text": "No casualties reported in Paradip sector; relief shelters fully stocked.",
     "relation": "CONFLICTING", "confidence": 0.58, "language": "en", "created_at": ago(hours=1)},
    # Brahmaputra
    {"id": "ev_brah_1", "disaster_id": "dis_brahmaputra_ghy", "source": "CWC Pandu gauge", "source_type": "SENSOR",
     "claim_text": "Brahmaputra at Guwahati flowing 1.82 m above highest danger mark and rising.",
     "relation": "SUPPORTING", "confidence": 0.99, "language": "en", "created_at": ago(minutes=40)},
    {"id": "ev_brah_2", "disaster_id": "dis_brahmaputra_ghy", "source": "ASDMA", "source_type": "OFFICIAL",
     "claim_text": "Red alert for 12 districts; 45,000 residents moved to elevated relief shelters.",
     "relation": "SUPPORTING", "confidence": 0.96, "language": "en", "created_at": ago(hours=3)},
    {"id": "ev_brah_3", "disaster_id": "dis_brahmaputra_ghy", "source": "SDRF Assam", "source_type": "OFFICIAL",
     "claim_text": "Motorboat rescue units active in submerged lowlands of Barpeta; boats requested for 3 villages.",
     "relation": "SUPPORTING", "confidence": 0.93, "language": "en", "created_at": ago(hours=1, minutes=30)},
    {"id": "ev_brah_4", "disaster_id": "dis_brahmaputra_ghy", "source": "Local report", "source_type": "SOCIAL",
     "claim_text": "Water levels receding in parts of Kamrup according to residents.",
     "relation": "CONFLICTING", "confidence": 0.42, "language": "as", "created_at": ago(hours=4)},
    # Wayanad
    {"id": "ev_wyd_1", "disaster_id": "dis_wayanad_slide", "source": "KSDMA sensor array", "source_type": "SENSOR",
     "claim_text": "Pore-water pressure on the Chooralmala slope exceeded the 45 kPa critical threshold.",
     "relation": "SUPPORTING", "confidence": 0.95, "language": "en", "created_at": ago(hours=3)},
    {"id": "ev_wyd_2", "disaster_id": "dis_wayanad_slide", "source": "District Collector Wayanad",
     "source_type": "OFFICIAL", "claim_text": "Mandatory evacuation of estate worker lines; heavy machinery staged at Kalpetta.",
     "relation": "SUPPORTING", "confidence": 0.94, "language": "en", "created_at": ago(hours=2)},
    # Chamoli
    {"id": "ev_chm_1", "disaster_id": "dis_chamoli_fire", "source": "Sentinel-2 thermal", "source_type": "SENSOR",
     "claim_text": "Thermal infrared detects 14 active fire spots in Chamoli division.",
     "relation": "SUPPORTING", "confidence": 0.92, "language": "en", "created_at": ago(hours=9)},
    {"id": "ev_chm_2", "disaster_id": "dis_chamoli_fire", "source": "Uttarakhand Forest Dept", "source_type": "OFFICIAL",
     "claim_text": "Fire-break trenches dug around Gopeshwar; NH-58 traffic rerouted due to smoke.",
     "relation": "SUPPORTING", "confidence": 0.9, "language": "en", "created_at": ago(hours=4)},
    # Delhi
    {"id": "ev_del_1", "disaster_id": "dis_delhi_heat", "source": "IMD Regional Centre", "source_type": "OFFICIAL",
     "claim_text": "Safdarjung observatory records 47.2 °C; red alert extended for five days.",
     "relation": "SUPPORTING", "confidence": 0.98, "language": "en", "created_at": ago(hours=5)},
    {"id": "ev_del_2", "disaster_id": "dis_delhi_heat", "source": "DDMA", "source_type": "OFFICIAL",
     "claim_text": "Cooling centres and drinking-water booths activated across 11 revenue districts.",
     "relation": "SUPPORTING", "confidence": 0.95, "language": "en", "created_at": ago(hours=3)},
]

MOCK_TASKS = [
    {"id": "tsk_puri_evac", "code": "TSK-001", "title": "Coastal evacuation by inflatable boat",
     "description": "Move stranded families from breached embankment villages near Paradip to Shelter #4.",
     "urgency": "CRITICAL", "required_skill": "Boat Rescue", "lat": 20.2644, "lng": 86.6705,
     "location_name": "Paradip, Jagatsinghpur", "quantity_needed": 3, "status": "OPEN",
     "disaster_id": "dis_remal_puri", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=2), "updated_at": ago(hours=2)},
    {"id": "tsk_aiims_triage", "code": "TSK-002", "title": "Trauma triage support at AIIMS Bhubaneswar",
     "description": "Emergency department surge staffing for cyclone casualties.",
     "urgency": "CRITICAL", "required_skill": "Paramedic", "lat": 20.2285, "lng": 85.8189,
     "location_name": "AIIMS Bhubaneswar", "quantity_needed": 2, "status": "OPEN",
     "disaster_id": "dis_remal_puri", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=3), "updated_at": ago(hours=3)},
    {"id": "tsk_paradip_food", "code": "TSK-003", "title": "Relief kit packing at Paradip Shelter #4",
     "description": "Pack and distribute dry rations and water purification kits.",
     "urgency": "HIGH", "required_skill": "Manual Packing", "lat": 20.2600, "lng": 86.6600,
     "location_name": "Paradip Port Shelter #4", "quantity_needed": 4, "status": "OPEN",
     "disaster_id": "dis_remal_puri", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=4), "updated_at": ago(hours=4)},
    {"id": "tsk_barpeta_boats", "code": "TSK-004", "title": "Motorboat rescue in Barpeta lowlands",
     "description": "Three villages cut off; elderly and infants awaiting evacuation.",
     "urgency": "CRITICAL", "required_skill": "Boat Rescue", "lat": 26.3220, "lng": 91.0060,
     "location_name": "Barpeta, Assam", "quantity_needed": 2, "status": "OPEN",
     "disaster_id": "dis_brahmaputra_ghy", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=1), "updated_at": ago(hours=1)},
    {"id": "tsk_ghy_drone", "code": "TSK-005", "title": "Drone survey of embankment breach",
     "description": "Map breach extent at Majuli for SDRF boat routing.",
     "urgency": "HIGH", "required_skill": "Drone Operation", "lat": 26.9500, "lng": 94.1670,
     "location_name": "Majuli, Assam", "quantity_needed": 1, "status": "OPEN",
     "disaster_id": "dis_brahmaputra_ghy", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=5), "updated_at": ago(hours=5)},
    {"id": "tsk_wyd_debris", "code": "TSK-006", "title": "Clear debris on Meppadi ghat road",
     "description": "Chainsaw crews to reopen evacuation corridor.",
     "urgency": "MODERATE", "required_skill": "Chainsaw & Debris", "lat": 11.5560, "lng": 76.1350,
     "location_name": "Meppadi, Wayanad", "quantity_needed": 2, "status": "OPEN",
     "disaster_id": "dis_wayanad_slide", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=6), "updated_at": ago(hours=6)},
    {"id": "tsk_del_water", "code": "TSK-007", "title": "Staff drinking-water booths",
     "description": "Distribute ORS and water at DDMA cooling centres.",
     "urgency": "LOW", "required_skill": "Food & Shelter Logistics", "lat": 28.6280, "lng": 77.2195,
     "location_name": "Central Delhi", "quantity_needed": 3, "status": "OPEN",
     "disaster_id": "dis_delhi_heat", "created_by_id": SYSTEM_USER_ID, "assigned_to_id": None,
     "created_at": ago(hours=8), "updated_at": ago(hours=8)},
]

MOCK_VOLUNTEERS = [
    {"id": "vol_001", "user_id": None, "name": "Rahul Sharma", "skills": ["Paramedic", "Medical & First Aid"],
     "lat": 20.2961, "lng": 85.8245, "location_name": "Bhubaneswar", "availability": "AVAILABLE",
     "verified": True, "missions_done": 14, "total_hours": 128, "equipment": ["Trauma kit"],
     "badge_level": "Tier-2 Field Medic", "response_rate": 98.4, "active_missions": 0},
    {"id": "vol_002", "user_id": None, "name": "Anita Patel", "skills": ["Food & Shelter Logistics", "Manual Packing"],
     "lat": 20.2500, "lng": 86.6200, "location_name": "Paradip", "availability": "AVAILABLE",
     "verified": True, "missions_done": 22, "total_hours": 210, "equipment": [],
     "badge_level": "Tier-2 Logistics Lead", "response_rate": 99.1, "active_missions": 0},
    {"id": "vol_003", "user_id": None, "name": "Subrat Behera", "skills": ["Boat Rescue", "Rescue & Search"],
     "lat": 19.8135, "lng": 85.8312, "location_name": "Puri", "availability": "AVAILABLE",
     "verified": True, "missions_done": 31, "total_hours": 340, "equipment": ["Inflatable boat", "Life jackets"],
     "badge_level": "Tier-3 Water Rescue", "response_rate": 97.2, "active_missions": 1},
    {"id": "vol_004", "user_id": None, "name": "Priya Das", "skills": ["Rescue & Search", "Paramedic"],
     "lat": 20.4625, "lng": 85.8830, "location_name": "Cuttack", "availability": "AVAILABLE",
     "verified": True, "missions_done": 9, "total_hours": 76, "equipment": ["First-aid kit"],
     "badge_level": "Tier-1 Field Responder", "response_rate": 95.0, "active_missions": 0},
    {"id": "vol_005", "user_id": None, "name": "Manoj Nayak", "skills": ["Manual Packing", "Transport & Driving"],
     "lat": 20.2700, "lng": 86.6500, "location_name": "Paradip", "availability": "AVAILABLE",
     "verified": False, "missions_done": 3, "total_hours": 20, "equipment": ["4x4 pickup"],
     "badge_level": "Tier-1 Field Responder", "response_rate": 92.0, "active_missions": 0},
    {"id": "vol_006", "user_id": None, "name": "Bikash Kalita", "skills": ["Boat Rescue", "Communications"],
     "lat": 26.1800, "lng": 91.7500, "location_name": "Guwahati", "availability": "AVAILABLE",
     "verified": True, "missions_done": 18, "total_hours": 190, "equipment": ["Motorboat", "VHF radio"],
     "badge_level": "Tier-3 Water Rescue", "response_rate": 98.0, "active_missions": 0},
    {"id": "vol_007", "user_id": None, "name": "Ritu Baruah", "skills": ["Drone Operation", "Communications"],
     "lat": 26.7509, "lng": 94.2037, "location_name": "Jorhat", "availability": "AVAILABLE",
     "verified": True, "missions_done": 7, "total_hours": 64, "equipment": ["DJI Mavic 3 Thermal"],
     "badge_level": "Tier-2 Aerial Recon", "response_rate": 96.5, "active_missions": 0},
    {"id": "vol_008", "user_id": None, "name": "Arjun Menon", "skills": ["Chainsaw & Debris", "Rescue & Search"],
     "lat": 11.6100, "lng": 76.0830, "location_name": "Kalpetta", "availability": "BUSY",
     "verified": True, "missions_done": 12, "total_hours": 110, "equipment": ["Chainsaw", "Helmet"],
     "badge_level": "Tier-2 Heavy Rescue", "response_rate": 94.0, "active_missions": 2},
    {"id": "vol_009", "user_id": None, "name": "Neha Gupta", "skills": ["Food & Shelter Logistics", "Blood Donor"],
     "lat": 28.6500, "lng": 77.2300, "location_name": "Delhi", "availability": "AVAILABLE",
     "verified": True, "missions_done": 5, "total_hours": 40, "equipment": [],
     "badge_level": "Tier-1 Field Responder", "response_rate": 97.0, "active_missions": 0},
]

MOCK_ALERTS = [
    {"id": "alt_remal", "code": "ALT-101", "title": "Cyclone Remal landfall watch", "category": "Cyclone",
     "level": "CRITICAL", "location": "Puri, Paradip & coastal districts", "state": "Odisha",
     "description": "Severe cyclonic storm approaching at 145 km/h with a high tidal storm surge expected.",
     "advisory": "Move to designated concrete shelters now. Carry 72 hours of dry food, water and medicines.",
     "disaster_id": "dis_remal_puri", "sender_id": SYSTEM_USER_ID, "created_at": ago(minutes=10)},
    {"id": "alt_brah", "code": "ALT-102", "title": "Brahmaputra inundation alert", "category": "Flood",
     "level": "CRITICAL", "location": "Guwahati, Kamrup & Barpeta", "state": "Assam",
     "description": "Water level 1.8 m above danger mark. Twelve villages submerged.",
     "advisory": "Move to elevated ground. SDRF motorboat teams are evacuating low-lying areas.",
     "disaster_id": "dis_brahmaputra_ghy", "sender_id": SYSTEM_USER_ID, "created_at": ago(minutes=25)},
    {"id": "alt_wyd", "code": "ALT-103", "title": "Wayanad slope instability warning", "category": "Landslide",
     "level": "CRITICAL", "location": "Meppadi & Chooralmala", "state": "Kerala",
     "description": "280 mm of rainfall in 24 hours has triggered high landslide risk on tea-estate slopes.",
     "advisory": "Ghat-road traffic suspended. Follow evacuation corridors marked by district officials.",
     "disaster_id": "dis_wayanad_slide", "sender_id": SYSTEM_USER_ID, "created_at": ago(hours=2)},
    {"id": "alt_chm", "code": "ALT-104", "title": "High-altitude forest fires", "category": "Wildfire",
     "level": "HIGH", "location": "Chamoli & Almora forest divisions", "state": "Uttarakhand",
     "description": "Dry winds accelerating fire spread across 45 hectares of pine forest.",
     "advisory": "Avoid mountain passes. Helicopter water-drop operations in progress.",
     "disaster_id": "dis_chamoli_fire", "sender_id": SYSTEM_USER_ID, "created_at": ago(hours=1)},
    {"id": "alt_del", "code": "ALT-105", "title": "Extreme heatwave advisory", "category": "Heatwave",
     "level": "HIGH", "location": "Delhi NCR & Haryana", "state": "Delhi",
     "description": "Temperatures peaking at 47 °C. IMD red alert in force.",
     "advisory": "Avoid outdoor activity between 11:00 and 16:00. Drink water frequently; check on elderly neighbours.",
     "disaster_id": "dis_delhi_heat", "sender_id": SYSTEM_USER_ID, "created_at": ago(hours=3)},
]

MOCK_MESH_NODES = [
    {"id": "mn_1", "node_uuid": "7a2c4e6b-8d0f-4a2c-b4e6-8d0f2a4c6e8b", "volunteer_id": "vol_003",
     "last_lat": 20.2600, "last_lng": 86.6650, "battery_level": 64.0, "last_seen_at": ago(minutes=6),
     "created_at": ago(days=3)},
    {"id": "mn_2", "node_uuid": "8f3b6c20-a19e-4c7b-b8f2-5d9c2e0a4f11", "volunteer_id": "vol_002",
     "last_lat": 20.2500, "last_lng": 86.6200, "battery_level": 88.0, "last_seen_at": ago(minutes=2),
     "created_at": ago(days=3)},
    {"id": "mn_3", "node_uuid": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", "volunteer_id": "vol_006",
     "last_lat": 26.3100, "last_lng": 91.0200, "battery_level": 23.0, "last_seen_at": ago(minutes=48),
     "created_at": ago(days=1)},
]

MOCK_MESH_EVENTS = [
    {"id": "me_1", "event_id": "d4a1b8c2-3e5f-4a7b-9c1d-2e4f6a8b0c2e",
     "origin_node_id": "7a2c4e6b-8d0f-4a2c-b4e6-8d0f2a4c6e8b", "disaster_id": "dis_remal_puri",
     "type": "PERSON_TRAPPED", "priority": "CRITICAL", "payload": {"count": 4, "condition": "rising_flood"},
     "lat": 20.2710, "lng": 86.6790, "observed_at": ago(minutes=42), "hop_count": 2, "ttl": 3,
     "received_at": ago(minutes=31), "review_status": "UNREVIEWED", "promoted_task_id": None},
    {"id": "me_2", "event_id": "0b6e2f1a-77c4-4d1e-9a52-31c0de9b7a11",
     "origin_node_id": "8f3b6c20-a19e-4c7b-b8f2-5d9c2e0a4f11", "disaster_id": "dis_remal_puri",
     "type": "MEDICAL_EMERGENCY", "priority": "HIGH", "payload": {"injured": 2, "needs": ["insulin"]},
     "lat": 20.2490, "lng": 86.6150, "observed_at": ago(hours=1, minutes=20), "hop_count": 1, "ttl": 4,
     "received_at": ago(hours=1), "review_status": "REVIEWED", "promoted_task_id": None},
    {"id": "me_3", "event_id": "5c9d3a7e-1f2b-4e8a-b6c4-9d0e1f2a3b4c",
     "origin_node_id": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", "disaster_id": "dis_brahmaputra_ghy",
     "type": "RESOURCE_REQUEST", "priority": "MEDIUM", "payload": {"resource": "boats", "quantity": 3},
     "lat": 26.3220, "lng": 91.0060, "observed_at": ago(hours=2), "hop_count": 3, "ttl": 2,
     "received_at": ago(hours=1, minutes=10), "review_status": "UNREVIEWED", "promoted_task_id": None},
    {"id": "me_4", "event_id": "e7f8a9b0-c1d2-4e3f-a4b5-c6d7e8f9a0b1",
     "origin_node_id": "c1d2e3f4-5a6b-4c7d-8e9f-0a1b2c3d4e5f", "disaster_id": "dis_brahmaputra_ghy",
     "type": "PERSON_RESCUED", "priority": "LOW", "payload": {"count": 7},
     "lat": None, "lng": None, "observed_at": ago(hours=5), "hop_count": 0, "ttl": 5,
     "received_at": ago(hours=4), "review_status": "REVIEWED", "promoted_task_id": None},
]


SYSTEM_USER = {
    "id": SYSTEM_USER_ID, "name": "Test Command", "email": "command@test.invalid", "phone": "", "password_hash": None,
    "role": "INCIDENT_ADMIN", "state_district": "New Delhi", "lat": None, "lng": None, "provider": "system",
    "google_id": None, "avatar_url": None, "blood_group": None, "emergency_contact": None, "is_verified": True,
    "onboarded": True, "org_id": "org_ndrf", "profile_data": {}, "muster_code": None, "muster_issued_at": None,
    "created_at": ago(days=30), "updated_at": ago(days=30),
}

DATASET = {
    "users": [SYSTEM_USER], "volunteers": MOCK_VOLUNTEERS,
    "disasters": [{**d, "source": None, "source_url": None, "external_id": None} for d in MOCK_HAZARDS],
    "evidence": MOCK_EVIDENCE, "tasks": MOCK_TASKS, "alerts": MOCK_ALERTS, "organizations": MOCK_ORGANIZATIONS,
    "mesh_nodes": MOCK_MESH_NODES, "mesh_events": MOCK_MESH_EVENTS,
}
