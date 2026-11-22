import type { Metadata } from 'next';
import Forecasts from './Forecasts';

export const metadata: Metadata = { title: 'Forecasts' };

export default function PredictionsPage() {
  return <Forecasts />;
}
