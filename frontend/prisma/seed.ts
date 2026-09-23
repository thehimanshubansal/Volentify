import { PrismaClient, Role, Severity, TaskStatus, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

const INDIAN_STATES_DISTRICTS = [
  { state: 'Odisha', districts: ['Puri', 'Bhadrak', 'Balasore', 'Jagatsinghpur', 'Kendrapara', 'Ganjam', 'Cuttack', 'Bhubaneswar'], centerLat: 19.8135, centerLng: 85.8312 },
  { state: 'Assam', districts: ['Kamrup', 'Barpeta', 'Dhubri', 'Majuli', 'Dhemaji', 'Cachar', 'Nagaon', 'Guwahati'], centerLat: 26.1445, centerLng: 91.7362 },
  { state: 'Kerala', districts: ['Wayanad', 'Idukki', 'Ernakulam', 'Alappuzha', 'Kottayam', 'Pathanamthitta', 'Malappuram'], centerLat: 11.6854, centerLng: 76.1320 },
  { state: 'Uttarakhand', districts: ['Chamoli', 'Rudraprayag', 'Uttarkashi', 'Pithoragarh', 'Nainital', 'Almora', 'Dehradun'], centerLat: 30.0668, centerLng: 79.0193 },
  { state: 'Himachal Pradesh', districts: ['Kangra', 'Mandi', 'Kullu', 'Shimla', 'Kinnaur', 'Lahaul and Spiti', 'Solan'], centerLat: 32.0998, centerLng: 76.2691 },
  { state: 'West Bengal', districts: ['South 24 Parganas', 'North 24 Parganas', 'Purba Medinipur', 'Howrah', 'Kolkata', 'Darjeeling'], centerLat: 22.5726, centerLng: 88.3639 },
  { state: 'Gujarat', districts: ['Kutch', 'Jamnagar', 'Porbandar', 'Junagadh', 'Dwarka', 'Surat', 'Ahmedabad'], centerLat: 23.2420, centerLng: 69.6669 },
  { state: 'Tamil Nadu', districts: ['Chennai', 'Cuddalore', 'Nagapattinam', 'Thanjavur', 'Kanyakumari', 'Thoothukudi'], centerLat: 13.0827, centerLng: 80.2707 },
  { state: 'Maharashtra', districts: ['Mumbai Suburban', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Kolhapur', 'Pune'], centerLat: 18.9220, centerLng: 72.8347 },
  { state: 'Bihar', districts: ['Patna', 'Bhagalpur', 'Katihar', 'Purnia', 'Muzaffarpur', 'Darbhanga', 'Saharsa'], centerLat: 25.5941, centerLng: 85.1376 },
  { state: 'Delhi NCR', districts: ['Central Delhi', 'East Delhi', 'North Delhi', 'South Delhi', 'Gurugram', 'Noida'], centerLat: 28.6139, centerLng: 77.2090 },
  { state: 'Rajasthan', districts: ['Jaisalmer', 'Bikaner', 'Barmer', 'Jodhpur', 'Churu', 'Jaipur'], centerLat: 26.9124, centerLng: 75.7873 },
];

const FIRST_NAMES = [
  'Aarav', 'Rahul', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Ananya', 'Rohan', 'Sneha', 'Deepak',
  'Pooja', 'Sanjay', 'Kavita', 'Rajesh', 'Meera', 'Arjun', 'Divya', 'Manoj', 'Nehal', 'Karan',
  'Isha', 'Alok', 'Shreya', 'Gaurav', 'Ritu', 'Nikhil', 'Tanvi', 'Vikas', 'Swati', 'Manish'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Verma', 'Das', 'Mukherjee', 'Nair', 'Reddy', 'Banerjee', 'Iyer',
  'Joshi', 'Gupta', 'Choudhury', 'Rao', 'Bose', 'Mohanty', 'Mishra', 'Pandey', 'Kulkarni', 'Bhatt'
];

const SKILL_SETS = [
  ['Rescue & Search', 'Boat Operator', 'Swift Water Rescue'],
  ['Paramedic', 'Trauma Triage', 'First Aid Specialist'],
  ['Food & Shelter Logistics', 'Supply Chain Management'],
  ['Debris Clearing', 'Heavy Machinery Operation'],
  ['Drone Pilot', 'Aerial Damage Assessment', 'GIS Mapping'],
  ['Crisis Communications', 'HAM Radio Operator'],
  ['Child & Elderly Care', 'Psychosocial Support'],
  ['Civil Defense', 'Firefighting & HAZMAT'],
  ['Blood Donor Coordinator', 'Emergency Medical Supplies'],
  ['Ambulance Driver', 'Off-road Evacuation Logistics']
];

const DISASTER_TYPES = [
  { type: 'Cyclone', severities: [Severity.CRITICAL, Severity.HIGH], namePrefix: 'Severe Cyclonic Storm' },
  { type: 'Flood', severities: [Severity.CRITICAL, Severity.HIGH, Severity.MODERATE], namePrefix: 'River Basin Flash Flood' },
  { type: 'Wildfire', severities: [Severity.HIGH, Severity.CRITICAL], namePrefix: 'Forest Canopy Fireline' },
  { type: 'Landslide', severities: [Severity.CRITICAL, Severity.HIGH], namePrefix: 'Slope Debris Flow' },
  { type: 'Earthquake', severities: [Severity.CRITICAL, Severity.HIGH, Severity.MODERATE], namePrefix: 'Seismic Rupture Event' },
  { type: 'Heatwave', severities: [Severity.HIGH, Severity.MODERATE], namePrefix: 'Extreme Meteorological Heatwave' },
];

const ORG_TYPES = [
  { category: 'NDRF', namePrefix: 'National Disaster Response Force (NDRF) Battalion' },
  { category: 'SDRF', namePrefix: 'State Disaster Response Force (SDRF) Unit' },
  { category: 'RED_CROSS', namePrefix: 'Indian Red Cross Society Emergency Wing' },
  { category: 'CIVIL_DEFENSE', namePrefix: 'Civil Defense Rapid Response Volunteer Corps' },
  { category: 'LOCAL_NGO', namePrefix: 'Volentify Humanitarian Relief Foundation' },
];

export async function generate100SampleData() {
  console.log('--- Generating 100+ Complete Sample Records for Volentify Database ---');

  // 1. Generate 100 Organizations
  console.log('Creating 100 Organizations...');
  const organizations = [];
  for (let i = 1; i <= 100; i++) {
    const loc = INDIAN_STATES_DISTRICTS[i % INDIAN_STATES_DISTRICTS.length];
    const orgType = ORG_TYPES[i % ORG_TYPES.length];
    const district = loc.districts[i % loc.districts.length];
    const org = await prisma.organization.upsert({
      where: { name: `${orgType.namePrefix} #${i.toString().padStart(3, '0')} (${district})` },
      update: {},
      create: {
        name: `${orgType.namePrefix} #${i.toString().padStart(3, '0')} (${district})`,
        category: orgType.category,
        state: loc.state,
        district: district,
        contactEmail: `dispatch.unit${i}@${orgType.category.toLowerCase()}.org.in`,
        contactPhone: `+91 ${9800000000 + i}`,
        registrationNo: `IND-DRM-2026-${1000 + i}`,
        verified: true,
      }
    });
    organizations.push(org);
  }

  // 2. Generate 120 Users & Volunteer Profiles
  console.log('Creating 120 Users & Volunteer Profiles across 5 Roles...');
  const roles = [Role.VOLUNTEER, Role.VOLUNTEER, Role.VOLUNTEER, Role.NGO_MEMBER, Role.RESEARCHER, Role.CITIZEN, Role.INCIDENT_ADMIN];
  const users = [];

  for (let i = 1; i <= 120; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const loc = INDIAN_STATES_DISTRICTS[i % INDIAN_STATES_DISTRICTS.length];
    const district = loc.districts[i % loc.districts.length];
    const role = roles[i % roles.length];
    const org = organizations[i % organizations.length];

    // Jitter coordinates around district center
    const lat = loc.centerLat + (Math.sin(i * 1.5) * 0.15);
    const lng = loc.centerLng + (Math.cos(i * 1.5) * 0.15);

    const user = await prisma.user.upsert({
      where: { email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@volentify.org` },
      update: {},
      create: {
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@volentify.org`,
        phone: `+91 ${9811000000 + i}`,
        passwordHash: 'volentify_secure_pbkdf2_hash_2026',
        role: role,
        stateDistrict: `${district}, ${loc.state}`,
        isVerified: i % 4 !== 0, // 75% verified
        orgId: (role === Role.NGO_MEMBER || role === Role.INCIDENT_ADMIN) ? org.id : null,
      }
    });
    users.push(user);

    // If Volunteer, create VolunteerProfile
    if (role === Role.VOLUNTEER || i <= 100) {
      const skills = SKILL_SETS[i % SKILL_SETS.length];
      const availability = i % 10 === 0 ? 'OFFLINE' : i % 5 === 0 ? 'BUSY' : 'AVAILABLE';
      await prisma.volunteerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          skills: skills,
          currentLat: lat,
          currentLng: lng,
          locationName: `${district}, ${loc.state}`,
          availability: availability,
          missionsDone: (i * 7) % 35,
          totalHours: Math.round(((i * 14.5) % 240) * 10) / 10,
          equipment: ['VHF Radio', 'Emergency Medical Trauma Pouch', 'High-Vis Life Jacket'],
          badgeLevel: i % 3 === 0 ? 'Tier-1 Tactical Specialist' : 'Field Responder',
          responseRate: Math.round((92.0 + (i % 8)) * 10) / 10,
        }
      });
    }
  }

  // 3. Generate 100 Disasters
  console.log('Creating 100 Disaster Incidents with GeoJSON Polygons & Telemetry...');
  const disasters = [];
  for (let i = 1; i <= 100; i++) {
    const loc = INDIAN_STATES_DISTRICTS[i % INDIAN_STATES_DISTRICTS.length];
    const district = loc.districts[i % loc.districts.length];
    const dType = DISASTER_TYPES[i % DISASTER_TYPES.length];
    const severity = dType.severities[i % dType.severities.length];
    const org = organizations[i % organizations.length];

    const lat = loc.centerLat + (Math.sin(i * 2.1) * 0.25);
    const lng = loc.centerLng + (Math.cos(i * 2.1) * 0.25);
    const code = `DIS-${2026}-${i.toString().padStart(3, '0')}`;

    const disaster = await prisma.disaster.upsert({
      where: { code: code },
      update: {},
      create: {
        code: code,
        title: `${dType.namePrefix} in ${district} Sector`,
        category: dType.type,
        severity: severity,
        lat: lat,
        lng: lng,
        location: `${district}, ${loc.state}`,
        state: loc.state,
        radiusKm: 15.0 + ((i * 3) % 45),
        status: i % 8 === 0 ? 'CONTAINED' : i % 5 === 0 ? 'MONITORING' : 'ACTIVE',
        affectedPop: `${((i * 18) % 250 + 10)}K`,
        summary: `Automated Laya OSINT telemetry confirms ${severity.toLowerCase()} ${dType.type.toLowerCase()} activity across ${district} river/coastal zones. Evacuation and relief task dispatches active.`,
        windSpeedKmh: dType.type === 'Cyclone' ? 90.0 + ((i * 5) % 75) : 15.0 + (i % 25),
        rainfallMm: dType.type === 'Flood' ? 180.0 + ((i * 12) % 220) : 25.0 + (i % 80),
        surgeMeters: dType.type === 'Cyclone' || dType.type === 'Flood' ? Math.round((1.2 + (i % 3.5)) * 10) / 10 : 0.0,
        orgId: org.id,
      }
    });
    disasters.push(disaster);
  }

  // 4. Generate 110 Tasks (Relief Missions)
  console.log('Creating 110 Relief Tasks & Dispatch Requests...');
  for (let i = 1; i <= 110; i++) {
    const disaster = disasters[i % disasters.length];
    const creator = users.find(u => u.role === Role.NGO_MEMBER || u.role === Role.INCIDENT_ADMIN) || users[0];
    const volunteerUser = users.find((u, idx) => u.role === Role.VOLUNTEER && idx % 3 === 0);
    const skillList = ['Rescue & Search', 'Paramedic', 'Food & Shelter Logistics', 'Debris Clearing', 'Drone Pilot', 'Boat Operator'];
    const requiredSkill = skillList[i % skillList.length];
    const urgency = [Severity.CRITICAL, Severity.HIGH, Severity.MODERATE, Severity.LOW][i % 4];

    await prisma.task.upsert({
      where: { code: `TSK-${i.toString().padStart(3, '0')}` },
      update: {},
      create: {
        code: `TSK-${i.toString().padStart(3, '0')}`,
        title: `${requiredSkill} Deployment for ${disaster.location}`,
        description: `Urgent mission dispatched under ${disaster.title}. Requires ${requiredSkill} equipped with standard PPE and satellite comms.`,
        urgency: urgency,
        requiredSkill: requiredSkill,
        lat: disaster.lat + (Math.sin(i) * 0.05),
        lng: disaster.lng + (Math.cos(i) * 0.05),
        locationName: disaster.location,
        quantityNeeded: (i % 12) + 2,
        status: i % 4 === 0 ? TaskStatus.COMPLETED : i % 3 === 0 ? TaskStatus.IN_PROGRESS : TaskStatus.OPEN,
        disasterId: disaster.id,
        createdById: creator.id,
        assignedToId: i % 2 === 0 && volunteerUser ? volunteerUser.id : null,
      }
    });
  }

  // 5. Generate 100 Evidence & Field Reports
  console.log('Creating 100 Evidence Items & Multilingual SOS Reports...');
  const sources = [
    { name: 'IMD Coastal Doppler Radar', type: SourceType.OFFICIAL },
    { name: 'Central Water Commission (CWC) Gauge', type: SourceType.SENSOR },
    { name: 'NDRF Tactical Comms Unit', type: SourceType.OFFICIAL },
    { name: 'Press Trust of India (PTI) Wire', type: SourceType.NEWS },
    { name: 'X / Twitter SOS Real-Time Stream', type: SourceType.SOCIAL },
    { name: 'Citizen WhatsApp Emergency Helpline', type: SourceType.CITIZEN },
  ];

  const claims = [
    'River level crossed red danger mark by 1.85m; 4 villages cut off from road access.',
    'Wind gusts of 142 km/h damaging coastal power transmission towers near harbor.',
    'Helicopter airdrop completed 450 food & dry ration packets across flood-isolated sector.',
    'Debris flow triggered rockfall along National Highway; SDRF heavy loaders clearing path.',
    'Medical trauma center established at primary community health shelter; 24 wounded treated.',
    'Tidal surge inundating low-lying paddy fields; 2,500 villagers moved to cyclone shelter.',
  ];

  for (let i = 1; i <= 100; i++) {
    const disaster = disasters[i % disasters.length];
    const src = sources[i % sources.length];
    const author = users[i % users.length];

    await prisma.evidence.create({
      data: {
        disasterId: disaster.id,
        authorId: author.id,
        source: `${src.name} #${(i % 12) + 1}`,
        sourceType: src.type,
        claimText: `${claims[i % claims.length]} [Report ID: REF-2026-${100 + i}]`,
        relation: i % 6 === 0 ? 'CONFLICTING' : i % 8 === 0 ? 'DUPLICATE' : 'SUPPORTING',
        confidence: Math.round((0.85 + (i % 14) * 0.01) * 100) / 100,
        language: ['en', 'hi', 'or', 'bn', 'ta', 'ml'][i % 6],
      }
    });
  }

  // 6. Generate 100 Alerts
  console.log('Creating 100 Emergency Broadcast Alerts...');
  for (let i = 1; i <= 100; i++) {
    const disaster = disasters[i % disasters.length];
    const sender = users.find(u => u.role === Role.INCIDENT_ADMIN) || users[0];

    await prisma.alert.upsert({
      where: { code: `ALT-BRDCST-${i.toString().padStart(3, '0')}` },
      update: {},
      create: {
        code: `ALT-BRDCST-${i.toString().padStart(3, '0')}`,
        title: `EMERGENCY ALERT: ${disaster.title}`,
        category: disaster.category,
        level: disaster.severity,
        location: disaster.location,
        state: disaster.state,
        description: `Immediate advisory issued for ${disaster.location}. Estimated wind speed: ${disaster.windSpeedKmh || 45} km/h, surge: ${disaster.surgeMeters || 1.2}m.`,
        advisory: 'Follow SDRF/NDRF evacuation directives immediately. Move to designated concrete cyclone/flood shelters. Helpline: 1070 / 112.',
        disasterId: disaster.id,
        senderId: sender.id,
      }
    });
  }

  console.log('✅ Successfully seeded at least 100 records for every table in Prisma ORM!');
}

generate100SampleData()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
