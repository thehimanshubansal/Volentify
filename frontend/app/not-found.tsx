import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main className="page flex flex-1 flex-col items-start justify-center gap-6 py-32">
      <p className="eyebrow">Page not found</p>
      <h1 className="display max-w-2xl text-5xl sm:text-6xl">This page isn’t on the map.</h1>
      <p className="max-w-lg text-stone">The link may be out of date, or the incident has been archived.</p>
      <div className="flex gap-3">
        <ButtonLink href="/map">Open the map</ButtonLink>
        <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
      </div>
    </main>
  );
}
