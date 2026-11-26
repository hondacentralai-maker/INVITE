import React, { useEffect, useState } from 'react';
import { useI18n } from '../lib/i18n';

interface CountdownClockProps {
  targetIso: string;
  accentColor: string;
  textColor: string;
  darkSurface: boolean;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
}

function computeParts(targetIso: string): TimeParts {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, passed: false };
}

export const CountdownClock: React.FC<CountdownClockProps> = ({
  targetIso,
  accentColor,
  textColor,
  darkSurface,
}) => {
  const { isAr } = useI18n();
  const [parts, setParts] = useState<TimeParts>(() => computeParts(targetIso));

  useEffect(() => {
    setParts(computeParts(targetIso));
    const timer = window.setInterval(() => {
      setParts(computeParts(targetIso));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetIso]);

  if (parts.passed) {
    return (
      <div
        className="text-center py-4 px-5 rounded-2xl border"
        style={{
          borderColor: `${accentColor}44`,
          backgroundColor: darkSurface ? 'rgba(255,255,255,0.04)' : 'rgba(184,146,70,0.08)',
        }}
      >
        <p className="font-bold text-base" style={{ color: accentColor }}>
          {isAr ? 'اليوم الكبير قد أقبل — ألف مبروك للعروسين' : 'The Joyous Day Has Arrived'}
        </p>
      </div>
    );
  }

  const cells = [
    { val: parts.days, label: isAr ? 'يوم' : 'Days' },
    { val: parts.hours, label: isAr ? 'ساعة' : 'Hours' },
    { val: parts.minutes, label: isAr ? 'دقيقة' : 'Mins' },
    { val: parts.seconds, label: isAr ? 'ثانية' : 'Secs' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md mx-auto" dir="ltr">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border py-3 px-2 text-center transition-colors"
          style={{
            borderColor: `${accentColor}45`,
            backgroundColor: darkSurface ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
          }}
        >
          <span
            className="block text-2xl sm:text-3xl font-bold tabular-nums leading-none"
            style={{ color: accentColor }}
          >
            {String(c.val).padStart(2, '0')}
          </span>
          <span
            className="block text-[11px] sm:text-xs font-semibold mt-1.5 opacity-80"
            style={{ color: textColor }}
          >
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
};
