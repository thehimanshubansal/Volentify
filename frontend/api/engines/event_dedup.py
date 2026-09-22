import math
import re
from datetime import datetime
from typing import List, Dict, Set
from api.models.schemas import RawReportSchema, DeduplicatedEventSchema

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

class EventDeduplicator:
    DISASTER_KEYWORDS = {
        "flood": ["flood", "flooding", "inundation", "submerged", "water level", "deluge", "waterlogging"],
        "cyclone": ["cyclone", "hurricane", "storm", "cyclonic", "wind speed", "landfall", "typhoon"],
        "earthquake": ["earthquake", "seismic", "tremor", "quake", "richter", "epicenter"],
        "landslide": ["landslide", "mudslide", "slope", "debris flow", "land slip"],
        "wildfire": ["fire", "wildfire", "forest fire", "blaze", "burning", "hotspot"],
        "heatwave": ["heatwave", "heat wave", "temperature", "heat stroke", "scorching"],
    }

    INDIA_GAZETTEER = {
        "guwahati": {"canonical": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362},
        "gauhati": {"canonical": "Guwahati", "state": "Assam", "lat": 26.1445, "lng": 91.7362},
        "puri": {"canonical": "Puri", "state": "Odisha", "lat": 19.8135, "lng": 85.8312},
        "paradip": {"canonical": "Paradip", "state": "Odisha", "lat": 20.2644, "lng": 86.6705},
        "mumbai": {"canonical": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
        "bombay": {"canonical": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
        "chennai": {"canonical": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
        "delhi": {"canonical": "Delhi", "state": "Delhi", "lat": 28.6139, "lng": 77.2090},
        "bhopal": {"canonical": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lng": 77.4126},
        "wayanad": {"canonical": "Wayanad", "state": "Kerala", "lat": 11.6854, "lng": 76.1320},
        "bhubaneswar": {"canonical": "Bhubaneswar", "state": "Odisha", "lat": 20.2285, "lng": 85.8189},
        "chamoli": {"canonical": "Chamoli", "state": "Uttarakhand", "lat": 30.2731, "lng": 79.3263},
        "almora": {"canonical": "Almora", "state": "Uttarakhand", "lat": 29.5982, "lng": 79.6467},
        "kamrup": {"canonical": "Kamrup", "state": "Assam", "lat": 26.2917, "lng": 91.5435}
    }

    STOPWORDS = {"the", "a", "an", "in", "on", "at", "of", "to", "is", "has", "been", "was", "were", "are", "for", "with", "by", "from", "this", "that", "and", "or", "but", "not", "no", "its", "it", "as", "up", "out", "have", "had", "very", "due", "also", "near", "after", "about", "into"}

    @staticmethod
    def extract_disaster_type(text: str) -> str:
        text_lower = text.lower()
        for dtype, keywords in EventDeduplicator.DISASTER_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                return dtype
        return "unknown"

    @staticmethod
    def extract_location(text: str) -> Dict:
        text_lower = text.lower()
        for loc, data in EventDeduplicator.INDIA_GAZETTEER.items():
            if loc in text_lower:
                return data
        return None

    @staticmethod
    def jaccard_similarity(text1: str, text2: str) -> float:
        words1 = set(re.findall(r'\b\w+\b', text1.lower())) - EventDeduplicator.STOPWORDS
        words2 = set(re.findall(r'\b\w+\b', text2.lower())) - EventDeduplicator.STOPWORDS
        if not words1 and not words2:
            return 1.0
        return len(words1 & words2) / len(words1 | words2)

    @staticmethod
    def calculate_similarity(r1: RawReportSchema, r2: RawReportSchema) -> float:
        type1 = EventDeduplicator.extract_disaster_type(r1.text)
        type2 = EventDeduplicator.extract_disaster_type(r2.text)
        type_match = 1.0 if type1 == type2 and type1 != "unknown" else 0.0

        loc1 = EventDeduplicator.extract_location(r1.text)
        loc2 = EventDeduplicator.extract_location(r2.text)
        
        if loc1 and loc2:
            if loc1["canonical"] == loc2["canonical"]:
                location_sim = 1.0
            else:
                dist = haversine_distance(loc1["lat"], loc1["lng"], loc2["lat"], loc2["lng"])
                location_sim = 1.0 / (1.0 + dist / 50.0)
        else:
            location_sim = 0.0

        time_diff = abs((r1.timestamp - r2.timestamp).total_seconds())
        time_sim = max(0.0, 1.0 - (time_diff / 86400))

        text_sim = EventDeduplicator.jaccard_similarity(r1.text, r2.text)

        return 0.3 * type_match + 0.3 * location_sim + 0.2 * time_sim + 0.2 * text_sim

    @staticmethod
    def deduplicate(reports: List[RawReportSchema], threshold: float = 0.6) -> List[DeduplicatedEventSchema]:
        clusters = []
        
        for report in reports:
            best_match_idx = -1
            best_sim = -1
            
            for i, cluster in enumerate(clusters):
                max_sim = 0
                for r in cluster:
                    sim = EventDeduplicator.calculate_similarity(report, r)
                    if sim > max_sim:
                        max_sim = sim
                
                if max_sim > best_sim:
                    best_sim = max_sim
                    best_match_idx = i
            
            if best_sim >= threshold:
                clusters[best_match_idx].append(report)
            else:
                clusters.append([report])
        
        events = []
        for i, cluster in enumerate(clusters):
            event_id = f"EVT-{i+1:03d}"
            
            types = [EventDeduplicator.extract_disaster_type(r.text) for r in cluster]
            disaster_type = max(set(types), key=types.count)
            if disaster_type == "unknown":
                disaster_type = "Unspecified"
            
            locs = [EventDeduplicator.extract_location(r.text) for r in cluster]
            valid_locs = [l for l in locs if l is not None]
            if valid_locs:
                canonical_names = [l["canonical"] for l in valid_locs]
                main_loc_name = max(set(canonical_names), key=canonical_names.count)
                main_loc = next(l for l in valid_locs if l["canonical"] == main_loc_name)
                location = main_loc_name
                lat = main_loc["lat"]
                lng = main_loc["lng"]
            else:
                location = "Unknown"
                lat = 20.0
                lng = 78.0

            latest_report = max(cluster, key=lambda x: x.timestamp)
            hours_old = (datetime.now() - latest_report.timestamp).total_seconds() / 3600.0
            status = "Active" if hours_old < 6 else "Monitoring"
            
            combined_text = " ".join([r.text.lower() for r in cluster])
            if any(w in combined_text for w in ["danger mark", "evacuation", "killed", "dead"]):
                severity = "HIGH"
            elif any(w in combined_text for w in ["warning", "alert"]):
                severity = "MODERATE"
            else:
                severity = "LOW"

            events.append(DeduplicatedEventSchema(
                event_id=event_id,
                disaster_type=disaster_type.title(),
                location=location,
                lat=lat,
                lng=lng,
                report_count=len(cluster),
                report_ids=[r.id for r in cluster],
                status=status,
                last_update=latest_report.timestamp,
                severity=severity
            ))
            
        return events
