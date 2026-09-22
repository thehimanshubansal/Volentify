import math
from typing import List, Dict
from api.models.schemas import TaskSchema, VolunteerSchema, RankedMatchSchema

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

class ResourceMatcher:
    URGENCY_WEIGHTS = {
        "CRITICAL": 3.0,
        "HIGH": 2.0,
        "MODERATE": 1.0,
        "LOW": 0.5
    }

    AVAILABILITY_MULTIPLIER = {
        "AVAILABLE": 1.0,
        "BUSY": 0.3,
        "OFFLINE": 0.0
    }

    SKILL_ADJACENCY = {
        "Paramedic": ["Medical & First Aid", "Blood Donor"],
        "Rescue & Search": ["Debris Clearing"],
        "Food & Shelter Logistics": ["Transport & Driving"],
        "Medical & First Aid": ["Paramedic"],
        "Debris Clearing": ["Rescue & Search", "Transport & Driving"],
        "Transport & Driving": ["Debris Clearing", "Food & Shelter Logistics"],
        "Blood Donor": ["Medical & First Aid", "Paramedic"],
        "Communication": []
    }

    @staticmethod
    def get_skill_score(required_skill: str, volunteer_skills: List[str]) -> float:
        if required_skill in volunteer_skills:
            return 1.0
        adjacent_skills = ResourceMatcher.SKILL_ADJACENCY.get(required_skill, [])
        for skill in volunteer_skills:
            if skill in adjacent_skills:
                return 0.5
        return 0.0

    @staticmethod
    def match_task(task: TaskSchema, volunteers: List[VolunteerSchema]) -> List[RankedMatchSchema]:
        urgency_weight = ResourceMatcher.URGENCY_WEIGHTS.get(task.urgency, 1.0)
        
        matches = []
        for v in volunteers:
            avail_mult = ResourceMatcher.AVAILABILITY_MULTIPLIER.get(v.availability, 0.0)
            if avail_mult == 0.0:
                continue

            skill_score = ResourceMatcher.get_skill_score(task.required_skill, v.skills)
            if skill_score == 0.0:
                continue

            distance_km = haversine_distance(task.lat, task.lng, v.lat, v.lng)
            proximity_score = 1.0 / (1.0 + distance_km / 10.0)

            final_score = urgency_weight * skill_score * proximity_score * avail_mult

            reason = f"{task.urgency} priority + {skill_score*100}% skill match + {distance_km:.1f}km away + {v.availability}"
            
            matches.append(RankedMatchSchema(
                volunteer_id=v.id,
                name=v.name,
                score=final_score,
                reason=reason,
                distance_km=distance_km
            ))

        return sorted(matches, key=lambda x: x.score, reverse=True)

    @staticmethod
    def batch_match(tasks: List[TaskSchema], volunteers: List[VolunteerSchema]) -> Dict[str, List[RankedMatchSchema]]:
        results = {}
        for t in tasks:
            results[t.id] = ResourceMatcher.match_task(t, volunteers)
        return results
