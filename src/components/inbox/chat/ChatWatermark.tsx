import { memo } from 'react';

/**
 * Gift-box doodle watermark background for the chat area,
 * similar to WhatsApp's iconic pattern but with presents & ornaments.
 */
export const ChatWatermark = memo(function ChatWatermark() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full text-primary"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id="gift-pattern"
            x="0"
            y="0"
            width="180"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Gift box 1 – tall with bow */}
            <g opacity="0.045" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="12" y="30" width="36" height="28" rx="2" />
              <rect x="8" y="24" width="44" height="8" rx="2" />
              <line x1="30" y1="24" x2="30" y2="58" />
              <path d="M30 24 Q22 14 18 16 Q14 18 20 24" />
              <path d="M30 24 Q38 14 42 16 Q46 18 40 24" />
            </g>

            {/* Gift box 2 – wide flat */}
            <g opacity="0.04" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" transform="translate(95, 15) rotate(8)">
              <rect x="0" y="10" width="50" height="20" rx="2" />
              <rect x="-3" y="5" width="56" height="7" rx="2" />
              <line x1="25" y1="5" x2="25" y2="30" />
              <path d="M25 5 Q18 -2 15 0 Q12 2 18 5" />
              <path d="M25 5 Q32 -2 35 0 Q38 2 32 5" />
            </g>

            {/* Ornament ball */}
            <g opacity="0.035" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
              <circle cx="75" cy="80" r="12" />
              <ellipse cx="75" cy="80" rx="5" ry="12" />
              <line x1="63" y1="80" x2="87" y2="80" />
              <rect x="72" y="66" width="6" height="4" rx="1" />
              <path d="M75 66 Q75 60 78 62" />
            </g>

            {/* Gift box 3 – small tilted */}
            <g opacity="0.04" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" transform="translate(20, 105) rotate(-6)">
              <rect x="0" y="8" width="28" height="22" rx="2" />
              <rect x="-2" y="3" width="32" height="7" rx="2" />
              <line x1="14" y1="3" x2="14" y2="30" />
              <path d="M14 3 Q8 -3 6 -1 Q4 1 9 3" />
              <path d="M14 3 Q20 -3 22 -1 Q24 1 19 3" />
            </g>

            {/* Gift box 4 – cube with ribbon */}
            <g opacity="0.04" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" transform="translate(100, 90)">
              <rect x="0" y="10" width="32" height="26" rx="2" />
              <rect x="-2" y="5" width="36" height="7" rx="2" />
              <line x1="16" y1="5" x2="16" y2="36" />
              <path d="M16 5 Q10 -2 7 0 Q4 2 10 5" />
              <path d="M16 5 Q22 -2 25 0 Q28 2 22 5" />
            </g>

            {/* Small ornament */}
            <g opacity="0.03" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
              <circle cx="155" cy="65" r="9" />
              <line x1="146" y1="65" x2="164" y2="65" />
              <rect x="153" y="54" width="4" height="3" rx="1" />
              <path d="M155 54 Q155 50 157 51" />
            </g>

            {/* Gift box 5 – bottom area */}
            <g opacity="0.035" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" transform="translate(55, 145) rotate(5)">
              <rect x="0" y="8" width="40" height="24" rx="2" />
              <rect x="-2" y="3" width="44" height="7" rx="2" />
              <line x1="20" y1="3" x2="20" y2="32" />
              <path d="M20 3 Q13 -4 10 -2 Q7 0 14 3" />
              <path d="M20 3 Q27 -4 30 -2 Q33 0 26 3" />
            </g>

            {/* Tiny gift */}
            <g opacity="0.03" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" transform="translate(140, 140)">
              <rect x="0" y="6" width="22" height="16" rx="1.5" />
              <rect x="-1" y="2" width="24" height="5" rx="1.5" />
              <line x1="11" y1="2" x2="11" y2="22" />
              <path d="M11 2 Q7 -2 5 0 Q3 2 7 2" />
              <path d="M11 2 Q15 -2 17 0 Q19 2 15 2" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#gift-pattern)" />
      </svg>
    </div>
  );
});
