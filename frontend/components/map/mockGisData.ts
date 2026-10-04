export interface MapFeatureNode {
  id: string;
  name: string;
  category: 'hazard' | 'hospital' | 'shelter' | 'volunteer' | 'agency';
  subType: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'INFO';
  lat: number;
  lng: number;
  details: string;
  contact?: string;
  status: string;
  updatedAt: string;
  location?: string;
  state?: string;
  skills?: string[];
  equipment?: string[];
  missionsDone?: number;
  totalHours?: number;
  responseRate?: number;
  windSpeed?: number;
  rainfallMm?: number;
  affectedPop?: string;
  bedsTotal?: number;
  bedsAvailable?: number;
  icuAvailable?: number;
  capacity?: number;
  currentOccupancy?: number;
  rationDays?: number;
  medicalOfficer?: string;
}

export interface TacticalSector {
  id: string;
  name: string;
  icon: string;
  tag: string;
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  description: string;
  activeHazardsCount: number;
  criticality: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'STABLE';
}

export const TACTICAL_SECTORS: TacticalSector[] = [
  {
    id: 'pan-india',
    name: 'Pan-India God\'s Eye',
    icon: '🛰️',
    tag: 'NATIONAL COMMAND',
    center: [78.9629, 21.5937],
    zoom: 4.8,
    pitch: 52,
    bearing: -10,
    description: 'Strategic satellite surveillance over all Indian disaster operational sectors.',
    activeHazardsCount: 12,
    criticality: 'CRITICAL'
  },
  {
    id: 'bay-of-bengal',
    name: 'Bay of Bengal Cyclone Corridor',
    icon: '🌀',
    tag: 'EASTERN SECTOR',
    center: [86.2500, 20.1500],
    zoom: 7.2,
    pitch: 58,
    bearing: -22,
    description: 'High cyclonic surge activity across Puri, Balasore, Kendrapara & Sunderbans coasts.',
    activeHazardsCount: 3,
    criticality: 'CRITICAL'
  },
  {
    id: 'brahmaputra',
    name: 'Brahmaputra Flood Plain',
    icon: '🌊',
    tag: 'NORTHEAST SECTOR',
    center: [92.8000, 26.5000],
    zoom: 7.4,
    pitch: 50,
    bearing: 15,
    description: 'Riverine overflow and flash inundation across Majuli, Barpeta and Kamrup districts.',
    activeHazardsCount: 2,
    criticality: 'CRITICAL'
  },
  {
    id: 'himalayan',
    name: 'Himalayan Ridge & Slopes',
    icon: '⛰️',
    tag: 'NORTHERN SECTOR',
    center: [79.2000, 30.3000],
    zoom: 7.8,
    pitch: 62,
    bearing: -35,
    description: 'Seismic vulnerability and slope debris flow hazard monitoring in Chamoli & Shimla.',
    activeHazardsCount: 2,
    criticality: 'HIGH'
  },
  {
    id: 'western-ghats',
    name: 'Western Ghats Monsoon Basin',
    icon: '🌧️',
    tag: 'SOUTHERN SECTOR',
    center: [76.1320, 11.6854],
    zoom: 8.0,
    pitch: 55,
    bearing: 10,
    description: 'Intense precipitation and high-gradient slope saturation in Wayanad & Idukki.',
    activeHazardsCount: 2,
    criticality: 'HIGH'
  },
  {
    id: 'central-forest',
    name: 'Central Dry Deciduous Belt',
    icon: '🔥',
    tag: 'CENTRAL SECTOR',
    center: [81.0200, 23.7000],
    zoom: 7.2,
    pitch: 48,
    bearing: 5,
    description: 'Thermal hotspot anomalies and dry season forest canopy firelines in Madhya Pradesh.',
    activeHazardsCount: 1,
    criticality: 'MODERATE'
  }
];

