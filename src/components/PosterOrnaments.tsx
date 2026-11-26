import React from 'react';

export const HangingLanternSvg: React.FC<{ color?: string; className?: string }> = ({
  color = '#C89B3C',
  className = 'w-10 h-20',
}) => (
  <svg viewBox="0 0 64 128" fill="none" aria-hidden="true" className={className}>
    <line x1="32" y1="0" x2="32" y2="34" stroke={color} strokeWidth="1.8" />
    <circle cx="32" cy="38" r="4" stroke={color} strokeWidth="1.6" />
    <path d="M22 44 L42 44 L48 56 L16 56 Z" fill={color} fillOpacity="0.22" stroke={color} strokeWidth="1.6" />
    <rect x="18" y="56" width="28" height="36" rx="4" fill="#FFF7DC" fillOpacity="0.35" stroke={color} strokeWidth="1.8" />
    <path d="M26 56 V92 M38 56 V92" stroke={color} strokeWidth="1.1" strokeOpacity="0.7" />
    <circle cx="32" cy="74" r="5" fill="#FDE68A" opacity="0.85" />
    <path d="M18 92 L46 92 L38 106 L26 106 Z" fill={color} fillOpacity="0.28" stroke={color} strokeWidth="1.6" />
    <circle cx="32" cy="112" r="2.5" fill={color} />
  </svg>
);

export const FloralBouquetSvg: React.FC<{ className?: string; flip?: boolean }> = ({
  className = 'w-28 h-28',
  flip = false,
}) => (
  <svg
    viewBox="0 0 140 140"
    fill="none"
    aria-hidden="true"
    className={`${className} ${flip ? 'scale-[-1]' : ''}`}
  >
    {/* Olive & eucalyptus leaves */}
    <ellipse cx="42" cy="46" rx="18" ry="7" transform="rotate(-32 42 46)" fill="#5F7252" fillOpacity="0.72" />
    <ellipse cx="64" cy="28" rx="15" ry="6" transform="rotate(-65 64 28)" fill="#788A66" fillOpacity="0.7" />
    <ellipse cx="26" cy="72" rx="16" ry="6" transform="rotate(-10 26 72)" fill="#4D5F42" fillOpacity="0.75" />
    <ellipse cx="86" cy="40" rx="14" ry="5.5" transform="rotate(14 86 40)" fill="#6D7F5D" fillOpacity="0.68" />
    <path d="M16 18 C46 38, 68 58, 96 70" stroke="#8C6D2B" strokeWidth="1.4" strokeOpacity="0.65" />
    {/* Cream ivory roses */}
    <g>
      <circle cx="46" cy="54" r="20" fill="#F8F1E3" stroke="#D1BA8E" strokeWidth="1.2" />
      <path d="M36 52 C40 42, 54 42, 56 54 C52 62, 40 62, 38 52" stroke="#C5A66D" strokeWidth="1.2" fill="#EFE2C9" />
      <circle cx="46" cy="54" r="5" fill="#D8BC87" />
    </g>
    <g>
      <circle cx="78" cy="36" r="15" fill="#FFFDF8" stroke="#D1BA8E" strokeWidth="1.1" />
      <circle cx="78" cy="36" r="6" fill="#E6D2AE" />
    </g>
    <g>
      <circle cx="30" cy="84" r="13" fill="#FBF5E8" stroke="#D1BA8E" strokeWidth="1.1" />
      <circle cx="30" cy="84" r="5" fill="#DFC79A" />
    </g>
    {/* Small gold buds */}
    <circle cx="102" cy="54" r="4" fill="#D8B86F" />
    <circle cx="52" cy="96" r="3.5" fill="#D8B86F" />
  </svg>
);

export const HennaHandsIconSvg: React.FC<{ color?: string; className?: string }> = ({
  color = '#8C6726',
  className = 'w-11 h-11',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <path
      d="M16 48 V29 C16 26 19 25 20 28 V34 M20 26 C20 20 24 20 24 25 V33 M24 23 C24 17 28 17 28 23 V34 M28 26 C28 21 31 22 31 28 V42 C31 48 25 53 19 52 C17 51 16 50 16 48 Z"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity="0.1"
    />
    <path
      d="M48 48 V29 C48 26 45 25 44 28 V34 M44 26 C44 20 40 20 40 25 V33 M40 23 C40 17 36 17 36 23 V34 M36 26 C36 21 33 22 33 28 V42 C33 48 39 53 45 52 C47 51 48 50 48 48 Z"
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
      fillOpacity="0.1"
    />
    <circle cx="23.5" cy="40" r="2.2" fill={color} />
    <circle cx="40.5" cy="40" r="2.2" fill={color} />
    <path d="M32 10 L33.8 14 L38 14.5 L34.8 17.4 L35.6 21.5 L32 19.4 L28.4 21.5 L29.2 17.4 L26 14.5 L30.2 14 Z" fill={color} fillOpacity="0.65" />
  </svg>
);

export const WeddingRingsIconSvg: React.FC<{ color?: string; className?: string }> = ({
  color = '#A67C2E',
  className = 'w-11 h-11',
}) => (
  <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
    <circle cx="24" cy="36" r="13" stroke={color} strokeWidth="2.4" />
    <circle cx="40" cy="36" r="13" stroke={color} strokeWidth="2.4" />
    <path
      d="M32 19 C32 15 27 12 24 15 C21 18 25 22 32 27 C39 22 43 18 40 15 C37 12 32 15 32 19 Z"
      fill={color}
      fillOpacity="0.8"
    />
  </svg>
);

export const HangingMedallionSvg: React.FC<{
  monogram: string;
  color?: string;
  className?: string;
}> = ({ monogram, color = '#D8B566', className = 'w-16 h-32' }) => (
  <svg viewBox="0 0 80 150" fill="none" aria-hidden="true" className={className}>
    <line x1="40" y1="0" x2="40" y2="76" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
    <circle cx="40" cy="80" r="4" stroke={color} strokeWidth="1.5" />
    <circle cx="40" cy="112" r="28" fill="#181209" stroke={color} strokeWidth="2.2" />
    <circle cx="40" cy="112" r="23" stroke={color} strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.8" />
    <text
      x="40"
      y="118"
      textAnchor="middle"
      fill={color}
      fontSize="16"
      fontWeight="700"
      fontFamily="Cormorant Garamond, Amiri, serif"
    >
      {monogram.slice(0, 4)}
    </text>
  </svg>
);
