'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Clock, Calendar } from 'lucide-react';

export default function MapTimelineSlider() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(50); // 0 = -24h, 50 = LIVE, 100 = +48h Forecast

  const getLabel = () => {
    if (sliderValue === 50) return 'REAL-TIME LIVE TELEMETRY';
    if (sliderValue < 50) return `HISTORICAL -${Math.round((50 - sliderValue) * 0.48)} HOURS`;
    return `ML FORECAST +${Math.round((sliderValue - 50) * 0.96)} HOURS`;
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-1/4 md:right-1/4 z-20 bg-surface-low/95 backdrop-blur-md p-3.5 rounded-xl border border-surface-highest/90 shadow-tactical font-telemetry">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded bg-primary text-surface-lowest hover:bg-primary-tint transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>
          <button
            onClick={() => setSliderValue(50)}
            className="p-1.5 rounded bg-surface-high hover:bg-surface-highest text-tactical-text transition-colors"
            title="Reset to Live"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="text-xs font-bold text-tactical-text flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{getLabel()}</span>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${sliderValue > 50 ? 'bg-primary/20 text-primary' : 'bg-surface-high text-tactical-muted'}`}>
          {sliderValue > 50 ? 'ML SIMULATION RUNNING' : 'IMAGERY STREAM'}
        </span>
      </div>

      {/* Timeline Slider Input */}
      <input
        type="range"
        min="0"
        max="100"
        value={sliderValue}
        onChange={(e) => setSliderValue(Number(e.target.value))}
        className="w-full h-2 bg-surface-highest rounded-lg appearance-none cursor-pointer accent-primary"
      />

      <div className="flex justify-between text-[10px] text-tactical-muted mt-1">
        <span>-24 Hours</span>
        <span className="text-primary font-bold">LIVE (NOW)</span>
        <span>+48h Forecast</span>
      </div>
    </div>
  );
}
