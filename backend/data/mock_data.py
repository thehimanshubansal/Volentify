"""
Volentify 2.0 - High-Fidelity Tactical Dataset
Provides robust fallback when live Supabase / Postgres database connection is unconfigured or offline.
"""

MOCK_HAZARDS = [
    {
        "id": "DIS-2026-001",
        "name": "Super Cyclone Dana Eye Impact",
        "category": "hazard",
        "subType": "Cyclone",
        "severity": "CRITICAL",
        "lat": 19.8135,
        "lng": 85.8312,
        "details": "Category 4 cyclonic storm with sustained winds at 135 km/h. Coastal surge warning active along Puri-Bhadrak strip. 45 NDRF teams deployed.",
        "status": "RED ALERT - ACTIVE IMPACT",
        "updatedAt": "Live Telemetry (3 min ago)",
        "location": "Puri Coastal Corridor",
        "state": "Odisha",
        "wind_speed": 135.0,
        "rainfall_mm": 240.0,
        "affected_pop": "1.4M Citizens",
        "radius_km": 75.0,
        "surge_m": 3.8
    },
    {
        "id": "DIS-2026-002",
        "name": "Brahmaputra Basin Flash Inundation",
        "category": "hazard",
        "subType": "Flood",
        "severity": "CRITICAL",
        "lat": 26.9600,
        "lng": 94.2167,
        "details": "Brahmaputra flowing 1.8m above danger mark at Neamatighat. Over 68 riverine villages submerged. SDRF boat rescue units mobilized.",
        "status": "CRITICAL FLOODING",
        "updatedAt": "Live Telemetry (7 min ago)",
        "location": "Majuli River Island",
        "state": "Assam",
        "wind_speed": 42.0,
        "rainfall_mm": 310.0,
        "affected_pop": "420K Citizens",
        "radius_km": 45.0,
        "surge_m": 1.9
    },
    {
        "id": "DIS-2026-003",
        "name": "Wayanad Mountain Slope Debris Flow",
        "category": "hazard",
        "subType": "Landslide",
        "severity": "CRITICAL",
        "lat": 11.6854,
        "lng": 76.1320,
        "details": "Massive mudslide triggered by 48-hour continuous torrential monsoon downpour. Road connectivity blocked on NH-766.",
        "status": "ACTIVE EVACUATION",
        "updatedAt": "Live Telemetry (12 min ago)",
        "location": "Meppadi / Chooralmala Ridge",
        "state": "Kerala",
        "wind_speed": 35.0,
        "rainfall_mm": 380.0,
        "affected_pop": "85K Citizens",
        "radius_km": 25.0,
        "surge_m": 0.0
    },
    {
        "id": "DIS-2026-004",
        "name": "Chamoli Glacial Slope Breach",
        "category": "hazard",
        "subType": "Landslide",
        "severity": "HIGH",
        "lat": 30.5500,
        "lng": 79.5700,
        "details": "Upper catchment slope instability and rock-debris slide blocking Alaknanda tributary. Heavy machinery deployed for clearing.",
        "status": "TACTICAL MONITORING",
        "updatedAt": "Live Telemetry (18 min ago)",
        "location": "Joshimath Sector",
        "state": "Uttarakhand",
        "wind_speed": 28.0,
        "rainfall_mm": 120.0,
        "affected_pop": "32K Citizens",
        "radius_km": 30.0,
        "surge_m": 0.0
    },
    {
        "id": "DIS-2026-005",
        "name": "Bandhavgarh Thermal Canopy Fireline",
        "category": "hazard",
        "subType": "Wildfire",
        "severity": "HIGH",
        "lat": 23.7000,
        "lng": 81.0200,
        "details": "Fast-spreading forest canopy fire detected by MODIS thermal sensors. Fire breaks being created by forest rangers and civil volunteers.",
        "status": "CONTAINMENT ACTIVE",
        "updatedAt": "Live Telemetry (25 min ago)",
        "location": "Tala Forest Range",
        "state": "Madhya Pradesh",
        "wind_speed": 48.0,
        "rainfall_mm": 0.0,
        "affected_pop": "12K Citizens & Wildlife",
        "radius_km": 20.0,
        "surge_m": 0.0
    },
    {
        "id": "DIS-2026-006",
        "name": "Kachchh Faultline Seismic Swarm",
        "category": "hazard",
        "subType": "Earthquake",
        "severity": "MODERATE",
        "lat": 23.4200,
        "lng": 70.3600,
        "details": "Magnitude 4.7 seismic event at 12km depth. Minor structural tremors reported in Bhachau and Gandhidham.",
        "status": "SEISMIC WATCH",
        "updatedAt": "Live Telemetry (32 min ago)",
        "location": "Bhachau Sub-Division",
        "state": "Gujarat",
        "wind_speed": 18.0,
        "rainfall_mm": 0.0,
        "affected_pop": "190K Citizens",
        "radius_km": 35.0,
        "surge_m": 0.0
    }
]