export const MOCK_DISASTERS: MapFeatureNode[] = [
  {
    id: 'DIS-2026-001',
    name: 'Super Cyclone Dana Eye Impact',
    category: 'hazard',
    subType: 'Cyclone',
    severity: 'CRITICAL',
    lat: 19.8135,
    lng: 85.8312,
    details: 'Category 4 cyclonic storm with sustained winds at 135 km/h. Coastal surge warning active along Puri-Bhadrak strip. 45 NDRF teams deployed.',
    status: 'RED ALERT - ACTIVE IMPACT',
    updatedAt: 'Live Telemetry (3 min ago)',
    location: 'Puri Coastal Corridor',
    state: 'Odisha',
    windSpeed: 135,
    rainfallMm: 240,
    affectedPop: '1.4M Citizens',
    contact: '+91 674 2395398 (SRC Odisha)'
  },
  {
    id: 'DIS-2026-002',
    name: 'Brahmaputra Basin Flash Inundation',
    category: 'hazard',
    subType: 'Flood',
    severity: 'CRITICAL',
    lat: 26.9600,
    lng: 94.2167,
    details: 'Brahmaputra flowing 1.8m above danger mark at Neamatighat. Over 68 riverine villages submerged. SDRF boat rescue units mobilized.',
    status: 'CRITICAL FLOODING',
    updatedAt: 'Live Telemetry (7 min ago)',
    location: 'Majuli River Island',
    state: 'Assam',
    windSpeed: 42,
    rainfallMm: 310,
    affectedPop: '420K Citizens',
    contact: '+91 361 2237011 (ASDMA Control)'
  },
  {
    id: 'DIS-2026-003',
    name: 'Wayanad Mountain Slope Debris Flow',
    category: 'hazard',
    subType: 'Landslide',
    severity: 'CRITICAL',
    lat: 11.6854,
    lng: 76.1320,
    details: 'Massive mudslide triggered by 48-hour continuous torrential monsoon downpour. Road connectivity blocked on NH-766.',
    status: 'ACTIVE EVACUATION',
    updatedAt: 'Live Telemetry (12 min ago)',
    location: 'Meppadi / Chooralmala Ridge',
    state: 'Kerala',
    windSpeed: 35,
    rainfallMm: 380,
    affectedPop: '85K Citizens',
    contact: '+91 4936 204151 (District Collectorate)'
  },
  {
    id: 'DIS-2026-004',
    name: 'Chamoli Glacial Slope Breach',
    category: 'hazard',
    subType: 'Landslide',
    severity: 'HIGH',
    lat: 30.5500,
    lng: 79.5700,
    details: 'Upper catchment slope instability and rock-debris slide blocking Alaknanda tributary. Heavy machinery deployed for clearing.',
    status: 'TACTICAL MONITORING',
    updatedAt: 'Live Telemetry (18 min ago)',
    location: 'Joshimath Sector',
    state: 'Uttarakhand',
    windSpeed: 28,
    rainfallMm: 120,
    affectedPop: '32K Citizens',
    contact: '+91 1372 252107 (USDMA Chamoli)'
  },
  {
    id: 'DIS-2026-005',
    name: 'Bandhavgarh Thermal Canopy Fireline',
    category: 'hazard',
    subType: 'Wildfire',
    severity: 'HIGH',
    lat: 23.7000,
    lng: 81.0200,
    details: 'Fast-spreading forest canopy fire detected by MODIS thermal sensors. Fire breaks being created by forest rangers and civil volunteers.',
    status: 'CONTAINMENT ACTIVE',
    updatedAt: 'Live Telemetry (25 min ago)',
    location: 'Tala Forest Range',
    state: 'Madhya Pradesh',
    windSpeed: 48,
    rainfallMm: 0,
    affectedPop: '12K Citizens & Wildlife',
    contact: '+91 7627 265364 (Forest Control)'
  },
  {
    id: 'DIS-2026-006',
    name: 'Kachchh Faultline Seismic Swarm',
    category: 'hazard',
    subType: 'Earthquake',
    severity: 'MODERATE',
    lat: 23.4200,
    lng: 70.3600,
    details: 'Magnitude 4.7 seismic event at 12km depth. Minor structural tremors reported in Bhachau and Gandhidham. Structural integrity inspection underway.',
    status: 'SEISMIC WATCH',
    updatedAt: 'Live Telemetry (32 min ago)',
    location: 'Bhachau Sub-Division',
    state: 'Gujarat',
    windSpeed: 18,
    rainfallMm: 0,
    affectedPop: '190K Citizens',
    contact: '+91 2832 250020 (GSDMA Bhuj)'
  },
  {
    id: 'DIS-2026-007',
    name: 'Sunderbans Tidal Surge & Cyclone Remal',
    category: 'hazard',
    subType: 'Cyclone',
    severity: 'CRITICAL',
    lat: 21.8000,
    lng: 88.9000,
    details: 'Storm surge reaching 3.2m above astronomical tide level. Coastal embankments breached in Gosaba and Kakdwip.',
    status: 'MASS EVACUATION',
    updatedAt: 'Live Telemetry (15 min ago)',
    location: 'Gosaba Island Delta',
    state: 'West Bengal',
    windSpeed: 120,
    rainfallMm: 290,
    affectedPop: '650K Citizens',
    contact: '+91 33 22143526 (WB Disaster Dept)'
  },
  {
    id: 'DIS-2026-008',
    name: 'Mumbai Urban Flash Inundation',
    category: 'hazard',
    subType: 'Flood',
    severity: 'HIGH',
    lat: 19.0760,
    lng: 72.8777,
    details: 'Mithi river water levels near overflow threshold. Low-lying areas in Kurla, Sion, and Hindmata experiencing high waterlogging.',
    status: 'PUMPING STATIONS ACTIVE',
    updatedAt: 'Live Telemetry (10 min ago)',
    location: 'Kurla West / Mithi Basin',
    state: 'Maharashtra',
    windSpeed: 55,
    rainfallMm: 210,
    affectedPop: '800K Commuters',
    contact: '+91 22 22694727 (BMC Disaster Room)'
  }
];

