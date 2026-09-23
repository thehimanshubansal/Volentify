import os
import json
import google.generativeai as genai
from datetime import datetime
from typing import List
from api.models.schemas import RawReportSchema, DeduplicatedEventSchema

# Initialize Gemini if key is available
gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

class EventDeduplicator:
    
    @staticmethod
    def deduplicate(reports: List[RawReportSchema]) -> List[DeduplicatedEventSchema]:
        if not reports:
            return []
            
        if not gemini_key:
            print("WARNING: GEMINI_API_KEY not found. Skipping deduplication logic.")
            return []
            
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Serialize the incoming reports for the prompt
        reports_json = [{"id": r.id, "text": r.text, "source": r.source} for r in reports]
        
        prompt = f"""
        You are a disaster intelligence AI. 
        I will provide you with a list of raw incoming disaster reports.
        Your job is to cluster them into distinct "Events". 
        If multiple reports describe the exact same event (same disaster, same location, roughly same time), group them together.
        
        Return ONLY a raw JSON array (no markdown tags, just the bracket array) of events. 
        Each event must have:
        - event_id: a unique string like "EVT-001"
        - disaster_type: (e.g., "Flood", "Cyclone")
        - location: string name of the primary location
        - lat: float latitude (approximate for that location)
        - lng: float longitude (approximate for that location)
        - report_ids: array of string IDs of the reports belonging to this cluster
        - severity: "HIGH", "MODERATE", or "LOW"
        - status: "Active" or "Monitoring"
        
        Reports:
        {json.dumps(reports_json)}
        """
        
        try:
            response = model.generate_content(prompt)
            # Clean up potential markdown formatting from the response
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
                
            data = json.loads(text.strip())
            
            events = []
            for item in data:
                events.append(DeduplicatedEventSchema(
                    event_id=item.get("event_id", f"EVT-{datetime.now().timestamp()}"),
                    disaster_type=item.get("disaster_type", "Unknown"),
                    location=item.get("location", "Unknown"),
                    lat=item.get("lat", 20.0),
                    lng=item.get("lng", 78.0),
                    report_count=len(item.get("report_ids", [])),
                    report_ids=item.get("report_ids", []),
                    status=item.get("status", "Active"),
                    last_update=datetime.now(),
                    severity=item.get("severity", "LOW")
                ))
            return events
        except Exception as e:
            print(f"Error calling Gemini for deduplication: {e}")
            return []
