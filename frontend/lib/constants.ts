import type { MeshEventType, MeshPriority, Role, Severity } from './types';

export const SKILLS = [
  'Rescue & Search', 'Boat Rescue', 'Paramedic', 'Medical & First Aid', 'Drone Operation', 'Chainsaw & Debris',
  'Food & Shelter Logistics', 'Transport & Driving', 'Blood Donor', 'Communications', 'Manual Packing',
] as const;

export const EQUIPMENT = [
  'Inflatable boat', 'Motorboat', 'Life jackets', 'Trauma kit', 'Drone', 'Chainsaw', 'Generator',
  '4x4 vehicle', 'VHF radio', 'Satellite phone',
] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
] as const;

export const ROLE_META: Record<Role, { label: string; short: string; blurb: string; pass: string }> = {
  VOLUNTEER: { label: 'Volunteer responder', short: 'Volunteer', pass: 'First Responder Tactical Muster Pass',
    blurb: 'Certified skills and equipment, dispatched to missions near you.' },
  CITIZEN: { label: 'Citizen', short: 'Citizen', pass: 'Civilian SOS Evacuation Clearance Pass',
    blurb: 'Alerts for your district and priority evacuation for your household.' },
  NGO_MEMBER: { label: 'NGO partner', short: 'NGO', pass: 'Relief Supply Fleet Pass',
    blurb: 'Coordinate relief quotas, fleet assets and volunteer requisitions.' },
  INCIDENT_ADMIN: { label: 'Incident command', short: 'Command', pass: 'EOC Incident Controller Clearance Pass',
    blurb: 'NDRF, SDMA, DEOC, police or fire — broadcast alerts and run dispatch.' },
  RESEARCHER: { label: 'Researcher', short: 'Research', pass: 'Research Analyst Access Pass',
    blurb: 'Analytical access to OSINT evidence and ML forecasts.' },
};

export const SEVERITY_META: Record<Severity, { label: string; text: string; bg: string; ring: string; hex: string }> = {
  CRITICAL: { label: 'Critical', text: 'text-critical', bg: 'bg-critical', ring: 'ring-critical/30', hex: '#ff5a4e' },
  HIGH: { label: 'High', text: 'text-high', bg: 'bg-high', ring: 'ring-high/30', hex: '#ff9a3c' },
  MODERATE: { label: 'Moderate', text: 'text-moderate', bg: 'bg-moderate', ring: 'ring-moderate/30', hex: '#e9c46a' },
  LOW: { label: 'Low', text: 'text-low', bg: 'bg-low', ring: 'ring-low/30', hex: '#7fb69a' },
};

export const MESH_PRIORITY_HEX: Record<MeshPriority, string> = {
  CRITICAL: '#ff5a4e', HIGH: '#ff9a3c', MEDIUM: '#e9c46a', LOW: '#7fb69a',
};

export const MESH_TYPE_LABEL: Record<MeshEventType, string> = {
  PERSON_RESCUED: 'Person rescued', PERSON_MISSING: 'Person missing', PERSON_TRAPPED: 'People trapped',
  MEDICAL_EMERGENCY: 'Medical emergency', FIRE: 'Fire', FLOOD: 'Flooding', RESOURCE_REQUEST: 'Resource request',
  VOLUNTEER_STATUS: 'Volunteer status', DISASTER_STATUS: 'Situation update',
};

export const CATEGORY_HEX: Record<string, string> = {
  Cyclone: '#ff5a4e', Storm: '#ff7a6e', Flood: '#8fb3d9', Landslide: '#d4b483', Wildfire: '#ff9a3c', Heatwave: '#e9c46a',
  Earthquake: '#c9a2e8', Volcano: '#e07a5f', Drought: '#c8a165', 'Dust storm': '#b8a58a',
};

/** Where live incidents come from; shown wherever an incident's provenance is displayed. */
export const SOURCE_LABEL: Record<string, string> = {
  GDACS: 'GDACS · EC Joint Research Centre & UN OCHA', USGS: 'USGS Earthquake Hazards Program', 'NASA EONET': 'NASA Earth Observatory (EONET)',
};
