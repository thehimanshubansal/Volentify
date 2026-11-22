'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import { Award, CalendarDays, Hourglass, MapPin, ShieldCheck, Star } from 'lucide-react';
import { api, ApiError, useApi } from '@/lib/api';
import { ROLE_META } from '@/lib/constants';
import { useSession } from '@/lib/session';
import type { Availability, MissionHistoryItem, Review, TaskStatus, VolunteerProfileData } from '@/lib/types';
import { cn, formatCoord, formatDateTime, timeAgo } from '@/lib/utils';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, SourceTag } from '@/components/ui/DataState';
import { Field, Select, Textarea } from '@/components/ui/Field';
import { Panel, Stat } from '@/components/ui/Page';
import { useToast } from '@/components/ui/Toast';

type Tone = NonNullable<React.ComponentProps<typeof Pill>['tone']>;

const AVAILABILITY: Record<Availability, { label: string; tone: Tone }> = {
  AVAILABLE: { label: 'Available', tone: 'good' },
  BUSY: { label: 'On mission', tone: 'signal' },
  OFFLINE: { label: 'Off duty', tone: 'neutral' },
};

const STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  OPEN: { label: 'Open', tone: 'neutral' },
  ASSIGNED: { label: 'Assigned', tone: 'neutral' },
  IN_PROGRESS: { label: 'In progress', tone: 'signal' },
  COMPLETED: { label: 'Completed', tone: 'good' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Outstanding'] as const;
const COMMENT_MAX = 600;
const HISTORY_PREVIEW = 8;
/** Onboarding stores India's centroid until a real position arrives — never present it as a location. */
const PLACEHOLDER = { lat: 20.59, lng: 78.96 };

const plural = (n: number, word: string) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-base text-stone">{children}</span>;
}

function duration(minutes: number | null): React.ReactNode {
  if (minutes == null) return '—';
  const total = Math.round(minutes);
  if (total < 1) return <>&lt;1<Unit> min</Unit></>;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return <>{m}<Unit> min</Unit></>;
  return <>{h}<Unit> h</Unit>{m ? <> {m}<Unit> min</Unit></> : null}</>;
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function Stamp({ label, iso }: { label: string; iso: string | null }) {
  if (!iso) return null;
  return (
    <span>
      {label} <time dateTime={iso} title={formatDateTime(iso)} className="text-sand">{timeAgo(iso)}</time>
    </span>
  );
}

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden
          className={cn(size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5', n <= value ? 'fill-gold text-gold' : 'text-ash')} />
      ))}
    </span>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '·';
  const ring = 'h-20 w-20 shrink-0 rounded-full ring-1 ring-gold/35 sm:h-24 sm:w-24';
  if (url && !failed) {
    // Plain <img>: provider avatars come from arbitrary hosts (same as the navbar).
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn(ring, 'object-cover')} />;
  }
  return (
    <span aria-hidden className={cn(ring, 'flex items-center justify-center bg-gold/[0.08] font-serif text-[2.75rem] leading-none text-gold sm:text-5xl')}>
      {initial}
    </span>
  );
}

/* ─── Sections ──────────────────────────────────────────────────────────── */

function CurrentStatus({ data }: { data: VolunteerProfileData }) {
  const v = data.volunteer;
  const located = !(Math.round(v.lat * 100) / 100 === PLACEHOLDER.lat && Math.round(v.lng * 100) / 100 === PLACEHOLDER.lng);
  return (
    <Panel>
      <dl className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_auto_minmax(0,1fr)]">
        <div className="min-w-0 space-y-2.5">
          <dt className="text-[0.8125rem] text-stone">Skills</dt>
          <dd className="flex flex-wrap gap-2">
            {v.skills.length ? v.skills.map((s) => <Pill key={s}>{s}</Pill>) : <span className="text-sm text-stone">No skills listed</span>}
          </dd>
        </div>
        <div className="min-w-0 space-y-2.5">
          <dt className="text-[0.8125rem] text-stone">Equipment</dt>
          <dd className="flex flex-wrap gap-2">
            {v.equipment.length ? v.equipment.map((s) => <Pill key={s}>{s}</Pill>) : <span className="text-sm text-stone">None listed</span>}
          </dd>
        </div>
        <div className="space-y-1.5">
          <dt className="text-[0.8125rem] text-stone">Active missions</dt>
          <dd className="numeral text-4xl leading-none">{data.stats.missions_active}</dd>
        </div>
        <div className="min-w-0 space-y-1.5">
          <dt className="text-[0.8125rem] text-stone">Location</dt>
          <dd className="space-y-1.5">
            <p className="flex items-start gap-1.5 text-[0.9375rem] text-ivory">
              <MapPin className="mt-1 h-3.5 w-3.5 shrink-0 text-stone" aria-hidden />
              <span className="min-w-0 break-words">{data.district ?? 'District not shared'}</span>
            </p>
            {data.is_self ? (
              located ? (
                <>
                  <p className="code break-words">{formatCoord(v.lat, v.lng)}</p>
                  <p className="text-xs text-stone">Location last updated from your mission start. Others only see your district.</p>
                </>
              ) : (
                <p className="text-xs text-stone">Your position updates when you start a mission. Others only see your district.</p>
              )
            ) : (
              <p className="text-xs text-stone">Shown to district level only.</p>
            )}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}

