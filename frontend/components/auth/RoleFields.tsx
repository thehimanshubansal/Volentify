'use client';

import { EQUIPMENT, SKILLS } from '@/lib/constants';
import type { Role } from '@/lib/types';
import { ChipGroup, Field, Input, Segmented, Select, Textarea } from '@/components/ui/Field';

export type Profile = Record<string, string | number | string[] | undefined>;

const DEPENDENCIES = ['Insulin', 'Dialysis', 'Oxygen'] as const;
const FLEET = ['Trucks', 'Boats', 'Ambulances', 'Water tankers', 'Mobile kitchens'] as const;
const AGENCIES = ['NDRF', 'SDMA', 'DEOC', 'Police', 'Fire'] as const;
const CLEARANCE = ['Public data', 'Aggregated OSINT', 'Full analytical'] as const;

export const ROLE_DEFAULTS: Record<Role, Profile> = {
  VOLUNTEER: {},
  CITIZEN: { household_size: 1, infants: 0, elderly: 0, evacuation_status: 'Safe', medical_dependencies: [] },
  NGO_MEMBER: { darpan_id: '', meals_per_day: 0, water_litres_per_day: 0, shelter_beds: 0, medical_vans: 0, fleet_assets: [] },
  INCIDENT_ADMIN: { agency: 'NDRF', badge_number: '', hotline: '', vhf_frequency: '' },
  RESEARCHER: { institution: '', expertise: '', publications: '', clearance: 'Aggregated OSINT' },
};

/** Returns a plain-language reason the step can't continue, or null. */
export function roleStepError(role: Role, profile: Profile, skills: string[]): string | null {
  switch (role) {
    case 'VOLUNTEER': return skills.length ? null : 'Choose at least one certified skill.';
    case 'CITIZEN': return Number(profile.household_size) >= 1 ? null : 'Household size must be at least 1.';
    case 'NGO_MEMBER': return String(profile.darpan_id ?? '').trim().length >= 4 ? null : 'Enter your NGO Darpan registration ID.';
    case 'INCIDENT_ADMIN': return String(profile.badge_number ?? '').trim() ? null : 'Enter your official badge number.';
    case 'RESEARCHER': return String(profile.institution ?? '').trim() ? null : 'Enter your institution.';
  }
}

function NumberField({ label, name, profile, set, min = 0, hint }: {
  label: string; name: string; profile: Profile; set: (k: string, v: Profile[string]) => void; min?: number; hint?: string;
}) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <Input id={name} type="number" inputMode="numeric" min={min} value={String(profile[name] ?? '')}
        onChange={(e) => set(name, e.target.value === '' ? '' : Math.max(min, Number(e.target.value)))} />
    </Field>
  );
}

function TextField({ label, name, profile, set, placeholder, hint }: {
  label: string; name: string; profile: Profile; set: (k: string, v: Profile[string]) => void; placeholder?: string; hint?: string;
}) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <Input id={name} value={String(profile[name] ?? '')} placeholder={placeholder} onChange={(e) => set(name, e.target.value)} />
    </Field>
  );
}

export function RoleFields({ role, profile, onProfile, skills, onSkills, equipment, onEquipment }: {
  role: Role; profile: Profile; onProfile: (p: Profile) => void;
  skills: string[]; onSkills: (s: string[]) => void; equipment: string[]; onEquipment: (e: string[]) => void;
}) {
  const set = (k: string, v: Profile[string]) => onProfile({ ...profile, [k]: v });
  const list = (k: string) => (Array.isArray(profile[k]) ? (profile[k] as string[]) : []);

  switch (role) {
    case 'VOLUNTEER':
      return (
        <div className="space-y-7">
          <ChipGroup label="Certified skills" options={SKILLS} value={skills as (typeof SKILLS)[number][]} onChange={onSkills} />
          <ChipGroup label="Equipment you can bring" options={EQUIPMENT} value={equipment as (typeof EQUIPMENT)[number][]} onChange={onEquipment} />
          <p className="text-xs text-stone">Dispatch matches you to missions by these skills. Rare specialist skills are protected from routine tasks.</p>
        </div>
      );
    case 'CITIZEN':
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField label="People in household" name="household_size" profile={profile} set={set} min={1} />
            <NumberField label="Infants (under 2)" name="infants" profile={profile} set={set} />
            <NumberField label="Elderly (over 70)" name="elderly" profile={profile} set={set} />
          </div>
          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-sand">Your situation right now</p>
            <Segmented ariaLabel="Evacuation status" value={String(profile.evacuation_status ?? 'Safe')}
              onChange={(v) => set('evacuation_status', v)}
              options={[{ value: 'Safe', label: 'Safe' }, { value: 'Trapped', label: 'Trapped' }, { value: 'SOS', label: 'Need rescue now' }]} />
            {profile.evacuation_status !== 'Safe' && (
              <p className="text-sm text-critical">If you are in danger now, call <a href="tel:112" className="underline">112</a> first. Your status is shared with responders once you finish.</p>
            )}
          </div>
          <ChipGroup label="Medical dependencies in the household" options={DEPENDENCIES}
            value={list('medical_dependencies') as (typeof DEPENDENCIES)[number][]} onChange={(v) => set('medical_dependencies', v)} />
        </div>
      );
    case 'NGO_MEMBER':
      return (
        <div className="space-y-6">
          <TextField label="NGO Darpan registration ID" name="darpan_id" profile={profile} set={set} placeholder="OR/2019/0234567" />
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Meals per day" name="meals_per_day" profile={profile} set={set} />
            <NumberField label="Drinking water (litres per day)" name="water_litres_per_day" profile={profile} set={set} />
            <NumberField label="Shelter beds" name="shelter_beds" profile={profile} set={set} />
            <NumberField label="Mobile medical vans" name="medical_vans" profile={profile} set={set} />
          </div>
          <ChipGroup label="Fleet assets" options={FLEET} value={list('fleet_assets') as (typeof FLEET)[number][]} onChange={(v) => set('fleet_assets', v)} />
        </div>
      );
    case 'INCIDENT_ADMIN':
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-sand">Command agency</p>
            <Segmented ariaLabel="Command agency" value={String(profile.agency ?? 'NDRF')} onChange={(v) => set('agency', v)}
              options={AGENCIES.map((a) => ({ value: a, label: a }))} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Official badge number" name="badge_number" profile={profile} set={set} placeholder="NDRF-3BN-0417" />
            <TextField label="24/7 control-room hotline" name="hotline" profile={profile} set={set} placeholder="0674 2395398" />
            <TextField label="Tactical VHF frequency" name="vhf_frequency" profile={profile} set={set} placeholder="156.800 MHz" hint="Shared only with verified command accounts." />
          </div>
        </div>
      );
    case 'RESEARCHER':
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Institution" name="institution" profile={profile} set={set} placeholder="IIT Bhubaneswar" />
            <TextField label="Area of expertise" name="expertise" profile={profile} set={set} placeholder="Coastal hydrology" />
          </div>
          <Field label="Selected publications" htmlFor="publications" hint="One per line — titles or DOIs.">
            <Textarea id="publications" value={String(profile.publications ?? '')} onChange={(e) => set('publications', e.target.value)} />
          </Field>
          <Field label="Requested clearance" htmlFor="clearance">
            <Select id="clearance" value={String(profile.clearance ?? CLEARANCE[1])} onChange={(e) => set('clearance', e.target.value)}>
              {CLEARANCE.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
        </div>
      );
  }
}
