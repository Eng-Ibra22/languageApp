// SomSpeak SVG Logo Component
// Pure SVG — sharp at any resolution, zero external dependencies

export default function SomSpeakLogo({ size = 40, showText = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SomSpeak logo"
      >
        <defs>
          <linearGradient id="ss-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          <linearGradient id="ss-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f2040" />
          </linearGradient>
        </defs>

        {/* Main speech bubble */}
        <rect x="8" y="10" width="72" height="52" rx="14" fill="url(#ss-primary)" />

        {/* Bubble tail */}
        <path d="M22 58 L14 74 L36 62 Z" fill="url(#ss-primary)" />

        {/* Sound / language wave lines inside bubble */}
        <rect x="20" y="26" width="30" height="5" rx="2.5" fill="white" opacity="0.95" />
        <rect x="20" y="37" width="44" height="5" rx="2.5" fill="white" opacity="0.75" />
        <rect x="20" y="48" width="20" height="5" rx="2.5" fill="white" opacity="0.55" />

        {/* Arabic-style dot accent — small decoration */}
        <circle cx="78" cy="30" r="10" fill="url(#ss-accent)" />
        <circle cx="78" cy="30" r="4" fill="white" opacity="0.9" />
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: size * 0.45,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #f97316, #ea580c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          SomSpeak
        </span>
      )}
    </div>
  );
}
