import { memo } from 'react';

/**
 * Animated vector watermark background for the chat area.
 * Uses pure CSS animations for performance — no JS animation loop.
 */
export const ChatWatermark = memo(function ChatWatermark() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Slow floating animation */}
          <style>{`
            @keyframes wm-float-1 {
              0%, 100% { transform: translate(0, 0) rotate(0deg); }
              25% { transform: translate(30px, -20px) rotate(5deg); }
              50% { transform: translate(-10px, -40px) rotate(-3deg); }
              75% { transform: translate(-30px, -10px) rotate(4deg); }
            }
            @keyframes wm-float-2 {
              0%, 100% { transform: translate(0, 0) rotate(0deg); }
              33% { transform: translate(-25px, 25px) rotate(-6deg); }
              66% { transform: translate(20px, -15px) rotate(4deg); }
            }
            @keyframes wm-float-3 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(15px, -30px) scale(1.05); }
            }
            @keyframes wm-drift {
              0%, 100% { transform: translate(0, 0); }
              50% { transform: translate(-20px, 20px); }
            }
            .wm-g1 { animation: wm-float-1 25s ease-in-out infinite; }
            .wm-g2 { animation: wm-float-2 30s ease-in-out infinite; }
            .wm-g3 { animation: wm-float-3 20s ease-in-out infinite; }
            .wm-g4 { animation: wm-drift 35s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Chat bubble outlines */}
        <g className="wm-g1" opacity="0.035">
          <path
            d="M80 120 Q80 90 110 90 H200 Q230 90 230 120 V170 Q230 200 200 200 H140 L110 230 V200 H110 Q80 200 80 170 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary"
          />
        </g>

        <g className="wm-g2" opacity="0.03">
          <path
            d="M500 300 Q500 270 530 270 H650 Q680 270 680 300 V360 Q680 390 650 390 H580 L550 420 V390 H530 Q500 390 500 360 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-primary"
          />
        </g>

        {/* Hexagon grid pattern */}
        <g className="wm-g3" opacity="0.025">
          <polygon
            points="350,50 380,30 410,50 410,90 380,110 350,90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
          <polygon
            points="410,50 440,30 470,50 470,90 440,110 410,90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
          <polygon
            points="380,110 410,90 440,110 440,150 410,170 380,150"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
        </g>

        {/* Concentric circles */}
        <g className="wm-g4" opacity="0.03">
          <circle cx="700" cy="180" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
          <circle cx="700" cy="180" r="60" fill="none" stroke="currentColor" strokeWidth="0.6" className="text-primary" />
          <circle cx="700" cy="180" r="80" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-primary" />
        </g>

        {/* Abstract connection lines */}
        <g className="wm-g1" opacity="0.025">
          <line x1="100" y1="400" x2="250" y2="350" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
          <line x1="250" y1="350" x2="300" y2="450" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
          <line x1="300" y1="450" x2="450" y2="380" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
          <circle cx="100" cy="400" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
          <circle cx="250" cy="350" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
          <circle cx="300" cy="450" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
          <circle cx="450" cy="380" r="3" fill="currentColor" className="text-primary" opacity="0.5" />
        </g>

        {/* Floating diamonds */}
        <g className="wm-g2" opacity="0.02">
          <rect x="600" y="450" width="25" height="25" rx="3" transform="rotate(45 612 462)" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
          <rect x="650" y="500" width="18" height="18" rx="2" transform="rotate(45 659 509)" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
        </g>

        {/* Signal waves */}
        <g className="wm-g3" opacity="0.03">
          <path d="M150 550 Q170 530 190 550 Q210 570 230 550 Q250 530 270 550" fill="none" stroke="currentColor" strokeWidth="1" className="text-primary" />
          <path d="M160 565 Q175 550 190 565 Q205 580 220 565 Q235 550 250 565" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-primary" />
        </g>

        {/* Small chat icon bottom-right */}
        <g className="wm-g4" opacity="0.025">
          <path
            d="M750 550 Q750 535 765 535 H830 Q845 535 845 550 V580 Q845 595 830 595 H800 L780 615 V595 H765 Q750 595 750 580 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary"
          />
          {/* dots inside bubble */}
          <circle cx="785" cy="565" r="2.5" fill="currentColor" className="text-primary" opacity="0.4" />
          <circle cx="800" cy="565" r="2.5" fill="currentColor" className="text-primary" opacity="0.4" />
          <circle cx="815" cy="565" r="2.5" fill="currentColor" className="text-primary" opacity="0.4" />
        </g>
      </svg>
    </div>
  );
});
