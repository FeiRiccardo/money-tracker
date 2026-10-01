// The app icon: a white coin with a blue euro sign on a blue gradient. A 512x512 full-bleed square
// with the artwork inside the central 80% "safe zone", so the same image serves as a normal,
// maskable and Apple touch icon. `npm run icons` renders it to the PNG sizes in public/.

// A geometric euro sign (an arc plus two bars), drawn as strokes so it renders the same everywhere.
const euro = (cx, color) => {
  const r = 100;
  const x = cx + r * 0.669;
  return `<g fill="none" stroke="${color}" stroke-linecap="round" stroke-width="34">
    <path d="M${x} ${256 - r * 0.743} A${r} ${r} 0 1 0 ${x} ${256 + r * 0.743}"/>
    <path d="M${cx - 112} 228H${cx + 52}M${cx - 112} 284H${cx + 52}" stroke-width="26"/>
  </g>`;
};

const art = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e40af"/></linearGradient>
    <linearGradient id="coin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dbeafe"/></linearGradient>
  </defs>`;
const coin = `
  <circle cx="256" cy="268" r="186" fill="#0b1f5c" opacity=".28"/>
  <circle cx="256" cy="256" r="186" fill="url(#coin)"/>
  <circle cx="256" cy="256" r="156" fill="none" stroke="#2563eb" stroke-opacity=".25" stroke-width="8"/>
  ${euro(270, '#1d4ed8')}`;

/** Full-bleed square, for the PNG icons. */
export const squareSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${art}
  <rect width="512" height="512" fill="url(#bg)"/>${coin}
</svg>`;

/** Rounded corners, for the browser-tab favicon. */
export const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${art}
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>${coin}
</svg>`;
