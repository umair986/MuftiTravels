/**
 * How long Mufti Travels has been operating.
 *
 * The site once claimed "15+ years"; the business has operated since 2022.
 * Every mention of its age reads from here and is computed, so the number
 * stays true each new year without anyone remembering to edit copy.
 *
 * Plain module with no imports, so client components can use it without
 * pulling anything else into their bundle.
 */

export const FOUNDED_YEAR = 2022;

/** Whole years since founding, counted by calendar year (4 in 2026). */
export function yearsInService(now: Date = new Date()): number {
  return Math.max(1, now.getFullYear() - FOUNDED_YEAR);
}

/** Pilgrims served, as the site states it. Update here when the figure grows. */
export const PILGRIMS_SERVED = "1,000+";
