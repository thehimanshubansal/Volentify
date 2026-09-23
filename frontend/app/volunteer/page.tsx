'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  MapPin, 
  ShieldCheck, 
  Award, 
  Heart, 
  Radio, 
  Activity, 
  Sparkles,
  RefreshCw,
  Navigation,
  Compass,
  AlertTriangle
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  required_skill: string;
  lat: number;
  lng: number;
  quantity_needed: number;
  status: string;
  event_id?: string;
}

interface RankedMatch {
  volunteer_id: string;
  name: string;
  score: number;
  reason: string;
  distance_km: number;
}

const INITIAL_TASKS: Task[] = [
  {
    id: 'TSK-001',
    title: 'Puri Coastal Evacuation & Inflatable Boat Transport',
    urgency: 'CRITICAL',
    required_skill: 'Rescue & Search',
    lat: 19.8135,
    lng: 85.8312,
    quantity_needed: 15,
    status: 'ACTIVE DISPATCH'
  },
  {
    id: 'TSK-002',
    title: 'AIIMS Bhubaneswar Emergency Trauma & Triage Support',
    urgency: 'CRITICAL',
    required_skill: 'Paramedic',
    lat: 20.2285,
    lng: 85.8189,
    quantity_needed: 8,
    status: 'ACTIVE DISPATCH'
  },
  {
    id: 'TSK-003',
    title: 'Paradip Port Relief Shelter Food & Water Distribution',
    urgency: 'HIGH',
    required_skill: 'Food & Shelter Logistics',
    lat: 20.2644,
    lng: 86.6705,
    quantity_needed: 20,
    status: 'ACTIVE DISPATCH'
  },
  {
    id: 'TSK-004',
    title: 'Bhadrak Coastal Debris & Road Clearing',
    urgency: 'MODERATE',
    required_skill: 'Debris Clearing',
    lat: 21.0574,
    lng: 86.4947,
    quantity_needed: 10,
    status: 'PENDING CREW'
  },
  {
    id: 'TSK-005',
    title: 'Odisha Blood Bank Emergency O-Negative Donors',
    urgency: 'HIGH',
    required_skill: 'Blood Donor',
    lat: 20.2961,
    lng: 85.8245,
    quantity_needed: 25,
    status: 'ACTIVE DISPATCH'
  }
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dlat = ((lat2 - lat1) * Math.PI) / 180;
  const dlon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dlon / 2) *
      Math.sin(dlon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

export default function VolunteerPage() {
  const [registered, setRegistered] = useState(false);
  const [volunteerName, setVolunteerName] = useState('Rahul Sharma');
  const [primarySkill, setPrimarySkill] = useState('Rescue & Search');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY' | 'OFFLINE'>('AVAILABLE');
  const [userLat, setUserLat] = useState(19.85);
  const [userLng, setUserLng] = useState(85.80);
  const [locationName, setLocationName] = useState('Puri Coast, Odisha');
  const [acceptedMissions, setAcceptedMissions] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    fetch('/api/tasks')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data) && data.length > 0) {
           setTasks(data);
         }
      })
      .catch(err => {
         console.error(err);
      })
      .finally(() => setLoadingTasks(false));

    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.name) setVolunteerName(user.name);
      } catch (e) {}
    }
  }, []);

  // Compute live match score based on research paper formula:
  // Score = UrgencyWeight * SkillScore * ProximityScore * AvailabilityMultiplier
  const urgencyWeights: Record<string, number> = {
    CRITICAL: 3.0,
    HIGH: 2.0,
    MODERATE: 1.0,
    LOW: 0.5
  };

  const availabilityMultipliers = {
    AVAILABLE: 1.0,
    BUSY: 0.3,
    OFFLINE: 0.0
  };

  const skillAdjacency: Record<string, string[]> = {
    'Paramedic': ['Medical & First Aid', 'Blood Donor'],
    'Rescue & Search': ['Debris Clearing', 'Transport & Driving'],
    'Food & Shelter Logistics': ['Transport & Driving'],
    'Medical & First Aid': ['Paramedic', 'Blood Donor'],
    'Debris Clearing': ['Rescue & Search', 'Transport & Driving'],
    'Transport & Driving': ['Debris Clearing', 'Food & Shelter Logistics'],
    'Blood Donor': ['Medical & First Aid', 'Paramedic']
  };

  const rankedTasks = tasks.map((task) => {
    const dist = haversineDistance(userLat, userLng, task.lat, task.lng);
    const urgencyW = urgencyWeights[task.urgency] || 1.0;
    
    // Skill match score
    let skillScore = 0.0;
    if (task.required_skill === primarySkill) {
      skillScore = 1.0;
    } else if ((skillAdjacency[primarySkill] || []).includes(task.required_skill)) {
      skillScore = 0.5;
    } else {
      skillScore = 0.1;
    }

    const proximityScore = 1.0 / (1.0 + dist / 15.0);
    const availMult = availabilityMultipliers[availability];

    const compositeScore = urgencyW * skillScore * proximityScore * availMult;
    const matchPercentage = Math.min(99, Math.round((compositeScore / 3.0) * 100));

    return {
      ...task,
      dist: dist.toFixed(1),
      skillScore,
      compositeScore,
      matchPercentage
    };
  }).sort((a, b) => b.compositeScore - a.compositeScore);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userStr = localStorage.getItem('user');
      let userId = null;
      if (userStr) {
        userId = JSON.parse(userStr).id;
      }
      
      const res = await fetch('/api/volunteer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: volunteerName,
          skills: [primarySkill],
          equipment: [],
          availability_status: availability,
          lat: userLat,
          lng: userLng,
          rating: 5.0
        })
      });

      if (res.ok) {
        setRegistered(true);
      } else {
         console.error('Failed to save profile');
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleAccept = (taskId: string) => {
    if (!acceptedMissions.includes(taskId)) {
      setAcceptedMissions([...acceptedMissions, taskId]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="border-b border-surface-highest/60 pb-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-telemetry font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>VOLENTIFY FIELD VOLUNTEER CORPS</span>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-telemetry font-bold">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>HEURISTIC SKILL-PROXIMITY ENGINE ACTIVE</span>
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-tactical-text">
          Priority- & Skill-Aware Volunteer Dispatch
        </h1>
        <p className="text-xs sm:text-sm text-tactical-muted">
          Dynamic heuristic resource matching allocating scarce volunteer skills to high-urgency disaster needs with Haversine distance decay.
        </p>
      </div>

      {/* Grid: Dispatch Task Board + Registration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Active Volunteer Assignments */}
        <div className="lg:col-span-7 space-y-6 font-telemetry">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>LIVE RANKED DISPATCH MISSIONS (HEURISTIC SORTED)</span>
            </h3>
            <span className="text-xs text-tactical-muted">
              {rankedTasks.length} MISSIONS AVAILABLE
            </span>
          </div>

          <div className="space-y-4">
            {rankedTasks.map((task) => {
              const isAccepted = acceptedMissions.includes(task.id);

              return (
                <div 
                  key={task.id} 
                  className={`p-5 rounded-2xl glass-panel space-y-3 border-l-4 transition-all ${
                    task.urgency === 'CRITICAL' ? 'border-l-emergency' : task.urgency === 'HIGH' ? 'border-l-primary' : 'border-l-blue-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        task.urgency === 'CRITICAL' ? 'bg-emergency/20 text-emergency' : 'bg-primary/20 text-primary'
                      }`}>
                        {task.urgency} PRIORITY
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {task.matchPercentage}% MATCH SCORE
                      </span>
                    </div>
                    <span className="text-xs text-tactical-muted font-bold">
                      DISTANCE: {task.dist} KM
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-tactical-text font-sans">
                    {task.title}
                  </h4>
                  
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <span className="text-tactical-muted">
                      Required Skill: <strong className="text-tactical-text">{task.required_skill}</strong>
                    </span>
                    <span className="text-primary font-bold">
                      Needed: {task.quantity_needed} Volunteers
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-highest">
                    <span className="text-[10px] text-tactical-muted">
                      TASK ID: {task.id} | Status: {task.status}
                    </span>
                    <button
                      onClick={() => handleAccept(task.id)}
                      disabled={isAccepted}
                      className={`px-4 py-1.5 rounded text-xs font-bold transition-colors ${
                        isAccepted 
                          ? 'bg-emerald-500 text-white cursor-default' 
                          : 'bg-primary text-surface-lowest hover:bg-primary-tint'
                      }`}
                    >
                      {isAccepted ? 'MISSION ACCEPTED ✓' : 'ACCEPT MISSION'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Registration / Profile Status */}
        <div className="lg:col-span-5 space-y-6 font-telemetry">
          <div className="p-6 rounded-2xl glass-panel space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>VOLUNTEER SKILL & TELEMETRY PROFILE</span>
            </h3>

            {registered ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-300">VOLUNTEER PROFILE VERIFIED</h4>
                <p className="text-xs text-tactical-muted">
                  ID: VOL-IND-84920 | Status: {availability}
                </p>
                <button
                  onClick={() => setRegistered(false)}
                  className="text-xs text-primary underline mt-2"
                >
                  Edit Profile / Skills
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="text-tactical-muted block mb-1">VOLUNTEER NAME</label>
                  <input
                    type="text"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="w-full p-2.5 rounded bg-surface-lowest border border-surface-highest text-tactical-text font-sans"
                  />
                </div>

                <div>
                  <label className="text-tactical-muted block mb-1">PRIMARY CERTIFIED SKILL</label>
                  <select
                    value={primarySkill}
                    onChange={(e) => setPrimarySkill(e.target.value)}
                    className="w-full p-2.5 rounded bg-surface-lowest border border-surface-highest text-tactical-text"
                  >
                    <option value="Rescue & Search">Rescue & Search (Inflatable Boats / S&R)</option>
                    <option value="Paramedic">Paramedic / Emergency Medical Care</option>
                    <option value="Food & Shelter Logistics">Food & Shelter Logistics</option>
                    <option value="Debris Clearing">Debris Clearing & Heavy Equipment</option>
                    <option value="Transport & Driving">Transport & 4x4 Driving</option>
                    <option value="Blood Donor">Blood Donor (O- / Rare Blood Group)</option>
                  </select>
                </div>

                <div>
                  <label className="text-tactical-muted block mb-1">AVAILABILITY STATUS</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((status) => (
                      <button
                        type="button"
                        key={status}
                        onClick={() => setAvailability(status)}
                        className={`py-2 text-[10px] font-bold rounded border ${
                          availability === status 
                            ? 'bg-primary text-surface-lowest border-primary' 
                            : 'bg-surface-lowest text-tactical-muted border-surface-highest hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-tactical-muted block mb-1">DEPLOYMENT BASE LOCATION</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      if (e.target.value.toLowerCase().includes('assam')) {
                        setUserLat(26.1445);
                        setUserLng(91.7362);
                      } else if (e.target.value.toLowerCase().includes('delhi')) {
                        setUserLat(28.6139);
                        setUserLng(77.2090);
                      } else {
                        setUserLat(19.85);
                        setUserLng(85.80);
                      }
                    }}
                    placeholder="e.g. Puri, Odisha"
                    className="w-full p-2.5 rounded bg-surface-lowest border border-surface-highest text-tactical-text font-sans"
                  />
                  <div className="flex justify-between text-[10px] text-tactical-muted mt-1">
                    <span>LAT: {userLat.toFixed(4)}° N</span>
                    <span>LNG: {userLng.toFixed(4)}° E</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded bg-primary text-surface-lowest font-bold text-xs hover:bg-primary-tint transition-colors shadow-tactical"
                >
                  SAVE VOLUNTEER DISPATCH PROFILE
                </button>
              </form>
            )}
          </div>

          {/* Quick Stats Panel */}
          <div className="p-6 rounded-2xl glass-panel space-y-3 font-telemetry">
            <h4 className="text-xs font-bold text-tactical-text uppercase">
              REPUTATION & VERIFICATION METRICS
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-surface-high border border-surface-highest">
                <span className="text-[10px] text-tactical-muted block">MISSIONS ACCEPTED</span>
                <span className="text-lg font-bold text-primary">{acceptedMissions.length}</span>
              </div>
              <div className="p-3 rounded bg-surface-high border border-surface-highest">
                <span className="text-[10px] text-tactical-muted block">CREDENTIAL STATUS</span>
                <span className="text-lg font-bold text-emerald-400">LEVEL 2 VERIFIED</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