export const MOCK_VOLUNTEERS: MapFeatureNode[] = [
  {
    id: 'VOL-IND-001',
    name: 'Captain Vikram Rathore',
    category: 'volunteer',
    subType: 'Swift Water Rescue Lead',
    status: 'AVAILABLE',
    lat: 19.8250,
    lng: 85.8450,
    details: 'Ex-Navy diver certified in swift water rescue, night boating, and high-current debris navigation. Stationed at Puri response base.',
    updatedAt: 'Live Telemetry',
    location: 'Puri Sector HQ, Odisha',
    skills: ['Swift Water Rescue', 'Zodiac Operator', 'Trauma Triage', 'Night Diving'],
    equipment: ['Zodiac Combat Boat', 'Sonar Scanner', 'Satellite Radio', 'Oxygen Rigs'],
    missionsDone: 28,
    totalHours: 164.5,
    responseRate: 99.2,
    contact: '+91 98450 11223'
  },
  {
    id: 'VOL-IND-002',
    name: 'Dr. Ananya Sengupta',
    category: 'volunteer',
    subType: 'Emergency Trauma Surgeon',
    status: 'AVAILABLE',
    lat: 19.7990,
    lng: 85.8150,
    details: 'Senior field surgeon experienced in mass casualty trauma stabilization and mobile field hospital triage.',
    updatedAt: 'Live Telemetry',
    location: 'District Trauma Post, Puri',
    skills: ['Trauma Surgery', 'Mass Casualty Triage', 'Emergency HAZMAT', 'Pediatric Life Support'],
    equipment: ['Portable Surgical Kit', 'Ultrasound V-Scan', 'Defibrillator', 'Hemostatic Agents'],
    missionsDone: 34,
    totalHours: 210.0,
    responseRate: 98.7,
    contact: '+91 97321 44556'
  },
  {
    id: 'VOL-IND-003',
    name: 'Rohan Bordoloi',
    category: 'volunteer',
    subType: 'Thermal Drone Recon Pilot',
    status: 'AVAILABLE',
    lat: 26.9450,
    lng: 94.2050,
    details: 'DGCA certified heavy drone pilot specializing in thermal search of submerged villages and flood relief dropping.',
    updatedAt: 'Live Telemetry',
    location: 'Majuli Island Base, Assam',
    skills: ['Drone Reconnaissance', 'Thermal Mapping', 'Air Dropping Logistics', 'GIS Telemetry'],
    equipment: ['DJI Matrice 350 RTK', 'Zenmuse H20N Night Camera', 'Portable Starlink', 'Payload Drop Winch'],
    missionsDone: 19,
    totalHours: 92.0,
    responseRate: 97.5,
    contact: '+91 94350 88991'
  },
  {
    id: 'VOL-IND-004',
    name: 'Arjun Nambiar',
    category: 'volunteer',
    subType: 'Mountain K9 Search Handler',
    status: 'AVAILABLE',
    lat: 11.6780,
    lng: 76.1250,
    details: 'Certified mountain search and rescue handler with trained avalanche/mudslide locator Belgian Malinois dog.',
    updatedAt: 'Live Telemetry',
    location: 'Chooralmala Sector, Kerala',
    skills: ['K9 Debris Search', 'Rope Rescue', 'Wilderness First Aid', 'Cave & Tunnel Exploration'],
    equipment: ['K9 Tracking Harness', 'Avalanche Transceiver', 'Climbing Hardware', 'GPS Collar'],
    missionsDone: 15,
    totalHours: 88.0,
    responseRate: 96.8,
    contact: '+91 94471 22334'
  },
  {
    id: 'VOL-IND-005',
    name: 'Sneha Kulkarni',
    category: 'volunteer',
    subType: 'Ambulance Off-road Pilot',
    status: 'BUSY',
    lat: 19.0650,
    lng: 72.8650,
    details: 'Currently deployed in flood evacuation shuttle in Kurla. Specialized in 4x4 high-clearance water transit.',
    updatedAt: 'Live Telemetry',
    location: 'Kurla Emergency Lane, Mumbai',
    skills: ['4x4 Off-road Driving', 'Ambulance Evacuation', 'Emergency CPR', 'Crowd Coordination'],
    equipment: ['High-Snorkel 4x4 Ambulance', 'Foldable Spine Boards', 'Oxygen Concentrator', 'Winch Rigs'],
    missionsDone: 22,
    totalHours: 135.0,
    responseRate: 98.1,
    contact: '+91 98200 55667'
  },
  {
    id: 'VOL-IND-006',
    name: 'Manoj Joshi',
    category: 'volunteer',
    subType: 'High-Altitude Rope Technician',
    status: 'AVAILABLE',
    lat: 30.5350,
    lng: 79.5600,
    details: 'IRATA Level 3 rope access specialist. Stationed along steep slope failure zones in Joshimath.',
    updatedAt: 'Live Telemetry',
    location: 'Joshimath Ridge, Uttarakhand',
    skills: ['High Angle Rope Access', 'Heavy Rigging', 'Debris Shoring', 'Anchor Systems'],
    equipment: ['Static Kernmantle Ropes', 'Titanium Stretcher', 'Pneumatic Drill', 'Pulleys & Hauling Rigs'],
    missionsDone: 17,
    totalHours: 115.0,
    responseRate: 95.4,
    contact: '+91 94120 77889'
  },
  {
    id: 'VOL-IND-007',
    name: 'Pooja Bhatt',
    category: 'volunteer',
    subType: 'HAM Radio Emergency Comms',
    status: 'AVAILABLE',
    lat: 23.4100,
    lng: 70.3450,
    details: 'Licensed amateur radio operator maintaining HF emergency disaster net when cellular infrastructure fails.',
    updatedAt: 'Live Telemetry',
    location: 'Bhachau Comms Post, Gujarat',
    skills: ['HAM Radio Comms', 'HF Winlink Data', 'Solar Field Power', 'Disaster Telemetry'],
    equipment: ['Yaesu FT-891 HF Radio', 'Solar Battery Bank', 'Dipole Antenna Mast', 'Satellite Beacon'],
    missionsDone: 24,
    totalHours: 156.0,
    responseRate: 99.0,
    contact: '+91 98251 33445'
  },
  {
    id: 'VOL-IND-008',
    name: 'Kavita Das',
    category: 'volunteer',
    subType: 'Water Purification & Logistics',
    status: 'AVAILABLE',
    lat: 21.8150,
    lng: 88.8800,
    details: 'Water chemistry technician deploying reverse osmosis emergency desalination plants for islanders.',
    updatedAt: 'Live Telemetry',
    location: 'Gosaba Jetty, West Bengal',
    skills: ['Water Purification', 'Disinfection Systems', 'Supply Chain Logistics', 'Community Health'],
    equipment: ['Mobile Solar RO Plant (500L/hr)', 'Chlorination Tablets', 'Water Testing Lab Kit'],
    missionsDone: 12,
    totalHours: 74.0,
    responseRate: 96.0,
    contact: '+91 98302 99112'
  }
];

