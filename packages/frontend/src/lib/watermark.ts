export interface WatermarkConfig {
  studentName: string;
  rollNumber: string; // use the student _id last 6 chars
  sessionHash: string; // random 8-char hex generated at exam start
  timestamp: string;
}

/**
 * Generate a random 8-character hex string for session identification.
 */
export function generateSessionHash(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extract a 6-character roll number fragment from a student's _id.
 */
export function extractRollNumber(studentId: string): string {
  return studentId.slice(-6);
}

/**
 * Build the watermark text displayed in the pattern.
 */
function buildWatermarkText(config: WatermarkConfig): string {
  return `${config.studentName} | ${config.rollNumber} | ${config.sessionHash}`;
}

/**
 * Create an SVG data URI that renders a single cell of the repeating
 * watermark pattern.  The SVG contains the identifying text rotated
 * -30 degrees and painted at very low opacity so it is visible in
 * screenshots but does not interfere with reading.
 */
function buildSvgDataUri(
  text: string,
  opacity: number = 0.04,
): string {
  // Tile dimensions – wide enough for the text, tall enough for
  // comfortable diagonal spacing.
  const width = 400;
  const height = 200;

  // Escape XML-sensitive characters in the label.
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" `,
    `font-family="monospace, sans-serif" font-size="14" fill="#000" `,
    `fill-opacity="${opacity}" `,
    `transform="rotate(-30, ${width / 2}, ${height / 2})">`,
    escaped,
    `</text>`,
    `</svg>`,
  ].join('');

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Returns a CSS `background-image` value that tiles the watermark
 * across the entire element.
 *
 * @param config  Watermark configuration
 * @param opacity Opacity of the text (0.04 = subtle, 0.08 = visible)
 */
export function generateWatermarkCSS(
  config: WatermarkConfig,
  opacity: number = 0.04,
): string {
  const text = buildWatermarkText(config);
  const uri = buildSvgDataUri(text, opacity);
  return `url("${uri}")`;
}

/**
 * Creates a fixed-position `<div>` that covers the entire viewport
 * with a repeating watermark pattern.
 *
 * The overlay uses `pointer-events: none` so it never blocks user
 * interaction, and `z-index: 55` to sit below the webcam overlay
 * (z-index 60) but above normal exam content.
 *
 * @param config  Watermark configuration
 * @param opacity Opacity of the text (0.04 = subtle, 0.08 = visible)
 * @returns The `HTMLDivElement` – the caller is responsible for
 *          appending it to `document.body`.
 */
export function createWatermarkOverlay(
  config: WatermarkConfig,
  opacity: number = 0.04,
): HTMLDivElement {
  const el = document.createElement('div');

  el.setAttribute('data-watermark', 'true');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.width = '100vw';
  el.style.height = '100vh';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '55';
  el.style.backgroundImage = generateWatermarkCSS(config, opacity);
  el.style.backgroundRepeat = 'repeat';

  return el;
}

/**
 * Removes a previously created watermark overlay from the DOM.
 */
export function removeWatermarkOverlay(el: HTMLDivElement): void {
  el.parentNode?.removeChild(el);
}