function MissionRow({ m }: { m: MissionHistoryItem }) {
  const s = STATUS[m.status];
  return (
    <li className="grid gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-8">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="code">{m.code}</span>
          <SeverityBadge level={m.urgency} />
          <Pill tone={s.tone}>{s.label}</Pill>
        </div>
        <p className="break-words text-[1.0625rem] text-ivory">{m.title}</p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-stone">
          <span>{m.required_skill}</span>
          <Link href={`/disasters/${encodeURIComponent(m.disaster_id)}`} className="link min-w-0 break-words">{m.disaster_title}</Link>
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
          {!m.accepted_at && !m.started_at && !m.completed_at && <Stamp label="Raised" iso={m.created_at} />}
          <Stamp label="Accepted" iso={m.accepted_at} />
          <Stamp label="Started" iso={m.started_at} />
          <Stamp label="Completed" iso={m.completed_at} />
        </p>
        {m.outcome_note && (
          <p className="mt-2 max-w-2xl break-words border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-sand">
            <span className="sr-only">Outcome note: </span>{m.outcome_note}
          </p>
        )}
      </div>
      {m.people_helped != null && (
        <p className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0.5 sm:text-right">
          <span className="numeral text-3xl leading-none">{m.people_helped.toLocaleString('en-IN')}</span>
          <span className="text-xs text-stone">{m.people_helped === 1 ? 'person helped' : 'people helped'}</span>
        </p>
      )}
    </li>
  );
}

function MissionHistory({ history, isSelf }: { history: MissionHistoryItem[]; isSelf: boolean }) {
  const [all, setAll] = useState(false);
  if (!history.length) {
    return (
      <EmptyState
        title="No missions yet"
        body={isSelf ? 'Missions you accept on the dispatch board will be recorded here.' : 'This responder hasn’t taken on a mission yet.'}
        action={isSelf ? <ButtonLink href="/volunteer" size="sm" variant="secondary">Find a mission</ButtonLink> : undefined}
      />
    );
  }
  const shown = all ? history : history.slice(0, HISTORY_PREVIEW);
  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line border-y border-line">
        {shown.map((m) => <MissionRow key={m.id} m={m} />)}
      </ul>
      {history.length > HISTORY_PREVIEW && (
        <Button variant="ghost" size="sm" onClick={() => setAll((x) => !x)} aria-expanded={all}>
          {all ? 'Show fewer missions' : `Show all ${history.length} missions`}
        </Button>
      )}
    </div>
  );
}

