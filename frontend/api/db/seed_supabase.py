"""
Volentify 2.0 Database Seeder (Python / Supabase / JSON Direct)
Generates 100+ complete, realistic records for Disasters, Tasks, Volunteers, Organizations, and Evidence.
"""

import json
import math
import os
import sys

INDIAN_STATES_DISTRICTS = [
    {"state": "Odisha", "districts": ["Puri", "Bhadrak", "Balasore", "Jagatsinghpur", "Kendrapara", "Ganjam", "Cuttack", "Bhubaneswar"], "lat": 19.8135, "lng": 85.8312},
    {"state": "Assam", "districts": ["Kamrup", "Barpeta", "Dhubri", "Majuli", "Dhemaji", "Cachar", "Nagaon", "Guwahati"], "lat": 26.1445, "lng": 91.7362},
    {"state": "Kerala", "districts": ["Wayanad", "Idukki", "Ernakulam", "Alappuzha", "Kottayam", "Pathanamthitta", "Malappuram"], "lat": 11.6854, "lng": 76.1320},
    {"state": "Uttarakhand", "districts": ["Chamoli", "Rudraprayag", "Uttarkashi", "Pithoragarh", "Nainital", "Almora", "Dehradun"], "lat": 30.0668, "lng": 79.0193},
    {"state": "Himachal Pradesh", "districts": ["Kangra", "Mandi", "Kullu", "Shimla", "Kinnaur", "Lahaul and Spiti", "Solan"], "lat": 32.0998, "lng": 76.2691},
    {"state": "West Bengal", "districts": ["South 24 Parganas", "North 24 Parganas", "Purba Medinipur", "Howrah", "Kolkata", "Darjeeling"], "lat": 22.5726, "lng": 88.3639},
    {"state": "Gujarat", "districts": ["Kutch", "Jamnagar", "Porbandar", "Junagadh", "Dwarka", "Surat", "Ahmedabad"], "lat": 23.2420, "lng": 69.6669},
    {"state": "Tamil Nadu", "districts": ["Chennai", "Cuddalore", "Nagapattinam", "Thanjavur", "Kanyakumari", "Thoothukudi"], "lat": 13.0827, "lng": 80.2707},
    {"state": "Maharashtra", "districts": ["Mumbai Suburban", "Raigad", "Ratnagiri", "Sindhudurg", "Kolhapur", "Pune"], "lat": 18.9220, "lng": 72.8347},
    {"state": "Bihar", "districts": ["Patna", "Bhagalpur", "Katihar", "Purnia", "Muzaffarpur", "Darbhanga", "Saharsa"], "lat": 25.5941, "lng": 85.1376},
    {"state": "Delhi NCR", "districts": ["Central Delhi", "East Delhi", "North Delhi", "South Delhi", "Gurugram", "Noida"], "lat": 28.6139, "lng": 77.2090},
    {"state": "Rajasthan", "districts": ["Jaisalmer", "Bikaner", "Barmer", "Jodhpur", "Churu", "Jaipur"], "lat": 26.9124, "lng": 75.7873},
]

FIRST_NAMES = [
    "Aarav", "Rahul", "Priya", "Amit", "Sunita", "Vikram", "Ananya", "Rohan", "Sneha", "Deepak",
    "Pooja", "Sanjay", "Kavita", "Rajesh", "Meera", "Arjun", "Divya", "Manoj", "Nehal", "Karan",
    "Isha", "Alok", "Shreya", "Gaurav", "Ritu", "Nikhil", "Tanvi", "Vikas", "Swati", "Manish"
]

LAST_NAMES = [
    "Sharma", "Patel", "Singh", "Verma", "Das", "Mukherjee", "Nair", "Reddy", "Banerjee", "Iyer",
    "Joshi", "Gupta", "Choudhury", "Rao", "Bose", "Mohanty", "Mishra", "Pandey", "Kulkarni", "Bhatt"
]

DISASTER_CATEGORIES = ["Cyclone", "Flood", "Wildfire", "Landslide", "Earthquake", "Heatwave"]
SEVERITIES = ["CRITICAL", "HIGH", "MODERATE", "LOW"]
SKILLS = ["Rescue & Search", "Paramedic", "Food & Shelter Logistics", "Debris Clearing", "Drone Pilot", "Boat Operator", "First Aid", "Civil Defense"]