MOCK_VOLUNTEERS = [
    {
        "id": "VOL-IND-001",
        "name": "Captain Vikram Rathore",
        "skills": ["Swift Water Rescue", "Zodiac Operator", "Trauma Triage", "Night Diving"],
        "equipment": ["Zodiac Combat Boat", "Sonar Scanner", "Satellite Radio"],
        "currentLat": 19.8250,
        "currentLng": 85.8450,
        "lat": 19.8250,
        "lng": 85.8450,
        "availability": "AVAILABLE",
        "verified": True,
        "locationName": "Puri Sector HQ, Odisha",
        "missionsDone": 28,
        "totalHours": 164.5,
        "responseRate": 99.2,
        "phone": "+91 98450 11223"
    },
    {
        "id": "VOL-IND-002",
        "name": "Dr. Ananya Sengupta",
        "skills": ["Trauma Surgery", "Mass Casualty Triage", "Emergency HAZMAT"],
        "equipment": ["Portable Surgical Kit", "Ultrasound V-Scan", "Defibrillator"],
        "currentLat": 19.7990,
        "currentLng": 85.8150,
        "lat": 19.7990,
        "lng": 85.8150,
        "availability": "AVAILABLE",
        "verified": True,
        "locationName": "District Trauma Post, Puri",
        "missionsDone": 34,
        "totalHours": 210.0,
        "responseRate": 98.7,
        "phone": "+91 97321 44556"
    },
    {
        "id": "VOL-IND-003",
        "name": "Rohan Bordoloi",
        "skills": ["Drone Reconnaissance", "Thermal Mapping", "Air Dropping Logistics"],
        "equipment": ["DJI Matrice 350 RTK", "Zenmuse Night Camera", "Portable Starlink"],
        "currentLat": 26.9450,
        "currentLng": 94.2050,
        "lat": 26.9450,
        "lng": 94.2050,
        "availability": "AVAILABLE",
        "verified": True,
        "locationName": "Majuli Island Base, Assam",
        "missionsDone": 19,
        "totalHours": 92.0,
        "responseRate": 97.5,
        "phone": "+91 94350 88991"
    },
    {
        "id": "VOL-IND-004",
        "name": "Arjun Nambiar",
        "skills": ["K9 Debris Search", "Rope Rescue", "Wilderness First Aid"],
        "equipment": ["K9 Tracking Harness", "Avalanche Transceiver", "Climbing Hardware"],
        "currentLat": 11.6780,
        "currentLng": 76.1250,
        "lat": 11.6780,
        "lng": 76.1250,
        "availability": "AVAILABLE",
        "verified": True,
        "locationName": "Chooralmala Sector, Kerala",
        "missionsDone": 15,
        "totalHours": 88.0,
        "responseRate": 96.8,
        "phone": "+91 94471 22334"
    },
    {
        "id": "VOL-IND-005",
        "name": "Sneha Kulkarni",
        "skills": ["4x4 Off-road Driving", "Ambulance Evacuation", "Emergency CPR"],
        "equipment": ["High-Snorkel 4x4 Ambulance", "Spine Boards", "Oxygen Concentrator"],
        "currentLat": 19.0650,
        "currentLng": 72.8650,
        "lat": 19.0650,
        "lng": 72.8650,
        "availability": "BUSY",
        "verified": True,
        "locationName": "Kurla Emergency Lane, Mumbai",
        "missionsDone": 22,
        "totalHours": 135.0,
        "responseRate": 98.1,
        "phone": "+91 98200 55667"
    }
]

MOCK_TASKS = [
    {
        "id": "TSK-001",
        "title": "Puri Coastal Evacuation & Inflatable Boat Transport",
        "urgency": "CRITICAL",
        "required_skill": "Swift Water Rescue",
        "lat": 19.8135,
        "lng": 85.8312,
        "quantity_needed": 15,
        "status": "ACTIVE DISPATCH"
    },
    {
        "id": "TSK-002",
        "title": "AIIMS Bhubaneswar Emergency Trauma & Triage Support",
        "urgency": "CRITICAL",
        "required_skill": "Paramedic",
        "lat": 20.2285,
        "lng": 85.8189,
        "quantity_needed": 8,
        "status": "ACTIVE DISPATCH"
    },
    {
        "id": "TSK-003",
        "title": "Majuli Island Drone Reconnaissance & Air Dropping",
        "urgency": "HIGH",
        "required_skill": "Drone Reconnaissance",
        "lat": 26.9600,
        "lng": 94.2167,
        "quantity_needed": 5,
        "status": "ACTIVE DISPATCH"
    }
]

MOCK_ALERTS = [
    {
        "id": "ALT-001",
        "title": "RED ALERT: Cyclone Dana Eye Landfall Imminent",
        "severity": "CRITICAL",
        "region": "Odisha & West Bengal Coastal Belts",
        "time": "Active Now",
        "message": "Wind gusts exceeding 135 km/h. Evacuation mandatory for low-lying sectors."
    },
    {
        "id": "ALT-002",
        "title": "ORANGE ALERT: Brahmaputra River Spillage",
        "severity": "HIGH",
        "region": "Upper Assam / Majuli",
        "time": "Active Now",
        "message": "Water levels 1.8m above danger threshold. Avoid char crossings."
    }
]

MOCK_ORGANIZATIONS = [
    {
        "id": "ORG-001",
        "name": "National Disaster Response Force (NDRF) 03 BN",
        "category": "NDRF",
        "state": "Odisha",
        "district": "Cuttack",
        "contactEmail": "dispatch.03bn@ndrf.gov.in",
        "contactPhone": "+91 671 2879001",
        "verified": True
    },
    {
        "id": "ORG-002",
        "name": "Assam State Disaster Management Authority (ASDMA)",
        "category": "SDRF",
        "state": "Assam",
        "district": "Guwahati",
        "contactEmail": "control@asdma.gov.in",
        "contactPhone": "+91 361 2237011",
        "verified": True
    }
]
