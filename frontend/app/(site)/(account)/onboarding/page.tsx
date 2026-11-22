import type { Metadata } from 'next';
import { Suspense } from 'react';
import Wizard from './Wizard';

export const metadata: Metadata = { title: 'Set up your muster pass' };

export default function OnboardingPage() {
  return <Suspense><Wizard /></Suspense>;
}