export const MOCK_HOSPITALS: MapFeatureNode[] = [
  {
    id: 'HOSP-IND-001',
    name: 'AIIMS Coastal Trauma & Disaster Center',
    category: 'hospital',
    subType: 'Apex Trauma Center',
    status: 'HIGH READINESS',
    lat: 19.8350,
    lng: 85.8600,
    details: 'Designated coastal disaster apex trauma center equipped with helipad, 40-bed burn unit, and emergency blood bank.',
    updatedAt: 'Live Telemetry (5 min ago)',
    location: 'Puri Bypass Road',
    state: 'Odisha',
    bedsTotal: 450,
    bedsAvailable: 118,
    icuAvailable: 24,
    medicalOfficer: 'Dr. S. Mohapatra, MD',
    contact: '+91 674 2476789'
  },
  {
    id: 'HOSP-IND-002',
    name: 'Jorhat Medical College Emergency Wing',
    category: 'hospital',
    subType: 'District Referral Hospital',
    status: 'ACTIVE MASS CASUALTY PROTOCOL',
    lat: 26.7500,
    lng: 94.2200,
    details: 'Receiving boat evacuees from Majuli. Equipped with infectious waterborne disease isolation ward and portable dialysis.',
    updatedAt: 'Live Telemetry (12 min ago)',
    location: 'Jorhat City',
    state: 'Assam',
    bedsTotal: 320,
    bedsAvailable: 64,
    icuAvailable: 12,
    medicalOfficer: 'Dr. B. K. Saikia, MS',
    contact: '+91 376 2370107'
  },
  {
    id: 'HOSP-IND-003',
    name: 'Mananthavady District Trauma Hospital',
    category: 'hospital',
    subType: 'Trauma & Orthopedic Center',
    status: 'SURGE CAPACITY ACTIVE',
    lat: 11.8020,
    lng: 76.0040,
    details: 'Directly handling landslide trauma admissions from Chooralmala and Meppadi. 6 operating theaters active.',
    updatedAt: 'Live Telemetry (8 min ago)',
    location: 'Mananthavady, Wayanad',
    state: 'Kerala',
    bedsTotal: 280,
    bedsAvailable: 42,
    icuAvailable: 8,
    medicalOfficer: 'Dr. P. Radhakrishnan',
    contact: '+91 4935 240223'
  },
  {
    id: 'HOSP-IND-004',
    name: 'AIIMS Rishikesh High-Altitude Trauma Facility',
    category: 'hospital',
    subType: 'Super-Specialty Trauma Center',
    status: 'NORMAL READINESS',
    lat: 30.0760,
    lng: 78.2880,
    details: 'Equipped with air-ambulance airlift receiving facilities, hyperbaric oxygen chambers, and hypothermia warming units.',
    updatedAt: 'Live Telemetry (20 min ago)',
    location: 'Virbhadra Road, Rishikesh',
    state: 'Uttarakhand',
    bedsTotal: 600,
    bedsAvailable: 195,
    icuAvailable: 38,
    medicalOfficer: 'Dr. R. Nautiyal',
    contact: '+91 135 2462929'
  }
];

