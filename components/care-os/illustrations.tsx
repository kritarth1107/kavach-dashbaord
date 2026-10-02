/* Hand-drawn flat vectors for Care OS. Colours read from the palette so dark mode follows. */

type Svg = { className?: string; title?: string };

/** Monogram for small places: forest tile, serif K, saffron underline (from the Kavach CareOS wordmark). */
export function KavachMark({ className, title = "Kavach CareOS" }: Svg) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title}>
      <rect width="48" height="48" rx="14" fill="#143429" />
      <text
        x="24"
        y="31.5"
        textAnchor="middle"
        fontSize="26"
        fontWeight="600"
        fill="#f4f1ea"
        style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
      >
        K
      </text>
      <rect x="15" y="36" width="18" height="3" rx="1.5" fill="#d3541e" />
    </svg>
  );
}

/** Full wordmark (the brand logo). */
export function KavachWordmark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/kavach-careos-logo.png" alt="Kavach CareOS" className={className + " dark:brightness-0 dark:invert"} />;
}

/** Saheli's avatar: a soft lime orb with a spark. */
export function SaheliOrb({ className, title = "Saheli" }: Svg) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label={title}>
      <defs>
        <radialGradient id="orb" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffe9d8" />
          <stop offset="0.55" stopColor="#f2a06b" />
          <stop offset="1" stopColor="#d3541e" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#orb)" />
      <path d="M24 13c1 5.2 3.8 8 9 9-5.2 1-8 3.8-9 9-1-5.2-3.8-8-9-9 5.2-1 8-3.8 9-9Z" fill="#ffffff" />
    </svg>
  );
}

/** Elderly woman: silver bun, round glasses, bindi, saree pallu. */
export function ElderWoman({ className, title = "" }: Svg) {
  return (
    <svg viewBox="0 0 200 200" className={className} role={title ? "img" : "presentation"} aria-label={title || undefined}>
      <circle cx="100" cy="100" r="100" fill="#ffe5d3" />
      <circle cx="100" cy="100" r="76" fill="#ffd9bf" opacity="0.6" />
      {/* bun */}
      <circle cx="100" cy="47" r="17" fill="#c9c6c2" />
      <circle cx="100" cy="47" r="10" fill="#b8b4ae" />
      {/* saree + shoulders */}
      <path d="M38 200c4-38 28-60 62-60s58 22 62 60Z" fill="#c65a3a" />
      <path d="M62 200c10-30 30-50 66-58l14 6c-26 12-42 30-50 52Z" fill="#e08a4c" />
      <path d="M128 142l14 6-6 6-14-6Z" fill="#f3c34f" />
      {/* neck */}
      <path d="M88 118h24v26a12 12 0 0 1-24 0Z" fill="#c98b66" />
      {/* face */}
      <ellipse cx="100" cy="94" rx="33" ry="38" fill="#d9a07b" />
      {/* hair */}
      <path d="M67 92c-2-26 14-42 33-42s35 16 33 42c-5-15-16-24-33-24S72 77 67 92Z" fill="#d7d4cf" />
      <path d="M100 52c-3 8-3 14 0 18 3-4 3-10 0-18Z" fill="#b8b4ae" />
      {/* ears */}
      <ellipse cx="66" cy="98" rx="5" ry="8" fill="#c98b66" />
      <ellipse cx="134" cy="98" rx="5" ry="8" fill="#c98b66" />
      <circle cx="66" cy="107" r="2.4" fill="#f3c34f" />
      <circle cx="134" cy="107" r="2.4" fill="#f3c34f" />
      {/* glasses */}
      <circle cx="86" cy="96" r="10" fill="none" stroke="#3a2e26" strokeWidth="2.6" />
      <circle cx="114" cy="96" r="10" fill="none" stroke="#3a2e26" strokeWidth="2.6" />
      <path d="M96 96h8" stroke="#3a2e26" strokeWidth="2.6" />
      <circle cx="86" cy="97" r="2.6" fill="#3a2e26" />
      <circle cx="114" cy="97" r="2.6" fill="#3a2e26" />
      {/* bindi */}
      <circle cx="100" cy="78" r="3.2" fill="#c0392b" />
      {/* nose + smile */}
      <path d="M100 100c-2 6-2 9 2 10" fill="none" stroke="#b87a55" strokeWidth="2" strokeLinecap="round" />
      <path d="M88 116c7 6 17 6 24 0" fill="none" stroke="#8a4b33" strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="78" cy="110" rx="6" ry="3.5" fill="#e98f7a" opacity="0.45" />
      <ellipse cx="122" cy="110" rx="6" ry="3.5" fill="#e98f7a" opacity="0.45" />
    </svg>
  );
}

