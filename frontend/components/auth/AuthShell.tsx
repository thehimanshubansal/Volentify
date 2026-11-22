import Link from 'next/link';

/** Two-column frame shared by sign-in, registration and the OAuth callback. */
export function AuthShell({ title, lede, children, footer }: {
  title: string; lede: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-20">
      <div className="hidden flex-col justify-between lg:flex">
        <div className="space-y-6">
          <p className="eyebrow">Volentify network</p>
          <p className="display max-w-md text-6xl text-balance">Every responder, accounted for.</p>
          <p className="max-w-sm leading-relaxed text-stone">
            One account carries your role, your skills and your digital muster pass — the credential command uses to
            dispatch, verify and account for you in the field.
          </p>
        </div>
        <p className="text-sm text-ash">
          In immediate danger? Call <a href="tel:112" className="link">112</a>. You do not need an account to{' '}
          <Link href="/contact" className="link">report an incident</Link>.
        </p>
      </div>
      <div className="w-full">
        <div className="space-y-2">
          <h1 className="display text-[2.5rem] sm:text-5xl">{title}</h1>
          <p className="text-stone">{lede}</p>
        </div>
        <div className="mt-8">{children}</div>
        {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-stone">{footer}</div>}
      </div>
    </div>
  );
}
