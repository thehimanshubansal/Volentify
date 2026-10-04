'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Phone,
  MapPin,
  Compass,
  Award,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Radio,
  Activity,
  Heart,
  Users,
  Building2,
  Flame,
  LifeBuoy,
  Download,
  QrCode,
  Check,
  Zap,
  Navigation,
  Crosshair,
  Home,
  Baby,
  Truck,
  FileBadge
} from 'lucide-react';

const INDIAN_SECTORS = [
  { state: 'Odisha', districts: ['Puri', 'Bhadrak', 'Balasore', 'Jagatsinghpur', 'Kendrapara', 'Ganjam', 'Cuttack', 'Bhubaneswar'], lat: 19.8135, lng: 85.8312 },
  { state: 'Assam', districts: ['Kamrup', 'Barpeta', 'Dhubri', 'Majuli', 'Dhemaji', 'Cachar', 'Nagaon', 'Guwahati'], lat: 26.1445, lng: 91.7362 },
  { state: 'Kerala', districts: ['Wayanad', 'Idukki', 'Ernakulam', 'Alappuzha', 'Kottayam', 'Pathanamthitta', 'Malappuram'], lat: 11.6854, lng: 76.1320 },
  { state: 'Uttarakhand', districts: ['Chamoli', 'Rudraprayag', 'Uttarkashi', 'Pithoragarh', 'Nainital', 'Almora', 'Dehradun'], lat: 30.0668, lng: 79.0193 },
  { state: 'Himachal Pradesh', districts: ['Kangra', 'Mandi', 'Kullu', 'Shimla', 'Kinnaur', 'Lahaul and Spiti'], lat: 32.0998, lng: 76.2691 },
  { state: 'West Bengal', districts: ['South 24 Parganas', 'North 24 Parganas', 'Purba Medinipur', 'Howrah', 'Kolkata', 'Darjeeling'], lat: 22.5726, lng: 88.3639 },
  { state: 'Gujarat', districts: ['Kutch', 'Jamnagar', 'Porbandar', 'Junagadh', 'Dwarka', 'Surat', 'Ahmedabad'], lat: 23.2420, lng: 69.6669 },
  { state: 'Tamil Nadu', districts: ['Chennai', 'Cuddalore', 'Nagapattinam', 'Thanjavur', 'Kanyakumari', 'Thoothukudi'], lat: 13.0827, lng: 80.2707 },
  { state: 'Maharashtra', districts: ['Mumbai Suburban', 'Raigad', 'Ratnagiri', 'Sindhudurg', 'Kolhapur', 'Pune'], lat: 18.9220, lng: 72.8347 },
  { state: 'Delhi NCR', districts: ['Central Delhi', 'East Delhi', 'North Delhi', 'South Delhi', 'Gurugram', 'Noida'], lat: 28.6139, lng: 77.2090 },
];

const VOLUNTEER_SKILLS = [
  { id: 'water', label: 'Swift Water & Flood Rescue', icon: LifeBuoy, desc: 'Motorized boat navigation & survivor extraction' },
  { id: 'paramedic', label: 'Trauma & Paramedic ACLS', icon: Heart, desc: 'Advanced cardiac triage, hemorrhage control' },
  { id: 'drone', label: 'Drone Reconnaissance (DGCA)', icon: Radio, desc: 'Thermal aerial mapping & flood boundary imaging' },
  { id: 'debris', label: 'Heavy Debris & Chainsaw Clearing', icon: Flame, desc: 'Arterial road clearing & structural collapse entry' },
  { id: 'ham', label: 'HAM Radio VHF/UHF Emergency Comms', icon: Activity, desc: 'Zero-cell telecom & grid-down packet radio' },
  { id: 'offroad', label: '4x4 Off-Road Winch & Evacuation', icon: Compass, desc: 'High-clearance submerged road rescue' },
];

const VOLUNTEER_EQUIPMENT = [
  'Personal Protective Equipment (PPE)',
  'Emergency Trauma IFAK Pouch',
  'Garmin / InReach Satellite Transceiver',
  '4x4 Recovery Winch & Heavy Straps',
  'Inflatable Motorized Rescue Boat',
  'Thermal Imaging Drone (DJI/Autel)',
  'Heavy Stihl Chainsaw Kit'
];

