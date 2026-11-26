import React from 'react';
import type { TemplateConfig } from '../types/database';

export const KhatamRosette: React.FC<{ color?: string; className?: string }> = ({
  color = '#D4AF37',
  className = 'w-14 h-14',
}) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <g stroke={color} strokeWidth="1.4" opacity="0.92">
      <rect x="26" y="26" width="68" height="68" />
      <rect x="26" y="26" width="68" height="68" transform="rotate(45 60 60)" />
      <circle cx="60" cy="60" r="36" strokeDasharray="3 3" opacity="0.65" />
      <circle cx="60" cy="60" r="16" />
      <polygon points="60,36 66,54 84,60 66,66 60,84 54,66 36,60 54,54" fill={color} fillOpacity="0.16" />
      <circle cx="60" cy="60" r="4" fill={color} />
    </g>
  </svg>
);

export const ArabesqueDivider: React.FC<{ color?: string; className?: string }> = ({
  color = '#C8A45D',
  className = 'w-full max-w-xs h-6',
}) => (
  <svg viewBox="0 0 360 32" fill="none" aria-hidden="true" className={className}>
    <line x1="8" y1="16" x2="136" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
    <line x1="224" y1="16" x2="352" y2="16" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
    <path
      d="M144 16 C154 6, 166 6, 174 16 C166 26, 154 26, 144 16 Z"
      stroke={color}
      strokeWidth="1.2"
      fill={color}
      fillOpacity="0.12"
    />
    <path
      d="M216 16 C206 6, 194 6, 186 16 C194 26, 206 26, 216 16 Z"
      stroke={color}
      strokeWidth="1.2"
      fill={color}
      fillOpacity="0.12"
    />
    <polygon points="180,6 188,16 180,26 172,16" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.3" />
    <circle cx="136" cy="16" r="2.2" fill={color} />
    <circle cx="224" cy="16" r="2.2" fill={color} />
  </svg>
);

export const CornerFiligree: React.FC<{
  color?: string;
  position: 'tl' | 'tr' | 'bl' | 'br';
  styleVariant?: TemplateConfig['ornamentStyle'];
}> = ({ color = '#C8A45D', position, styleVariant = 'royal_crest' }) => {
  const rotateClass =
    position === 'tl'
      ? ''
      : position === 'tr'
        ? 'scale-x-[-1]'
        : position === 'bl'
          ? 'scale-y-[-1]'
          : 'scale-[-1]';

  const posClass =
    position === 'tl'
      ? 'top-3 left-3'
      : position === 'tr'
        ? 'top-3 right-3'
        : position === 'bl'
          ? 'bottom-3 left-3'
          : 'bottom-3 right-3';

  if (styleVariant === 'minimal_hairline') {
    return (
      <svg
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className={`pointer-events-none absolute w-7 h-7 opacity-45 ${posClass} ${rotateClass}`}
      >
        <path d="M2 24 V2 H24" stroke={color} strokeWidth="1" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none absolute w-14 h-14 sm:w-16 sm:h-16 opacity-80 ${posClass} ${rotateClass}`}
    >
      <path d="M4 60 V14 C4 8.5 8.5 4 14 4 H60" stroke={color} strokeWidth="1.4" />
      <path d="M10 48 V16 C10 12.7 12.7 10 16 10 H48" stroke={color} strokeWidth="0.9" strokeOpacity="0.65" />
      <path
        d="M16 16 C22 16 26 20 26 26 C20 26 16 22 16 16 Z"
        stroke={color}
        strokeWidth="1.1"
        fill={color}
        fillOpacity="0.18"
      />
      <circle cx="10" cy="10" r="2.2" fill={color} />
    </svg>
  );
};

export const WaxSealEmblem: React.FC<{
  initials: string;
  accentColor?: string;
  size?: 'sm' | 'lg';
}> = ({ initials, accentColor = '#D4AF37', size = 'lg' }) => {
  const dim = size === 'lg' ? 'w-24 h-24 text-2xl' : 'w-14 h-14 text-sm';
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shadow-xl select-none ${dim}`}
      style={{
        background: `radial-gradient(circle at 32% 30%, ${accentColor}, #7c5c20 75%, #4b3610 100%)`,
        boxShadow: `0 12px 28px -6px rgba(0,0,0,0.45), inset 0 2px 6px rgba(255,255,255,0.45)`,
      }}
    >
      <div
        className="absolute inset-1.5 rounded-full border border-white/40"
        aria-hidden="true"
      />
      <span
        className="font-serif font-bold tracking-wider text-white drop-shadow"
        style={{ fontFamily: '"Cormorant Garamond", "Amiri", serif' }}
      >
        {initials}
      </span>
    </div>
  );
};

export const OliveSprig: React.FC<{ color?: string; className?: string }> = ({
  color = '#4A5C44',
  className = 'w-16 h-8',
}) => (
  <svg viewBox="0 0 120 48" fill="none" aria-hidden="true" className={className}>
    <path d="M10 34 C38 28, 72 22, 110 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <ellipse cx="32" cy="24" rx="8" ry="4" transform="rotate(-24 32 24)" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1" />
    <ellipse cx="48" cy="30" rx="8" ry="4" transform="rotate(14 48 30)" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1" />
    <ellipse cx="64" cy="18" rx="8" ry="4" transform="rotate(-22 64 18)" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1" />
    <ellipse cx="80" cy="24" rx="7.5" ry="3.8" transform="rotate(12 80 24)" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1" />
    <ellipse cx="98" cy="14" rx="7" ry="3.5" transform="rotate(-18 98 14)" fill={color} fillOpacity="0.34" stroke={color} strokeWidth="1" />
  </svg>
);
