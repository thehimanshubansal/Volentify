import math
import httpx # pyrefly: ignore [missing-import]
from typing import List, Dict, Optional
from api.models.schemas import InfraFacilitySchema, DataMode

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """
[out:json][timeout:10];
(
  node["amenity"="hospital"](around:{radius_m},{lat},{lng});
  way["amenity"="hospital"](around:{radius_m},{lat},{lng});
  node["amenity"="school"](around:{radius_m},{lat},{lng});
  way["amenity"="school"](around:{radius_m},{lat},{lng});
  node["amenity"="fire_station"](around:{radius_m},{lat},{lng});
  node["amenity"="police"](around:{radius_m},{lat},{lng});
  way["bridge"="yes"](around:{radius_m},{lat},{lng});
  node["amenity"="bus_station"](around:{radius_m},{lat},{lng});
  way["highway"="trunk"](around:{radius_m},{lat},{lng});
);
out center body;
"""

OSM_TAG_MAP = {
    "hospital": "Hospital",
    "school": "School / College",
    "fire_station": "Fire Station",
    "police": "Police Station",
    "bridge": "Bridge",
    "bus_station": "Bus Station / Transport Hub",
    "highway": "Major Road"
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

class InfraProximityEngine:
    @staticmethod
    def get_status_from_distance(distance_km: float) -> str:
        if distance_km < 2.0:
            return "Potentially Affected"
        elif distance_km < 5.0:
            return "In Proximity — Status Unknown"
        elif distance_km < 10.0:
            return "No Report"
        else:
            return "Outside Impact Zone"

    @staticmethod
    def extract_type(tags: Dict) -> str:
        for k, v in tags.items():
            if k == "amenity" and v in OSM_TAG_MAP:
                return OSM_TAG_MAP[v]
            if k == "bridge" and v == "yes":
                return OSM_TAG_MAP["bridge"]
            if k == "highway" and v == "trunk":
                return OSM_TAG_MAP["highway"]
        return "Unknown Facility"

    @staticmethod
    async def get_nearby_infrastructure(lat: float, lng: float, radius_km: float = 10.0) -> Dict:
        radius_m = int(radius_km * 1000)
        query = OVERPASS_QUERY.format(lat=lat, lng=lng, radius_m=radius_m)
        
        facilities = []
        data_mode = DataMode.LIVE
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(OVERPASS_URL, data={"data": query})
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for el in data.get("elements", []):
                        # Extract coords
                        el_lat = el.get("lat") or el.get("center", {}).get("lat")
                        el_lng = el.get("lon") or el.get("center", {}).get("lon")
                        if not el_lat or not el_lng:
                            continue
                            
                        dist = haversine_distance(lat, lng, el_lat, el_lng)
                        status = InfraProximityEngine.get_status_from_distance(dist)
                        
                        tags = el.get("tags", {})
                        f_type = InfraProximityEngine.extract_type(tags)
                        name = tags.get("name", f"Unnamed {f_type}")
                        
                        facilities.append(InfraFacilitySchema(
                            name=name,
                            type=f_type,
                            lat=el_lat,
                            lng=el_lng,
                            distance_km=dist,
                            status=status,
                            osm_id=el.get("id"),
                            data_mode=data_mode
                        ))
        except Exception as e:
            print(f"Overpass API failed: {e}")
            return {"facilities": [], "data_mode": DataMode.DEMO}

        return {
            "facilities": sorted(facilities, key=lambda x: x.distance_km),
            "data_mode": data_mode
        }
