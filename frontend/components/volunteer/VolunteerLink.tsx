import Link from 'next/link';
import { cn } from '@/lib/utils';

/** A responder's name, linking to their public profile. Inherits the surrounding text colour. */
export function VolunteerLink({
  id, name, className, children,
}: { id: string; name: string; className?: string; children?: React.ReactNode }) {
  return (
    <Link
      href={`/volunteers/${encodeURIComponent(id)}`}
      title={`${name}: responder profile`}
      className={cn(
        'underline decoration-line-strong underline-offset-4 transition-colors hover:text-ivory hover:decoration-signal',
        className,
      )}
    >
      {children ?? name}
    </Link>
  );
}

export default VolunteerLink;
