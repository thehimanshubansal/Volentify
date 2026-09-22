'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TelemetryWidgetProps {
  title: string;
  value: string | number;
  subtext?: string;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  variant?: 'primary' | 'emergency' | 'secondary' | 'neutral';
}

export default function TelemetryWidget({
  title,
  value,
  subtext,
  change,
  isPositive = true,
  icon: Icon,
  variant = 'primary',
}: TelemetryWidgetProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emergency':
        return {
          border: 'border-emergency/40 hover:border-emergency',
          iconBg: 'bg-emergency/15 text-emergency',
          valueColor: 'text-emergency',
        };
      case 'secondary':
        return {
          border: 'border-secondary-bright/40 hover:border-secondary-bright',
          iconBg: 'bg-secondary/30 text-secondary-bright',
          valueColor: 'text-secondary-bright',
        };
      case 'neutral':
        return {
          border: 'border-surface-highest/60 hover:border-surface-highest',
          iconBg: 'bg-surface-high text-tactical-muted',
          valueColor: 'text-tactical-text',
        };
      default:
        return {
          border: 'border-primary/40 hover:border-primary',
          iconBg: 'bg-primary/15 text-primary',
          valueColor: 'text-primary-tint',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={`p-5 rounded-xl bg-surface-low/90 backdrop-blur-md border ${styles.border} transition-all hover:scale-[1.01] shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-telemetry text-tactical-muted uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-2xl lg:text-3xl font-bold font-telemetry tracking-tight ${styles.valueColor}`}>
          {value}
        </span>
        {change && (
          <span className={`text-xs font-telemetry font-semibold px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {change}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-tactical-muted">
          {subtext}
        </p>
      )}
    </div>
  );
}
