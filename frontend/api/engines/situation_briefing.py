import re
from datetime import datetime
from typing import List, Dict, Set
from api.models.schemas import EvidenceSchema, SituationBriefingSchema, SourceType

class SituationBriefingEngine:
    CONFLICT_PAIRS = [
        ("no casualties", "casualties reported"),
        ("no casualties", "killed"),
        ("no casualties", "deaths"),
        ("receding", "rising"),
        ("water level dropping", "water level rising"),
        ("under control", "spreading"),
        ("under control", "out of control"),
        ("no damage", "severe damage"),
        ("evacuated safely", "stranded"),
        ("stable", "worsening"),
        ("weakening", "intensifying"),
    ]

    NEEDS_KEYWORDS = {
        "Rescue": ["rescue", "stranded", "trapped", "evacuate", "evacuation", "search"],
        "Medical": ["medical", "hospital", "injury", "casualties", "ambulance", "doctor", "blood"],
        "Shelter": ["shelter", "displaced", "homeless", "relief camp", "tent"],
        "Food & Water": ["food", "water", "ration", "drinking water", "supplies"],
        "Transport": ["transport", "road blocked", "bridge", "vehicle", "boat", "airlift"],
    }

    HIGH_KEYWORDS = ["killed", "death", "casualties", "stranded", "collapse", "breach", "danger mark", "evacuation order"]
    MODERATE_KEYWORDS = ["warning", "alert", "rising", "spreading", "deployed"]
    
    STOPWORDS = {"the", "a", "an", "in", "on", "at", "of", "to", "is", "has", "been", "was", "were", "are", "for", "with", "by", "from", "this", "that", "and", "or", "but", "not", "no"}

    @staticmethod
    def jaccard_similarity(text1: str, text2: str) -> float:
        words1 = set(re.findall(r'\b\w+\b', text1.lower())) - SituationBriefingEngine.STOPWORDS
        words2 = set(re.findall(r'\b\w+\b', text2.lower())) - SituationBriefingEngine.STOPWORDS
        if not words1 and not words2:
            return 1.0
        return len(words1 & words2) / len(words1 | words2)

    @staticmethod
    def detect_conflicts(text1: str, text2: str) -> bool:
        t1, t2 = text1.lower(), text2.lower()
        for p1, p2 in SituationBriefingEngine.CONFLICT_PAIRS:
            if (p1 in t1 and p2 in t2) or (p2 in t1 and p1 in t2):
                return True
        return False

    @staticmethod
    def extract_needs(texts: List[str]) -> List[str]:
        needs = set()
        combined_text = " ".join(texts).lower()
        for category, keywords in SituationBriefingEngine.NEEDS_KEYWORDS.items():
            if any(kw in combined_text for kw in keywords):
                needs.add(category)
        return list(needs)

    @staticmethod
    def classify_severity(texts: List[str]) -> str:
        combined_text = " ".join(texts).lower()
        if any(kw in combined_text for kw in SituationBriefingEngine.HIGH_KEYWORDS):
            return "HIGH"
        if any(kw in combined_text for kw in SituationBriefingEngine.MODERATE_KEYWORDS):
            return "MODERATE"
        return "LOW"

    @staticmethod
    def generate_briefing(event_id: str, event_label: str, event_location: str, evidence: List[EvidenceSchema]) -> SituationBriefingSchema:
        if not evidence:
            return None

        # Build relations (simple O(N^2) for small N)
        duplicate_count = 0
        conflicting_count = 0
        supporting_count = 0
        unique_sources = set()
        
        # We assume the first evidence item is the "anchor" claim for simplicity in this demo,
        # or we compare all pairs. Let's compare all items to each other to count relations.
        # Actually, simpler: mark items as duplicate if highly similar to any earlier item.
        processed_texts = []
        supporting_texts = []
        
        for ev in evidence:
            unique_sources.add(ev.source)
            is_dup = False
            is_conflict = False
            
            for pt in processed_texts:
                if SituationBriefingEngine.jaccard_similarity(ev.claim_text, pt['text']) > 0.7 and ev.source_type == pt['type']:
                    is_dup = True
                    break
                if SituationBriefingEngine.detect_conflicts(ev.claim_text, pt['text']):
                    is_conflict = True
                    break
            
            if is_dup:
                duplicate_count += 1
            elif is_conflict:
                conflicting_count += 1
                processed_texts.append({'text': ev.claim_text, 'type': ev.source_type})
            else:
                supporting_count += 1
                supporting_texts.append(ev.claim_text)
                processed_texts.append({'text': ev.claim_text, 'type': ev.source_type})

        # Calculate confidence
        source_agreement = supporting_count / max(1, supporting_count + conflicting_count)
        
        latest_time = max(e.timestamp for e in evidence)
        hours_since = (datetime.now() - latest_time).total_seconds() / 3600.0
        recency_factor = max(0.3, 1.0 - (hours_since / 24.0))
        
        evidence_count_factor = min(1.0, len(unique_sources) / 5.0)
        
        confidence = (0.4 * source_agreement) + (0.3 * recency_factor) + (0.3 * evidence_count_factor)
        
        # Generate other fields
        severity = SituationBriefingEngine.classify_severity(supporting_texts)
        needs = SituationBriefingEngine.extract_needs(supporting_texts)
        
        # Template generation
        source_phrase = f"{len(unique_sources)} independent source{'s' if len(unique_sources) > 1 else ''}"
        severity_phrase = f"a {severity.lower()}-severity {event_label}"
        
        brief = f"Multiple {source_phrase} support {severity_phrase} event"
        if event_location and event_location != "Unknown":
            brief += f" in {event_location}"
        brief += "."
        
        if needs:
            brief += f" {' and '.join(needs)} response {'is' if len(needs) == 1 else 'are'} priorities."
            
        if conflicting_count > 0:
            brief += f" Note: {conflicting_count} conflicting report(s) require verification."

        return SituationBriefingSchema(
            event_id=event_id,
            event_label=f"{event_label} — {event_location}",
            severity=severity,
            confidence=confidence,
            supporting_count=supporting_count,
            conflicting_count=conflicting_count,
            duplicate_count=duplicate_count,
            needs=needs,
            brief=brief
        )