def generate_sample_dataset():
    disasters = []
    volunteers = []
    tasks = []
    organizations = []
    evidence_list = []
    alerts = []

    # 1. 100 Organizations
    for i in range(1, 101):
        loc = INDIAN_STATES_DISTRICTS[i % len(INDIAN_STATES_DISTRICTS)]
        district = loc["districts"][i % len(loc["districts"])]
        cat = ["NDRF", "SDRF", "RED_CROSS", "CIVIL_DEFENSE", "LOCAL_NGO"][i % 5]
        org = {
            "id": f"ORG-{i:03d}",
            "name": f"{cat} Tactical Unit #{i:03d} ({district}, {loc['state']})",
            "category": cat,
            "state": loc["state"],
            "district": district,
            "contact_email": f"unit{i}@{cat.lower()}.gov.in",
            "contact_phone": f"+91 {9800000000 + i}",
            "verified": True
        }
        organizations.append(org)

    # 2. 100 Disasters
    for i in range(1, 101):
        loc = INDIAN_STATES_DISTRICTS[i % len(INDIAN_STATES_DISTRICTS)]
        district = loc["districts"][i % len(loc["districts"])]
        d_cat = DISASTER_CATEGORIES[i % len(DISASTER_CATEGORIES)]
        sev = SEVERITIES[i % 3] # CRITICAL, HIGH, MODERATE
        
        lat = round(loc["lat"] + (math.sin(i * 1.8) * 0.25), 4)
        lng = round(loc["lng"] + (math.cos(i * 1.8) * 0.25), 4)
        code = f"ALT-{100 + i}"

        disaster = {
            "id": code,
            "name": f"{d_cat} Event in {district} Sector",
            "category": "hazard",
            "subType": d_cat,
            "severity": sev,
            "lat": lat,
            "lng": lng,
            "location": f"{district}, {loc['state']}",
            "state": loc["state"],
            "radius_km": 15.0 + ((i * 4) % 40),
            "status": "Evacuation Active" if sev == "CRITICAL" else "Active Monitoring",
            "affected_pop": f"{((i * 15) % 300 + 15)}K",
            "details": f"Multi-source OSINT & CWC sensors confirm {sev.lower()} {d_cat.lower()} activity across {district}. Emergency relief response dispatched.",
            "wind_speed": 130 + (i % 30) if d_cat == "Cyclone" else 20 + (i % 20),
            "rainfall_mm": 210 + (i % 120) if d_cat == "Flood" else 30 + (i % 50),
            "surge_m": round(1.5 + (i % 3), 1) if d_cat in ["Cyclone", "Flood"] else 0.0,
            "updatedAt": f"{(i % 45) + 2} mins ago"
        }
        disasters.append(disaster)

    # 3. 120 Volunteers
    for i in range(1, 121):
        fn = FIRST_NAMES[i % len(FIRST_NAMES)]
        ln = LAST_NAMES[(i * 3) % len(LAST_NAMES)]
        loc = INDIAN_STATES_DISTRICTS[i % len(INDIAN_STATES_DISTRICTS)]
        district = loc["districts"][i % len(loc["districts"])]
        skill = SKILLS[i % len(SKILLS)]

        lat = round(loc["lat"] + (math.sin(i * 2.5) * 0.12), 4)
        lng = round(loc["lng"] + (math.cos(i * 2.5) * 0.12), 4)
        avail = "OFFLINE" if i % 8 == 0 else "BUSY" if i % 4 == 0 else "AVAILABLE"

        vol = {
            "id": f"VOL-IND-{84000 + i}",
            "name": f"{fn} {ln}",
            "email": f"{fn.lower()}.{ln.lower()}{i}@volentify.org",
            "phone": f"+91 {9810000000 + i}",
            "role": "VOLUNTEER",
            "skills": [skill, SKILLS[(i + 2) % len(SKILLS)]],
            "lat": lat,
            "lng": lng,
            "location": f"{district}, {loc['state']}",
            "availability": avail,
            "verified": True,
            "missions_done": (i * 5) % 28,
            "total_hours": round((i * 12.4) % 210, 1),
            "response_rate": f"{94 + (i % 6)}%"
        }
        volunteers.append(vol)

    # 4. 110 Tasks
    for i in range(1, 111):
        d = disasters[i % len(disasters)]
        skill = SKILLS[i % len(SKILLS)]
        urgency = SEVERITIES[i % 4]

        task = {
            "id": f"TSK-{i:03d}",
            "title": f"{skill} Task: {d['name']}",
            "urgency": urgency,
            "required_skill": skill,
            "lat": round(d["lat"] + (math.sin(i) * 0.04), 4),
            "lng": round(d["lng"] + (math.cos(i) * 0.04), 4),
            "quantity_needed": (i % 10) + 2,
            "status": "COMPLETED" if i % 5 == 0 else "IN_PROGRESS" if i % 3 == 0 else "ACTIVE DISPATCH",
            "event_id": d["id"]
        }
        tasks.append(task)

    # 5. 100 Evidence Items
    for i in range(1, 101):
        d = disasters[i % len(disasters)]
        evidence = {
            "id": f"EV-{i:03d}",
            "event_id": d["id"],
            "source": f"IMD Doppler / CWC Sensor Unit #{i}",
            "source_type": "OFFICIAL" if i % 2 == 0 else "NEWS",
            "claim_text": f"Severe telemetry alert recorded in {d['location']}: hazard intensity peaking at level {d['severity']}.",
            "relation": "CONFLICTING" if i % 7 == 0 else "SUPPORTING",
            "confidence": round(0.88 + (i % 10) * 0.01, 2)
        }
        evidence_list.append(evidence)

    # 6. 100 Alerts
    for i in range(1, 101):
        d = disasters[i % len(disasters)]
        alert = {
            "id": f"ALT-BRDCST-{i:03d}",
            "title": f"NATIONAL EMERGENCY BROADCAST: {d['name']}",
            "level": d["severity"],
            "category": d["subType"],
            "location": d["location"],
            "state": d["state"],
            "time": f"{(i % 55) + 1} mins ago",
            "description": f"Urgent safety bulletin issued for {d['location']}. High wind and inundation probability.",
            "advisory": "Follow district magistrate evacuation orders. Move to identified high-ground shelters. Helpline 112 / 1070."
        }
        alerts.append(alert)

    data = {
        "disasters": disasters,
        "volunteers": volunteers,
        "tasks": tasks,
        "organizations": organizations,
        "evidence": evidence_list,
        "alerts": alerts
    }

    # Save to json file for instant frontend/FastAPI loading
    out_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_100_data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Generated 100+ sample records for all 6 tables! Saved to {out_path}")
    return data

if __name__ == "__main__":
    generate_sample_dataset()
