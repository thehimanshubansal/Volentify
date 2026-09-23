import os
import json
import google.generativeai as genai # pyrefly: ignore [missing-import]
from datetime import datetime
from typing import List
from api.models.schemas import EvidenceSchema, SituationBriefingSchema

# Initialize Gemini if key is available
gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

class SituationBriefingEngine:
    
    @staticmethod
    def generate_briefing(event_id: str, event_label: str, event_location: str, evidence: List[EvidenceSchema]) -> SituationBriefingSchema:
        if not evidence:
            return None

        if not gemini_key:
            print("WARNING: GEMINI_API_KEY not found. Using fallback mock briefing.")
            return SituationBriefingSchema(
                event_id=event_id,
                event_label=f"{event_label} — {event_location}",
                severity="HIGH",
                confidence=0.85,
                supporting_count=len(evidence),
                conflicting_count=0,
                duplicate_count=0,
                needs=["Rescue", "Medical"],
                brief=f"Multiple sources report a high severity {event_label} in {event_location}. Immediate response required."
            )

        model = genai.GenerativeModel('gemini-1.5-flash')
        
        evidence_json = [{"source": e.source, "text": e.claim_text, "type": e.source_type} for e in evidence]
        
        prompt = f"""
        You are a tactical disaster response AI. 
        I am giving you multiple intelligence reports (evidence) about a specific event.
        Event: {event_label} in {event_location}
        
        Analyze the evidence and generate a Situation Briefing.
        Return ONLY a raw JSON object (no markdown, just the braces) with the following structure:
        - severity: string ("HIGH", "MODERATE", or "LOW")
        - confidence: float between 0.0 and 1.0 (based on source agreement and number of sources)
        - supporting_count: int (number of reports that support the main event narrative)
        - conflicting_count: int (number of reports that conflict with the main narrative, e.g. "no casualties" vs "casualties")
        - duplicate_count: int (number of reports that are almost exact duplicates of others)
        - needs: array of strings (e.g. ["Rescue", "Medical", "Shelter", "Food & Water", "Transport"])
        - brief: string (A concise 1-2 sentence tactical summary of the situation, mentioning conflicts if any exist)
        
        Evidence:
        {json.dumps(evidence_json)}
        """
        
        try:
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
                
            data = json.loads(text.strip())
            
            return SituationBriefingSchema(
                event_id=event_id,
                event_label=f"{event_label} — {event_location}",
                severity=data.get("severity", "MODERATE"),
                confidence=float(data.get("confidence", 0.7)),
                supporting_count=int(data.get("supporting_count", 0)),
                conflicting_count=int(data.get("conflicting_count", 0)),
                duplicate_count=int(data.get("duplicate_count", 0)),
                needs=data.get("needs", []),
                brief=data.get("brief", "Situation is currently being monitored.")
            )
        except Exception as e:
            print(f"Error calling Gemini for briefing: {e}")
            return None