export const MOCK_SHELTERS: MapFeatureNode[] = [
  {
    id: 'SHELTER-IND-001',
    name: 'Puri Marine Multi-Purpose Cyclone Shelter #04',
    category: 'shelter',
    subType: 'Reinforced Cyclone Shelter',
    status: 'OPEN & OPERATIONAL',
    lat: 19.8050,
    lng: 85.8050,
    details: 'Engineered for 200 km/h gusts with solar microgrid, reverse osmosis water plant, and maternity corner.',
    updatedAt: 'Live Telemetry (4 min ago)',
    location: 'Brahmagiri Road, Puri',
    state: 'Odisha',
    capacity: 1200,
    currentOccupancy: 860,
    rationDays: 14,
    contact: '+91 674 2390111'
  },
  {
    id: 'SHELTER-IND-002',
    name: 'Kamalabari High-Ground Flood Relief Camp',
    category: 'shelter',
    subType: 'Flood Relief Camp',
    status: 'OPEN - NEAR CAPACITY',
    lat: 26.9300,
    lng: 94.1800,
    details: 'Raised plinth shelter housing families evacuated from low-lying chars. Clean sanitation blocks operational.',
    updatedAt: 'Live Telemetry (10 min ago)',
    location: 'Kamalabari, Majuli',
    state: 'Assam',
    capacity: 800,
    currentOccupancy: 740,
    rationDays: 10,
    contact: '+91 361 2548899'
  },
  {
    id: 'SHELTER-IND-003',
    name: 'Meppadi Community Relief Shelter',
    category: 'shelter',
    subType: 'Municipal Disaster Center',
    status: 'OPEN & OPERATIONAL',
    lat: 11.5500,
    lng: 76.1200,
    details: 'Temporary rehabilitation shelter with trauma counselors, infant nutrition center, and hot meal community kitchen.',
    updatedAt: 'Live Telemetry (15 min ago)',
    location: 'Meppadi Town Hall, Wayanad',
    state: 'Kerala',
    capacity: 650,
    currentOccupancy: 490,
    rationDays: 12,
    contact: '+91 4936 282244'
  },
  {
    id: 'SHELTER-IND-004',
    name: 'Kakdwip Coastal Resettlement Shelter',
    category: 'shelter',
    subType: 'Cyclone & Surge Shelter',
    status: 'OPEN & OPERATIONAL',
    lat: 21.8700,
    lng: 88.1900,
    details: 'Equipped with cattle protection enclosure on ground tier, civilian dormitories on upper tiers, and diesel backup generators.',
    updatedAt: 'Live Telemetry (22 min ago)',
    location: 'Kakdwip Port Sector, West Bengal',
    state: 'West Bengal',
    capacity: 950,
    currentOccupancy: 610,
    rationDays: 16,
    contact: '+91 33 24391200'
  }
];
