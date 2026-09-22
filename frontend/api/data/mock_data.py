from datetime import datetime, timedelta
from api.models.schemas import TaskSchema, VolunteerSchema, Urgency, Availability, RawReportSchema, EvidenceSchema, SourceType

now = datetime.now()

# --- Mock Tasks (Feature 1) ---
MOCK_TASKS = [
    TaskSchema(
        id="TASK-001",
        title="Emergency medical assistance",
        urgency=Urgency.CRITICAL,
        required_skill="Paramedic",
        lat=23.2599, lng=77.4126, # Bhopal
        quantity_needed=10,
        status="OPEN"
    ),
    TaskSchema(
        id="TASK-002",
        title="Debris clearing at main road",
        urgency=Urgency.HIGH,
        required_skill="Debris Clearing",
        lat=26.1445, lng=91.7362, # Guwahati
        quantity_needed=25,
        status="OPEN"
    ),
    TaskSchema(
        id="TASK-003",
        title="Food distribution at relief camp",
        urgency=Urgency.MODERATE,
        required_skill="Food & Shelter Logistics",
        lat=19.8135, lng=85.8312, # Puri
        quantity_needed=15,
        status="PARTIALLY_FILLED"
    ),
    TaskSchema(
        id="TASK-004",
        title="Search and Rescue in flooded area",
        urgency=Urgency.CRITICAL,
        required_skill="Rescue & Search",
        lat=13.0827, lng=80.2707, # Chennai
        quantity_needed=30,
        status="OPEN"
    )
]

# --- Mock Volunteers (Feature 1) ---
MOCK_VOLUNTEERS = [
    VolunteerSchema(
        id="V-101",
        name="Rahul Sharma",
        skills=["Paramedic", "First Aid"],
        lat=23.2800, lng=77.3900, # Near Bhopal
        availability=Availability.AVAILABLE,
        verified=True
    ),
    VolunteerSchema(
        id="V-102",
        name="Anita Patel",
        skills=["Food & Shelter Logistics"],
        lat=19.8200, lng=85.8200, # Near Puri
        availability=Availability.AVAILABLE,
        verified=True
    ),
    VolunteerSchema(
        id="V-103",
        name="Vikram Singh",
        skills=["Debris Clearing", "Transport & Driving"],
        lat=26.1500, lng=91.7400, # Near Guwahati
        availability=Availability.AVAILABLE,
        verified=True
    ),
    VolunteerSchema(
        id="V-104",
        name="Priya Das",
        skills=["Rescue & Search", "Paramedic"],
        lat=13.0900, lng=80.2800, # Near Chennai
        availability=Availability.BUSY,
        verified=True
    )
]

# --- Mock Raw Reports (Feature 4) ---
MOCK_REPORTS = [
    RawReportSchema(
        id="R-001",
        text="Heavy flooding in Guwahati, water 2m above danger mark",
        source="NDMA Bulletin",
        timestamp=now - timedelta(hours=1)
    ),
    RawReportSchema(
        id="R-002",
        text="Brahmaputra river level rising dangerously at Kamrup",
        source="CWC Sensor",
        timestamp=now - timedelta(hours=2)
    ),
    RawReportSchema(
        id="R-003",
        text="12 villages submerged near Guwahati, SDRF deployed",
        source="India Today",
        timestamp=now - timedelta(minutes=30)
    ),
    RawReportSchema(
        id="R-004",
        text="Cyclone Remal approaching Puri coast at 145 km/h",
        source="IMD Alert",
        timestamp=now - timedelta(hours=3)
    ),
    RawReportSchema(
        id="R-005",
        text="Severe cyclonic storm warning for Paradip, Bhadrak",
        source="Twitter/X",
        timestamp=now - timedelta(hours=4)
    )
]

# --- Mock Evidence Items (Feature 7) ---
MOCK_EVIDENCE = [
    EvidenceSchema(
        id="EV-001",
        event_id="EVT-001",
        source="CWC Sensor",
        source_type=SourceType.SENSOR,
        timestamp=now - timedelta(minutes=30),
        claim_text="Water level 1.8m above danger mark at Pandu station"
    ),
    EvidenceSchema(
        id="EV-002",
        event_id="EVT-001",
        source="NDMA",
        source_type=SourceType.OFFICIAL,
        timestamp=now - timedelta(hours=1),
        claim_text="Brahmaputra flood alert issued for Kamrup district"
    ),
    EvidenceSchema(
        id="EV-003",
        event_id="EVT-001",
        source="India Today",
        source_type=SourceType.NEWS,
        timestamp=now - timedelta(hours=2),
        claim_text="12 villages submerged in Guwahati, thousands displaced"
    ),
    EvidenceSchema(
        id="EV-006",
        event_id="EVT-001",
        source="Local News",
        source_type=SourceType.NEWS,
        timestamp=now - timedelta(hours=3),
        claim_text="Water levels receding in Kamrup as per local report"
    )
]

# --- Fallback Infra (Feature 11) ---
FALLBACK_INFRA = {
    "delhi": [
        {"name": "AIIMS New Delhi", "type": "Hospital", "lat": 28.5672, "lng": 77.2100, "osm_source": "mock"},
        {"name": "Safdarjung Hospital", "type": "Hospital", "lat": 28.5685, "lng": 77.2066, "osm_source": "mock"},
        {"name": "Delhi Police HQ", "type": "Police Station", "lat": 28.6280, "lng": 77.2195, "osm_source": "mock"}
    ],
    "guwahati": [
        {"name": "Gauhati Medical College", "type": "Hospital", "lat": 26.1557, "lng": 91.7610, "osm_source": "mock"},
        {"name": "Panbazar Police Station", "type": "Police Station", "lat": 26.1834, "lng": 91.7454, "osm_source": "mock"}
    ]
}