function RatingSummary({ stats }: { stats: VolunteerProfileData['stats'] }) {
  const total = stats.reviews;
  return (
    <div className="space-y-5">
      <div className="flex items-end gap-3">
        {stats.average_rating != null ? (
          <>
            <p className="numeral text-5xl leading-none">
              {stats.average_rating.toFixed(1)}<span className="sr-only"> out of 5</span>
            </p>
            <div className="space-y-1 pb-0.5">
              <Stars value={Math.round(stats.average_rating)} size="md" />
              <p className="text-xs text-stone">{plural(total, 'review')}</p>
            </div>
          </>
        ) : (
          <p className="font-serif text-2xl text-ivory">No ratings yet</p>
        )}
      </div>
      <ul className="space-y-2.5" aria-label="Rating distribution">
        {([5, 4, 3, 2, 1] as const).map((n) => {
          const count = stats.rating_counts[String(n) as '1' | '2' | '3' | '4' | '5'] ?? 0;
          return (
            <li key={n} className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-[0.8125rem]">
              <span className="inline-flex items-center gap-1 text-sand">
                {n}<Star className="h-3 w-3 fill-gold text-gold" aria-hidden /><span className="sr-only"> {n === 1 ? 'star' : 'stars'}:</span>
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-ink-700" aria-hidden>
                <span className="block h-full rounded-full bg-gold/70" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
              </span>
              <span className="data text-right text-stone">{count}<span className="sr-only"> {count === 1 ? 'review' : 'reviews'}</span></span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewList({ reviews, viewerReviewId, isSelf }: { reviews: Review[]; viewerReviewId: string | null; isSelf: boolean }) {
  if (!reviews.length) {
    return (
      <EmptyState
        title="No reviews yet"
        body={isSelf ? 'Members who work alongside you can leave a review here.' : 'Reviews from members who have worked with this responder will appear here.'}
      />
    );
  }
  return (
    <ul className="divide-y divide-line border-y border-line">
      {reviews.map((r) => {
        const edited = Date.parse(r.updated_at) - Date.parse(r.created_at) > 60_000;
        return (
          <li key={r.id} className="space-y-2.5 py-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <Stars value={r.rating} />
              <span className="text-xs text-stone">
                <time dateTime={r.updated_at}
                  title={edited ? `Written ${formatDateTime(r.created_at)} · edited ${formatDateTime(r.updated_at)}` : formatDateTime(r.updated_at)}>
                  {timeAgo(r.updated_at)}
                </time>
                {edited && ' · edited'}
              </span>
              {r.id === viewerReviewId && <Pill tone="info">Your review</Pill>}
            </div>
            {r.comment
              ? <p className="max-w-2xl whitespace-pre-line break-words font-serif text-[1.25rem] leading-snug text-ivory">{r.comment}</p>
              : <p className="text-sm text-ash">Rating only, no comment.</p>}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone">
              <span className="text-sand">{r.author_name}</span>
              <Pill>{ROLE_META[r.author_role]?.short ?? r.author_role}</Pill>
              {r.task_code && <span>on mission <span className="code">{r.task_code}</span></span>}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function ReviewForm({ data, onSaved }: { data: VolunteerProfileData; onSaved: () => void }) {
  const toast = useToast();
  const uid = useId();
  const existing = data.viewer_review;
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [taskId, setTaskId] = useState(
    (existing?.task_code && data.reviewable_missions.find((m) => m.code === existing.task_code)?.id) || '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstName = data.volunteer.name.trim().split(/\s+/)[0] || 'this responder';
  const shown = hover || rating;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) {
      setError('Choose a rating from one to five stars.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post<Review>(`/api/volunteers/${encodeURIComponent(data.volunteer.id)}/reviews`, {
        rating, comment: comment.trim(), task_id: taskId || null,
      });
      toast(existing ? 'Your review has been updated' : 'Thank you. Your review is published.');
      onSaved();
    } catch (err) {
      const message = !(err instanceof ApiError) ? 'Could not save your review. Check your connection and try again.'
        : err.status === 429 ? 'You have sent several reviews in the last hour. Please try again later.'
        : err.message;
      setError(message);
      toast(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="space-y-1">
        <h3 className="text-2xl">{existing ? 'Your review' : `Review ${firstName}`}</h3>
        <p className="text-sm text-stone">
          {existing ? `You reviewed ${firstName} ${timeAgo(existing.updated_at)}. Sending again replaces it.` : 'Share how this responder worked with you in the field.'}
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[0.8125rem] font-medium text-sand">Your rating</legend>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex items-center" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} onMouseEnter={() => setHover(n)}
                className="relative cursor-pointer rounded-lg p-1.5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-signal">
                <input type="radio" name={`${uid}-rating`} value={n} checked={rating === n} className="sr-only"
                  onChange={() => { setRating(n); setError(null); }} />
                <Star aria-hidden className={cn('h-7 w-7 transition-colors', n <= shown ? 'fill-gold text-gold' : 'text-ash hover:text-stone')} />
                <span className="sr-only">{n} {n === 1 ? 'star' : 'stars'}, {RATING_WORDS[n].toLowerCase()}</span>
              </label>
            ))}
          </div>
          <span className="text-sm text-stone" aria-hidden>{shown ? RATING_WORDS[shown] : 'Not rated'}</span>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor={`${uid}-comment`} className="block text-[0.8125rem] font-medium text-sand">Comment <span className="font-normal text-stone">(optional)</span></label>
        <Textarea id={`${uid}-comment`} value={comment} maxLength={COMMENT_MAX} aria-describedby={`${uid}-count ${uid}-note`}
          onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
          placeholder="What did they do well? Would you deploy with them again?" />
        <div className="flex items-start justify-between gap-4 text-xs text-stone">
          <p id={`${uid}-note`}>Phone and ID numbers are removed automatically.</p>
          <p id={`${uid}-count`} className={cn('data shrink-0', comment.length > COMMENT_MAX - 60 && 'text-moderate')}>
            {comment.length}/{COMMENT_MAX}<span className="sr-only"> characters</span>
          </p>
        </div>
      </div>

      {data.reviewable_missions.length > 0 && (
        <Field label="Which mission?" hint="Optional. Link your review to a mission they completed." htmlFor={`${uid}-mission`}>
          <Select id={`${uid}-mission`} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">{existing?.task_code ? `Keep ${existing.task_code}` : 'Not about a specific mission'}</option>
            {data.reviewable_missions.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.title}</option>)}
          </Select>
        </Field>
      )}

      {error && <p className="text-sm text-critical" role="alert">{error}</p>}

      <Button type="submit" loading={busy} className="w-full sm:w-auto">{existing ? 'Update your review' : 'Publish review'}</Button>
    </form>
  );
}

function ReviewSlot({ data, onSaved }: { data: VolunteerProfileData; onSaved: () => void }) {
  const { status, user } = useSession();
  const pathname = usePathname();
  if (data.is_self) return null;
  if (data.can_review) {
    return (
      <Panel>
        <ReviewForm key={data.viewer_review?.updated_at ?? 'new'} data={data} onSaved={onSaved} />
      </Panel>
    );
  }
  if (status === 'loading') return null;
  if (!user) {
    return (
      <Panel className="space-y-3">
        <p className="text-sm text-sand">Worked alongside {data.volunteer.name}? Members can rate responders after signing in.</p>
        <Link href={`/login?next=${encodeURIComponent(pathname || `/volunteers/${data.volunteer.id}`)}`} className="link text-sm">Sign in to review</Link>
      </Panel>
    );
  }
  if (!user.onboarded) {
    return (
      <Panel className="space-y-3">
        <p className="text-sm text-sand">Finish setting up your account before reviewing other members.</p>
        <Link href={`/onboarding?next=${encodeURIComponent(pathname || '/')}`} className="link text-sm">Complete your profile</Link>
      </Panel>
    );
  }
  return null;
}

/* ─── States for /profile ("me") ────────────────────────────────────────── */

function SignedOut({ next }: { next: string }) {
  return (
    <div className="page flex flex-col items-start gap-5 py-24 sm:py-28">
      <p className="eyebrow">My profile</p>
      <h1 className="display text-balance text-5xl">Sign in to see your responder profile.</h1>
      <p className="max-w-lg text-stone">Your profile records the missions you have taken on, the people you have helped and the reviews other members leave for you.</p>
      <ButtonLink href={`/login?next=${encodeURIComponent(next)}`}>Sign in</ButtonLink>
    </div>
  );
}

function NoResponderProfile() {
  const { user } = useSession();
  const role = user?.role;
  const responder = !role || role === 'CITIZEN' || role === 'VOLUNTEER';
  return (
    <div className="page py-16 sm:py-24">
      <Panel className="max-w-2xl space-y-5 sm:p-8">
        <p className="eyebrow">My profile</p>
        <h1 className="display text-balance text-4xl sm:text-5xl">
          {responder ? 'You don’t have a responder profile yet.' : 'Responder profiles are for volunteers.'}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-stone">
          {responder
            ? 'Add your skills, equipment and district to volunteer with Volentify. Your profile then records the missions you take on and the reviews other members leave for you.'
            : `Your ${role ? ROLE_META[role].label.toLowerCase() : ''} account doesn’t carry a mission record. You can still review responders you have worked with from their profiles.`}
        </p>
        <div className="flex flex-wrap gap-3">
          {responder
            ? <ButtonLink href="/onboarding?role=VOLUNTEER">Become a volunteer</ButtonLink>
            : <ButtonLink href={role === 'INCIDENT_ADMIN' || role === 'NGO_MEMBER' ? '/agency' : '/dashboard'}>Go to your dashboard</ButtonLink>}
          <ButtonLink href="/volunteer" variant="secondary">See the dispatch board</ButtonLink>
        </div>
      </Panel>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function VolunteerProfile({ id }: { id: string }) {
  const pathname = usePathname();
  const { data, error, loading, source, reload } = useApi<VolunteerProfileData>(`/api/volunteers/${encodeURIComponent(id)}/profile`);
  const isMe = id === 'me';

  if (loading && !data) {
    return (
      <div className="page space-y-6 py-16 sm:py-20" role="status" aria-label="Loading profile">
        <div className="flex items-center gap-5"><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-14 w-2/3" /></div>
        <Skeleton className="h-24" /><Skeleton className="h-40" /><Skeleton className="h-64" />
      </div>
    );
  }
  if (isMe && error?.status === 401) return <SignedOut next={pathname || '/profile'} />;
  if (isMe && error?.status === 404) return <NoResponderProfile />;
  if (error?.status === 404) {
    return (
      <div className="page py-20 sm:py-28">
        <EmptyState
          title="Volunteer not found"
          body="This responder profile doesn’t exist or is no longer available. The link may be mistyped."
          action={<ButtonLink href="/volunteer" size="sm" variant="secondary">Back to the dispatch board</ButtonLink>}
        />
      </div>
    );
  }
  if (error || !data) {
    return <div className="page py-20"><ErrorState message={error?.message ?? 'Unable to load this profile.'} onRetry={reload} /></div>;
  }

  const v = data.volunteer;
  const s = data.stats;
  const avail = AVAILABILITY[v.availability];

  return (
    <article>
      <header className="page pb-10 pt-12 sm:pt-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-stone">
          <Link href="/volunteer" className="hover:text-ivory">Dispatch</Link>
          <span className="mx-2 text-ash">/</span>
          <span>{data.is_self ? 'Your profile' : 'Responder profile'}</span>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
            <Avatar name={v.name} url={data.avatar_url} />
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Pill><Award className="h-3 w-3" aria-hidden />{data.badge}</Pill>
                <Pill tone={avail.tone} dot>{avail.label}</Pill>
                <SourceTag source={source} className="ml-1" />
              </div>
              <h1 className="display text-balance break-words text-5xl sm:text-6xl">{v.name}</h1>
              <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone">
                {v.verified
                  ? <span className="inline-flex items-center gap-1.5 text-gold"><ShieldCheck className="h-4 w-4" aria-hidden />Verified responder</span>
                  : <span className="inline-flex items-center gap-1.5"><Hourglass className="h-3.5 w-3.5" aria-hidden />Awaiting verification</span>}
                {data.district && <span className="inline-flex min-w-0 items-center gap-1.5 text-sand"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="break-words">{data.district}</span></span>}
                {data.member_since && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    Member since <time dateTime={data.member_since}>{monthYear(data.member_since)}</time>
                  </span>
                )}
              </p>
            </div>
          </div>
          {data.is_self && (
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/onboarding" variant="secondary">Edit skills</ButtonLink>
              <ButtonLink href="/volunteer">Open dispatch board</ButtonLink>
            </div>
          )}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Missions completed" value={s.missions_completed.toLocaleString('en-IN')}
            note={s.missions_active ? `${s.missions_active} active now` : undefined} />
          <Stat label="People helped" value={s.people_helped.toLocaleString('en-IN')} note="Recorded at mission completion" />
          <Stat label="Hours in the field" value={<>{s.hours.toLocaleString('en-IN', { maximumFractionDigits: 1 })}<Unit> h</Unit></>}
            note="From start to completion" />
          <Stat label="Median time to start" value={duration(s.median_minutes_to_start)} note="From accepting a mission" />
          <Stat label="Average rating"
            value={s.average_rating != null
              ? <>{s.average_rating.toFixed(1)}<span className="ml-1 text-[0.6em] text-gold" aria-hidden>★</span><span className="sr-only"> out of 5</span></>
              : '—'}
            note={s.average_rating != null ? plural(s.reviews, 'review') : 'No ratings yet'} />
        </div>
      </header>

      <section aria-labelledby="current" className="page pb-12">
        <h2 id="current" className="mb-5 text-[1.75rem] leading-tight sm:text-[2rem]">Current status</h2>
        <CurrentStatus data={data} />
      </section>

      <section aria-labelledby="history" className="page py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="history" className="text-[1.75rem] leading-tight sm:text-[2rem]">Mission history</h2>
          {data.history.length > 0 && <p className="text-sm text-stone">{plural(data.history.length, 'mission')}, newest first</p>}
        </div>
        <MissionHistory history={data.history} isSelf={data.is_self} />
      </section>

      <section aria-labelledby="reviews" className="page pb-20 pt-12">
        <h2 id="reviews" className="mb-6 text-[1.75rem] leading-tight sm:text-[2rem]">Reviews</h2>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start">
          <div className="space-y-8 lg:sticky lg:top-24">
            <Panel><RatingSummary stats={s} /></Panel>
            <ReviewSlot data={data} onSaved={reload} />
          </div>
          <ReviewList reviews={data.reviews} viewerReviewId={data.viewer_review?.id ?? null} isSelf={data.is_self} />
        </div>
      </section>
    </article>
  );
}
