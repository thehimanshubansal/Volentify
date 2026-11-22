import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/Page';
import { LegalMeta, Prose } from '../_components/Prose';

export const metadata: Metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <>
      <PageHeader label="Terms of use" title="Using Volentify for humanitarian response." meta={<LegalMeta updated="2026-10-30" />} />
      <div className="page pb-10">
        <Prose>
          <p>
            By creating an account or using Volentify you agree to these terms. They are written to keep the platform
            trustworthy for the people who rely on it in an emergency.
          </p>

          <h2>Volentify is not an emergency service</h2>
          <p>
            Volentify supports coordination between volunteers, NGOs and authorities. It does <strong>not</strong> replace 112,
            police, fire, ambulance, the NDRF, SDRFs, SDMAs or district control rooms, and it does not guarantee that anyone will
            respond to a report. <strong>If someone is in danger, call 112 first.</strong>
          </p>

          <h2>Information on the platform</h2>
          <ul>
            <li>Field reports, especially those relayed through Volentify Mesh, are <strong>unverified observations</strong> until an incident controller reviews them. Treat them accordingly.</li>
            <li>Forecasts, triage results and situation briefings are decision aids, not official warnings. Official warnings come from IMD, CWC, INCOIS, NDMA and your state authorities.</li>
            <li>Map imagery, radar and infrastructure layers come from third parties and may be delayed, incomplete or unavailable.</li>
            <li>When the database cannot be reached, pages show a cached dataset and say so. Do not act on cached data as if it were current.</li>
          </ul>

          <h2>Accounts, roles and verification</h2>
          <ul>
            <li>Give accurate information during onboarding, including a mobile number you can be reached on.</li>
            <li>Choose the role that reflects what you actually do. NGO and incident-command roles stay locked until an administrator verifies them, and administrators may change or revoke a role at any time.</li>
            <li>Your muster pass identifies you to field teams. Do not share it, alter it or present someone else’s.</li>
            <li>You are responsible for activity on your account. Tell us promptly if you think it has been misused.</li>
          </ul>

          <h2>Acceptable use</h2>
          <p>Do not:</p>
          <ul>
            <li>submit false, exaggerated or prank reports, or reports about people without a genuine safety reason;</li>
            <li>accept missions you cannot carry out, or work beyond your certified skills;</li>
            <li>use casualty, location or household information for anything other than the response;</li>
            <li>attempt to bypass role restrictions, extract data in bulk, overload the service or interfere with mesh relays;</li>
            <li>impersonate an agency, officer or another volunteer.</li>
          </ul>
          <p>We may suspend accounts that break these rules and refer serious misuse to the authorities.</p>

          <h2>Volunteering</h2>
          <p>
            Volunteers take part at their own discretion and must follow the instructions of the incident commander and local
            authorities on site. Volentify does not employ volunteers and does not provide insurance cover. Never put yourself
            at risk beyond your training.
          </p>

          <h2>Availability and liability</h2>
          <p>
            We work to keep Volentify available, but it is provided as is, without guarantees of uninterrupted service or
            accuracy. To the extent permitted by law, the project and its contributors are not liable for losses arising from
            reliance on information shown on the platform or from its unavailability.
          </p>

          <h2>Open-source licence</h2>
          <p>
            The Volentify source code is released under the MIT licence and is available on the{' '}
            <a href="https://github.com/Gyanvir/Volentify">project repository</a>. The licence covers the code, not
            the data contributed by users or partner agencies.
          </p>

          <h2>Changes and contact</h2>
          <p>
            We will update this page when the terms change and show the date of the latest revision above. Questions are welcome
            through the <Link href="/contact">contact page</Link>. How we handle personal data is described in the{' '}
            <Link href="/privacy">privacy notice</Link>.
          </p>
        </Prose>
      </div>
    </>
  );
}