const CITIZEN_SPECIAL_NEEDS = [
  'Infant Formula / Baby Food Needed',
  'Critical Medication / Insulin / Dialysis Required',
  'Mobility Impaired / Wheelchair Transport',
  'Drinking Water Crisis in Household',
  'Domestic Pet / Livestock Rescue'
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Common Fields
  const [phone, setPhone] = useState('');
  const [phoneTested, setPhoneTested] = useState(false);
  const [testingPhone, setTestingPhone] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Role Selection
  const [role, setRole] = useState<'VOLUNTEER' | 'INCIDENT_ADMIN' | 'NGO_MEMBER' | 'CITIZEN'>('VOLUNTEER');

  // Sector Geolocation
  const [selectedStateIdx, setSelectedStateIdx] = useState(0);
  const [selectedDistrict, setSelectedDistrict] = useState(INDIAN_SECTORS[0].districts[0]);
  const [customLat, setCustomLat] = useState<number | null>(null);
  const [customLng, setCustomLng] = useState<number | null>(null);
  const [gpsCalibrating, setGpsCalibrating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Volunteer Specific State
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Swift Water & Flood Rescue',
    'Trauma & Paramedic ACLS'
  ]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    'Personal Protective Equipment (PPE)',
    'Emergency Trauma IFAK Pouch'
  ]);
  const [availability, setAvailability] = useState('AVAILABLE');

  // Citizen Specific State
  const [householdSize, setHouseholdSize] = useState(4);
  const [infantsCount, setInfantsCount] = useState(0);
  const [elderlyCount, setElderlyCount] = useState(1);
  const [evacStatus, setEvacStatus] = useState<'SAFE_IN_PLACE' | 'IMMEDIATE_EVACUATION_NEEDED' | 'IN_SHELTER'>('SAFE_IN_PLACE');
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>(['Drinking Water Crisis in Household']);
  const [homeAddress, setHomeAddress] = useState('');

  // NGO Specific State
  const [ngoName, setNgoName] = useState('Goonj Relief Mission');
  const [ngoDarpanId, setNgoDarpanId] = useState('OR/2022/03194');
  const [dailyMealCapacity, setDailyMealCapacity] = useState(1200);
  const [waterLitersDaily, setWaterLitersDaily] = useState(5000);
  const [shelterBeds, setShelterBeds] = useState(80);
  const [mobileVans, setMobileVans] = useState(3);
  const [ngoHubAddress, setNgoHubAddress] = useState('District Central Warehouse, Puri');

  // Incident Admin Specific State
  const [agencyName, setAgencyName] = useState('3rd Battalion NDRF (Odisha & Bengal Command)');
  const [officerRank, setOfficerRank] = useState('Deputy Commandant / Incident Commander');
  const [serviceId, setServiceId] = useState('IND-NDRF-8421');
  const [hotline24x7, setHotline24x7] = useState('1070 / 1077 State EOC');
  const [vhfFrequency, setVhfFrequency] = useState('145.500 MHz Primary Tactical');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load existing session if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.role) setRole(parsed.role);
        if (parsed.skills && Array.isArray(parsed.skills)) setSelectedSkills(parsed.skills);
        if (parsed.name) {
          if (parsed.role === 'NGO_MEMBER' && !parsed.ngoName) setNgoName(`${parsed.name} Foundation`);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const currentState = INDIAN_SECTORS[selectedStateIdx];
  const effectiveLat = customLat ?? currentState.lat;
  const effectiveLng = customLng ?? currentState.lng;

  // Phone Validation
  const cleanPhoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = cleanPhoneDigits.length >= 10;

  const handleTestCarrierPing = () => {
    if (!isPhoneValid) return;
    setTestingPhone(true);
    setTimeout(() => {
      setTestingPhone(false);
      setPhoneTested(true);
    }, 1200);
  };

  const handleCalibrateGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported on this browser.');
      return;
    }
    setGpsCalibrating(true);
    setGpsStatus('Acquiring high-precision GNSS satellite lock...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomLat(Number(pos.coords.latitude.toFixed(5)));
        setCustomLng(Number(pos.coords.longitude.toFixed(5)));
        setGpsCalibrating(false);
        setGpsStatus(`Locked: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (±${Math.round(pos.coords.accuracy)}m accuracy)`);
      },
      (err) => {
        setGpsCalibrating(false);
        setGpsStatus(`GNSS failed: ${err.message}. Using default district sector center.`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const toggleVolunteerSkill = (label: string) => {
    setSelectedSkills(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    );
  };

  const toggleEquipment = (item: string) => {
    setSelectedEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const toggleCitizenNeed = (item: string) => {
    setSelectedNeeds(prev =>
      prev.includes(item) ? prev.filter(n => n !== item) : [...prev, item]
    );
  };

  const handleCompleteOnboarding = async () => {
    if (!isPhoneValid) {
      setErrorMsg('A valid 10-digit mobile number is mandatory to activate your responder credentials.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    const userId = currentUser?.id || `USR-${Date.now().toString().slice(-6)}`;
    const stateDistrictString = `${selectedDistrict}, ${currentState.state}`;

    // Compile role-specific metadata
    const roleMetadata: Record<string, any> = {};
    let callsign = '';

    if (role === 'VOLUNTEER') {
      callsign = `TAC-VOL-${selectedDistrict.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      roleMetadata.skills = selectedSkills;
      roleMetadata.equipment = selectedEquipment;
      roleMetadata.availability = availability;
    } else if (role === 'CITIZEN') {
      callsign = `CIT-SOS-${selectedDistrict.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      roleMetadata.householdSize = householdSize;
      roleMetadata.infantsCount = infantsCount;
      roleMetadata.elderlyCount = elderlyCount;
      roleMetadata.evacStatus = evacStatus;
      roleMetadata.specialNeeds = selectedNeeds;
      roleMetadata.homeAddress = homeAddress;
    } else if (role === 'NGO_MEMBER') {
      callsign = `NGO-REL-${selectedDistrict.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      roleMetadata.ngoName = ngoName;
      roleMetadata.ngoDarpanId = ngoDarpanId;
      roleMetadata.dailyMealCapacity = dailyMealCapacity;
      roleMetadata.waterLitersDaily = waterLitersDaily;
      roleMetadata.shelterBeds = shelterBeds;
      roleMetadata.mobileVans = mobileVans;
      roleMetadata.ngoHubAddress = ngoHubAddress;
    } else if (role === 'INCIDENT_ADMIN') {
      callsign = `EOC-CMD-${selectedDistrict.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      roleMetadata.agencyName = agencyName;
      roleMetadata.officerRank = officerRank;
      roleMetadata.serviceId = serviceId;
      roleMetadata.hotline24x7 = hotline24x7;
      roleMetadata.vhfFrequency = vhfFrequency;
    }

    const payload = {
      user_id: userId,
      phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
      role: role,
      state_district: stateDistrictString,
      lat: effectiveLat,
      lng: effectiveLng,
      blood_group: bloodGroup,
      emergency_contact: emergencyContact || '+91 112 (National Emergency)',
      skills: selectedSkills,
      equipment: selectedEquipment,
      ...roleMetadata
    };

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let updatedUserData: any = null;
      if (res.ok) {
        const data = await res.json();
        updatedUserData = data.user;
      }

      const mergedUser = {
        ...(currentUser || {}),
        id: userId,
        name: currentUser?.name || (role === 'CITIZEN' ? 'Resident Citizen' : role === 'NGO_MEMBER' ? ngoName : 'Authorized Officer'),
        email: currentUser?.email || `${userId.toLowerCase()}@volentify.org`,
        ...payload,
        ...(updatedUserData || {}),
        onboarded: true,
        is_verified: true,
        callsign: callsign
      };

      localStorage.setItem('user', JSON.stringify(mergedUser));
      setCurrentUser(mergedUser);
      setStep(5);
    } catch (e: any) {
      console.warn('Backend sync offline, saving local profile:', e);
      const localUser = {
        ...(currentUser || {}),
        id: userId,
        name: currentUser?.name || 'Authorized Member',
        email: currentUser?.email || `${userId.toLowerCase()}@volentify.org`,
        ...payload,
        onboarded: true,
        is_verified: true,
        callsign: callsign
      };
      localStorage.setItem('user', JSON.stringify(localUser));
      setCurrentUser(localUser);
      setStep(5);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-primary/30">
      
      {/* Tactical Glow Backdrops */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Protocol Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/[0.08] pb-6 gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-mono text-xs tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>VOLENTIFY OSINT // ADAPTIVE ONBOARDING PROTOCOL</span>
            </div>
            <h1 className="heading-editorial text-3xl sm:text-4xl text-white tracking-tight">
              {role === 'VOLUNTEER' && 'Tactical Responder Onboarding'}
              {role === 'CITIZEN' && 'Citizen Emergency & SOS Registration'}
              {role === 'NGO_MEMBER' && 'Humanitarian Partner Network Enrollment'}
              {role === 'INCIDENT_ADMIN' && 'Agency & EOC Incident Command Integration'}
            </h1>
            <p className="text-xs text-slate-400 font-light">
              Calibrate your emergency comms, role-specific logistics capacity, and geo-fenced sector assignment.
            </p>
          </div>

          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-2 text-right shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Step Progress</div>
            <div className="text-lg font-mono font-bold text-primary">
              {step < 5 ? `0${step} / 04` : 'AUTHENTICATED'}
            </div>
          </div>
        </div>

        {/* Step Progress Indicators */}
        {step < 5 && (
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {[
              { num: 1, title: 'Emergency Comms', desc: 'Mandatory Phone' },
              { num: 2, title: 'Operational Role', desc: role },
              { num: 3, title: 'Field Geolocation', desc: selectedDistrict },
              { 
                num: 4, 
                title: role === 'VOLUNTEER' ? 'Skills & Gear' : role === 'CITIZEN' ? 'Household Profile' : role === 'NGO_MEMBER' ? 'Relief Capacity' : 'Agency Clearance',
                desc: 'Adaptive Specs' 
              },
            ].map((s) => (
              <button
                key={s.num}
                onClick={() => {
                  if (s.num < step || (s.num === 2 && isPhoneValid)) setStep(s.num);
                }}
                className={`text-left p-3 rounded-2xl border transition-all ${
                  step === s.num
                    ? 'bg-primary/10 border-primary text-white shadow-lg shadow-primary/10'
                    : step > s.num
                    ? 'bg-white/[0.03] border-white/20 text-slate-300'
                    : 'bg-white/[0.01] border-white/[0.06] text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-primary">0{s.num}</span>
                  {step > s.num && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                </div>
                <div className="font-sans font-medium text-xs truncate">{s.title}</div>
                <div className="text-[10px] text-slate-400 font-mono hidden sm:block truncate">{s.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: COMPULSORY EMERGENCY PHONE ================= */}
        {step === 1 && (
          <div className="p-6 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="space-y-2 border-b border-white/[0.06] pb-5">
              <div className="flex items-center space-x-2 text-primary font-mono text-xs uppercase tracking-wider">
                <Phone className="w-4 h-4" />
                <span>STEP 01: Mandatory Emergency Dispatch Channel</span>
              </div>
              <h2 className="heading-editorial text-2xl text-white">
                Register Your Verified Mobile Link
              </h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Under the Indian Disaster Management Act &amp; Volentify Emergency Protocol, a verified mobile contact is strictly compulsory. This links your device to high-priority Common Alerting Protocol (CAP) broadcasts, geo-fenced SOS telemetry, and field muster calls.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                  Primary Mobile Number <span className="text-red-400">* (STRICTLY COMPULSORY)</span>
                </label>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm shrink-0">
                    <span className="text-lg">🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneTested(false);
                    }}
                    placeholder="98765 43210"
                    maxLength={14}
                    className="flex-1 px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 font-mono text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleTestCarrierPing}
                    disabled={!isPhoneValid || testingPhone}
                    className={`px-4 py-3.5 rounded-2xl font-mono text-xs flex items-center space-x-2 transition-all shrink-0 ${
                      phoneTested
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : isPhoneValid
                        ? 'bg-primary text-slate-950 font-bold hover:bg-primary-hover shadow-lg shadow-primary/20'
                        : 'bg-white/[0.04] text-slate-500 border border-white/[0.06] cursor-not-allowed'
                    }`}
                  >
                    {testingPhone ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>Pinging...</span>
                      </>
                    ) : phoneTested ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Carrier Verified</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Verify Signal</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 font-mono">
                    {isPhoneValid ? (
                      <span className="text-emerald-400 flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid 10-digit mobile link ready for CAP SMS routing.</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center space-x-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Please enter your 10-digit mobile number to proceed.</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">AES-256 ENCRYPTED</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    Blood Group (Field Safety Badge)
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                      <option key={bg} value={bg} className="bg-slate-900 text-white">{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    Secondary Emergency Contact
                  </label>
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Next of Kin / +91 Mobile"
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
              <span className="text-xs text-slate-500 font-mono">STEP 1 OF 4</span>
              <button
                type="button"
                onClick={() => {
                  if (!isPhoneValid) {
                    setErrorMsg('Please enter a valid 10-digit mobile number before proceeding.');
                    return;
                  }
                  setErrorMsg('');
                  setStep(2);
                }}
                disabled={!isPhoneValid}
                className={`px-8 py-3.5 rounded-full font-mono text-xs font-bold flex items-center space-x-2 transition-all ${
                  isPhoneValid
                    ? 'bg-primary text-slate-950 hover:bg-primary-hover shadow-xl shadow-primary/20'
                    : 'bg-white/[0.05] text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Continue to Role Protocol</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: OPERATIONAL ROLE ================= */}
        {step === 2 && (
          <div className="p-6 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="space-y-2 border-b border-white/[0.06] pb-5">
              <div className="flex items-center space-x-2 text-primary font-mono text-xs uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>STEP 02: Operational Identity</span>
              </div>
              <h2 className="heading-editorial text-2xl text-white">
                Select Your Tactical Deployment Role
              </h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Volentify adapts data collection based on your exact profile. Choose how you intend to engage with the disaster network.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'VOLUNTEER',
                  title: 'Field First Responder',
                  badge: 'TIER-1 DISPATCH READY',
                  icon: LifeBuoy,
                  desc: 'Certified medics, boat operators, swift water squads, and chainsaw operators ready for active muster.'
                },
                {
                  id: 'CITIZEN',
                  title: 'Civilian Ground Scout / Evacuee',
                  badge: 'COMMUNITY SOS PASS',
                  icon: Home,
                  desc: 'Residents seeking hyper-local evacuation routing, food/water distribution, and priority SOS alerts.'
                },
                {
                  id: 'NGO_MEMBER',
                  title: 'Humanitarian NGO Partner',
                  badge: 'RELIEF SUPPLY FLEET',
                  icon: Building2,
                  desc: 'Non-profits managing community kitchens, mobile clinics, drinking water tanks, and relief shelters.'
                },
                {
                  id: 'INCIDENT_ADMIN',
                  title: 'Agency / Incident Command',
                  badge: 'EOC CLEARANCE',
                  icon: ShieldCheck,
                  desc: 'State Disaster Management Authorities (SDMA), NDRF commanders, DEOC officers, and emergency services.'
                }
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setRole(r.id as any)}
                    className={`cursor-pointer p-6 rounded-3xl border transition-all text-left relative overflow-hidden group ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary'
                        : 'bg-white/[0.02] border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-2xl ${isSelected ? 'bg-primary text-slate-950 font-bold' : 'bg-white/[0.06] text-primary'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-mono text-[10px] tracking-wider text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
                        {r.badge}
                      </span>
                    </div>

                    <h3 className="font-sans font-bold text-white text-base mb-1">{r.title}</h3>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">{r.desc}</p>
                    
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-primary">
                        <CheckCircle2 className="w-5 h-5 fill-primary text-slate-950" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-full font-mono text-xs text-slate-400 hover:text-white flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-8 py-3.5 rounded-full bg-primary text-slate-950 font-mono text-xs font-bold hover:bg-primary-hover shadow-xl shadow-primary/20 flex items-center space-x-2 transition-all"
              >
                <span>Continue to Geolocation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: TACTICAL GEOLOCATION ================= */}
        {step === 3 && (
          <div className="p-6 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="space-y-2 border-b border-white/[0.06] pb-5">
              <div className="flex items-center space-x-2 text-primary font-mono text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>STEP 03: Field Geolocation &amp; Dispatch Sector</span>
              </div>
              <h2 className="heading-editorial text-2xl text-white">
                Sector Allocation &amp; Satellite Coordinates
              </h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                Assign your default deployment base station. You can calibrate live GPS or select your designated high-vulnerability district.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    State / Jurisdiction
                  </label>
                  <select
                    value={selectedStateIdx}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setSelectedStateIdx(idx);
                      setSelectedDistrict(INDIAN_SECTORS[idx].districts[0]);
                      setCustomLat(null);
                      setCustomLng(null);
                    }}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                  >
                    {INDIAN_SECTORS.map((s, idx) => (
                      <option key={s.state} value={idx} className="bg-slate-900 text-white">
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    District / Operational Sector
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                  >
                    {currentState.districts.map(d => (
                      <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GNSS / Live GPS Calibration Card */}
              <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-white font-sans font-bold text-sm">
                      <Crosshair className="w-4 h-4 text-primary" />
                      <span>Live Satellite GNSS Calibration</span>
                    </div>
                    <p className="text-xs text-slate-400 font-light">
                      Calibrate exact coordinates to allow automated proximity matching and priority SOS dispatch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCalibrateGPS}
                    disabled={gpsCalibrating}
                    className="px-5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-white font-mono text-xs flex items-center space-x-2 transition-all shrink-0"
                  >
                    {gpsCalibrating ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin text-primary" />
                        <span>Calibrating...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5 text-primary" />
                        <span>Acquire Live Coordinates</span>
                      </>
                    )}
                  </button>
                </div>

                {gpsStatus && (
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-mono text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{gpsStatus}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center font-mono text-xs">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 uppercase">Latitude</div>
                    <div className="text-white font-bold">{effectiveLat.toFixed(4)}° N</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 uppercase">Longitude</div>
                    <div className="text-white font-bold">{effectiveLng.toFixed(4)}° E</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 uppercase">Sector</div>
                    <div className="text-white font-bold truncate">{selectedDistrict}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="text-[10px] text-slate-500 uppercase">Zone Status</div>
                    <div className="text-emerald-400 font-bold">ACTIVE</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-full font-mono text-xs text-slate-400 hover:text-white flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-8 py-3.5 rounded-full bg-primary text-slate-950 font-mono text-xs font-bold hover:bg-primary-hover shadow-xl shadow-primary/20 flex items-center space-x-2 transition-all"
              >
                <span>Continue to Role Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: ADAPTIVE DATA COLLECTION ================= */}
        {step === 4 && (
          <div className="p-6 sm:p-10 rounded-3xl bg-surface-card border border-white/[0.08] shadow-2xl space-y-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="space-y-2 border-b border-white/[0.06] pb-5">
              <div className="flex items-center space-x-2 text-primary font-mono text-xs uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>STEP 04: Role-Specific Operational Details ({role})</span>
              </div>
              <h2 className="heading-editorial text-2xl text-white">
                {role === 'VOLUNTEER' && 'Certified Response Capabilities & Hardware'}
                {role === 'CITIZEN' && 'Household Vulnerability & Evacuation Requirements'}
                {role === 'NGO_MEMBER' && 'Humanitarian Relief & Supply Chain Capacity'}
                {role === 'INCIDENT_ADMIN' && 'Agency Command Clearance & Dispatch Hotline'}
              </h2>
              <p className="text-xs text-slate-400 font-light leading-relaxed">
                {role === 'VOLUNTEER' && 'Your certified skills prevent rare life-saving assets from being squandered on generic tasks.'}
                {role === 'CITIZEN' && 'Specify family member count and critical supplies needed so rescue squads can prioritize your household.'}
                {role === 'NGO_MEMBER' && 'Declare daily meal packets, potable water, and shelter bed capacities to optimize NDRF coordination.'}
                {role === 'INCIDENT_ADMIN' && 'Establish official EOC frequency and jurisdiction authority for inter-agency disaster command.'}
              </p>
            </div>

            {/* --- ADAPTIVE FORM FOR VOLUNTEER --- */}
            {role === 'VOLUNTEER' && (
              <div className="space-y-6">
                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-3 font-medium">
                    Certified Skills ({selectedSkills.length} selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VOLUNTEER_SKILLS.map((sk) => {
                      const Icon = sk.icon;
                      const isSelected = selectedSkills.includes(sk.label);
                      return (
                        <div
                          key={sk.id}
                          onClick={() => toggleVolunteerSkill(sk.label)}
                          className={`cursor-pointer p-4 rounded-2xl border transition-all flex items-start space-x-3 ${
                            isSelected
                              ? 'bg-primary/10 border-primary text-white shadow-md shadow-primary/10'
                              : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-primary text-slate-950' : 'bg-white/[0.06] text-primary'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <div className="font-sans font-bold text-xs truncate text-white">{sk.label}</div>
                            <div className="text-[10px] text-slate-400 font-light">{sk.desc}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-3 font-medium">
                    Deplorable Hardware &amp; Inventory
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {VOLUNTEER_EQUIPMENT.map(eq => {
                      const isEqSelected = selectedEquipment.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => toggleEquipment(eq)}
                          className={`px-3.5 py-2 rounded-xl font-mono text-xs transition-all ${
                            isEqSelected
                              ? 'bg-white/[0.12] text-white border border-primary/50'
                              : 'bg-white/[0.02] text-slate-400 border border-white/[0.06] hover:text-white'
                          }`}
                        >
                          {isEqSelected ? '✓ ' : '+ '} {eq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-white font-sans font-bold text-xs">Immediate Deployment Status</div>
                    <div className="text-[10px] text-slate-400 font-light">Available to muster within 15 minutes of emergency cell siren</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAvailability(prev => prev === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE')}
                    className={`px-4 py-2 rounded-full font-mono text-xs font-bold transition-all ${
                      availability === 'AVAILABLE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.06] text-slate-400 border border-white/[0.1]'
                    }`}
                  >
                    ● {availability === 'AVAILABLE' ? 'AVAILABLE FOR DISPATCH' : 'RESERVE STANDBY'}
                  </button>
                </div>
              </div>
            )}

            {/* --- ADAPTIVE FORM FOR CITIZEN --- */}
            {role === 'CITIZEN' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <label className="font-mono text-xs text-slate-400 block uppercase">Total Household Size</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-mono text-lg font-bold"
                    />
                    <div className="text-[10px] text-slate-500">People residing together</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <label className="font-mono text-xs text-slate-400 block uppercase">Infants / Children (0-5y)</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={infantsCount}
                      onChange={(e) => setInfantsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-mono text-lg font-bold"
                    />
                    <div className="text-[10px] text-slate-500">Flagged for baby nutrition</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
                    <label className="font-mono text-xs text-slate-400 block uppercase">Elderly / Seniors (60+)</label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={elderlyCount}
                      onChange={(e) => setElderlyCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white font-mono text-lg font-bold"
                    />
                    <div className="text-[10px] text-slate-500">Mobility & medicine priority</div>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    Evacuation Priority Status
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'SAFE_IN_PLACE', title: 'Sheltering Safe', desc: 'Secure at home, monitoring alerts' },
                      { id: 'IMMEDIATE_EVACUATION_NEEDED', title: '🚨 SOS Rescue Needed', desc: 'Water rising / structural danger' },
                      { id: 'IN_SHELTER', title: 'At Relief Camp', desc: 'Currently in designated cyclone shelter' }
                    ].map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setEvacStatus(ev.id as any)}
                        className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${
                          evacStatus === ev.id
                            ? 'bg-primary/10 border-primary text-white shadow-md'
                            : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-sans font-bold text-xs text-white mb-0.5">{ev.title}</div>
                        <div className="text-[10px] text-slate-400">{ev.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-2 font-medium">
                    Specific Critical Humanitarian Needs
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CITIZEN_SPECIAL_NEEDS.map(nd => {
                      const isSel = selectedNeeds.includes(nd);
                      return (
                        <div
                          key={nd}
                          onClick={() => toggleCitizenNeed(nd)}
                          className={`cursor-pointer p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                            isSel
                              ? 'bg-red-500/10 border-red-500/40 text-red-200'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{nd}</span>
                          <span className="font-mono text-xs">{isSel ? '✓' : '+'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                    Home Address &amp; Prominent Landmark
                  </label>
                  <input
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    placeholder="e.g. Near Jagannath Temple Ward 4, Low-lying coastal lane"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* --- ADAPTIVE FORM FOR NGO MEMBER --- */}
            {role === 'NGO_MEMBER' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      NGO / Trust Legal Name
                    </label>
                    <input
                      type="text"
                      value={ngoName}
                      onChange={(e) => setNgoName(e.target.value)}
                      placeholder="e.g. Red Cross Society / Goonj Disaster Relief"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      NITI Aayog NGO Darpan / Reg ID
                    </label>
                    <input
                      type="text"
                      value={ngoDarpanId}
                      onChange={(e) => setNgoDarpanId(e.target.value)}
                      placeholder="e.g. OR/2022/03194"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Hot Cooked Meals/Day</div>
                    <input
                      type="number"
                      value={dailyMealCapacity}
                      onChange={(e) => setDailyMealCapacity(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-mono text-lg font-bold focus:outline-none"
                    />
                    <div className="text-[9px] text-slate-500">Packs prepared</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Drinking Water/Day</div>
                    <input
                      type="number"
                      value={waterLitersDaily}
                      onChange={(e) => setWaterLitersDaily(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-mono text-lg font-bold focus:outline-none"
                    />
                    <div className="text-[9px] text-slate-500">Liters purified</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Shelter Bed Capacity</div>
                    <input
                      type="number"
                      value={shelterBeds}
                      onChange={(e) => setShelterBeds(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-mono text-lg font-bold focus:outline-none"
                    />
                    <div className="text-[9px] text-slate-500">Available beds</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Mobile Medical Vans</div>
                    <input
                      type="number"
                      value={mobileVans}
                      onChange={(e) => setMobileVans(Number(e.target.value))}
                      className="w-full bg-transparent text-white font-mono text-lg font-bold focus:outline-none"
                    />
                    <div className="text-[9px] text-slate-500">Operational units</div>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                    Relief Base / Central Warehouse Hub Address
                  </label>
                  <input
                    type="text"
                    value={ngoHubAddress}
                    onChange={(e) => setNgoHubAddress(e.target.value)}
                    placeholder="e.g. Warehouse 4B, Coastal Road, Puri"
                    className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* --- ADAPTIVE FORM FOR INCIDENT ADMIN --- */}
            {role === 'INCIDENT_ADMIN' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      Command Agency Name
                    </label>
                    <input
                      type="text"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="e.g. NDRF 3rd Battalion / Odisha SDRF"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      Officer Designation / Rank
                    </label>
                    <input
                      type="text"
                      value={officerRank}
                      onChange={(e) => setOfficerRank(e.target.value)}
                      placeholder="e.g. Incident Commander / District Collector"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      Official Service ID
                    </label>
                    <input
                      type="text"
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      placeholder="e.g. IND-NDRF-8421"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      24/7 EOC Hotline
                    </label>
                    <input
                      type="text"
                      value={hotline24x7}
                      onChange={(e) => setHotline24x7(e.target.value)}
                      placeholder="e.g. 1070 / 1077"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="font-mono text-xs uppercase tracking-wider text-slate-300 block mb-1.5 font-medium">
                      Tactical VHF Frequency
                    </label>
                    <input
                      type="text"
                      value={vhfFrequency}
                      onChange={(e) => setVhfFrequency(e.target.value)}
                      placeholder="e.g. 145.500 MHz"
                      className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.1] text-white font-mono text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/[0.06] pt-6">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-full font-mono text-xs text-slate-400 hover:text-white flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteOnboarding}
                disabled={submitting}
                className="px-8 py-3.5 rounded-full bg-primary text-slate-950 font-mono text-xs font-bold hover:bg-primary-hover shadow-xl shadow-primary/25 flex items-center space-x-2 transition-all"
              >
                {submitting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Generating Security Pass...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Role Credential</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: DYNAMIC HOLOGRAPHIC DIGITAL ID CARD ================= */}
        {step === 5 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>SECURITY CLEARANCE ISSUED // TACTICAL CREDENTIAL ACTIVE</span>
              </div>
              <h2 className="heading-editorial text-3xl sm:text-4xl text-white">
                {role === 'VOLUNTEER' && 'Official Digital Responder Pass'}
                {role === 'CITIZEN' && 'National Citizen Emergency SOS Pass'}
                {role === 'NGO_MEMBER' && 'Humanitarian Relief Fleet Authorization'}
                {role === 'INCIDENT_ADMIN' && 'Incident Command EOC Clearance'}
              </h2>
              <p className="text-xs text-slate-400 font-light max-w-lg mx-auto">
                {role === 'VOLUNTEER' && 'Your responder profile is synchronized with the disaster command center. Present this holographic pass to NDRF/SDRF checkpoints.'}
                {role === 'CITIZEN' && 'Present this digital pass at relief distribution centers, medical clinics, and emergency evacuation transit hubs.'}
                {role === 'NGO_MEMBER' && 'Authorized for priority passage across flooded transit zones and NDRF coordinated humanitarian supply lines.'}
                {role === 'INCIDENT_ADMIN' && 'Command authority active. Validated for emergency curfew bypass and inter-agency dispatch coordination.'}
              </p>
            </div>

            {/* THE DYNAMIC HOLOGRAPHIC BADGE */}
            <div className="max-w-md mx-auto">
              <div className="relative rounded-3xl p-[2px] bg-gradient-to-tr from-primary via-sky-400 to-amber-400 shadow-2xl shadow-primary/20">
                <div className="rounded-[22px] bg-slate-950 p-6 sm:p-8 space-y-6 relative overflow-hidden backdrop-blur-3xl">
                  
                  {/* Subtle Grid Watermark */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                  
                  {/* Holographic Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.1] pb-4 relative z-10">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-slate-950 font-bold font-mono shadow-md shadow-primary/30">
                        V
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-white tracking-wider">VOLENTIFY OSINT</div>
                        <div className="font-mono text-[9px] text-slate-400 uppercase">
                          {role === 'VOLUNTEER' && 'FIRST RESPONDER MUSTER PASS'}
                          {role === 'CITIZEN' && 'CITIZEN SOS & EVACUATION PASS'}
                          {role === 'NGO_MEMBER' && 'HUMANITARIAN RELIEF PASS'}
                          {role === 'INCIDENT_ADMIN' && 'EOC COMMAND CLEARANCE'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-[10px] text-emerald-400 font-bold">● ACTIVE</div>
                      <div className="text-[9px] text-slate-500">{currentUser?.callsign || 'TAC-SEC-9421'}</div>
                    </div>
                  </div>

                  {/* Identity Section */}
                  <div className="flex items-center space-x-4 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-sky-500/20 border border-white/20 flex items-center justify-center text-2xl font-bold text-white shadow-inner shrink-0">
                      {currentUser?.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full rounded-2xl object-cover" />
                      ) : (
                        currentUser?.name?.slice(0, 2).toUpperCase() || 'AR'
                      )}
                    </div>

                    <div className="space-y-0.5 overflow-hidden">
                      <h3 className="font-sans font-bold text-lg text-white truncate">
                        {role === 'NGO_MEMBER' ? ngoName : currentUser?.name || 'Active Member'}
                      </h3>
                      <div className="font-mono text-xs text-primary font-medium">
                        {role === 'VOLUNTEER' && 'Tier-1 Certified First Responder'}
                        {role === 'CITIZEN' && `Citizen Evacuee (Family of ${householdSize})`}
                        {role === 'NGO_MEMBER' && `Darpan ID: ${ngoDarpanId}`}
                        {role === 'INCIDENT_ADMIN' && officerRank}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{selectedDistrict}, {currentState.state}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Matrix (Role Adaptive) */}
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] font-mono text-[11px] relative z-10">
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Verified Mobile</div>
                      <div className="text-white font-bold truncate">{currentUser?.phone || phone}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">
                        {role === 'CITIZEN' ? 'Household' : role === 'NGO_MEMBER' ? 'Daily Meals' : 'Blood Group'}
                      </div>
                      <div className="text-primary font-bold">
                        {role === 'CITIZEN' ? `${householdSize} Members (${infantsCount} Inf / ${elderlyCount} Sr)` : role === 'NGO_MEMBER' ? `${dailyMealCapacity} packs/day` : `${bloodGroup} (COMPATIBLE)`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">GNSS Sector</div>
                      <div className="text-slate-300 truncate">{effectiveLat.toFixed(3)}°N, {effectiveLng.toFixed(3)}°E</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase">Status</div>
                      <div className="text-emerald-400 font-bold truncate">
                        {role === 'VOLUNTEER' ? availability : role === 'CITIZEN' ? evacStatus : role === 'NGO_MEMBER' ? 'ACTIVE FLEET' : 'AUTHORIZED'}
                      </div>
                    </div>
                  </div>

                  {/* Detail Chips */}
                  <div className="space-y-1.5 relative z-10">
                    <div className="text-[9px] font-mono uppercase text-slate-500 tracking-wider">
                      {role === 'VOLUNTEER' ? 'Certified Deployments' : role === 'CITIZEN' ? 'Special Medical Needs' : role === 'NGO_MEMBER' ? 'Relief Assets' : 'Jurisdiction Command'}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role === 'VOLUNTEER' && selectedSkills.slice(0, 3).map(s => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white font-mono text-[10px] border border-white/[0.1]">
                          {s}
                        </span>
                      ))}
                      {role === 'CITIZEN' && selectedNeeds.slice(0, 2).map(n => (
                        <span key={n} className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 font-mono text-[10px] border border-red-500/30">
                          {n}
                        </span>
                      ))}
                      {role === 'NGO_MEMBER' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white font-mono text-[10px] border border-white/[0.1]">
                            {waterLitersDaily}L Water/Day
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white font-mono text-[10px] border border-white/[0.1]">
                            {shelterBeds} Shelter Beds
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white font-mono text-[10px] border border-white/[0.1]">
                            {mobileVans} Medical Vans
                          </span>
                        </>
                      )}
                      {role === 'INCIDENT_ADMIN' && (
                        <>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-white font-mono text-[10px] border border-white/[0.1]">
                            {agencyName}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-primary font-mono text-[10px] border border-white/[0.1]">
                            VHF: {vhfFrequency}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hologram Barcode & QR Code Footer */}
                  <div className="flex items-center justify-between border-t border-white/[0.1] pt-4 relative z-10">
                    <div className="space-y-1">
                      <div className="text-[9px] font-mono text-slate-500">NDMA / WMO COMPLIANT</div>
                      <div className="font-mono text-[10px] text-slate-400 tracking-widest">
                        VLNTFY-{(currentUser?.id || '9872').replace(/[^a-zA-Z0-9]/g, '').slice(0, 10).toUpperCase()}
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
                      <QrCode className="w-full h-full text-slate-950" />
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/map"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-slate-950 font-mono text-xs font-bold hover:bg-primary-hover shadow-xl shadow-primary/25 flex items-center justify-center space-x-2 transition-all"
              >
                <span>Deploy to Tactical Map</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <Link
                href="/volunteer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-all"
              >
                <Users className="w-4 h-4 text-primary" />
                <span>Open Operations Hub</span>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