/** Elderly man: silver hair, moustache, glasses, kurta. */
export function ElderMan({ className, title = "" }: Svg) {
  return (
    <svg viewBox="0 0 200 200" className={className} role={title ? "img" : "presentation"} aria-label={title || undefined}>
      <circle cx="100" cy="100" r="100" fill="#dcedf9" />
      <circle cx="100" cy="100" r="76" fill="#c9e2f5" opacity="0.6" />
      <path d="M38 200c4-38 28-60 62-60s58 22 62 60Z" fill="#f4efe4" />
      <path d="M92 142h16l-8 30Z" fill="#e3dccb" />
      <circle cx="100" cy="152" r="2" fill="#b8ad95" />
      <circle cx="100" cy="162" r="2" fill="#b8ad95" />
      <path d="M88 118h24v26a12 12 0 0 1-24 0Z" fill="#b97c58" />
      <ellipse cx="100" cy="94" rx="33" ry="38" fill="#c98e69" />
      <path d="M68 86c0-22 14-34 32-34s32 12 32 34c-4-10-12-16-32-16s-28 6-32 16Z" fill="#e2e0dc" />
      <ellipse cx="66" cy="98" rx="5" ry="8" fill="#b97c58" />
      <ellipse cx="134" cy="98" rx="5" ry="8" fill="#b97c58" />
      <path d="M68 92c-3-4-4-10-1-14M132 92c3-4 4-10 1-14" stroke="#e2e0dc" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="75" y="88" width="21" height="16" rx="6" fill="none" stroke="#3a2e26" strokeWidth="2.6" />
      <rect x="104" y="88" width="21" height="16" rx="6" fill="none" stroke="#3a2e26" strokeWidth="2.6" />
      <path d="M96 95h8" stroke="#3a2e26" strokeWidth="2.6" />
      <circle cx="86" cy="96" r="2.6" fill="#3a2e26" />
      <circle cx="114" cy="96" r="2.6" fill="#3a2e26" />
      <path d="M100 100c-2 6-2 9 2 10" fill="none" stroke="#a4694a" strokeWidth="2" strokeLinecap="round" />
      <path d="M84 114c6-5 12-5 16-2 4-3 10-3 16 2-6 4-26 4-32 0Z" fill="#e2e0dc" />
      <path d="M90 121c6 4 14 4 20 0" fill="none" stroke="#7d4530" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Calm empty state: a cup of chai beside a tulsi pot. */
export function ChaiAndTulsi({ className }: Svg) {
  return (
    <svg viewBox="0 0 220 140" className={className} role="presentation">
      <ellipse cx="110" cy="128" rx="96" ry="8" fill="#000" opacity="0.06" />
      {/* tulsi pot */}
      <path d="M140 92h46l-6 34h-34Z" fill="#c65a3a" />
      <rect x="136" y="86" width="54" height="10" rx="4" fill="#dc7650" />
      <path d="M163 86c0-20-6-34-14-44M163 86c0-22 8-38 18-48M163 86c0-12-10-20-22-24M163 86c2-14 14-22 26-22" stroke="#4d8a4f" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[149, 42], [181, 38], [141, 62], [189, 64], [156, 58], [172, 52]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="7" ry="4.5" fill={i % 2 ? "#6fae5f" : "#8cc66f"} transform={`rotate(${i * 30 - 40} ${x} ${y})`} />
      ))}
      {/* cup */}
      <path d="M44 74h62l-6 46a8 8 0 0 1-8 7H58a8 8 0 0 1-8-7Z" fill="#ffffff" stroke="#e6ded2" strokeWidth="2" />
      <path d="M106 82c12 0 16 8 14 16s-10 12-18 10" fill="none" stroke="#e6ded2" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="75" cy="76" rx="29" ry="5" fill="#c98a52" />
      <path d="M62 64c-6-8 6-12 0-20M76 62c-6-8 6-12 0-20M90 64c-6-8 6-12 0-20" stroke="#cfc4b6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M58 98h34" stroke="#d3541e" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

/** A small sun over hills for the greeting card. */
export function MorningSun({ className }: Svg) {
  return (
    <svg viewBox="0 0 120 80" className={className} role="presentation">
      <circle cx="60" cy="46" r="20" fill="#ffd36e" />
      <path d="M0 80c20-22 40-24 60-12s40 10 60-6v18Z" fill="#cfe7c3" />
      <path d="M0 80c26-14 46-14 70-4s36 8 50 0v4Z" fill="#b5d9a5" />
    </svg>
  );
}

export function personArt(gender?: string | null) {
  return gender === "male" ? ElderMan : ElderWoman;
}
